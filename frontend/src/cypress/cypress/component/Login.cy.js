// cypress/component/Login.cy.js

import React from 'react';
import { mount } from 'cypress/react';
import { BrowserRouter } from 'react-router-dom';
import LoginPage from '../../src/components/Login';

describe('Login Component', () => {
  beforeEach(() => {
    // We won't set up any stubs in beforeEach
  });

  it('renders the login form correctly', () => {
    cy.mount(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );
    
    // Check if form elements are rendered
    cy.get('h2').should('contain', 'Log in');
    cy.get('input[name="email"]').should('be.visible');
    cy.get('input[name="password"]').should('be.visible');
    cy.get('button[type="submit"]').should('be.visible').and('contain', 'Log in');
    cy.get('.forgot-password a').should('be.visible').and('have.attr', 'href', '/reset');
  });

  it('handles form input correctly', () => {
    cy.mount(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );
    
    // Type in form fields
    cy.get('input[name="email"]').type('test@example.com');
    cy.get('input[name="password"]').type('password123');
    
    // Verify input values
    cy.get('input[name="email"]').should('have.value', 'test@example.com');
    cy.get('input[name="password"]').should('have.value', 'password123');
  });

  it('submits the form and calls the API', () => {
    // Set up the spy for this test only
    cy.window().then((win) => {
      cy.spy(win, 'fetch').as('fetchSpy');
    });
    
    cy.mount(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );
    
    // Fill out and submit form
    cy.get('input[name="email"]').type('test@example.com');
    cy.get('input[name="password"]').type('password123');
    cy.get('button[type="submit"]').click();
    
    // Verify fetch was called with correct parameters
    cy.get('@fetchSpy').should('be.calledWith', 'http://localhost:8080/login');
  });

  it('displays error message on authentication failure', () => {
    // Intercept the login request and return an error
    cy.intercept('POST', 'http://localhost:8080/login', {
      statusCode: 401,
      body: { error: 'Invalid email or password' }
    }).as('failedLogin');
    
    cy.mount(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );
    
    // Fill and submit form
    cy.get('input[name="email"]').type('test@example.com');
    cy.get('input[name="password"]').type('wrongpassword');
    cy.get('button[type="submit"]').click();
    
    // Wait for the request to complete
    cy.wait('@failedLogin');
    
    // Check error message
    cy.get('.error').should('be.visible');
    cy.get('.error').should('contain', 'Invalid email or password');
  });

  it('handles form validation correctly', () => {
    cy.mount(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );
    
    // Try to submit without filling required fields
    cy.get('button[type="submit"]').click();
    
    // HTML5 validation should prevent submission
    cy.get('input[name="email"]:invalid').should('exist');
  });
});