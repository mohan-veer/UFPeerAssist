// cypress/support/e2e.js

// Import commands.js using ES2015 syntax:
import './commands';

// Disable uncaught exceptions handling
Cypress.on('uncaught:exception', (err, runnable) => {
  // Returning false here prevents Cypress from failing the test
  return false;
});

// Add auto-login function to preserve login state between tests if needed
// This is useful for test suites that require authentication
beforeEach(() => {
  // Check if this test requires authentication
  const testPath = Cypress.currentTest.title;
  
  if (testPath.includes('authenticated') || Cypress.env('forceLogin')) {
    // Set up a fake token in localStorage
    cy.window().then((win) => {
      win.localStorage.setItem('token', 'fake-jwt-token');
    });
  }
});

// Clean up after each test
afterEach(() => {
  // Clear localStorage if needed between tests
  if (Cypress.env('cleanupAfterTest')) {
    cy.clearLocalStorage();
  }
});