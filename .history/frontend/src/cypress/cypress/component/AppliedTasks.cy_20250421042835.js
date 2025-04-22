// cypress/component/AppliedTasks.cy.js
import React from 'react';
import { mount } from 'cypress/react';
import AppliedTasks from '../../../src/components/AppliedTasks';
// import { getUserEmailFromToken } from '../../../src/utils/auth';

// Mock the auth utility
const getUserEmailStub = cy.stub().as('getUserEmailFromToken');

// Replace the actual module with our stub
Cypress.on('window:before:load', (win) => {
  cy.stub(win, 'getUserEmailFromToken').callsFake(getUserEmailStub);
});

describe('Applied Tasks Component', () => {
  beforeEach(() => {
    // Mock the auth token
    cy.window().then((win) => {
      win.localStorage.setItem('token', 'fake-jwt-token');
    });

    // Set up the auth stub return value
    getUserEmailStub.returns('test@example.com');
  });

  it('renders loading state initially', () => {
    // Intercept API call and delay response
    cy.intercept('GET', 'http://localhost:8080/appliedtasks/*', {
      delay: 500,
      statusCode: 200,
      body: { applied_tasks: [] }
    }).as('fetchAppliedTasks');

    // Mount component
    mount(<AppliedTasks />);

    // Verify loading state
    cy.contains('Loading your applied tasks...').should('be.visible');
  });

  it('displays "no tasks" message when no tasks are returned', () => {
    // Intercept API call with empty response
    cy.intercept('GET', 'http://localhost:8080/appliedtasks/*', {
      statusCode: 200,
      body: { applied_tasks: [] }
    }).as('fetchEmptyAppliedTasks');

    // Mount component
    mount(<AppliedTasks />);

    // Wait for API call to complete
    cy.wait('@fetchEmptyAppliedTasks');

    // Verify empty state message
    cy.contains("You haven't applied for any tasks yet.").should('be.visible');
  });

  it('handles error when API request fails', () => {
    // Intercept API call with error response
    cy.intercept('GET', 'http://localhost:8080/appliedtasks/*', {
      statusCode: 500,
      body: { error: 'Server error' }
    }).as('fetchAppliedTasksError');

    // Mount component
    mount(<AppliedTasks />);

    // Wait for API call to complete
    cy.wait('@fetchAppliedTasksError');

    // Verify error message
    cy.contains('Failed to load applied tasks').should('be.visible');
  });

  it('displays tasks correctly when data is loaded', () => {
    // Mock task data
    const mockAppliedTasks = [
      {
        task: {
          id: 1,
          title: 'Test Task',
          description: 'This is a test task',
          task_date: '2025-04-20',
          task_time: '14:00',
          estimated_pay_rate: 25,
          place_of_work: 'Remote'
        },
        creator: {
          name: 'John Doe',
          email: 'john@example.com',
          mobile: '123-456-7890'
        },
        selected: false
      }
    ];

    // Intercept API call with mock data
    cy.intercept('GET', 'http://localhost:8080/appliedtasks/*', {
      statusCode: 200,
      body: { applied_tasks: mockAppliedTasks }
    }).as('fetchMockAppliedTasks');

    // Mount component
    mount(<AppliedTasks />);

    // Wait for API call to complete
    cy.wait('@fetchMockAppliedTasks');

    // Verify task data is displayed correctly
    cy.contains('Test Task').should('be.visible');
    cy.contains('This is a test task').should('be.visible');
    cy.contains('Remote').should('be.visible');
    cy.contains('$25/hr').should('be.visible');
    cy.contains('John Doe').should('be.visible');
    cy.contains('john@example.com').should('be.visible');
    cy.contains('123-456-7890').should('be.visible');
  });

  it('shows pending status for non-selected tasks', () => {
    // Mock task data with non-selected status
    const mockPendingTasks = [
      {
        task: {
          id: 1,
          title: 'Pending Task',
          description: 'This is a task awaiting selection',
          task_date: '2025-04-20',
          task_time: '14:00',
          estimated_pay_rate: 25,
          place_of_work: 'Remote'
        },
        creator: {
          name: 'John Doe',
          email: 'john@example.com',
          mobile: '123-456-7890'
        },
        selected: false
      }
    ];

    // Intercept API call with mock data
    cy.intercept('GET', 'http://localhost:8080/appliedtasks/*', {
      statusCode: 200,
      body: { applied_tasks: mockPendingTasks }
    }).as('fetchPendingTasks');

    // Mount component
    mount(<AppliedTasks />);

    // Wait for API call to complete
    cy.wait('@fetchPendingTasks');

    // Verify pending status is displayed correctly
    cy.contains('Pending').should('be.visible');
    cy.contains('Your application is awaiting review.').should('be.visible');
  });

  it('shows selected status for selected tasks', () => {
    // Mock task data with selected status
    const mockSelectedTasks = [
      {
        task: {
          id: 1,
          title: 'Selected Task',
          description: 'This is a task that was selected',
          task_date: '2025-04-20',
          task_time: '14:00',
          estimated_pay_rate: 25,
          place_of_work: 'Remote'
        },
        creator: {
          name: 'John Doe',
          email: 'john@example.com',
          mobile: '123-456-7890'
        },
        selected: true
      }
    ];

    // Intercept API call with mock data
    cy.intercept('GET', 'http://localhost:8080/appliedtasks/*', {
      statusCode: 200,
      body: { applied_tasks: mockSelectedTasks }
    }).as('fetchSelectedTasks');

    // Mount component
    mount(<AppliedTasks />);

    // Wait for API call to complete
    cy.wait('@fetchSelectedTasks');

    // Verify selected status is displayed correctly
    cy.contains('✓ Selected').should('be.visible');
    cy.contains('You have been selected for this task!').should('be.visible');
  });

  it('formats dates correctly', () => {
    // Mock task data with date
    const mockDateTask = [
      {
        task: {
          id: 1,
          title: 'Date Test Task',
          description: 'This task tests date formatting',
          task_date: '2025-04-20',
          task_time: '14:00',
          estimated_pay_rate: 25,
          place_of_work: 'Remote'
        },
        creator: {
          name: 'John Doe',
          email: 'john@example.com',
          mobile: '123-456-7890'
        },
        selected: false
      }
    ];

    // Intercept API call with mock data
    cy.intercept('GET', 'http://localhost:8080/appliedtasks/*', {
      statusCode: 200,
      body: { applied_tasks: mockDateTask }
    }).as('fetchDateTask');

    // Mount component
    mount(<AppliedTasks />);

    // Wait for API call to complete
    cy.wait('@fetchDateTask');

    // Verify date is formatted correctly
    cy.get('.task-details').within(() => {
      cy.contains('Date:').should('be.visible');
      cy.contains('April 20, 2025').should('be.visible');
    });
  });
});