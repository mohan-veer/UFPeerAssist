// cypress/integration/form-validation.spec.js

describe('Task Completion Form Validation', () => {
    beforeEach(() => {
      // Mock authentication - set the token in localStorage
      cy.window().then((win) => {
        win.localStorage.setItem('token', 'fake-test-token');
      });
    });
  
    describe('Task Completion Form', () => {
      const mockTaskId = 'task123';
      const mockOwnerEmail = 'owner@example.com';
      
      beforeEach(() => {
        // Visit the page with the task completion form component
        // Note: This is a mock URL - adjust to your actual route
        cy.visit(`/tasks/${mockTaskId}/complete`);
        
        // Stub component props if needed
        cy.window().then((win) => {
          // Assuming the component is mounted with these props
          win.taskId = mockTaskId;
          win.ownerEmail = mockOwnerEmail;
        });
      });
      
      it('should validate OTP field is required', () => {
        // Try to submit without entering OTP
        cy.contains('button', 'Complete Task').should('be.disabled');
        
        // Enter OTP
        cy.get('input[id="otp-input"]').type('123456');
        
        // Button should be enabled
        cy.contains('button', 'Complete Task').should('not.be.disabled');
        
        // Clear input
        cy.get('input[id="otp-input"]').clear();
        
        // Button should be disabled again
        cy.contains('button', 'Complete Task').should('be.disabled');
      });
      
      it('should show loading state during form submission', () => {
        // Intercept API call and delay response
        cy.intercept('POST', '**/validate-task-completion', (req) => {
          req.reply({
            delay: 1000, // Delay by 1 second
            statusCode: 200,
            body: { message: 'Success' }
          });
        }).as('verifyTask');
        
        // Enter OTP
        cy.get('input[id="otp-input"]').type('123456');
        
        // Submit form
        cy.contains('button', 'Complete Task').click();
        
        // Button should show loading state
        cy.contains('button', 'Verifying...').should('be.visible');
        cy.contains('button', 'Verifying...').should('be.disabled');
        
        // Wait for request to complete
        cy.wait('@verifyTask');
        
        // Success message should be shown
        cy.contains('✅ Task Completed Successfully!').should('be.visible');
      });
      
      it('should display error messages from the API', () => {
        // Intercept API call with error response
        cy.intercept('POST', '**/validate-task-completion', {
          statusCode: 400,
          body: { error: 'Invalid verification code' }
        }).as('verifyTaskError');
        
        // Enter OTP
        cy.get('input[id="otp-input"]').type('123456');
        
        // Submit form
        cy.contains('button', 'Complete Task').click();
        
        // Wait for request to complete
        cy.wait('@verifyTaskError');
        
        // Error message should be shown
        cy.contains('Invalid verification code').should('be.visible');
        
        // Form should still be visible
        cy.get('input[id="otp-input"]').should('be.visible');
      });
    });
    
    describe('Task Completion Verification', () => {
      const mockTask = {
        _id: 'task123',
        title: 'Test Task',
        description: 'This is a test task',
        creator_email: 'creator@example.com'
      };
      
      beforeEach(() => {
        // Visit the page with the task completion verification component
        // Note: This is a mock URL - adjust to your actual route
        cy.visit(`/verify-completion/${mockTask._id}`);
        
        // Stub component props if needed
        cy.window().then((win) => {
          // Mock task data
          win.task = mockTask;
        });
      });
      
      it('should validate OTP field is required', () => {
        // Try to submit without entering OTP
        cy.contains('button', 'Verify Completion').should('be.disabled');
        
        // Enter OTP
        cy.get('input[id="otp-input"]').type('123456');
        
        // Button should be enabled
        cy.contains('button', 'Verify Completion').should('not.be.disabled');
        
        // Clear input
        cy.get('input[id="otp-input"]').clear();
        
        // Button should be disabled again
        cy.contains('button', 'Verify Completion').should('be.disabled');
      });
      
      it('should show developer tools only in development mode', () => {
        // Development mode should show the toggle button
        cy.contains('button', 'Show Developer Tools').should('be.visible').click();
        
        // Developer tools should be visible
        cy.contains('Developer Testing Tools').should('be.visible');
        cy.contains(`Current task ID: ${mockTask._id}`).should('be.visible');
        cy.contains(`Current owner: ${mockTask.creator_email}`).should('be.visible');
        
        // Click to hide
        cy.contains('button', 'Hide Developer Tools').click();
        
        // Developer tools should be hidden
        cy.contains('Developer Testing Tools').should('not.exist');
        
        // Mock production mode
        cy.window().then((win) => {
          Object.defineProperty(win, 'process', {
            value: { env: { NODE_ENV: 'production' } }
          });
          
          // Force re-render by refreshing
          cy.reload();
          
          // Developer tools toggle should not be visible
          cy.contains('button', 'Show Developer Tools').should('not.exist');
        });
      });
    });
    
    describe('Task End Button', () => {
      const mockTask = {
        _id: 'task123',
        title: 'Test Task',
        description: 'This is a test task',
        selected_users: ['user@example.com']
      };
      
      beforeEach(() => {
        // Visit the page with the task end button component
        // Note: This is a mock URL - adjust to your actual route
        cy.visit(`/tasks/${mockTask._id}`);
        
        // Stub component props and auth
        cy.window().then((win) => {
          // Mock task data
          win.task = mockTask;
          
          // Mock auth (user is selected for this task)
          win.getUserEmailFromToken = cy.stub().returns('user@example.com');
        });
      });
      
      it('should handle unauthorized users', () => {
        // Change the authenticated user to someone not selected for the task
        cy.window().then((win) => {
          win.getUserEmailFromToken = cy.stub().returns('another@example.com');
        });
        
        // Reload to apply the new auth
        cy.reload();
        
        // Click the end button
        cy.contains('button', 'End Task').click();
        
        // Error message should be shown
        cy.contains('You are not authorized to end this task').should('be.visible');
        
        // API request should not be made
        cy.intercept('POST', '**/tasks/*/end/*').as('endTask');
        cy.wait(500); // Wait a bit
        cy.get('@endTask.all').should('have.length', 0);
      });
      
      it('should handle API errors', () => {
        // Intercept API call with error response
        cy.intercept('POST', '**/tasks/*/end/*', {
          statusCode: 400,
          body: { error: 'Failed to end task' }
        }).as('endTaskError');
        
        // Click the end button
        cy.contains('button', 'End Task').click();
        
        // Wait for request to complete
        cy.wait('@endTaskError');
        
        // Error message should be shown
        cy.contains('Failed to end task').should('be.visible');
      });
    });
    
    describe('Task Verification Component', () => {
      beforeEach(() => {
        // Mock auth
        cy.window().then((win) => {
          win.getUserEmailFromToken = cy.stub().returns('owner@example.com');
        });
        
        // Intercept API request for tasks
        cy.intercept('GET', '**/users/*/created-tasks', {
          statusCode: 200,
          body: {
            tasks: [
              {
                _id: 'task1',
                title: 'Task 1',
                description: 'This is task 1',
                task_date: '2025-04-20',
                task_time: '14:00',
                place_of_work: 'Remote',
                status: 'In Progress',
                selected_users: ['worker@example.com']
              }
            ]
          }
        }).as('getTasks');
        
        // Visit the task verification page
        cy.visit('/task-verification');
        cy.wait('@getTasks');
      });
      
      it('should validate OTP field is required when verifying', () => {
        // Click to start verification
        cy.contains('button', 'Verify Task Completion').click();
        
        // Verify button should be disabled
        cy.contains('button', 'Verify Completion').should('be.disabled');
        
        // Enter OTP
        cy.get('input[placeholder="Enter OTP code"]').type('123456');
        
        // Verify button should be enabled
        cy.contains('button', 'Verify Completion').should('not.be.disabled');
        
        // Clear input
        cy.get('input[placeholder="Enter OTP code"]').clear();
        
        // Verify button should be disabled again
        cy.contains('button', 'Verify Completion').should('be.disabled');
      });
      
      it('should allow cancelling verification', () => {
        // Click to start verification
        cy.contains('button', 'Verify Task Completion').click();
        
        // Verification form should be visible
        cy.contains('Enter the verification code sent to your email:').should('be.visible');
        
        // Click cancel
        cy.contains('button', 'Cancel').click();
        
        // Verification form should be hidden
        cy.contains('Enter the verification code sent to your email:').should('not.exist');
        
        // Start verification button should be visible again
        cy.contains('button', 'Verify Task Completion').should('be.visible');
      });
    });
  });