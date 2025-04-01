// cypress/component/Register.cy.js
import React from 'react'; // Add this back
import { mount } from 'cypress/react';
import { BrowserRouter } from 'react-router-dom';
import RegisterForm from '../../src/components/Register';

describe('Register Component', () => {
    beforeEach(() => {
        // Intercept API calls
        cy.intercept('POST', 'http://localhost:8080/signup', {
          statusCode: 200,
          body: { success: true }
        }).as('registerRequest');
      });
    
      it('renders the registration form correctly', () => {
        cy.mount(
          <BrowserRouter>
            <RegisterForm />
          </BrowserRouter>
        );
        
        // Check form title
        cy.get('h2').should('contain', 'Create New Account');
        
        // Check if all form fields are present
        cy.get('input[name="name"]').should('be.visible');
        cy.get('input[name="email"]').should('be.visible');
        cy.get('input[name="mobile"]').should('be.visible');
        cy.get('input[name="password"]').should('be.visible');
        
        // Check submit button
        cy.get('button[type="submit"]').should('be.visible');
        cy.get('button[type="submit"]').should('contain', 'Create Account');
      });
  it('handles form input correctly', () => {
    cy.mount(
      <BrowserRouter>
        <RegisterForm />
      </BrowserRouter>
    );
    
    // Fill in the form
    cy.get('input[name="name"]').type('John Doe');
    cy.get('input[name="email"]').type('john.doe@example.com');
    cy.get('input[name="mobile"]').type('1234567890');
    cy.get('input[name="password"]').type('Password123');
    
    // Verify input values
    cy.get('input[name="name"]').should('have.value', 'John Doe');
    cy.get('input[name="email"]').should('have.value', 'john.doe@example.com');
    cy.get('input[name="mobile"]').should('have.value', '1234567890');
    cy.get('input[name="password"]').should('have.value', 'Password123');
  });

  it('submits the form and calls the API', () => {
    cy.mount(
      <BrowserRouter>
        <RegisterForm />
      </BrowserRouter>
    );
    
    // Fill in the form
    cy.get('input[name="name"]').type('John Doe');
    cy.get('input[name="email"]').type('john.doe@example.com');
    cy.get('input[name="mobile"]').type('1234567890');
    cy.get('input[name="password"]').type('Password123');
    
    // Submit the form
    cy.get('button[type="submit"]').click();
    
    // Wait for the API call
    cy.wait('@registerRequest').its('request.body').should('deep.equal', {
      name: 'John Doe',
      email: 'john.doe@example.com',
      mobile: '1234567890',
      password: 'Password123'
    });
  });

  it('shows success message after successful registration', () => {
    cy.mount(
      <BrowserRouter>
        <RegisterForm />
      </BrowserRouter>
    );
    
    // Fill in the form
    cy.get('input[name="name"]').type('John Doe');
    cy.get('input[name="email"]').type('john.doe@example.com');
    cy.get('input[name="mobile"]').type('1234567890');
    cy.get('input[name="password"]').type('Password123');
    
    // Submit the form
    cy.get('button[type="submit"]').click();
    
    // Verify success message
    cy.get('.success').should('be.visible');
    cy.get('.success').should('contain', 'Registration successful');
  });

  it('shows error message on registration failure', () => {
    // Override the intercept for this test
    cy.intercept('POST', 'http://localhost:8080/signup', {
      statusCode: 400,
      body: { error: 'Email already exists' }
    }).as('failedRegister');
    
    cy.mount(
      <BrowserRouter>
        <RegisterForm />
      </BrowserRouter>
    );
    
    // Fill in the form
    cy.get('input[name="name"]').type('John Doe');
    cy.get('input[name="email"]').type('existing@example.com');
    cy.get('input[name="mobile"]').type('1234567890');
    cy.get('input[name="password"]').type('Password123');
    
    // Submit the form
    cy.get('button[type="submit"]').click();
    
    // Wait for the API call
    cy.wait('@failedRegister');
    
    // Verify error message
    cy.get('.error').should('be.visible');
    cy.get('.error').should('contain', 'Email already exists');
  });
});