// cypress/integration/task-completion-workflow.spec.js

describe('Task Completion Workflow', () => {
    beforeEach(() => {
      // Mock authentication - set the token in localStorage
      cy.window().then((win) => {
        win.localStorage.setItem('token', 'fake-test-token');
      });
      
      // Stub getUserEmailFromToken to return a test user
      cy.stub(window, 'getUserEmailFromToken').returns('test@example.com');
    });
    
    it('should allow a worker to end a task', () => {
      // Mock the task data
      const mockTask = {
        _id: 'task123',
        title: 'Test Task',
        description: 'This is a test task',
        task_date: '2025-04-20',
        task_time: '14:00',
        estimated_pay_rate: 25,
        place_of_work: 'Remote',
        status: 'In Progress',
        selected_users: ['test@example.com'],
        creator_email: 'creator@example.com'
      };
      
      // Intercept API request to get scheduled tasks
      cy.intercept('GET', '**/scheduled-tasks/*', {
        statusCode: 200,
        body: { scheduled_tasks: [mockTask] }
      }).as('getScheduledTasks');
      
      // Intercept the task end API call
      cy.intercept('POST', '**/tasks/*/end/*', {
        statusCode: 200,
        body: { message: 'Task end initiated successfully' }
      }).as('endTask');
      
      // Visit the scheduled tasks page
      cy.visit('/scheduled-tasks');
      cy.wait('@getScheduledTasks');
      
      // Find and click the "End Task" button
      cy.contains('End Task').click();
      
      // Verify the API was called correctly
      cy.wait('@endTask').its('request.url').should('include', `/tasks/${mockTask._id}/end/test@example.com`);
      
      // Verify success message is displayed
      cy.contains('✅ Task completion initiated').should('be.visible');
      cy.contains('An OTP has been sent to the task owner for verification.').should('be.visible');
    });
    
    it('should allow task owner to verify task completion', () => {
      // Mock tasks data
      const mockTask = {
        _id: 'task123',
        title: 'Test Task for Verification',
        description: 'This task needs verification',
        task_date: '2025-04-20',
        task_time: '14:00',
        place_of_work: 'Remote',
        status: 'In Progress',
        selected_users: ['worker@example.com'],
        creator_email: 'test@example.com' // Current user is the creator
      };
      
      // Intercept API request to get created tasks
      cy.intercept('GET', '**/users/*/created-tasks', {
        statusCode: 200,
        body: { tasks: [mockTask] }
      }).as('getCreatedTasks');
      
      // Intercept the verification API call
      cy.intercept('POST', '**/validate-task-completion', {
        statusCode: 200,
        body: { message: 'Task verification successful' }
      }).as('verifyTask');
      
      // Visit the task verification page
      cy.visit('/task-verification');
      cy.wait('@getCreatedTasks');
      
      // Verify the task card is displayed
      cy.contains('Test Task for Verification').should('be.visible');
      
      // Start the verification process
      cy.contains('Verify Task Completion').click();
      
      // Enter OTP code
      cy.get('input[placeholder="Enter OTP code"]').type('123456');
      
      // Submit the verification
      cy.contains('button', 'Verify Completion').click();
      
      // Verify the API was called correctly
      cy.wait('@verifyTask').its('request.body').should('deep.equal', {
        task_id: 'task123',
        email: 'test@example.com',
        otp: '123456'
      });
      
      // Verify success message
      cy.contains('Task verified and marked as completed!').should('be.visible');
    });
    
    it('should show error messages for invalid verification codes', () => {
      // Mock tasks data
      const mockTask = {
        _id: 'task123',
        title: 'Test Task for Verification',
        description: 'This task needs verification',
        task_date: '2025-04-20',
        task_time: '14:00',
        place_of_work: 'Remote',
        status: 'In Progress',
        selected_users: ['worker@example.com'],
        creator_email: 'test@example.com'
      };
      
      // Intercept API request to get created tasks
      cy.intercept('GET', '**/users/*/created-tasks', {
        statusCode: 200,
        body: { tasks: [mockTask] }
      }).as('getCreatedTasks');
      
      // Intercept the verification API call with error
      cy.intercept('POST', '**/validate-task-completion', {
        statusCode: 400,
        body: { error: 'Invalid verification code' }
      }).as('verifyTaskError');
      
      // Visit the task verification page
      cy.visit('/task-verification');
      cy.wait('@getCreatedTasks');
      
      // Start the verification process
      cy.contains('Verify Task Completion').click();
      
      // Enter OTP code
      cy.get('input[placeholder="Enter OTP code"]').type('wrongcode');
      
      // Submit the verification
      cy.contains('button', 'Verify Completion').click();
      
      // Wait for API call
      cy.wait('@verifyTaskError');
      
      // Verify error message
      cy.contains('Invalid verification code').should('be.visible');
    });
    
    it('should show completed tasks in the completed tasks view', () => {
      // Mock completed tasks data
      const mockCompletedTasks = [
        {
          _id: 'task1',
          title: 'Completed Task 1',
          description: 'This task has been completed',
          task_date: '2025-04-15',
          task_time: '10:00',
          estimated_pay_rate: 25,
          place_of_work: 'Remote',
          status: 'Completed'
        },
        {
          _id: 'task2',
          title: 'Completed Task 2',
          description: 'This is another completed task',
          task_date: '2025-04-10',
          task_time: '14:00',
          estimated_pay_rate: 30,
          place_of_work: 'Office',
          status: 'Completed'
        }
      ];
      
      // Intercept API request to get created tasks, including completed ones
      cy.intercept('GET', '**/users/*/created-tasks', {
        statusCode: 200,
        body: { tasks: [...mockCompletedTasks, {
          _id: 'task3',
          title: 'Open Task',
          status: 'Open'
        }] }
      }).as('getTasks');
      
      // Visit the completed tasks page
      cy.visit('/completed-tasks');
      cy.wait('@getTasks');
      
      // Verify that only completed tasks are shown
      cy.contains('Completed Task 1').should('be.visible');
      cy.contains('Completed Task 2').should('be.visible');
      cy.contains('Open Task').should('not.exist');
      
      // Verify completed badges are shown
      cy.get('.completed-badge').should('have.length', 2);
      cy.contains('✓ Completed').should('be.visible');
    });
    
    it('should handle when there are no completed tasks', () => {
      // Intercept API request with no completed tasks
      cy.intercept('GET', '**/users/*/created-tasks', {
        statusCode: 200,
        body: { tasks: [{
          _id: 'task3',
          title: 'Open Task',
          status: 'Open'
        }] }
      }).as('getTasks');
      
      // Visit the completed tasks page
      cy.visit('/completed-tasks');
      cy.wait('@getTasks');
      
      // Verify "no tasks" message is shown
      cy.contains("You don't have any completed tasks yet.").should('be.visible');
    });
  });