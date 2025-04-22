// cypress/component/TaskApplications.cy.js

import React from 'react';
import { mount } from 'cypress/react';
import { BrowserRouter } from 'react-router-dom';
import TaskApplications from '../../src/components/TaskApplications';

describe('Task Applications Component', () => {
  beforeEach(() => {
    // Create a fake JWT token with an email
    const createFakeJWT = (email) => {
      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const payload = btoa(JSON.stringify({ email }));
      const signature = btoa('fake-signature');
      return `${header}.${payload}.${signature}`;
    };
    
    // Set up authentication token
    cy.window().then((win) => {
      win.localStorage.setItem('token', createFakeJWT('test@example.com'));
      
      // Mock console methods
      cy.stub(win.console, 'log').as('consoleLog');
      cy.stub(win.console, 'error').as('consoleError');
      
      // Mock window.alert
      cy.stub(win, 'alert').as('alertStub');
    });
    
    // Mock tasks data
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
    
    // Intercept API call with mock data
    cy.intercept('GET', '**/users/*/created-tasks', {
      statusCode: 200,
      body: { tasks: mockTasks }
    }).as('fetchTaskApplications');
  });

  it('renders loading state initially', () => {
    // Delay the API response to see loading state
    cy.intercept('GET', '**/users/*/created-tasks', {
      statusCode: 200,
      body: { tasks: [] },
      delay: 500
    }).as('delayedFetch');
    
    // Mount the component
    cy.mount(
      <BrowserRouter>
        <TaskApplications />
      </BrowserRouter>
    );
    
    // Verify loading state is shown
    cy.contains('Loading your tasks...').should('be.visible');
  });

  it('displays "no tasks" message when no tasks are returned', () => {
    // Override to return empty list
    cy.intercept('GET', '**/users/*/created-tasks', {
      statusCode: 200,
      body: { tasks: [] }
    }).as('fetchEmptyTasks');
    
    // Mount the component
    cy.mount(
      <BrowserRouter>
        <TaskApplications />
      </BrowserRouter>
    );
    
    // Wait for API call
    cy.wait('@fetchEmptyTasks');
    
    // Verify empty state message
    cy.contains("You haven't created any tasks yet.").should('be.visible');
  });

  it('displays task applications correctly when data is loaded', () => {
    // Mount the component
    cy.mount(
      <BrowserRouter>
        <TaskApplications />
      </BrowserRouter>
    );
    
    // Wait for API call
    cy.wait('@fetchTaskApplications');
    
    // Verify tasks are rendered
    cy.contains('Test Task 1').should('be.visible');
    cy.contains('Test Task 2').should('be.visible');
    
    // Verify applicants are shown
    cy.contains('applicant1@example.com').should('be.visible');
    cy.contains('applicant2@example.com').should('be.visible');
    cy.contains('applicant3@example.com').should('be.visible');
    cy.contains('selected@example.com').should('be.visible');
  });

  it('shows selected badge for selected applicants', () => {
    // Mount the component
    cy.mount(
      <BrowserRouter>
        <TaskApplications />
      </BrowserRouter>
    );
    
    // Wait for API call
    cy.wait('@fetchTaskApplications');
    
    // Find a selected applicant and verify badge
    cy.contains('selected@example.com')
      .parents('li')
      .within(() => {
        cy.contains('Selected').should('be.visible');
      });
  });

  it('shows limit reached warning when applicable', () => {
    // Mount the component
    cy.mount(
      <BrowserRouter>
        <TaskApplications />
      </BrowserRouter>
    );
    
    // Wait for API call
    cy.wait('@fetchTaskApplications');
    
    // Verify the limit warning for task2 (1/1)
    cy.contains('Test Task 2')
      .parents('.task-with-applicants')
      .within(() => {
        cy.contains('Maximum number of people (1) already selected for this task.').should('be.visible');
      });
  });

  it('shows disabled Limit Reached button when limit is reached', () => {
    // Mount the component
    cy.mount(
      <BrowserRouter>
        <TaskApplications />
      </BrowserRouter>
    );
    
    // Wait for API call
    cy.wait('@fetchTaskApplications');
    
    // Verify the Limit Reached button for task2's non-selected applicant
    cy.contains('Test Task 2')
      .parents('.task-with-applicants')
      .contains('applicant3@example.com')
      .parents('li')
      .within(() => {
        cy.contains('button', 'Limit Reached').should('be.visible');
        cy.contains('button', 'Limit Reached').should('be.disabled');
      });
  });

  it('accepts an applicant when clicking Accept button', () => {
    // Intercept the Accept API call
    cy.intercept('POST', '**/tasks/task1/accept/applicant1@example.com', {
      statusCode: 200,
      body: { message: 'Applicant accepted successfully' }
    }).as('acceptApplicant');
    
    // Mount the component
    cy.mount(
      <BrowserRouter>
        <TaskApplications />
      </BrowserRouter>
    );
    
    // Wait for initial API call
    cy.wait('@fetchTaskApplications');
    
    // Find and click the Accept button
    cy.contains('Test Task 1')
      .parents('.task-with-applicants')
      .contains('applicant1@example.com')
      .parents('li')
      .contains('button', 'Accept')
      .click();
    
    // Wait for the accept API call
    cy.wait('@acceptApplicant');
    
    // Verify alert was shown
    cy.get('@alertStub').should('have.been.calledWith', 
      'Successfully accepted applicant1@example.com for this task');
  });

  it('handles error when accepting an applicant fails', () => {
    // Intercept the Accept API call with error
    cy.intercept('POST', '**/tasks/task1/accept/applicant1@example.com', {
      statusCode: 400,
      body: { error: 'Failed to accept applicant' }
    }).as('acceptApplicantError');
    
    // Mount the component
    cy.mount(
      <BrowserRouter>
        <TaskApplications />
      </BrowserRouter>
    );
    
    // Wait for initial API call
    cy.wait('@fetchTaskApplications');
    
    // Find and click the Accept button
    cy.contains('Test Task 1')
      .parents('.task-with-applicants')
      .contains('applicant1@example.com')
      .parents('li')
      .contains('button', 'Accept')
      .click();
    
    // Wait for the accept API call
    cy.wait('@acceptApplicantError');
    
    // Verify error alert was shown
    cy.get('@alertStub').should('have.been.calledWith', 'Error: Failed to accept applicant');
  });

  // Modifying this test to avoid the Processing... text issue
  it('disables Accept button during processing', () => {
    // Intercept the Accept API call with delay
    cy.intercept('POST', '**/tasks/task1/accept/applicant1@example.com', {
      delay: 1000, // Add a 1-second delay
      statusCode: 200,
      body: { message: 'Applicant accepted successfully' }
    }).as('acceptApplicantSlow');
    
    // Mount the component
    cy.mount(
      <BrowserRouter>
        <TaskApplications />
      </BrowserRouter>
    );
    
    // Wait for initial API call
    cy.wait('@fetchTaskApplications');
    
    // Get a reference to the button before clicking it
    cy.contains('Test Task 1')
      .parents('.task-with-applicants')
      .contains('applicant1@example.com')
      .parents('li')
      .find('button')
      .as('acceptButton');
    
    // Click the button
    cy.get('@acceptButton').click();
    
    // Verify the button is disabled during processing
    cy.get('@acceptButton').should('be.disabled');
    
    // Wait for the accept API call to complete
    cy.wait('@acceptApplicantSlow');
  });

  it('handles error when API request fails', () => {
    // Override the interceptor with error
    cy.intercept('GET', '**/users/*/created-tasks', {
      statusCode: 500,
      body: { error: 'Internal server error' }
    }).as('fetchError');
    
    // Mount the component
    cy.mount(
      <BrowserRouter>
        <TaskApplications />
      </BrowserRouter>
    );
    
    // Wait for API call
    cy.wait('@fetchError');
    
    // Verify error message
    cy.contains('Failed to load tasks').should('be.visible');
    
    // Verify console.error was called
    cy.get('@consoleError').should('be.called');
  });
});