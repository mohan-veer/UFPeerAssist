import React from 'react';
import TaskCompletionForm from '../../src/components/TaskCompletionForm';
import { mount } from 'cypress/react';

describe('TaskCompletionForm Component', () => {
  const mockTaskId = 'task123';
  const mockOwnerEmail = 'owner@example.com';

  beforeEach(() => {
    // Set up localStorage mock
    cy.window().then(win => {
      win.localStorage.setItem('token', 'fake-token');
    });
  });

  it('renders form elements correctly', () => {
    mount(<TaskCompletionForm taskId={mockTaskId} ownerEmail={mockOwnerEmail} />);

    // Check for form elements
    cy.contains('Verify Task Completion').should('be.visible');
    cy.contains('Enter the verification code:').should('be.visible');
    cy.get('input[type="text"]').should('be.visible');
    cy.contains('Complete Task').should('be.visible');
    cy.contains('The task owner should have received this code via email.').should('be.visible');
  });

  it('disables submit button when OTP is empty', () => {
    mount(<TaskCompletionForm taskId={mockTaskId} ownerEmail={mockOwnerEmail} />);

    // Submit button should be disabled initially
    cy.contains('button', 'Complete Task').should('be.disabled');

    // Enter OTP and check button state
    cy.get('input[type="text"]').type('123456');
    cy.contains('button', 'Complete Task').should('not.be.disabled');

    // Clear OTP and check button state again
    cy.get('input[type="text"]').clear();
    cy.contains('button', 'Complete Task').should('be.disabled');
  });

  it('shows loading state during submission', () => {
    // Intercept API call and delay response
    cy.intercept('POST', '**/validate-task-completion', {
      delay: 300,
      statusCode: 200,
      body: { message: 'Success' }
    }).as('verifyTask');

    mount(<TaskCompletionForm taskId={mockTaskId} ownerEmail={mockOwnerEmail} />);

    // Enter OTP
    cy.get('input[type="text"]').type('123456');

    // Submit form
    cy.contains('button', 'Complete Task').click();

    // Check loading state
    cy.contains('Verifying...').should('be.visible');
    cy.contains('button', 'Verifying...').should('be.disabled');

    // Wait for API call to complete
    cy.wait('@verifyTask');
  });

  it('shows success state after successful verification', () => {
    // Intercept API call
    cy.intercept('POST', '**/validate-task-completion', {
      statusCode: 200,
      body: { message: 'Task verification successful' }
    }).as('verifyTask');

    mount(<TaskCompletionForm taskId={mockTaskId} ownerEmail={mockOwnerEmail} />);

    // Enter OTP
    cy.get('input[type="text"]').type('123456');

    // Submit form
    cy.contains('button', 'Complete Task').click();

    // Wait for API call to complete
    cy.wait('@verifyTask');

    // Check success message
    cy.contains('✅ Task Completed Successfully!').should('be.visible');
    cy.contains('This task has been marked as completed.').should('be.visible');

    // Original form should not be visible
    cy.get('input[type="text"]').should('not.exist');
    cy.contains('button', 'Complete Task').should('not.exist');
  });

  it('shows error message when verification fails', () => {
    // Intercept API call with error
    cy.intercept('POST', '**/validate-task-completion', {
      statusCode: 400,
      body: { error: 'Invalid verification code' }
    }).as('verifyTaskError');

    mount(<TaskCompletionForm taskId={mockTaskId} ownerEmail={mockOwnerEmail} />);

    // Enter OTP
    cy.get('input[type="text"]').type('123456');

    // Submit form
    cy.contains('button', 'Complete Task').click();

    // Wait for API call to complete
    cy.wait('@verifyTaskError');

    // Check error message
    cy.contains('Invalid verification code').should('be.visible');

    // Form should still be visible
    cy.get('input[type="text"]').should('be.visible');
    cy.contains('button', 'Complete Task').should('be.visible');
  });

  it('makes API request with correct parameters', () => {
    // Intercept API call
    cy.intercept('POST', '**/validate-task-completion', req => {
      // Assert on request body
      expect(req.body).to.deep.equal({
        task_id: mockTaskId,
        email: mockOwnerEmail,
        otp: '123456'
      });

      // Return successful response
      req.reply({
        statusCode: 200,
        body: { message: 'Success' }
      });
    }).as('verifyTask');

    mount(<TaskCompletionForm taskId={mockTaskId} ownerEmail={mockOwnerEmail} />);

    // Enter OTP
    cy.get('input[type="text"]').type('123456');

    // Submit form
    cy.contains('button', 'Complete Task').click();

    // Wait for API call to complete
    cy.wait('@verifyTask');
  });

  it('handles network errors gracefully', () => {
    // Intercept API call with network error
    cy.intercept('POST', '**/validate-task-completion', {
      forceNetworkError: true
    }).as('networkError');

    mount(<TaskCompletionForm taskId={mockTaskId} ownerEmail={mockOwnerEmail} />);

    // Enter OTP
    cy.get('input[type="text"]').type('123456');

    // Submit form
    cy.contains('button', 'Complete Task').click();

    // Wait for API call to fail
    cy.wait('@networkError');

    // Check error message
    cy.contains('Connection error. Please try again.').should('be.visible');
  });
});