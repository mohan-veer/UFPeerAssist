import React from 'react';
import TaskEndButton from '../../src/components/TaskEndButton';
import { mount } from 'cypress/react';
import * as authUtils from '../../src/utils/auth';

describe('TaskEndButton Component', () => {
  const mockTask = {
    _id: 'task123',
    title: 'Test Task',
    description: 'This is a test task',
    selected_users: ['user@example.com'],
    creator_email: 'creator@example.com'
  };

  beforeEach(() => {
    // Set up localStorage mock
    cy.window().then(win => {
      win.localStorage.setItem('token', 'fake-token');
    });

    // Stub the auth utility
    cy.stub(authUtils, 'getUserEmailFromToken').returns('user@example.com');

    // Stub console methods to prevent test logs from being cluttered
    cy.window().then(win => {
      cy.stub(win.console, 'log');
      cy.stub(win.console, 'error');
    });
  });

  it('renders end button correctly', () => {
    mount(<TaskEndButton task={mockTask} />);

    // Check button text
    cy.contains('button', 'End Task').should('be.visible');
    
    // Check help text
    cy.contains('This will send a notification to the task owner to verify completion.').should('be.visible');
  });

  it('shows success message after clicking end button', () => {
    // Use a very wide intercept to catch any outgoing request
    cy.intercept('POST', '**/tasks/**', {
      statusCode: 200,
      body: { message: 'Task end initiated successfully' }
    }).as('anyTaskRequest');

    mount(<TaskEndButton task={mockTask} />);

    // Click the end button
    cy.contains('button', 'End Task').click();

    // Look for the success message directly without waiting for API
    cy.contains('✅ Task completion initiated', { timeout: 5000 }).should('be.visible');
    cy.contains('An OTP has been sent to the task owner for verification.').should('be.visible');

    // End button should not be visible anymore
    cy.contains('button', 'End Task').should('not.exist');
  });

  it('shows error message when API returns error', () => {
    // Use a very wide intercept to catch any outgoing request
    cy.intercept('POST', '**/tasks/**', {
      statusCode: 400,
      body: { error: 'Failed to end task' }
    }).as('anyTaskError');

    mount(<TaskEndButton task={mockTask} />);

    // Click the end button
    cy.contains('button', 'End Task').click();

    // Look for the error message directly without waiting for API
    cy.contains('Failed to end task', { timeout: 5000 }).should('be.visible');

    // Button should still be visible
    cy.contains('button', 'End Task').should('be.visible');
  });

  it('shows error when user email is not found', () => {
    // Change the stub to return null
    cy.stub(authUtils, 'getUserEmailFromToken').returns(null);

    mount(<TaskEndButton task={mockTask} />);

    // Click the end button
    cy.contains('button', 'End Task').click();

    // Check error message
    cy.contains('You must be logged in to end this task').should('be.visible');
  });

  it('shows error when user is not authorized', () => {
    // Change the stub to return a different email
    cy.stub(authUtils, 'getUserEmailFromToken').returns('another@example.com');

    mount(<TaskEndButton task={mockTask} />);

    // Click the end button
    cy.contains('button', 'End Task').click();

    // Check for partial text if exact text might be different
    cy.contains('not authorized', { timeout: 5000 }).should('be.visible');
  });

  it('handles network errors gracefully', () => {
    // Use a very wide intercept to catch any outgoing request
    cy.intercept('POST', '**/tasks/**', {
      forceNetworkError: true
    }).as('anyNetworkError');

    mount(<TaskEndButton task={mockTask} />);

    // Click the end button
    cy.contains('button', 'End Task').click();

    // Check error message without waiting for API
    cy.contains('Connection error', { timeout: 5000 }).should('be.visible');
  });
});