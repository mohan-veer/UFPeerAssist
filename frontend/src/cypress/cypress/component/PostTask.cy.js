// cypress/component/PostTask.cy.js

import React from 'react';
import { mount } from 'cypress/react';
import { BrowserRouter } from 'react-router-dom';
import PostTask from '../../src/components/PostTask';

// Instead of trying to mock the DashboardHeader with Jest, we can use Cypress's stub

describe('PostTask Component', () => {
  beforeEach(() => {
    // Instead of mocking useNavigate and isAuthenticated directly,
    // we'll use interceptors and localStorage for authentication simulation
    cy.intercept('POST', 'http://localhost:8080/users/*/post_task', {
      statusCode: 200,
      body: { success: true }
    }).as('postTaskRequest');
    
    // Set a token in localStorage to simulate authentication
    cy.window().then((win) => {
      win.localStorage.setItem('token', 'fake-jwt-token');
    });
  });

  it('renders the post task form correctly', () => {
    cy.mount(
      <BrowserRouter>
        <PostTask />
      </BrowserRouter>
    );
    
    // Check form title (adjust selector if needed based on your actual component)
    cy.contains('Post a New Task').should('be.visible');
    
    // Check if all form fields are present
    cy.get('input[name="title"]').should('be.visible');
    cy.get('textarea[name="description"]').should('be.visible');
    cy.get('input[name="task_date"]').should('be.visible');
    cy.get('input[name="task_time"]').should('be.visible');
    cy.get('input[name="estimated_pay_rate"]').should('be.visible');
    cy.get('input[name="place_of_work"]').should('be.visible');
    cy.get('select[name="work_type"]').should('be.visible');
    cy.get('input[name="people_needed"]').should('be.visible');
    
    // Check submit button
    cy.get('.submit-button').should('be.visible').and('contain', 'Post Task');
  });

  it('handles form input correctly', () => {
    cy.mount(
      <BrowserRouter>
        <PostTask />
      </BrowserRouter>
    );
    
    // Fill in the form
    cy.get('input[name="title"]').type('Need Help with JavaScript');
    cy.get('textarea[name="description"]').type('Looking for someone to help with React project');
    cy.get('input[name="task_date"]').type('2025-05-01');
    cy.get('input[name="task_time"]').type('15:30');
    cy.get('input[name="estimated_pay_rate"]').clear().type('25');
    cy.get('input[name="place_of_work"]').type('Reitz Union');
    cy.get('select[name="work_type"]').select('ComputerHelp');
    cy.get('input[name="people_needed"]').clear().type('1');
    
    // Verify input values
    cy.get('input[name="title"]').should('have.value', 'Need Help with JavaScript');
    cy.get('textarea[name="description"]').should('have.value', 'Looking for someone to help with React project');
    cy.get('input[name="task_date"]').should('have.value', '2025-05-01');
    cy.get('input[name="task_time"]').should('have.value', '15:30');
    cy.get('input[name="estimated_pay_rate"]').should('have.value', '25');
    cy.get('input[name="place_of_work"]').should('have.value', 'Reitz Union');
    cy.get('select[name="work_type"]').should('have.value', 'ComputerHelp');
    cy.get('input[name="people_needed"]').should('have.value', '1');
  });

  it('submits the form and calls the API', () => {
    // Create a valid-looking JWT token with an email embedded
    const createFakeJWT = (email) => {
      // This creates a simple fake JWT with the structure your decode function expects
      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const payload = btoa(JSON.stringify({ email }));
      const signature = btoa('fake-signature');
      return `${header}.${payload}.${signature}`;
    };
  
    // Set up a valid-looking token before mounting
    cy.window().then((win) => {
      // Set a token that your getUserEmailFromToken can extract an email from
      win.localStorage.setItem('token', createFakeJWT('test@example.com'));
    });
    
    // Now mount the component
    cy.mount(
      <BrowserRouter>
        <PostTask />
      </BrowserRouter>
    );
    
    // The error should not appear
    cy.contains('Unable to identify user').should('not.exist');
    
    // Fill minimum required fields
    cy.get('input[name="title"]').type('Test Task');
    cy.get('textarea[name="description"]').type('Test Description');
    cy.get('input[name="task_date"]').type('2025-05-01');
    cy.get('input[name="task_time"]').type('15:30');
    cy.get('input[name="estimated_pay_rate"]').clear().type('20');
    cy.get('input[name="place_of_work"]').type('Test Location');
    
    // The button should now be enabled
    cy.get('.submit-button').should('not.be.disabled').click();
    
    // Wait for the API call
    cy.wait('@postTaskRequest');
  });

  it('shows success message after successful submission', () => {
    // Create a valid-looking JWT token with an email embedded
    const createFakeJWT = (email) => {
      // This creates a simple fake JWT with the structure your decode function expects
      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const payload = btoa(JSON.stringify({ email }));
      const signature = btoa('fake-signature');
      return `${header}.${payload}.${signature}`;
    };
  
    // Set up a valid-looking token before mounting
    cy.window().then((win) => {
      // Set a token that your getUserEmailFromToken can extract an email from
      win.localStorage.setItem('token', createFakeJWT('test@example.com'));
    });
    
    cy.mount(
      <BrowserRouter>
        <PostTask />
      </BrowserRouter>
    );
    
    // The error should not appear
    cy.contains('Unable to identify user').should('not.exist');
    
    // Fill minimum required fields
    cy.get('input[name="title"]').type('Test Task');
    cy.get('textarea[name="description"]').type('Test Description');
    cy.get('input[name="task_date"]').type('2025-05-01');
    cy.get('input[name="task_time"]').type('15:30');
    cy.get('input[name="estimated_pay_rate"]').clear().type('20');
    cy.get('input[name="place_of_work"]').type('Test Location');
    
    // Submit the form
    cy.get('.submit-button').should('not.be.disabled').click();
    
    // Wait for the API call
    cy.wait('@postTaskRequest');
    
    // Verify success message
    cy.get('.success-message').should('be.visible');
    cy.get('.success-message').should('contain', 'Task posted successfully');
  });

  it('shows error message on submission failure', () => {
    // Override the intercept for this test
    cy.intercept('POST', 'http://localhost:8080/users/*/post_task', {
      statusCode: 400,
      body: { error: 'Failed to create task' }
    }).as('failedPostTask');
    
    // Create a valid-looking JWT token with an email embedded
    const createFakeJWT = (email) => {
      // This creates a simple fake JWT with the structure your decode function expects
      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const payload = btoa(JSON.stringify({ email }));
      const signature = btoa('fake-signature');
      return `${header}.${payload}.${signature}`;
    };
  
    // Set up a valid-looking token before mounting
    cy.window().then((win) => {
      // Set a token that your getUserEmailFromToken can extract an email from
      win.localStorage.setItem('token', createFakeJWT('test@example.com'));
    });
    
    cy.mount(
      <BrowserRouter>
        <PostTask />
      </BrowserRouter>
    );
    
    // The error should not appear
    cy.contains('Unable to identify user').should('not.exist');
    
    // Fill minimum required fields
    cy.get('input[name="title"]').type('Test Task');
    cy.get('textarea[name="description"]').type('Test Description');
    cy.get('input[name="task_date"]').type('2025-05-01');
    cy.get('input[name="task_time"]').type('15:30');
    cy.get('input[name="estimated_pay_rate"]').clear().type('20');
    cy.get('input[name="place_of_work"]').type('Test Location');
    
    // Submit the form
    cy.get('.submit-button').should('not.be.disabled').click();
    
    // Wait for the API call
    cy.wait('@failedPostTask');
    
    // Verify error message
    cy.get('.error-message').should('be.visible');
    cy.get('.error-message').should('contain', 'Failed to create task');
  });
});