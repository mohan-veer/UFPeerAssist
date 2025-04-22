import React from 'react';
import CompletedTasks from '../../src/components/CompletedTasks';
import { mount } from 'cypress/react';
import * as authUtils from '../../src/utils/auth';
import { BrowserRouter } from 'react-router-dom';

// Wrapper component to provide Router context
const withRouter = (component) => <BrowserRouter>{component}</BrowserRouter>;

describe('CompletedTasks Component', () => {
  const mockCompletedTasks = [
    {
      _id: 'task1',
      title: 'Completed Task 1',
      description: 'This is a completed task',
      task_date: '2025-04-20',
      task_time: '14:00',
      estimated_pay_rate: 25,
      place_of_work: 'Remote',
      status: 'Completed'
    },
    {
      _id: 'task2',
      title: 'Completed Task 2',
      description: 'This is another completed task',
      task_date: '2025-04-22',
      task_time: '10:00',
      estimated_pay_rate: 30,
      place_of_work: 'Office',
      status: 'Completed'
    }
  ];

  const mockTasks = [
    ...mockCompletedTasks,
    {
      _id: 'task3',
      title: 'Open Task',
      description: 'This is an open task',
      task_date: '2025-04-25',
      task_time: '09:00',
      estimated_pay_rate: 20,
      place_of_work: 'Remote',
      status: 'Open'
    }
  ];

  beforeEach(() => {
    // Set up localStorage mock
    cy.window().then(win => {
      win.localStorage.setItem('token', 'fake-token');
    });

    // Stub the auth utility
    cy.stub(authUtils, 'getUserEmailFromToken').returns('test@example.com');
    
    // Suppress console errors and logs
    cy.window().then(win => {
      cy.stub(win.console, 'error');
      cy.stub(win.console, 'log');
    });
  });

  it('shows loading state initially', () => {
    // Intercept the exact endpoint with the right pattern
    cy.intercept('GET', '**/users/test@example.com/created-tasks', {
      delay: 500,
      statusCode: 200,
      body: { tasks: mockTasks }
    }).as('getTasks');

    // Mount component with Router wrapper
    mount(withRouter(<CompletedTasks />));

    // Verify loading state is shown
    cy.contains('Loading your completed tasks...').should('be.visible');
    
    // Wait for API call to resolve
    cy.wait('@getTasks', { timeout: 3000 });
    
    // Then verify loading state is gone
    cy.contains('Loading your completed tasks...').should('not.exist');
  });

  it('displays completed tasks correctly', () => {
    // Use the exact endpoint pattern
    cy.intercept('GET', '**/users/test@example.com/created-tasks', {
      statusCode: 200,
      body: { tasks: mockTasks }
    }).as('getTasks');

    // Mount component with Router wrapper
    mount(withRouter(<CompletedTasks />));

    // Wait for API call to resolve
    cy.wait('@getTasks', { timeout: 3000 });

    // Verify loading state is gone
    cy.contains('Loading your completed tasks...').should('not.exist');

    // Verify completed tasks are displayed
    cy.contains('Completed Task 1').should('be.visible');
    cy.contains('Completed Task 2').should('be.visible');
    
    // Verify open tasks are not displayed
    cy.contains('Open Task').should('not.exist');

    // Verify completed badges
    cy.get('.completed-badge').should('have.length', 2);
    cy.contains('✓ Completed').should('be.visible');
  });

  it('displays "no tasks" message when no completed tasks are available', () => {
    // Use the exact endpoint pattern with only open tasks
    cy.intercept('GET', '**/users/test@example.com/created-tasks', {
      statusCode: 200,
      body: { tasks: [
        {
          _id: 'task3',
          title: 'Open Task',
          description: 'This is an open task',
          status: 'Open'
        }
      ]}
    }).as('getTasks');

    // Mount component with Router wrapper
    mount(withRouter(<CompletedTasks />));

    // Wait for API call to resolve
    cy.wait('@getTasks', { timeout: 3000 });

    // Verify loading state is gone
    cy.contains('Loading your completed tasks...').should('not.exist');

    // Verify "no tasks" message is shown
    cy.contains("You don't have any completed tasks yet.").should('be.visible');
  });

  it('displays error message when API request fails', () => {
    // Use the exact endpoint pattern with error status
    cy.intercept('GET', '**/users/test@example.com/created-tasks', {
      statusCode: 500,
      body: 'Internal Server Error'
    }).as('getTasksError');

    // Mount component with Router wrapper
    mount(withRouter(<CompletedTasks />));

    // Wait for API call to resolve
    cy.wait('@getTasksError', { timeout: 3000 });

    // Verify error message is shown
    cy.contains('Failed to load completed tasks').should('be.visible');
    cy.contains('HTTP error! status: 500').should('be.visible');
  });

  it('displays error message when user email is not found', () => {
    // Unstub and restub the auth utility to return null
    cy.stub(authUtils, 'getUserEmailFromToken').returns(null);

    // Mount component with Router wrapper
    mount(withRouter(<CompletedTasks />));

    // No need to wait for API call as it should error immediately
    
    // Verify error message is shown
    cy.contains('Failed to load completed tasks').should('be.visible');
    cy.contains('User email not found in token').should('be.visible');
  });
});