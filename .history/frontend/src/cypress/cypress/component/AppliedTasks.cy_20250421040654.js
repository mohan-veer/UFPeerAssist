// cypress/component/AppliedTasks.cy.js
import React from 'react';
import { mount } from 'cypress/react';
import AppliedTasks from '../../components/AppliedTasks';
import { getUserEmailFromToken } from '../../utils/auth';

// Mock the auth utility
const getUserEmailStub = cy.stub().as('getUserEmailFromToken');

// Replace the actual module with our stub
Cypress.on('window:before:load', (win) => {
  cy.stub(win, 'getUserEmailFromToken').callsFake(getUserEmailStub);
});

describe('AppliedTasks Component', () => {
  beforeEach(() => {
    // Mock localStorage
    cy.window().then(win => {
      win.localStorage.setItem('token', 'fake-jwt-token');
    });

    // Mock the auth function
    getUserEmailStub.returns('test@example.com');
  });

  it('renders loading state initially', () => {
    // Intercept API call but delay the response
    cy.intercept('GET', 'http://localhost:8080/appliedtasks/*', {
      delay: 1000,
      statusCode: 200,
      body: { applied_tasks: [] }
    }).as('fetchAppliedTasks');

    // Mount the component
    mount(<AppliedTasks />);

    // Verify loading state is shown
    cy.contains('Loading your applied tasks...').should('be.visible');
  });

  it('displays error message when fetch fails', () => {
    // Intercept API call with error
    cy.intercept('GET', 'http://localhost:8080/appliedtasks/*', {
      statusCode: 500,
      body: { error: 'Server error' }
    }).as('fetchAppliedTasksError');

    // Mount the component
    mount(<AppliedTasks />);

    // Verify error message is shown
    cy.wait('@fetchAppliedTasksError');
    cy.contains('Failed to load applied tasks').should('be.visible');
  });

  it('displays "no tasks" message when no tasks are returned', () => {
    // Intercept API call with empty response
    cy.intercept('GET', 'http://localhost:8080/appliedtasks/*', {
      statusCode: 200,
      body: { applied_tasks: [] }
    }).as('fetchEmptyAppliedTasks');

    // Mount the component
    mount(<AppliedTasks />);

    // Verify empty message is shown
    cy.wait('@fetchEmptyAppliedTasks');
    cy.contains("You haven't applied for any tasks yet.").should('be.visible');
  });

  it('renders applied tasks when data is loaded', () => {
    // Prepare mock data
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

    // Mount the component
    mount(<AppliedTasks />);

    // Verify task data is displayed
    cy.wait('@fetchMockAppliedTasks');
    cy.contains('Test Task').should('be.visible');
    cy.contains('This is a test task').should('be.visible');
    cy.contains('John Doe').should('be.visible');
    cy.contains('Pending').should('be.visible');
    cy.contains('Your application is awaiting review.').should('be.visible');
  });

  it('shows selected status when user is selected for a task', () => {
    // Prepare mock data with selected status
    const mockSelectedTasks = [
      {
        task: {
          id: 1,
          title: 'Selected Task',
          description: 'This is a selected task',
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

    // Intercept API call with selected task data
    cy.intercept('GET', 'http://localhost:8080/appliedtasks/*', {
      statusCode: 200,
      body: { applied_tasks: mockSelectedTasks }
    }).as('fetchSelectedTasks');

    // Mount the component
    mount(<AppliedTasks />);

    // Verify selected task UI is displayed
    cy.wait('@fetchSelectedTasks');
    cy.contains('Selected Task').should('be.visible');
    cy.contains('✓ Selected').should('be.visible');
    cy.contains('You have been selected for this task!').should('be.visible');
  });

  it('handles error when user email is not found in token', () => {
    // Mock the auth function to return null
    getUserEmailStub.returns(null);

    // Mount the component
    mount(<AppliedTasks />);

    // Verify error message is shown
    cy.contains('Failed to load applied tasks').should('be.visible');
    cy.contains('User email not found in token').should('be.visible');
  });
  
  it('formats date correctly', () => {
    // Prepare mock data with a date
    const mockDateTasks = [
      {
        task: {
          id: 1,
          title: 'Date Test Task',
          description: 'This tests date formatting',
          task_date: '2025-04-20', // April 20, 2025
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

    // Intercept API call with date test data
    cy.intercept('GET', 'http://localhost:8080/appliedtasks/*', {
      statusCode: 200,
      body: { applied_tasks: mockDateTasks }
    }).as('fetchDateTasks');

    // Mount the component
    mount(<AppliedTasks />);

    // Verify date is formatted correctly (will depend on locale)
    cy.wait('@fetchDateTasks');
    cy.contains('Date:').parent().should('contain', '2025');
    cy.contains('Date:').parent().should('contain', 'April');
    cy.contains('Date:').parent().should('contain', '20');
  });
});