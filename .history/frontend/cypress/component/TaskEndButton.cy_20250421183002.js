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
      cy.stub(win.console, 'log').as('consoleLog');
      cy.stub(win.console, 'error').as('consoleError');
    });
  });

  it('renders end button correctly', () => {
    mount(<TaskEndButton task={mockTask} />);

    // Check button text
    cy.contains('button', 'End Task').should('be.visible');
    
    // Check help text
    cy.contains('This will send a notification to the task owner to verify completion.').should('be.visible');
  });

  it('shows loading state during API call', () => {
    // Intercept API call and delay response
    cy.intercept('POST', '**/tasks/*/end/*', {
      delay: 300,
      statusCode: 200,
      body: { message: 'Success' }
    }).as('endTask');

    mount(<TaskEndButton task={mockTask} />);

    // Click the end button
    cy.contains('button', 'End Task').click();

    // Check loading state
    cy.contains('button', 'Processing...').should('be.visible');
    cy.contains('button', 'Processing...').should('be.disabled');

    // Wait for API call to complete
    cy.wait('@endTask');

    // Button should no longer be in loading state
    cy.contains('button', 'Processing...').should('not.exist');
  });

  it('shows success message after successful task end', () => {
    // Intercept API call
    cy.intercept('POST', '**/tasks/*/end/*', {
      statusCode: 200,
      body: { message: 'Task end initiated successfully' }
    }).as('endTask');

    mount(<TaskEndButton task={mockTask} />);

    // Click the end button
    cy.contains('button', 'End Task').click();

    // Wait for API call to complete
    cy.wait('@endTask');

    // Check success message
    cy.contains('✅ Task completion initiated').should('be.visible');
    cy.contains('An OTP has been sent to the task owner for verification.').should('be.visible');

    // End button should not be visible anymore
    cy.contains('button', 'End Task').should('not.exist');
  });

  it('shows error message when API returns error', () => {
    // Intercept API call with error
    cy.intercept('POST', '**/tasks/*/end/*', {
      statusCode: 400,
      body: { error: 'Failed to end task' }
    }).as('endTaskError');

    mount(<TaskEndButton task={mockTask} />);

    // Click the end button
    cy.contains('button', 'End Task').click();

    // Wait for API call to complete
    cy.wait('@endTaskError');

    // Check error message
    cy.contains('Failed to end task').should('be.visible');

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

    // No API call should be made
    cy.get('@consoleError').should('not.have.been.called');
  });

  it('shows error when user is not authorized', () => {
    // Change the stub to return a different email
    cy.stub(authUtils, 'getUserEmailFromToken').returns('another@example.com');

    mount(<TaskEndButton task={mockTask} />);

    // Click the end button
    cy.contains('button', 'End Task').click();

    // Check error message
    cy.contains('You are not authorized to end this task').should('be.visible');

    // No API call should be made
    cy.get('@consoleError').should('not.have.been.called');
  });

  it('makes API request with correct parameters', () => {
    // Intercept API call
    cy.intercept('POST', `**/tasks/${mockTask._id}/end/user@example.com`, req => {
      // Assert on request headers
      expect(req.headers.authorization).to.equal('Bearer fake-token');
      expect(req.headers['content-type']).to.equal('application/json');

      // Return successful response
      req.reply({
        statusCode: 200,
        body: { message: 'Success' }
      });
    }).as('endTask');

    mount(<TaskEndButton task={mockTask} />);

    // Click the end button
    cy.contains('button', 'End Task').click();

    // Wait for API call to complete
    cy.wait('@endTask');
  });

  it('logs success and error messages', () => {
    // Test success logging
    cy.intercept('POST', '**/tasks/*/end/*', {
      statusCode: 200,
      body: { message: 'Success' }
    }).as('endTaskSuccess');

    mount(<TaskEndButton task={mockTask} />);

    // Click the end button
    cy.contains('button', 'End Task').click();

    // Wait for API call to complete
    cy.wait('@endTaskSuccess');

    // Check console log
    cy.get('@consoleLog').should('have.been.calledWith', 'Successfully initiated task completion');

    // Remount with error scenario
    cy.mount(<TaskEndButton task={mockTask} />);

    // Intercept API call with error
    cy.intercept('POST', '**/tasks/*/end/*', {
      statusCode: 400,
      body: { error: 'Failed to end task' }
    }).as('endTaskError');

    // Click the end button
    cy.contains('button', 'End Task').click();

    // Wait for API call to complete
    cy.wait('@endTaskError');

    // Check error log
    cy.get('@consoleError').should('have.been.calledWith', 'Failed to end task:', Cypress.sinon.match.any);
  });

  it('handles network errors gracefully', () => {
    // Intercept API call with network error
    cy.intercept('POST', '**/tasks/*/end/*', {
      forceNetworkError: true
    }).as('networkError');

    mount(<TaskEndButton task={mockTask} />);

    // Click the end button
    cy.contains('button', 'End Task').click();

    // Wait for API call to fail
    cy.wait('@networkError');

    // Check error message
    cy.contains('Connection error. Please try again.').should('be.visible');
  });
});