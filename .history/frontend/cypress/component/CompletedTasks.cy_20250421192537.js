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
    
    // Important: Use very wide intercept to catch all possible endpoint variations
    cy.intercept('GET', '**', req => {
      // Log the request for debugging
      console.log('Intercepted request:', req.url);
      
      // Check if this request is for our API endpoint
      if (req.url.includes('/users/') && req.url.includes('/created-tasks')) {
        req.alias = 'getTasks';
        req.reply({
          statusCode: 200,
          body: { tasks: mockTasks }
        });
      }
    });
  });

  it('renders without crashing', () => {
    // Simple test - just make sure it renders
    mount(withRouter(<CompletedTasks />));
    
    // Check that the header renders
    cy.contains('Completed Tasks').should('exist');
  });

  it('shows loading state initially and then displays tasks', () => {
    // Mount component with Router wrapper
    mount(withRouter(<CompletedTasks />));

    // Verify loading state is shown
    cy.contains('Loading your completed tasks...').should('be.visible');
    
    // Wait for loading to go away (instead of waiting for API)
    cy.contains('Loading your completed tasks...').should('not.exist', { timeout: 5000 });

    // Verify completed tasks are displayed
    cy.contains('Completed Task 1').should('be.visible');
    cy.contains('Completed Task 2').should('be.visible');
    
    // Verify open tasks are not displayed
    cy.contains('Open Task').should('not.exist');
  });

  it('displays "no tasks" message when no completed tasks are available', () => {
    // Setup intercept for this specific test
    cy.intercept('GET', '**', req => {
      if (req.url.includes('/users/') && req.url.includes('/created-tasks')) {
        req.reply({
          statusCode: 200,
          body: { tasks: [
            {
              _id: 'task3',
              title: 'Open Task',
              description: 'This is an open task',
              status: 'Open'
            }
          ]}
        });
      }
    }).as('getOpenTasksOnly');

    // Mount component with Router wrapper
    mount(withRouter(<CompletedTasks />));

    // Wait for loading to go away
    cy.contains('Loading your completed tasks...').should('not.exist', { timeout: 5000 });

    // Verify "no tasks" message is shown
    cy.contains("You don't have any completed tasks yet.").should('be.visible');
  });

  it('displays error message when user email is not found', () => {
    // Unstub and restub the auth utility to return null
    cy.stub(authUtils, 'getUserEmailFromToken').returns(null);

    // Mount component with Router wrapper
    mount(withRouter(<CompletedTasks />));
    
    // Verify error message is shown
    cy.contains('Failed to load completed tasks').should('be.visible');
    cy.contains('User email not found in token').should('be.visible');
  });
});