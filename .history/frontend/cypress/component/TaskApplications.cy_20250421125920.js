// cypress/component/TaskApplications.cy.js

import React from 'react';
import { mount } from 'cypress/react';
import { BrowserRouter } from 'react-router-dom';
import TaskApplications from '../../src/components/TaskApplications';

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
    // Create a fake JWT token with an email
    const createFakeJWT = (email) => {
      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const payload = btoa(JSON.stringify({ email }));
      const signature = btoa('fake-signature');
      return `${header}.${payload}.${signature}`;
    };
    
    // Set up authentication token
    cy.window().then((win) => {
      win.localStorage.setItem('token', createFakeJWT('creator@example.com'));
      
      // Mock window.alert
      cy.stub(win, 'alert').as('alertStub');
    });
    
    // Intercept API call for fetching created tasks
    cy.intercept('GET', 'http://localhost:8080/users/*/created-tasks', {
      statusCode: 200,
      body: { tasks: [] }
    }).as('fetchTasks');
  });

  it('renders loading state initially', () => {
    // Delay the API response to see loading state
    cy.intercept('GET', 'http://localhost:8080/users/*/created-tasks', {
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
    // Mount the component
    cy.mount(
      <BrowserRouter>
        <TaskApplications />
      </BrowserRouter>
    );
    
    // Wait for API call
    cy.wait('@fetchTasks');
    
    // Verify empty state message
    cy.contains("You haven't created any tasks yet.").should('be.visible');
  });

  it('renders tasks and applicants when data is loaded', () => {
    // Override the interceptor with mock data
    cy.intercept('GET', 'http://localhost:8080/users/*/created-tasks', {
      statusCode: 200,
      body: { tasks: mockTasks }
    }).as('fetchWithData');
    
    // Mount the component
    cy.mount(
      <BrowserRouter>
        <TaskApplications />
      </BrowserRouter>
    );
    
    // Wait for API call
    cy.wait('@fetchWithData');
    
    // Verify tasks and applicants are rendered
    cy.contains('Test Task 1').should('be.visible');
    cy.contains('Test Task 2').should('be.visible');
    cy.contains('applicant1@example.com').should('be.visible');
    cy.contains('applicant2@example.com').should('be.visible');
    cy.contains('applicant3@example.com').should('be.visible');
    cy.contains('selected@example.com').should('be.visible');
  });

  it('shows correct number of people selected', () => {
    // Override the interceptor with mock data
    cy.intercept('GET', 'http://localhost:8080/users/*/created-tasks', {
      statusCode: 200,
      body: { tasks: mockTasks }
    }).as('fetchTasksWithSelected');
    
    // Mount the component
    cy.mount(
      <BrowserRouter>
        <TaskApplications />
      </BrowserRouter>
    );
    
    // Wait for API call
    cy.wait('@fetchTasksWithSelected');
    
    // Verify people selected counts
    cy.contains('People Selected: 1 / 2').should('be.visible'); // For task1
    cy.contains('People Selected: 1 / 1').should('be.visible'); // For task2
  });

  it('shows selected badge for selected applicants', () => {
    // Override the interceptor with mock data
    cy.intercept('GET', 'http://localhost:8080/users/*/created-tasks', {
      statusCode: 200,
      body: { tasks: mockTasks }
    }).as('fetchTasksWithSelectedApplicants');
    
    // Mount the component
    cy.mount(
      <BrowserRouter>
        <TaskApplications />
      </BrowserRouter>
    );
    
    // Wait for API call
    cy.wait('@fetchTasksWithSelectedApplicants');
    
    // Find a selected applicant and verify badge
    cy.contains('selected@example.com')
      .parents('li')
      .within(() => {
        cy.contains('Selected').should('be.visible');
      });
  });

  it('shows limit reached warning when people limit is reached', () => {
    // Override the interceptor with mock data
    cy.intercept('GET', 'http://localhost:8080/users/*/created-tasks', {
      statusCode: 200,
      body: { tasks: mockTasks }
    }).as('fetchTasksWithLimit');
    
    // Mount the component
    cy.mount(
      <BrowserRouter>
        <TaskApplications />
      </BrowserRouter>
    );
    
    // Wait for API call
    cy.wait('@fetchTasksWithLimit');
    
    // Verify the limit warning for task2 (1/1)
    cy.contains('Test Task 2')
      .parents('.task-with-applicants')
      .within(() => {
        cy.contains('Maximum number of people (1) already selected for this task.').should('be.visible');
      });
  });

  it('shows disabled Limit Reached button when limit is reached', () => {
    // Override the interceptor with mock data
    cy.intercept('GET', 'http://localhost:8080/users/*/created-tasks', {
      statusCode: 200,
      body: { tasks: mockTasks }
    }).as('fetchTasksForLimitButtons');
    
    // Mount the component
    cy.mount(
      <BrowserRouter>
        <TaskApplications />
      </BrowserRouter>
    );
    
    // Wait for API call
    cy.wait('@fetchTasksForLimitButtons');
    
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
    // Override the interceptor with mock data
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
    cy.mount(
      <BrowserRouter>
        <TaskApplications />
      </BrowserRouter>
    );
    
    // Wait for the initial API call
    cy.wait('@fetchTasksForAccept');
    
    // Find and click the Accept button for an applicant
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
    // Override the interceptor with mock data
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
    cy.mount(
      <BrowserRouter>
        <TaskApplications />
      </BrowserRouter>
    );
    
    // Wait for the initial API call
    cy.wait('@fetchTasksForAcceptError');
    
    // Find and click the Accept button for an applicant
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

  it('shows Processing... and disables button during accept operation', () => {
    // Override the interceptor with mock data
    cy.intercept('GET', 'http://localhost:8080/users/*/created-tasks', {
      statusCode: 200,
      body: { tasks: mockTasks }
    }).as('fetchTasksForProcessing');
    
    // Intercept the Accept API call with delay
    cy.intercept('POST', 'http://localhost:8080/tasks/task1/accept/applicant1@example.com', {
      statusCode: 200,
      body: { message: 'Applicant accepted successfully' },
      delay: 1000 // Add 1-second delay
    }).as('acceptApplicantSlow');
    
    // Mount the component
    cy.mount(
      <BrowserRouter>
        <TaskApplications />
      </BrowserRouter>
    );
    
    // Wait for the initial API call
    cy.wait('@fetchTasksForProcessing');
    
    // Find the Accept button
    cy.contains('Test Task 1')
      .parents('.task-with-applicants')
      .contains('applicant1@example.com')
      .parents('li')
      .contains('button', 'Accept')
      .as('acceptButton')
      .click();
    
    // Verify the button shows Processing... and is disabled
    cy.get('@acceptButton')
      .should('have.text', 'Processing...')
      .should('be.disabled');
    
    // Wait for the accept API call to complete
    cy.wait('@acceptApplicantSlow');
  });

  it('handles error when API request fails', () => {
    // Override the interceptor with error
    cy.intercept('GET', 'http://localhost:8080/users/*/created-tasks', {
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
  });
});