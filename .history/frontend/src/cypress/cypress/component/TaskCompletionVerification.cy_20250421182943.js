import React from 'react';
import TaskCompletionVerification from '../../src/components/TaskCompletionVerification';
import { mount } from 'cypress/react';

describe('TaskCompletionVerification Component', () => {
  const mockTask = {
    _id: 'task123',
    title: 'Test Task',
    description: 'This is a test task',
    creator_email: 'creator@example.com',
    task_date: '2025-04-20',
    task_time: '14:00',
    estimated_pay_rate: 25,
    place_of_work: 'Remote'
  };

  beforeEach(() => {
    // Set up localStorage mock
    cy.window().then(win => {
      win.localStorage.setItem('token', 'fake-token');
    });

    // Stub console methods to prevent test logs from being cluttered
    cy.window().then(win => {
      cy.stub(win.console, 'log').as('consoleLog');
      cy.stub(win.console, 'error').as('consoleError');
    });
  });

  it('renders verification form correctly', () => {
    // Set NODE_ENV to development for developer tools
    cy.window().then(win => {
      win.process = { env: { NODE_ENV: 'development' } };
    });

    mount(<TaskCompletionVerification task={mockTask} />);

    // Verify UI elements
    cy.contains('Verify Task Completion').should('be.visible');
    cy.contains('Enter Verification Code:').should('be.visible');
    cy.get('input[type="text"]').should('be.visible');
    cy.contains('button', 'Verify Completion').should('be.visible');
    cy.contains('button', 'Show Developer Tools').should('be.visible');

    // Verify help section
    cy.contains('Didn\'t receive the code?').should('be.visible');
    cy.contains('Check your spam/junk folder').should('be.visible');
  });

  it('disables verify button when OTP is empty', () => {
    mount(<TaskCompletionVerification task={mockTask} />);

    // Button should be disabled initially
    cy.contains('button', 'Verify Completion').should('be.disabled');

    // Enter OTP
    cy.get('input[type="text"]').type('123456');

    // Button should be enabled
    cy.contains('button', 'Verify Completion').should('not.be.disabled');

    // Clear OTP
    cy.get('input[type="text"]').clear();

    // Button should be disabled again
    cy.contains('button', 'Verify Completion').should('be.disabled');
  });

  it('shows loading state during submission', () => {
    // Intercept API call and delay response
    cy.intercept('POST', '**/validate-task-completion', {
      delay: 300,
      statusCode: 200,
      body: { message: 'Success' }
    }).as('verifyTask');

    mount(<TaskCompletionVerification task={mockTask} />);

    // Enter OTP
    cy.get('input[type="text"]').type('123456');

    // Submit form
    cy.contains('button', 'Verify Completion').click();

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

    mount(<TaskCompletionVerification task={mockTask} />);

    // Enter OTP
    cy.get('input[type="text"]').type('123456');

    // Submit form
    cy.contains('button', 'Verify Completion').click();

    // Wait for API call to complete
    cy.wait('@verifyTask');

    // Check success message
    cy.contains('✅ Task Completed Successfully!').should('be.visible');
    cy.contains('This task has been marked as completed. Thank you!').should('be.visible');

    // Original form should not be visible
    cy.get('input[type="text"]').should('not.exist');
    cy.contains('button', 'Verify Completion').should('not.exist');
  });

  it('shows error message when verification fails', () => {
    // Intercept API call with error
    cy.intercept('POST', '**/validate-task-completion', {
      statusCode: 400,
      body: { error: 'Invalid verification code' }
    }).as('verifyTaskError');

    mount(<TaskCompletionVerification task={mockTask} />);

    // Enter OTP
    cy.get('input[type="text"]').type('123456');

    // Submit form
    cy.contains('button', 'Verify Completion').click();

    // Wait for API call to complete
    cy.wait('@verifyTaskError');

    // Check error message
    cy.contains('Invalid verification code').should('be.visible');

    // Form should still be visible
    cy.get('input[type="text"]').should('be.visible');
    cy.contains('button', 'Verify Completion').should('be.visible');
  });

  it('toggles developer tools in development mode', () => {
    // Set NODE_ENV to development
    cy.window().then(win => {
      win.process = { env: { NODE_ENV: 'development' } };
    });

    mount(<TaskCompletionVerification task={mockTask} />);

    // Developer tools toggle should be visible
    cy.contains('button', 'Show Developer Tools').should('be.visible');

    // Click to show developer tools
    cy.contains('button', 'Show Developer Tools').click();

    // Developer info should be visible
    cy.contains('Developer Testing Tools').should('be.visible');
    cy.contains(`Current task ID: ${mockTask._id}`).should('be.visible');
    cy.contains(`Current owner: ${mockTask.creator_email}`).should('be.visible');

    // Click to hide developer tools
    cy.contains('button', 'Hide Developer Tools').click();

    // Developer info should be hidden
    cy.contains('Developer Testing Tools').should('not.exist');
  });

  it('hides developer tools in production mode', () => {
    // Set NODE_ENV to production
    cy.window().then(win => {
      win.process = { env: { NODE_ENV: 'production' } };
    });

    mount(<TaskCompletionVerification task={mockTask} />);

    // Developer tools toggle should not be visible
    cy.contains('button', 'Show Developer Tools').should('not.exist');
  });

  it('logs verification attempts correctly', () => {
    // Intercept API call
    cy.intercept('POST', '**/validate-task-completion', {
      statusCode: 200,
      body: { message: 'Success' }
    }).as('verifyTask');

    mount(<TaskCompletionVerification task={mockTask} />);

    // Enter OTP
    cy.get('input[type="text"]').type('123456');

    // Submit form
    cy.contains('button', 'Verify Completion').click();

    // Wait for API call to complete
    cy.wait('@verifyTask');

    // Check console logs
    cy.get('@consoleLog').should('have.been.calledWith', 'Verifying task completion for task ID:', mockTask._id);
    cy.get('@consoleLog').should('have.been.calledWith', 'Using OTP:', '123456');
    cy.get('@consoleLog').should('have.been.calledWith', 'Task owner email:', mockTask.creator_email);
    cy.get('@consoleLog').should('have.been.calledWith', 'Task successfully verified as complete');
  });

  it('makes API request with correct parameters', () => {
    // Intercept API call
    cy.intercept('POST', '**/validate-task-completion', req => {
      // Assert on request body
      expect(req.body).to.deep.equal({
        task_id: mockTask._id,
        email: mockTask.creator_email,
        otp: '123456'
      });

      // Return successful response
      req.reply({
        statusCode: 200,
        body: { message: 'Success' }
      });
    }).as('verifyTask');

    mount(<TaskCompletionVerification task={mockTask} />);

    // Enter OTP
    cy.get('input[type="text"]').type('123456');

    // Submit form
    cy.contains('button', 'Verify Completion').click();

    // Wait for API call to complete
    cy.wait('@verifyTask');
  });
});