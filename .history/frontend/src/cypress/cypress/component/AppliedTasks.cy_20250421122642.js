// cypress/e2e/appliedtasks.cy.js
describe('Applied Tasks Page', () => {
    beforeEach(() => {
      // Mock the auth token
      cy.window().then((win) => {
        win.localStorage.setItem('token', 'fake-jwt-token');
      });
  
      // Stub the network request
      cy.intercept('GET', 'http://localhost:8080/appliedtasks/*', (req) => {
        req.reply({
          statusCode: 200,
          body: {
            applied_tasks: [
              {
                task: {
                  id: 1,
                  title: 'Cypress Test Task',
                  description: 'This is a test task from Cypress',
                  task_date: '2025-04-20',
                  task_time: '14:00',
                  estimated_pay_rate: 25,
                  place_of_work: 'Remote'
                },
                creator: {
                  name: 'John Doe',
                  email: 'john@example.com',
                  mobile: '123-456-7890'
                },
                selected: false
              },
              {
                task: {
                  id: 2,
                  title: 'Selected Cypress Task',
                  description: 'This task has been selected',
                  task_date: '2025-04-22',
                  task_time: '10:00',
                  estimated_pay_rate: 30,
                  place_of_work: 'Office'
                },
                creator: {
                  name: 'Jane Smith',
                  email: 'jane@example.com',
                  mobile: '987-654-3210'
                },
                selected: true
              }
            ]
          }
        });
      });
  
      // Visit the applied tasks page
      cy.visit('/applied-tasks');
    });
  
    it('displays the applied tasks heading', () => {
      cy.contains('h2', "Tasks I've Applied For").should('be.visible');
    });
  
    it('displays the applied task cards', () => {
      cy.contains('Cypress Test Task').should('be.visible');
      cy.contains('Selected Cypress Task').should('be.visible');
    });
  
    it('shows pending status for non-selected tasks', () => {
      cy.contains('Cypress Test Task')
        .parents('.applied-task-card')
        .find('.pending-status')
        .should('contain', 'Pending')
        .and('contain', 'Your application is awaiting review.');
    });
  
    it('shows selected status for selected tasks', () => {
      cy.contains('Selected Cypress Task')
        .parents('.applied-task-card')
        .find('.selected-status')
        .should('contain', '✓ Selected')
        .and('contain', 'You have been selected for this task!');
    });
  
    it('displays task details correctly', () => {
      cy.contains('Cypress Test Task')
        .parents('.applied-task-card')
        .within(() => {
          cy.contains('Date:').should('be.visible');
          cy.contains('Time: 14:00').should('be.visible');
          cy.contains('Pay Rate: $25/hr').should('be.visible');
          cy.contains('Location: Remote').should('be.visible');
        });
    });
  
    it('displays creator information correctly', () => {
      cy.contains('Selected Cypress Task')
        .parents('.applied-task-card')
        .within(() => {
          cy.contains('Posted by:').should('be.visible');
          cy.contains('Name: Jane Smith').should('be.visible');
          cy.contains('Email: jane@example.com').should('be.visible');
          cy.contains('Contact: 987-654-3210').should('be.visible');
        });
    });
  
    it('handles error state', () => {
      cy.intercept('GET', 'http://localhost:8080/appliedtasks/*', {
        statusCode: 500,
        body: { error: 'Server error' }
      });
  
      cy.visit('/applied-tasks');
      cy.contains('Failed to load applied tasks').should('be.visible');
    });
  
    it('handles empty tasks list', () => {
      cy.intercept('GET', 'http://localhost:8080/appliedtasks/*', {
        statusCode: 200,
        body: { applied_tasks: [] }
      });
  
      cy.visit('/applied-tasks');
      cy.contains("You haven't applied for any tasks yet.").should('be.visible');
    });
  });