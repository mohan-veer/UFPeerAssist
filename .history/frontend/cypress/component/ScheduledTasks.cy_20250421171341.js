// cypress/component/ScheduledTasks.cy.js

import React from 'react';
import { mount } from 'cypress/react';
import { BrowserRouter } from 'react-router-dom';
import ScheduledTasks from '../../src/components/ScheduledTasks';

// For component tests, let's avoid stubbing the TaskCard and focus on testing ScheduledTasks

describe('ScheduledTasks Component', () => {
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
      
      // Mock console methods - this should work as these exist on window
      cy.stub(win.console, 'log').as('consoleLog');
      cy.stub(win.console, 'error').as('consoleError');
    });
    
    // Intercept API call with empty data
    cy.intercept('GET', 'http://localhost:8080/scheduled-tasks/*', {
      statusCode: 200,
      body: { scheduled_tasks: [] }
    }).as('fetchScheduledTasks');
  });

  it('renders loading state initially', () => {
    // Delay the API response to see loading state
    cy.intercept('GET', 'http://localhost:8080/scheduled-tasks/*', {
      statusCode: 200,
      body: { scheduled_tasks: [] },
      delay: 500
    }).as('delayedFetch');
    
    // Mount the component
    cy.mount(
      <BrowserRouter>
        <ScheduledTasks />
      </BrowserRouter>
    );
    
    // Verify loading state is shown
    cy.contains('Loading your scheduled tasks...').should('be.visible');
  });

  it('displays "no tasks" message when no tasks are returned', () => {
    // Mount the component
    cy.mount(
      <BrowserRouter>
        <ScheduledTasks />
      </BrowserRouter>
    );
    
    // Wait for API call
    cy.wait('@fetchScheduledTasks');
    
    // Verify empty state message
    cy.contains("You don't have any scheduled tasks yet.").should('be.visible');
  });

  it('renders scheduled tasks correctly when data is loaded', () => {
    // Mock scheduled tasks data
    const mockScheduledTasks = [
      {
        id: 1,
        title: 'Task 1',
        description: 'Description for Task 1',
        task_date: '2025-04-20',
        task_time: '14:00',
        estimated_pay_rate: 25,
        place_of_work: 'Remote',
        status: 'Scheduled'
      },
      {
        id: 2,
        title: 'Task 2',
        description: 'Description for Task 2',
        task_date: '2025-04-21',
        task_time: '10:00',
        estimated_pay_rate: 30,
        place_of_work: 'Office',
        status: 'Scheduled'
      }
    ];

    // Override the interceptor with mock data
    cy.intercept('GET', 'http://localhost:8080/scheduled-tasks/*', {
      statusCode: 200,
      body: { scheduled_tasks: mockScheduledTasks }
    }).as('fetchWithData');
    
    // Mount the component
    cy.mount(
      <BrowserRouter>
        <ScheduledTasks />
      </BrowserRouter>
    );
    
    // Wait for API call
    cy.wait('@fetchWithData');
    
    // Verify tasks are rendered - look for task titles in the DOM
    // This test might need adjustment based on how TaskCard renders the title
    cy.contains('Task 1').should('exist');
    cy.contains('Task 2').should('exist');
  });

  it('logs received tasks to console', () => {
    // Mock scheduled tasks data
    const mockScheduledTasks = [
      {
        id: 1,
        title: 'Console Log Test Task',
        description: 'This task should be logged to console',
        task_date: '2025-04-20',
        task_time: '14:00',
        estimated_pay_rate: 25,
        place_of_work: 'Remote',
        status: 'Scheduled'
      }
    ];

    // Override the interceptor with mock data
    cy.intercept('GET', 'http://localhost:8080/scheduled-tasks/*', {
      statusCode: 200,
      body: { scheduled_tasks: mockScheduledTasks }
    }).as('fetchLogTask');
    
    // Mount the component
    cy.mount(
      <BrowserRouter>
        <ScheduledTasks />
      </BrowserRouter>
    );
    
    // Wait for API call
    cy.wait('@fetchLogTask');
    
    // Verify console.log was called
    cy.get('@consoleLog').should('be.calledWith', 'Received scheduled tasks:', { scheduled_tasks: mockScheduledTasks });
  });

  it('handles tasks with MongoDB-style _id', () => {
    // Mock tasks with MongoDB-style IDs
    const mockMongoTasks = [
      {
        _id: 'abc123',
        title: 'MongoDB-style Task',
        description: 'This task has MongoDB-style _id',
        task_date: '2025-04-20',
        task_time: '14:00',
        estimated_pay_rate: 25,
        place_of_work: 'Remote',
        status: 'Scheduled'
      }
    ];

    // Override the interceptor with mock data
    cy.intercept('GET', 'http://localhost:8080/scheduled-tasks/*', {
      statusCode: 200,
      body: { scheduled_tasks: mockMongoTasks }
    }).as('fetchMongoTask');
    
    // Mount the component
    cy.mount(
      <BrowserRouter>
        <ScheduledTasks />
      </BrowserRouter>
    );
    
    // Wait for API call
    cy.wait('@fetchMongoTask');
    
    // Verify task is rendered
    cy.contains('MongoDB-style Task').should('exist');
  });

  it('handles error when API request fails', () => {
    // Override the interceptor with error
    cy.intercept('GET', 'http://localhost:8080/scheduled-tasks/*', {
      statusCode: 500,
      body: { error: 'Internal server error' }
    }).as('fetchError');
    
    // Mount the component
    cy.mount(
      <BrowserRouter>
        <ScheduledTasks />
      </BrowserRouter>
    );
    
    // Wait for API call
    cy.wait('@fetchError');
    
    // Verify error message
    cy.contains('Failed to load scheduled tasks').should('be.visible');
    
    // Verify console.error was called
    cy.get('@consoleError').should('be.called');
  });
});