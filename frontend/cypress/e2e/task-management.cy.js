// cypress/e2e/task-management.cy.js

describe('Task Management', () => {
    beforeEach(() => {
      cy.fixture('users').as('users');
      cy.fixture('tasks').as('tasks');
      cy.interceptAPI();
      
      // Login before each test
      cy.mockLogin();
    });
  
    it('should allow a user to create a new task', function() {
      const { newTask } = this.tasks;
      
      cy.visit('/post-task');
      
      // Fill out the form
      cy.get('input[name="title"]').type(newTask.title);
      cy.get('textarea[name="description"]').type(newTask.description);
      cy.get('input[name="task_date"]').type(newTask.task_date);
      cy.get('input[name="task_time"]').type(newTask.task_time);
      cy.get('input[name="estimated_pay_rate"]').clear().type(newTask.estimated_pay_rate);
      cy.get('input[name="place_of_work"]').type(newTask.place_of_work);
      cy.get('select[name="work_type"]').select(newTask.work_type);
      cy.get('input[name="people_needed"]').clear().type(newTask.people_needed);
      
      // Submit the form
      cy.get('button[type="submit"]').click();
      cy.wait('@createTask');
      
      // Verify success message
      cy.get('.success-message').should('contain', 'Task posted successfully');
      
      // Form should be reset
      cy.get('input[name="title"]').should('have.value', '');
    });
  
    it('should display tasks in the task feed', function() {
      cy.visit('/dashboard');
      cy.wait('@fetchTasks');
      
      // Verify tasks are displayed
      cy.get('.task-card').should('have.length.at.least', 1);
      
      // Check first task details
      cy.get('.task-card')
        .first()
        .within(() => {
          cy.get('h3').should('be.visible');
          cy.get('.task-description').should('be.visible');
          cy.get('.task-details').should('be.visible');
          cy.get('.apply-button').should('be.visible');
        });
    });
  
    it('should apply for a task successfully', function() {
      cy.visit('/dashboard');
      cy.wait('@fetchTasks');
      
      // Click apply button on first task
      cy.get('.task-card').first().within(() => {
        cy.get('.apply-button').click();
      });
      
      cy.wait('@applyTask');
      
      // Button should change to "Applied Successfully"
      cy.get('.task-card').first().within(() => {
        cy.get('.applied-button').should('be.visible');
        cy.get('.applied-button').should('be.disabled');
        cy.get('.applied-button').should('contain', 'Applied Successfully');
      });
    });
  
    it('should show my posted tasks', function() {
      // Intercept my tasks endpoint
      cy.intercept('GET', 'http://localhost:8080/users/*/created-tasks', {
        statusCode: 200,
        body: {
          tasks: [this.tasks.tasks[0]]
        }
      }).as('fetchMyTasks');
      
      cy.visit('/dashboard');
      
      // Navigate to My Tasks (assuming there's a link in the sidebar)
      cy.contains('My Tasks').click();
      cy.wait('@fetchMyTasks');
      
      // Verify my tasks are displayed
      cy.get('.tasks-list').should('be.visible');
      cy.get('.task-card').should('have.length', 1);
    });
  
    it('should handle empty task lists gracefully', function() {
      // Intercept with empty task list
      cy.intercept('GET', 'http://localhost:8080/tasks/feed/**', {
        statusCode: 200,
        body: { tasks: [] }
      }).as('emptyTasks');
      
      cy.visit('/dashboard');
      cy.wait('@emptyTasks');
      
      // Should show "no tasks" message
      cy.get('.no-tasks-message').should('be.visible');
      cy.get('.no-tasks-message').should('contain', 'No tasks available');
    });
  });