// cypress/component/TaskApplications.cy.js
import React from 'react';
import { mount } from 'cypress/react';
import TaskApplications from '../../components/TaskApplications';
import { getUserEmailFromToken } from '../../utils/auth';

// Mock the auth utility
const getUserEmailStub = cy.stub().as('getUserEmailFromToken');

// Replace the actual module with our stub
Cypress.on('window:before:load', (win) => {
  cy.stub(win, 'getUserEmailFromToken').callsFake(getUserEmailStub);
});

describe('TaskApplications Component', () => {
  const mockTasks = [
    {
      _id: 'task1',
      title: 'Test Task 1',
      description: 'This is test task 1',
      task_date: '2025-04-20',
      task_time: '14:00',
      estimated_pay_rate: 25,
      place_of_work: 'Remote',
      status: 'Open',
      people_needed: 2,
      selected_users: ['selected@example.com'],
      applicants: ['applicant1@example.com', 'applicant2@example.com', 'selected@example.com']
    },
    {
      _id: 'task2',
      title: 'Test Task 2',
      description: 'This is test task 2',
      task_date: '2025-04-22',
      task_time: '10:00',
      estimated_pay_rate: 30,
      place_of_work: 'Office',
      status: 'Open',
      people_needed: 1,
      selected_users: ['selected@example.com'],
      applicants: ['applicant3@example.com', 'selected@example.com']
    }
  ];

  beforeEach(() => {
    // Mock localStorage
    cy.window().then(win => {
      win.localStorage.setItem('token', 'fake-jwt-token');
    });

    // Mock window.alert
    cy.window().then(win => {
      cy.stub(win, 'alert').as('alertStub');
    });

    // Mock the auth function
    getUserEmailStub.returns('creator@example.com');
  });

  it('renders loading state initially', () => {
    // Intercept API call but delay the response
    cy.intercept('GET', 'http://localhost:8080/users/*/created-tasks', {
      delay: 1000,
      statusCode: 200,
      body: { tasks: [] }
    }).as('fetchTasks');

    // Mount the component
    mount(<TaskApplications />);

    // Verify loading state is shown
    cy.contains('Loading your tasks...').should('be.visible');
  });

  it('displays error message when fetch fails', () => {
    // Intercept API call with error
    cy.intercept('GET', 'http://localhost:8080/users/*/created-tasks', {
      statusCode: 500,
      body: { error: 'Server error' }
    }).as('fetchTasksError');

    // Mount the component
    mount(<TaskApplications />);

    // Verify error message is shown
    cy.wait('@fetchTasksError');
    cy.contains('Failed to load tasks').should('be.visible');
  });

  it('displays "no tasks" message when no tasks are returned', () => {
    // Intercept API call with empty response
    cy.intercept('GET', 'http://localhost:8080/users/*/created-tasks', {
      statusCode: 200,
      body: { tasks: [] }
    }).as('fetchEmptyTasks');

    // Mount the component
    mount(<TaskApplications />);

    // Verify empty message is shown
    cy.wait('@fetchEmptyTasks');
    cy.contains("You haven't created any tasks yet.").should('be.visible');
  });

  it('renders tasks and applicants when data is loaded', () => {
    // Intercept API call with mock data
    cy.intercept('GET', 'http://localhost:8080/users/*/created-tasks', {
      statusCode: 200,
      body: { tasks: mockTasks }
    }).as('fetchMockTasks');

    // Mount the component
    mount(<TaskApplications />);

    // Verify tasks are displayed
    cy.wait('@fetchMockTasks');
    cy.contains('Test Task 1').should('be.visible');
    cy.contains('Test Task 2').should('be.visible');
    
    // Verify applicants are displayed
    cy.contains('applicant1@example.com').should('be.visible');
    cy.contains('applicant2@example.com').should('be.visible');
    cy.contains('applicant3@example.com').should('be.visible');
    cy.contains('selected@example.com').should('be.visible');
  });

  it('shows correct number of people selected', () => {
    // Intercept API call with mock data
    cy.intercept('GET', 'http://localhost:8080/users/*/created-tasks', {
      statusCode: 200,
      body: { tasks: mockTasks }
    }).as('fetchTasksWithSelectedUsers');

    // Mount the component
    mount(<TaskApplications />);

    // Verify people selected counts
    cy.wait('@fetchTasksWithSelectedUsers');
    cy.contains('People Selected: 1 / 2').should('be.visible'); // For task1
    cy.contains('People Selected: 1 / 1').should('be.visible'); // For task2
  });

  it('shows limit reached warning when applicable', () => {
    // Intercept API call with mock data
    cy.intercept('GET', 'http://localhost:8080/users/*/created-tasks', {
      statusCode: 200,
      body: { tasks: mockTasks }
    }).as('fetchTasksWithFullTask');

    // Mount the component
    mount(<TaskApplications />);

    // Wait for API response
    cy.wait('@fetchTasksWithFullTask');
    
    // Find the second task (which has reached its limit)
    cy.contains('Test Task 2')
      .parents('.task-with-applicants')
      .within(() => {
        // Verify the warning is shown
        cy.contains('Maximum number of people (1) already selected for this task.').should('be.visible');
      });
  });

  it('shows disabled Limit Reached button when limit is reached', () => {
    // Intercept API call with mock data
    cy.intercept('GET', 'http://localhost:8080/users/*/created-tasks', {
      statusCode: 200,
      body: { tasks: mockTasks }
    }).as('fetchTasksForButtons');

    // Mount the component
    mount(<TaskApplications />);

    // Wait for API response
    cy.wait('@fetchTasksForButtons');
    
    // Find the second task (which has reached its limit)
    cy.contains('Test Task 2')
      .parents('.task-with-applicants')
      .contains('applicant3@example.com')
      .parents('li')
      .within(() => {
        // Verify the button is disabled and has correct text
        cy.contains('button', 'Limit Reached').should('be.visible');
        cy.contains('button', 'Limit Reached').should('be.disabled');
      });
  });

  it('shows Accept button for non-selected applicants', () => {
    // Intercept API call with mock data
    cy.intercept('GET', 'http://localhost:8080/users/*/created-tasks', {
      statusCode: 200,
      body: { tasks: mockTasks }
    }).as('fetchTasksForAcceptButtons');

    // Mount the component
    mount(<TaskApplications />);

    // Wait for API response
    cy.wait('@fetchTasksForAcceptButtons');
    
    // Find the first task (which has not reached its limit)
    cy.contains('Test Task 1')
      .parents('.task-with-applicants')
      .contains('applicant1@example.com')
      .parents('li')
      .within(() => {
        // Verify the Accept button is shown
        cy.contains('button', 'Accept').should('be.visible');
        cy.contains('button', 'Accept').should('not.be.disabled');
      });
  });

  it('accepts an applicant when clicking Accept', () => {
    // Intercept API call with mock data
    cy.intercept('GET', 'http://localhost:8080/users/*/created-tasks', {
      statusCode: 200,
      body: { tasks: mockTasks }
    }).as('fetchTasksForAccept');

    // Intercept the Accept API call
    cy.intercept('POST', 'http://localhost:8080/tasks/task1/accept/applicant1@example.com', {
      statusCode: 200,
      body: { message: 'Applicant accepted successfully' }
    }).as('acceptApplicant');

    // Mount the component
    mount(<TaskApplications />);

    // Wait for initial API response
    cy.wait('@fetchTasksForAccept');
    
    // Find and click the Accept button
    cy.contains('Test Task 1')
      .parents('.task-with-applicants')
      .contains('applicant1@example.com')
      .parents('li')
      .contains('button', 'Accept')
      .click();

    // Verify the Accept API was called
    cy.wait('@acceptApplicant');
    
    // Verify alert was shown
    cy.get('@alertStub').should('have.been.calledWith', 'Successfully accepted applicant1@example.com for this task');
  });

  it('handles error when accepting an applicant', () => {
    // Intercept API call with mock data
    cy.intercept('GET', 'http://localhost:8080/users/*/created-tasks', {
      statusCode: 200,
      body: { tasks: mockTasks }
    }).as('fetchTasksForAcceptError');

    // Intercept the Accept API call with error
    cy.intercept('POST', 'http://localhost:8080/tasks/task1/accept/applicant1@example.com', {
      statusCode: 400,
      body: { error: 'Failed to accept applicant' }
    }).as('acceptApplicantError');

    // Mount the component
    mount(<TaskApplications />);

    // Wait for initial API response
    cy.wait('@fetchTasksForAcceptError');
    
    // Find and click the Accept button
    cy.contains('Test Task 1')
      .parents('.task-with-applicants')
      .contains('applicant1@example.com')
      .parents('li')
      .contains('button', 'Accept')
      .click();

    // Verify the Accept API was called
    cy.wait('@acceptApplicantError');
    
    // Verify error alert was shown
    cy.get('@alertStub').should('have.been.calledWith', 'Error: Failed to accept applicant');
  });

  it('disables Accept button during processing', () => {
    // Intercept API call with mock data
    cy.intercept('GET', 'http://localhost:8080/users/*/created-tasks', {
      statusCode: 200,
      body: { tasks: mockTasks }
    }).as('fetchTasksForAcceptProcessing');

    // Intercept the Accept API call with delay
    cy.intercept('POST', 'http://localhost:8080/tasks/task1/accept/applicant1@example.com', {
      delay: 1000, // Add a 1-second delay
      statusCode: 200,
      body: { message: 'Applicant accepted successfully' }
    }).as('acceptApplicantSlow');

    // Mount the component
    mount(<TaskApplications />);

    // Wait for initial API response
    cy.wait('@fetchTasksForAcceptProcessing');
    
    // Get a reference to the button before clicking
    cy.contains('Test Task 1')
      .parents('.task-with-applicants')
      .contains('applicant1@example.com')
      .parents('li')
      .contains('button', 'Accept')
      .as('acceptButton')
      .click();

    // Verify the button shows "Processing..." and is disabled
    cy.get('@acceptButton')
      .should('have.text', 'Processing...')
      .should('be.disabled');

    // Wait for API to respond
    cy.wait('@acceptApplicantSlow');
  });

  it('formats date correctly', () => {
    // Intercept API call with mock data
    cy.intercept('GET', 'http://localhost:8080/users/*/created-tasks', {
      statusCode: 200,
      body: { tasks: mockTasks }
    }).as('fetchTasksForDateFormatting');

    // Mount the component
    mount(<TaskApplications />);

    // Wait for API response
    cy.wait('@fetchTasksForDateFormatting');
    
    // Verify date formatting in the first task
    cy.contains('Test Task 1')
      .parents('.task-with-applicants')
      .within(() => {
        cy.contains('Date:').parent().should('contain', '2025');
        cy.contains('Date:').parent().should('contain', 'April');
        cy.contains('Date:').parent().should('contain', '20');
      });
  });
});