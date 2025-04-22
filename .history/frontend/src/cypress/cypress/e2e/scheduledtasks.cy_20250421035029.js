describe('Scheduled Tasks Page', () => {
    beforeEach(() => {
      // Mock the auth token
      cy.window().then((win) => {
        win.localStorage.setItem('token', 'fake-jwt-token');
      });
  
      // Stub the network request
      cy.intercept('GET', 'http://localhost:8080/scheduled-tasks/*', (req) => {
        req.reply({
          statusCode: 200,
          body: {
            scheduled_tasks: [
              {
                id: 1,
                title: 'Cypress Scheduled Task 1',
                description: 'This is a scheduled task from Cypress',
                task_date: '2025-04-20',
                task_time: '14:00',
                estimated_pay_rate: 25,
                place_of_work: 'Remote',
                status: 'Scheduled'
              },
              {
                id: 2,
                title: 'Cypress Scheduled Task 2',
                description: 'This is another scheduled task from Cypress',
                task_date: '2025-04-22',
                task_time: '10:00',
                estimated_pay_rate: 30,
                place_of_work: 'Office',
                status: 'Scheduled'
              }
            ]
          }
        });
      });
  
      // Visit the scheduled tasks page
      cy.visit('/scheduled-tasks');
    });
  
    it('displays the scheduled tasks heading', () => {
      cy.contains('h2', 'My Scheduled Tasks').should('be.visible');
    });
  
    it('displays the task cards', () => {
      cy.get('.tasks-list').should('exist');
      cy.get('.tasks-list').children().should('have.length', 2);
    });
  
    it('renders task cards with the isScheduled prop set to true', () => {
      // This test assumes that we can inspect React props in Cypress
      // In a real test, you might need to verify this behavior differently
      // Perhaps by checking for specific DOM elements or classes that appear
      // only when isScheduled is true
      cy.get('.task-card.scheduled').should('have.length', 2);
    });
  
    it('handles error state', () => {
      cy.intercept('GET', 'http://localhost:8080/scheduled-tasks/*', {
        statusCode: 500,
        body: { error: 'Server error' }
      });
  
      cy.visit('/scheduled-tasks');
      cy.contains('Failed to load scheduled tasks').should('be.visible');
    });
  
    it('handles empty tasks list', () => {
      cy.intercept('GET', 'http://localhost:8080/scheduled-tasks/*', {
        statusCode: 200,
        body: { scheduled_tasks: [] }
      });
  
      cy.visit('/scheduled-tasks');
      cy.contains("You don't have any scheduled tasks yet.").should('be.visible');
    });
  
    it('correctly handles loading state', () => {
      // Force a slow response to see loading state
      cy.intercept('GET', 'http://localhost:8080/scheduled-tasks/*', (req) => {
        req.on('response', (res) => {
          res.setDelay(1000);
        });
        req.reply({
          statusCode: 200,
          body: {
            scheduled_tasks: []
          }
        });
      });
  
      cy.visit('/scheduled-tasks');
      cy.contains('Loading your scheduled tasks...').should('be.visible');
      cy.contains('Loading your scheduled tasks...').should('not.exist', { timeout: 5000 });
      cy.contains("You don't have any scheduled tasks yet.").should('be.visible');
    });
  
    it('passes the correct data to TaskCard components', () => {
      // This test assumes we can get data from React components
      // In a real test, we might need to check the rendered content instead
      cy.contains('Cypress Scheduled Task 1').should('be.visible');
      cy.contains('Cypress Scheduled Task 2').should('be.visible');
    });
  });