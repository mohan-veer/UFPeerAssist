// cypress/component/TaskFeed.cy.js

import React from 'react';
import { mount } from 'cypress/react';
import TaskFeed from '../../src/components/TaskFeed';

describe('TaskFeed Component', () => {
  beforeEach(() => {
    // Mock tasks data
    const mockTasks = [
      {
        id: '1',
        title: 'Math Tutoring Help',
        description: 'Need help with Calculus homework',
        task_date: '2025-04-15',
        task_time: '14:00',
        estimated_pay_rate: 20,
        place_of_work: 'Library West',
        work_type: 'Tutoring',
        people_needed: 1,
        creator_email: 'creator@example.com',
        views: 15,
        applicants: []
      },
      {
        id: '2',
        title: 'Help Moving Furniture',
        description: 'Need help moving furniture to new apartment',
        task_date: '2025-04-20',
        task_time: '10:00',
        estimated_pay_rate: 25,
        place_of_work: 'Gainesville Place Apartments',
        work_type: 'HouseShifting',
        people_needed: 2,
        creator_email: 'creator@example.com',
        views: 8,
        applicants: []
      }
    ];
    
    // Create a valid-looking JWT token with an email embedded
    const createFakeJWT = (email) => {
      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const payload = btoa(JSON.stringify({ email }));
      const signature = btoa('fake-signature');
      return `${header}.${payload}.${signature}`;
    };

    // Set token in localStorage
    cy.window().then((win) => {
      win.localStorage.setItem('token', createFakeJWT('test@example.com'));
    });
    
    // Intercept API calls
    cy.intercept('GET', '**/tasks/feed/**', {
      statusCode: 200,
      body: { tasks: mockTasks }
    }).as('fetchTasks');
  });

  it('renders the task feed with tasks', () => {
    cy.mount(<TaskFeed />);
    
    // Wait for tasks to load
    cy.wait('@fetchTasks');
    
    // Check title
    cy.get('h2').should('contain', 'Available Tasks');
    
    // Check if filter controls are visible
    cy.get('.filter-controls').should('be.visible');
    
    // Check if tasks are rendered
    cy.get('.task-card').should('have.length', 2);
    
    // Check first task details
    cy.get('.task-card').first().within(() => {
      cy.get('h3').should('contain', 'Math Tutoring Help');
      cy.get('.task-category').should('contain', 'Tutoring');
    });
  });

  it('displays loading state correctly', () => {
    // Override the intercept to delay the response
    cy.intercept('GET', '**/tasks/feed/**', {
      statusCode: 200,
      body: { tasks: [] },
      delay: 500
    }).as('slowFetchTasks');
    
    cy.mount(<TaskFeed />);
    
    // Loading state should be visible
    cy.get('.loading-container').should('be.visible');
    cy.get('.loading-container').should('contain', 'Loading tasks...');
    
    // Wait for the API call to complete
    cy.wait('@slowFetchTasks');
    
    // Loading should disappear
    cy.get('.loading-container').should('not.exist');
  });

  it('handles filter changes', () => {
    cy.mount(<TaskFeed />);
    
    // Wait for initial tasks to load
    cy.wait('@fetchTasks');
    
    // Set up a new intercept for filtered requests
    cy.intercept('GET', '**/tasks/feed/**', {
      statusCode: 200,
      body: { 
        tasks: [
          {
            id: '1',
            title: 'Math Tutoring Help',
            description: 'Need help with Calculus homework',
            task_date: '2025-04-15',
            task_time: '14:00',
            estimated_pay_rate: 20,
            place_of_work: 'Library West',
            work_type: 'Tutoring',
            people_needed: 1,
            creator_email: 'creator@example.com',
            views: 15,
            applicants: []
          }
        ] 
      }
    }).as('filteredTasks');
    
    // Change category filter
    cy.get('select[name="category"]').select('Tutoring');
    
    // Wait for filtered results
    cy.wait('@filteredTasks');
    
    // Verify filtered results
    cy.get('.task-card').should('have.length', 1);
    cy.get('.task-card').first().should('contain', 'Tutoring');
  });

  it('handles empty task list', () => {
    // Override the intercept to return empty tasks
    cy.intercept('GET', '**/tasks/feed/**', {
      statusCode: 200,
      body: { tasks: [] }
    }).as('emptyTasks');
    
    cy.mount(<TaskFeed />);
    
    // Wait for the API call
    cy.wait('@emptyTasks');
    
    // Check if no tasks message is displayed
    cy.get('.no-tasks-message').should('be.visible');
    cy.get('.no-tasks-message').should('contain', 'No tasks available');
  });

  it('handles fetch errors', () => {
    // Make the fetch return an error
    cy.intercept('GET', '**/tasks/feed/**', {
      statusCode: 500,
      body: { error: 'Server error' }
    }).as('failedFetch');
    
    cy.mount(<TaskFeed />);
    
    // Wait for the API call
    cy.wait('@failedFetch');
    
    // Error message should be visible
    cy.get('.error-message').should('be.visible');
    cy.get('.error-message').should('contain', 'Failed to load tasks');
  });
});