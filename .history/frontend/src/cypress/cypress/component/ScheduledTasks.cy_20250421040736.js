// cypress/component/ScheduledTasks.cy.js
import React from 'react';
import { mount } from 'cypress/react';
import ScheduledTasks from '../../components/ScheduledTasks';
import { getUserEmailFromToken } from '../../utils/auth';

// Mock the auth utility
const getUserEmailStub = cy.stub().as('getUserEmailFromToken');

// Replace the actual module with our stub
Cypress.on('window:before:load', (win) => {
  cy.stub(win, 'getUserEmailFromToken').callsFake(getUserEmailStub);
});

// We need to mock the TaskCard component since it's a dependency
const mockTaskCard = ({ task, isScheduled }) => {
  return (
    <div data-testid="task-card" className={isScheduled ? 'scheduled' : ''}>
      <h3>{task.title}</h3>
      <p>{task.description}</p>
    </div>
  );
};

describe('ScheduledTasks Component', () => {
  beforeEach(() => {
    // Mock localStorage
    cy.window().then(win => {
      win.localStorage.setItem('token', 'fake-jwt-token');
    });

    // Mock the auth function
    getUserEmailStub.returns('test@example.com');

    // Stub the console methods to prevent cluttering the test output
    cy.window().then(win => {
      cy.stub(win.console, 'log').as('consoleLog');
      cy.stub(win.console, 'error').as('consoleError');
    });

    // Register the mock TaskCard component
    cy.stub(global, 'TaskCard').callsFake(mockTaskCard);
  });

  it('renders loading state initially', () => {
    // Intercept API call but delay the response
    cy.intercept('GET', 'http://localhost:8080/scheduled-tasks/*', {
      delay: 1000,
      statusCode: 200,
      body: { scheduled_tasks: [] }
    }).as('fetchScheduledTasks');

    // Mount the component
    mount(<ScheduledTasks />);

    // Verify loading state is shown
    cy.contains('Loading your scheduled tasks...').should('be.visible');
  });

  it('displays error message when fetch fails', () => {
    // Intercept API call with error
    cy.intercept('GET', 'http://localhost:8080/scheduled-tasks/*', {
      statusCode: 500,
      body: { error: 'Server error' }
    }).as('fetchScheduledTasksError');

    // Mount the component
    mount(<ScheduledTasks />);

    // Verify error message is shown
    cy.wait('@fetchScheduledTasksError');
    cy.contains('Failed to load scheduled tasks').should('be.visible');
  });

  it('displays "no tasks" message when no tasks are returned', () => {
    // Intercept API call with empty response
    cy.intercept('GET', 'http://localhost:8080/scheduled-tasks/*', {
      statusCode: 200,
      body: { scheduled_tasks: [] }
    }).as('fetchEmptyScheduledTasks');

    // Mount the component
    mount(<ScheduledTasks />);

    // Verify empty message is shown
    cy.wait('@fetchEmptyScheduledTasks');
    cy.contains("You don't have any scheduled tasks yet.").should('be.visible');
  });

  it('renders scheduled tasks when data is loaded', () => {
    // Prepare mock data
    const mockScheduledTasks = [
      {
        id: 1,
        title: 'Scheduled Task 1',
        description: 'This is the first scheduled task'
      },
      {
        id: 2,
        title: 'Scheduled Task 2',
        description: 'This is the second scheduled task'
      }
    ];

    // Intercept API call with mock data
    cy.intercept('GET', 'http://localhost:8080/scheduled-tasks/*', {
      statusCode: 200,
      body: { scheduled_tasks: mockScheduledTasks }
    }).as('fetchMockScheduledTasks');

    // Mount the component
    mount(<ScheduledTasks />);

    // Verify tasks are displayed
    cy.wait('@fetchMockScheduledTasks');
    cy.get('[data-testid="task-card"]').should('have.length', 2);
    cy.contains('Scheduled Task 1').should('be.visible');
    cy.contains('Scheduled Task 2').should('be.visible');
  });

  it('passes isScheduled prop to TaskCard component', () => {
    // Prepare mock data
    const mockScheduledTasks = [
      {
        id: 1,
        title: 'Scheduled Task',
        description: 'This is a scheduled task'
      }
    ];

    // Intercept API call with mock data
    cy.intercept('GET', 'http://localhost:8080/scheduled-tasks/*', {
      statusCode: 200,
      body: { scheduled_tasks: mockScheduledTasks }
    }).as('fetchScheduledTask');

    // Mount the component
    mount(<ScheduledTasks />);

    // Verify isScheduled prop is passed
    cy.wait('@fetchScheduledTask');
    cy.get('[data-testid="task-card"]').should('have.class', 'scheduled');
  });

  it('handles tasks with _id property instead of id', () => {
    // Prepare mock data with MongoDB-style _id
    const mockMongoTasks = [
      {
        _id: 'abc123',
        title: 'MongoDB Task',
        description: 'This task has a MongoDB-style _id'
      }
    ];

    // Intercept API call with MongoDB-style data
    cy.intercept('GET', 'http://localhost:8080/scheduled-tasks/*', {
      statusCode: 200,
      body: { scheduled_tasks: mockMongoTasks }
    }).as('fetchMongoTasks');

    // Mount the component
    mount(<ScheduledTasks />);

    // Verify the task is displayed correctly
    cy.wait('@fetchMongoTasks');
    cy.contains('MongoDB Task').should('be.visible');
  });

  it('handles error when user email is not found in token', () => {
    // Mock the auth function to return null
    getUserEmailStub.returns(null);

    // Mount the component
    mount(<ScheduledTasks />);

    // Verify error message is shown
    cy.contains('Failed to load scheduled tasks').should('be.visible');
    cy.contains('User email not found in token').should('be.visible');
  });

  it('logs received tasks to console', () => {
    // Prepare mock data
    const mockTasks = [
      {
        id: 1,
        title: 'Console Log Test',
        description: 'This task should be logged to console'
      }
    ];

    // Intercept API call with mock data
    cy.intercept('GET', 'http://localhost:8080/scheduled-tasks/*', {
      statusCode: 200,
      body: { scheduled_tasks: mockTasks }
    }).as('fetchLogTasks');

    // Mount the component
    mount(<ScheduledTasks />);

    // Verify console.log was called
    cy.wait('@fetchLogTasks');
    cy.get('@consoleLog').should('have.been.calledWith', 'Received scheduled tasks:', { scheduled_tasks: mockTasks });
  });

  it('logs API errors to console', () => {
    // Intercept API call with error
    cy.intercept('GET', 'http://localhost:8080/scheduled-tasks/*', {
      statusCode: 500,
      body: { error: 'API error' }
    }).as('fetchErrorTasks');

    // Mount the component
    mount(<ScheduledTasks />);

    // Verify console.error was called
    cy.wait('@fetchErrorTasks');
    cy.get('@consoleError').should('have.been.called');
  });
});