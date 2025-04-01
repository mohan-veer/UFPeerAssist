// cypress/component/TaskCard.cy.js

import React from 'react';
import { mount } from 'cypress/react';
import TaskCard from '../../src/components/TaskCard';

describe('TaskCard Component', () => {
  let mockTask;
  
  beforeEach(() => {
    // Setup mock task data
    mockTask = {
      id: '123',
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
    };
    
    // Create a valid-looking JWT token with an email embedded
    const createFakeJWT = (email) => {
      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const payload = btoa(JSON.stringify({ email }));
      const signature = btoa('fake-signature');
      return `${header}.${payload}.${signature}`;
    };

    // Set up token and mock API responses
    cy.window().then((win) => {
      win.localStorage.setItem('token', createFakeJWT('test@example.com'));
    });

    // Intercept API calls for task application
    cy.intercept('POST', 'http://localhost:8080/tasks/*/apply/*', {
      statusCode: 200,
      body: { success: true }
    }).as('applyTask');
  });

  it('renders task details correctly', () => {
    cy.mount(<TaskCard task={mockTask} />);
    
    // Check task title and category
    cy.get('.task-header h3').should('contain', mockTask.title);
    cy.get('.task-category').should('contain', mockTask.work_type);
    
    // Check task description
    cy.get('.task-description').should('contain', mockTask.description);
    
    // Check task details - more flexible approach for date
    cy.get('.detail-item').eq(0).should('contain', 'Date:');
    cy.get('.detail-item').eq(0).find('.detail-value').should('not.be.empty');
    
    // Check other details with exact matches
    cy.get('.detail-item').eq(1).find('.detail-value').should('contain', mockTask.task_time);
    cy.get('.detail-item').eq(2).find('.detail-value').should('contain', `$${mockTask.estimated_pay_rate}/hr`);
    cy.get('.detail-item').eq(3).find('.detail-value').should('contain', mockTask.place_of_work);
    cy.get('.detail-item').eq(4).find('.detail-value').should('contain', mockTask.people_needed);
    cy.get('.detail-item').eq(5).find('.detail-value').should('contain', mockTask.creator_email);
    
    // Check task stats
    cy.get('.views-count').should('contain', `${mockTask.views} views`);
    cy.get('.applicants-count').should('contain', '0 applicants');
    
    // Check apply button
    cy.get('.apply-button').should('be.visible').and('contain', 'Apply for Task');
  });

  it('handles apply action correctly', () => {
    // Make the mock API response more explicit
    cy.intercept('POST', 'http://localhost:8080/tasks/*/apply/*', {
      statusCode: 200,
      body: { success: true, message: "Successfully applied" }
    }).as('applyTask');
    
    cy.mount(<TaskCard task={mockTask} />);
    
    // Verify initial state
    cy.get('.apply-button').should('be.visible').contains('Apply for Task');
    
    // Click apply button and add some wait time
    cy.get('.apply-button').click();
    
    // Wait for the API call to complete
    cy.wait('@applyTask');
    
    // Add a small delay to allow component to update
    cy.wait(500);
    
    // Log the current HTML to debug
    cy.document().then(doc => {
      console.log('Current HTML after apply:', doc.body.innerHTML);
    });
    
    // Try a more specific or alternative selector
    cy.get('button').contains('Applied Successfully').should('exist');
    
    // Or try a more general approach
    cy.contains('Applied Successfully').should('be.visible');
    
    // Then check if it has the disabled property
    cy.contains('Applied Successfully').should('be.disabled');
  });

  it('handles application error correctly', () => {
    // Override the intercept for this test
    cy.intercept('POST', 'http://localhost:8080/tasks/*/apply/*', {
      statusCode: 400,
      body: { error: 'You have already applied to this task' }
    }).as('failedApply');
    
    cy.mount(<TaskCard task={mockTask} />);
    
    // Click apply button
    cy.get('.apply-button').click();
    
    // Wait for the API call
    cy.wait('@failedApply');
    
    // Error message should be visible
    cy.get('.error-message').should('be.visible');
    cy.get('.error-message').should('contain', 'You have already applied to this task');
  });

  it('displays different button after clicking Apply', () => {
    // Mock the API call for applying to a task
    cy.intercept('POST', 'http://localhost:8080/tasks/*/apply/*', {
      statusCode: 200,
      body: { success: true }
    }).as('applyTask');
    
    // Create a JWT token for authentication
    const createFakeJWT = (email) => {
      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const payload = btoa(JSON.stringify({ email }));
      const signature = btoa('fake-signature');
      return `${header}.${payload}.${signature}`;
    };
  
    // Set up token
    cy.window().then((win) => {
      win.localStorage.setItem('token', createFakeJWT('test@example.com'));
    });
    
    // Mount component with a task that the user hasn't applied to yet
    cy.mount(<TaskCard task={mockTask} />);
    
    // Verify the initial apply button is visible
    cy.get('.apply-button').should('be.visible').contains('Apply for Task');
    
    // Click the apply button
    cy.get('.apply-button').click();
    
    // Wait for the API call to complete
    cy.wait('@applyTask');
    
    // Now the button should change to "Applied Successfully"
    cy.contains('Applied Successfully', { timeout: 10000 }).should('be.visible');
  });
});