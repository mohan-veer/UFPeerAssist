// cypress/component/AppliedTasks.cy.js

import React from 'react';
import { mount } from 'cypress/react';
import { BrowserRouter } from 'react-router-dom';
import AppliedTasks from '../../src/components/AppliedTasks';

describe('AppliedTasks Component', () => {
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
    });
    
    // Intercept API call
    cy.intercept('GET', 'http://localhost:8080/appliedtasks/*', {
      statusCode: 200,
      body: { applied_tasks: [] }
    }).as('fetchAppliedTasks');
  });

  it('renders loading state initially', () => {
    // Delay the API response to see loading state
    cy.intercept('GET', 'http://localhost:8080/appliedtasks/*', {
      statusCode: 200,
      body: { applied_tasks: [] },
      delay: 500
    }).as('delayedFetch');
    
    // Mount the component
    cy.mount(
      <BrowserRouter>
        <AppliedTasks />
      </BrowserRouter>
    );
    
    // Verify loading state is shown
    cy.contains('Loading your applied tasks...').should('be.visible');
  });

  it('displays "no tasks" message when no tasks are returned', () => {
    // Mount the component
    cy.mount(
      <BrowserRouter>
        <AppliedTasks />
      </BrowserRouter>
    );
    
    // Wait for API call
    cy.wait('@fetchAppliedTasks');
    
    // Verify empty state message
    cy.contains("You haven't applied for any tasks yet.").should('be.visible');
  });

  it('displays applied tasks when data is loaded', () => {
    // Override the interceptor with mock data
    cy.intercept('GET', 'http://localhost:8080/appliedtasks/*', {
      statusCode: 200,
      body: {
        applied_tasks: [
          {
            task: {
              id: 1,
              title: 'Test Applied Task',
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
        ]
      }
    }).as('fetchWithData');
    
    // Mount the component
    cy.mount(
      <BrowserRouter>
        <AppliedTasks />
      </BrowserRouter>
    );
    
    // Wait for API call
    cy.wait('@fetchWithData');
    
    // Verify task data is displayed
    cy.contains('Test Applied Task').should('be.visible');
    cy.contains('This is a test task').should('be.visible');
    cy.contains('Remote').should('be.visible');
    cy.contains('$25/hr').should('be.visible');
    cy.contains('John Doe').should('be.visible');
  });

  it('shows pending status for non-selected tasks', () => {
    // Override the interceptor with non-selected task
    cy.intercept('GET', 'http://localhost:8080/appliedtasks/*', {
      statusCode: 200,
      body: {
        applied_tasks: [
          {
            task: {
              id: 1,
              title: 'Pending Task',
              description: 'This is a pending task',
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
        ]
      }
    }).as('fetchPendingTask');
    
    // Mount the component
    cy.mount(
      <BrowserRouter>
        <AppliedTasks />
      </BrowserRouter>
    );
    
    // Wait for API call
    cy.wait('@fetchPendingTask');
    
    // Verify pending status
    cy.contains('Pending').should('be.visible');
    cy.contains('Your application is awaiting review.').should('be.visible');
  });

  it('shows selected status for selected tasks', () => {
    // Override the interceptor with selected task
    cy.intercept('GET', 'http://localhost:8080/appliedtasks/*', {
      statusCode: 200,
      body: {
        applied_tasks: [
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
        ]
      }
    }).as('fetchSelectedTask');
    
    // Mount the component
    cy.mount(
      <BrowserRouter>
        <AppliedTasks />
      </BrowserRouter>
    );
    
    // Wait for API call
    cy.wait('@fetchSelectedTask');
    
    // Verify selected status
    cy.contains('✓ Selected').should('be.visible');
    cy.contains('You have been selected for this task!').should('be.visible');
  });

  it('handles error when API request fails', () => {
    // Override the interceptor with error
    cy.intercept('GET', 'http://localhost:8080/appliedtasks/*', {
      statusCode: 500,
      body: { error: 'Internal server error' }
    }).as('fetchError');
    
    // Mount the component
    cy.mount(
      <BrowserRouter>
        <AppliedTasks />
      </BrowserRouter>
    );
    
    // Wait for API call
    cy.wait('@fetchError');
    
    // Verify error message
    cy.contains('Failed to load applied tasks').should('be.visible');
  });
});