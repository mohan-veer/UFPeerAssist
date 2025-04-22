import React from 'react';
import TaskEndButton from '../../src/components/TaskEndButton';
import { mount } from 'cypress/react';
import * as authUtils from '../../src/utils/auth';

describe('TaskEndButton Component - Minimal Tests', () => {
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

    // Suppress console methods to prevent test logs from being cluttered
    cy.window().then(win => {
      cy.stub(win.console, 'log');
      cy.stub(win.console, 'error');
    });
    
    // Mock fetch to avoid making actual API calls
    cy.window().then(win => {
      cy.stub(win, 'fetch').resolves({
        ok: true,
        json: cy.stub().resolves({ message: 'Success' })
      });
    });
  });

  it('renders end button correctly', () => {
    mount(<TaskEndButton task={mockTask} />);

    // Check button text
    cy.contains('button', 'End Task').should('be.visible');
    
    // Check help text
    cy.contains('This will send a notification to the task owner to verify completion.').should('be.visible');
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
});