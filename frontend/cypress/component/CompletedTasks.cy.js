import React from 'react';
import CompletedTasks from '../../src/components/CompletedTasks';
import { mount } from 'cypress/react';
import * as authUtils from '../../src/utils/auth';
import { BrowserRouter } from 'react-router-dom';

describe('CompletedTasks Component - Minimal Tests', () => {
  beforeEach(() => {
    // Set up localStorage mock
    cy.window().then(win => {
      win.localStorage.setItem('token', 'fake-token');
    });

    // Stub the auth utility
    cy.stub(authUtils, 'getUserEmailFromToken').returns('test@example.com');
    
    // Suppress console logs and errors
    cy.window().then(win => {
      cy.stub(win.console, 'log');
      cy.stub(win.console, 'error');
    });
    
    // Mock fetch to return empty data
    cy.window().then(win => {
      cy.stub(win, 'fetch').resolves({
        ok: true,
        json: cy.stub().resolves({ tasks: [] })
      });
    });
  });

  it('renders the component header', () => {
    // Mount component with Router wrapper
    cy.mount(
      <BrowserRouter>
        <CompletedTasks />
      </BrowserRouter>
    );
    
    // Verify the component header renders
    cy.contains('h2', 'Completed Tasks').should('be.visible');
  });
});