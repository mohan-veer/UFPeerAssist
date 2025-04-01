// cypress/e2e/auth.cy.js

describe('Authentication Flow', () => {
    beforeEach(() => {
      cy.fixture('users').as('users');
      cy.interceptAPI();
    });
  
    it('should allow a user to register successfully', function() {
      const { newUser } = this.users;
      
      cy.visit('/register');
      cy.get('input[name="name"]').type(newUser.name);
      cy.get('input[name="email"]').type(newUser.email);
      cy.get('input[name="mobile"]').type(newUser.mobile);
      cy.get('input[name="password"]').type(newUser.password);
      cy.get('button[type="submit"]').click();
      
      // Verify successful registration message
      cy.contains('Registration successful!').should('be.visible');
      
      // Should redirect to login page after successful registration
      cy.url().should('include', '/login');
    });
  
    it('should login successfully with valid credentials', function() {
      const { validUser } = this.users;
      
      cy.visit('/login');
      cy.get('input[name="email"]').type(validUser.email);
      cy.get('input[name="password"]').type(validUser.password);
      cy.get('button[type="submit"]').click();
      cy.wait('@loginRequest');
      
      // Should redirect to dashboard after successful login
      cy.url().should('include', '/dashboard');
      
      // Verify dashboard elements are visible
      cy.get('.dashboard-header').should('be.visible');
      cy.get('.task-feed').should('be.visible');
    });
  
    it('should show error message with invalid credentials', function() {
      const { invalidUser } = this.users;
      
      // Override the interceptor for this test to simulate error
      cy.intercept('POST', 'http://localhost:8080/login', {
        statusCode: 401,
        body: {
          error: 'Invalid email or password'
        }
      }).as('failedLogin');
      
      cy.visit('/login');
      cy.get('input[name="email"]').type(invalidUser.email);
      cy.get('input[name="password"]').type(invalidUser.password);
      cy.get('button[type="submit"]').click();
      cy.wait('@failedLogin');
      
      // Error message should be visible
      cy.get('.error').should('contain', 'Invalid email or password');
      
      // Should stay on login page
      cy.url().should('include', '/login');
    });
  
    it('should logout successfully', function() {
      const { validUser } = this.users;
      
      // Login first
      cy.login(validUser.email, validUser.password);
      cy.wait('@loginRequest');
      
      // Click logout button
      cy.get('.logout-button').click();
      
      // Should redirect to login page
      cy.url().should('include', '/login');
      
      // Try to access dashboard page after logout
      cy.visit('/dashboard');
      
      // Should redirect back to login
      cy.url().should('include', '/login');
    });
  
    it('should redirect to login when accessing protected routes without authentication', () => {
      // Clear local storage to ensure no tokens
      cy.clearLocalStorage();
      
      // Try to access dashboard directly
      cy.visit('/dashboard');
      
      // Should redirect to login
      cy.url().should('include', '/login');
      
      // Try to access task creation page
      cy.visit('/post-task');
      
      // Should redirect to login
      cy.url().should('include', '/login');
    });
  });