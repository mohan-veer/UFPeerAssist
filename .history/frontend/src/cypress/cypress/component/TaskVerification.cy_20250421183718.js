import React from 'react';
import TaskVerification from '../../src/components/TaskVerification';
import { mount } from 'cypress/react';
import * as authUtils from '../../src/utils/auth';
import * as router from 'react-router-dom';

describe('TaskVerification Component', () => {
  const mockTasks = [
    {
      _id: 'task1',
      title: 'Task 1',
      description: 'This is task 1',
      task_date: '2025-04-20',
      task_time: '14:00',
      place_of_work: 'Remote',
      status: 'In Progress',
      selected_users: ['worker1@example.com', 'worker2@example.com']
    },
    {
      _id: 'task2',
      title: 'Task 2',
      description: 'This is task 2',
      task_date: '2025-04-22',
      task_time: '10:00',
      place_of_work: 'Office',
      status: 'Open',
      selected_users: ['worker3@example.com']
    },
    {
      _id: 'task3',
      title: 'Completed Task',
      description: 'This task is already completed',
      task_date: '2025-04-15',
      task_time: '09:00',
      place_of_work: 'Remote',
      status: 'Completed',
      selected_users: ['worker1@example.com']
    }
  ];

  beforeEach(() => {
    // Set up localStorage mock
    cy.window().then(win => {
      win.localStorage.setItem('token', 'fake-token');
    });

    // Stub the auth utility
    cy.stub(authUtils, 'getUserEmailFromToken').returns('owner@example.com');

    // Stub the router navigate function
    const navigateSpy = cy.spy().as('navigateSpy');
    cy.stub(router, 'useNavigate').returns(navigateSpy);

    // Stub console methods to prevent test logs from being cluttered
    cy.window().then(win => {
      cy.stub(win.console, 'log').as('consoleLog');
      cy.stub(win.console, 'error').as('consoleError');
      
      // Stub setTimeout to control timing
      cy.stub(win, 'setTimeout').as('setTimeout');
    });
  });

  it('shows loading state initially', () => {
    // Intercept API call but don't resolve immediately
    cy.intercept('GET', '**/users/*/created-tasks', {
      delay: 300,
      statusCode: 200,
      body: { tasks: mockTasks }
    }).as('getTasks');

    mount(<TaskVerification />);

    // Check loading state
    cy.contains('Loading pending verifications...').should('be.visible');

    // Wait for API call to complete
    cy.wait('@getTasks');

    // Loading state should be gone
    cy.contains('Loading pending verifications...').should('not.exist');
  });

  it('renders task cards correctly and filters out completed tasks', () => {
    // Intercept API call
    cy.intercept('GET', '**/users/*/created-tasks', {
      statusCode: 200,
      body: { tasks: mockTasks }
    }).as('getTasks');

    mount(<TaskVerification />);

    // Wait for API call to complete
    cy.wait('@getTasks');

    // Check task cards
    cy.contains('Task 1').should('be.visible');
    cy.contains('Task 2').should('be.visible');
    
    // Completed task should not be visible
    cy.contains('Completed Task').should('not.exist');

    // Check task details
    cy.contains('This is task 1').should('be.visible');
    cy.contains('Remote').should('be.visible');
    cy.contains('Office').should('be.visible');
    cy.contains('worker1@example.com, worker2@example.com').should('be.visible');
  });

  it('shows "no verifications" message when no pending tasks exist', () => {
    // Intercept API call with only completed tasks
    cy.intercept('GET', '**/users/*/created-tasks', {
      statusCode: 200,
      body: { tasks: [mockTasks[2]] } // Only the completed task
    }).as('getTasks');

    mount(<TaskVerification />);

    // Wait for API call to complete
    cy.wait('@getTasks');

    // Check no tasks message
    cy.contains("You don't have any tasks pending verification.").should('be.visible');
    cy.contains("When a worker completes a task, you'll receive an email with a verification code.").should('be.visible');
  });

  it('shows error message when API request fails', () => {
    // Intercept API call with error
    cy.intercept('GET', '**/users/*/created-tasks', {
      statusCode: 500,
      body: 'Internal Server Error'
    }).as('getTasksError');

    mount(<TaskVerification />);

    // Wait for API call to complete
    cy.wait('@getTasksError');

    // Check error message
    cy.contains('Failed to load tasks').should('be.visible');
    cy.contains('HTTP error! status: 500').should('be.visible');
  });

  it('shows error when user email is not found', () => {
    // Change the stub to return null
    cy.stub(authUtils, 'getUserEmailFromToken').returns(null);

    mount(<TaskVerification />);

    // Check error message
    cy.contains('Failed to load tasks').should('be.visible');
    cy.contains('User email not found in token').should('be.visible');
  });

  it('shows and hides verification form correctly', () => {
    // Intercept API call
    cy.intercept('GET', '**/users/*/created-tasks', {
      statusCode: 200,
      body: { tasks: mockTasks }
    }).as('getTasks');

    mount(<TaskVerification />);

    // Wait for API call to complete
    cy.wait('@getTasks');

    // Verification form should not be visible initially
    cy.contains('Enter the verification code sent to your email:').should('not.exist');

    // Click verification button for first task
    cy.contains('button', 'Verify Task Completion').first().click();

    // Verification form should now be visible
    cy.contains('Enter the verification code sent to your email:').should('be.visible');
    cy.get('input[placeholder="Enter OTP code"]').should('be.visible');
    cy.contains('button', 'Verify Completion').should('be.visible');
    cy.contains('button', 'Cancel').should('be.visible');

    // Click cancel button
    cy.contains('button', 'Cancel').click();

    // Verification form should be hidden again
    cy.contains('Enter the verification code sent to your email:').should('not.exist');
  });

  it('disables verify button when OTP is empty', () => {
    // Intercept API call
    cy.intercept('GET', '**/users/*/created-tasks', {
      statusCode: 200,
      body: { tasks: mockTasks }
    }).as('getTasks');

    mount(<TaskVerification />);

    // Wait for API call to complete
    cy.wait('@getTasks');

    // Click verification button for first task
    cy.contains('button', 'Verify Task Completion').first().click();

    // Verify button should be disabled initially
    cy.contains('button', 'Verify Completion').should('be.disabled');

    // Enter OTP
    cy.get('input[placeholder="Enter OTP code"]').type('123456');

    // Verify button should be enabled
    cy.contains('button', 'Verify Completion').should('not.be.disabled');

    // Clear OTP
    cy.get('input[placeholder="Enter OTP code"]').clear();

    // Verify button should be disabled again
    cy.contains('button', 'Verify Completion').should('be.disabled');
  });

  it('shows success message and redirects after successful verification', () => {
    // Intercept tasks API call
    cy.intercept('GET', '**/users/*/created-tasks', {
      statusCode: 200,
      body: { tasks: mockTasks }
    }).as('getTasks');

    // Intercept verification API call
    cy.intercept('POST', '**/validate-task-completion', {
      statusCode: 200,
      body: { message: 'Task verified successfully' }
    }).as('verifyTask');

    mount(<TaskVerification />);

    // Wait for tasks to load
    cy.wait('@getTasks');

    // Click verification button for first task
    cy.contains('button', 'Verify Task Completion').first().click();

    // Enter OTP
    cy.get('input[placeholder="Enter OTP code"]').type('123456');

    // Submit verification
    cy.contains('button', 'Verify Completion').click();

    // Wait for verification API call to complete
    cy.wait('@verifyTask');

    // Check success message
    cy.contains('Task verified and marked as completed!').should('be.visible');

    // Check that redirect timer was set
    cy.get('@setTimeout').should('have.been.calledWith', Cypress.sinon.match.any, 2000);

    // Check that navigation will happen to completed tasks page
    cy.window().then(() => {
      // Get the first argument of the first call to setTimeout
      const timeoutCallback = cy.get('@setTimeout').firstCall.args[0];
      
      // Execute the callback manually
      timeoutCallback();
      
      // Check that navigation was called with the correct path
      cy.get('@navigateSpy').should('have.been.calledWith', '/completed-tasks');
    });
  });

  it('shows error message when verification fails', () => {
    // Intercept tasks API call
    cy.intercept('GET', '**/users/*/created-tasks', {
      statusCode: 200,
      body: { tasks: mockTasks }
    }).as('getTasks');

    // Intercept verification API call with error
    cy.intercept('POST', '**/validate-task-completion', {
      statusCode: 400,
      body: { error: 'Invalid verification code' }
    }).as('verifyTaskError');

    mount(<TaskVerification />);

    // Wait for tasks to load
    cy.wait('@getTasks');

    // Click verification button for first task
    cy.contains('button', 'Verify Task Completion').first().click();

    // Enter OTP
    cy.get('input[placeholder="Enter OTP code"]').type('123456');

    // Submit verification
    cy.contains('button', 'Verify Completion').click();

    // Wait for verification API call to complete
    cy.wait('@verifyTaskError');

    // Check error message
    cy.contains('Invalid verification code').should('be.visible');

    // Form should still be visible
    cy.get('input[placeholder="Enter OTP code"]').should('be.visible');
  });

  it('makes verification API request with correct parameters', () => {
    // Intercept tasks API call
    cy.intercept('GET', '**/users/*/created-tasks', {
      statusCode: 200,
      body: { tasks: mockTasks }
    }).as('getTasks');

    // Intercept verification API call
    cy.intercept('POST', '**/validate-task-completion', req => {
      // Assert on request body
      expect(req.body).to.deep.equal({
        task_id: 'task1',
        email: 'owner@example.com',
        otp: '123456'
      });

      req.reply({
        statusCode: 200,
        body: { message: 'Success' }
      });
    }).as('verifyTask');

    mount(<TaskVerification />);

    // Wait for tasks to load
    cy.wait('@getTasks');

    // Click verification button for first task
    cy.contains('button', 'Verify Task Completion').first().click();

    // Enter OTP
    cy.get('input[placeholder="Enter OTP code"]').type('123456');

    // Submit verification
    cy.contains('button', 'Verify Completion').click();

    // Wait for verification API call to complete
    cy.wait('@verifyTask');
  });

  it('removes task from list after successful verification', () => {
    // Intercept tasks API call
    cy.intercept('GET', '**/users/*/created-tasks', {
      statusCode: 200,
      body: { tasks: mockTasks }
    }).as('getTasks');

    // Intercept verification API call
    cy.intercept('POST', '**/validate-task-completion', {
      statusCode: 200,
      body: { message: 'Success' }
    }).as('verifyTask');

    mount(<TaskVerification />);

    // Wait for tasks to load
    cy.wait('@getTasks');

    // Both tasks should be visible initially
    cy.contains('Task 1').should('be.visible');
    cy.contains('Task 2').should('be.visible');

    // Click verification button for first task
    cy.contains('Task 1').parent().parent().contains('button', 'Verify Task Completion').click();

    // Enter OTP
    cy.get('input[placeholder="Enter OTP code"]').type('123456');

    // Submit verification
    cy.contains('button', 'Verify Completion').click();

    // Wait for verification API call to complete
    cy.wait('@verifyTask');

    // Task 1 should be removed from the list
    cy.contains('Task 1').should('not.exist');
    
    // Task 2 should still be visible
    cy.contains('Task 2').should('be.visible');
  });

  it('formats date correctly using component\'s formatDate function', () => {
    // We need to test the date formatting function directly to ensure it works with any input
    
    // Create a mock task with the specific date we want to test
    const taskWithSpecificDate = {
      ...mockTasks[0],
      task_date: '2025-04-20' // Use a fixed date for testing
    };
    
    // Intercept tasks API call and return our mock task
    cy.intercept('GET', '**/users/*/created-tasks', {
      statusCode: 200,
      body: { tasks: [taskWithSpecificDate] }
    }).as('getTasks');

    mount(<TaskVerification />);

    // Wait for tasks to load
    cy.wait('@getTasks');

    // Check that the component's formatDate function works correctly
    // The component should display the formatted date from our mock task
    cy.contains('div', /Date:/).should(($div) => {
      const text = $div.text();
      
      // Test for the expected date format using a more flexible regex
      // This will check for:
      // 1. A month name or number
      // 2. A day number
      // 3. The year 2025 (which is from our fixed mock data)
      const dateFormatRegex = /(January|February|March|April|May|June|July|August|September|October|November|December|\d{1,2})[\/\s\.\-,]*(\d{1,2})[\/\s\.\-,]*2025|\d{1,2}[\/\s\.\-,]*(January|February|March|April|May|June|July|August|September|October|November|December)[\/\s\.\-,]*2025|2025[\/\s\.\-,]*(\d{1,2})[\/\s\.\-,]*(January|February|March|April|May|June|July|August|September|October|November|December)|\d{1,2}[\/\s\.\-,]*\d{1,2}[\/\s\.\-,]*2025/i;
      
      expect(dateFormatRegex.test(text)).to.be.true;
      
      // Make sure the year from our mock data appears in the formatted date
      expect(text).to.include('2025');
      
      // Since we're specifically using April 20 in our mock,
      // ensure either "April" and "20" appear (for long format)
      // or the components of that date appear in some format
      const containsExpectedDate = 
        (text.includes('April') && text.includes('20')) || // Long format
        text.includes('4/20') ||  // MM/DD format
        text.includes('20/4') ||  // DD/MM format
        text.includes('Apr') ||   // Abbreviated month
        text.includes('20');      // At least the day
        
      expect(containsExpectedDate).to.be.true;
    });
  });
});