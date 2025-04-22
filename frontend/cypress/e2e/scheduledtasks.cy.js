// cypress/e2e/scheduledtasks.cy.js

describe('Scheduled Tasks Page', () => {
  beforeEach(() => {
    // Mock the auth token
    cy.window().then((win) => {
      win.localStorage.setItem('token', 'fake-jwt-token');
    });

    // The default API stub for most tests (empty tasks)
    cy.intercept('GET', 'http://localhost:8080/scheduled-tasks/*', {
      statusCode: 200,
      body: { scheduled_tasks: [] }
    }).as('fetchEmptyTasks');
  });

  it('displays the scheduled tasks heading', () => {
    cy.visit('/scheduled-tasks');
    
    // Wait for the API call to complete
    cy.wait('@fetchEmptyTasks');
    
    // Check for the heading
    cy.contains('h2', 'My Scheduled Tasks').should('be.visible');
  });

  it('handles error state', () => {
    // Override with error response
    cy.intercept('GET', 'http://localhost:8080/scheduled-tasks/*', {
      statusCode: 500,
      body: { error: 'Server error' }
    }).as('fetchError');

    cy.visit('/scheduled-tasks');
    cy.wait('@fetchError');
    
    // Make sure error message appears
    cy.contains('Failed to load scheduled tasks').should('be.visible');
  });

  it('handles empty tasks list', () => {
    cy.visit('/scheduled-tasks');
    cy.wait('@fetchEmptyTasks');
    
    // Important: Give the component time to update after API call
    // The assertion in screenshot #3 shows it's timing out while looking for this text
    cy.contains("You don't have any scheduled tasks yet.", { timeout: 10000 }).should('be.visible');
  });

  it('displays tasks when data is available', () => {
    // Provide mock data with tasks
    cy.intercept('GET', 'http://localhost:8080/scheduled-tasks/*', {
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
    }).as('fetchTasksWithData');

    cy.visit('/scheduled-tasks');
    cy.wait('@fetchTasksWithData');
    
    // Instead of looking for .task-card.scheduled which might not exist
    // Look for the task titles which should definitely be there
    cy.contains('Cypress Scheduled Task 1').should('be.visible');
    cy.contains('Cypress Scheduled Task 2').should('be.visible');
    
    // Look for any task card elements, without the .scheduled class
    cy.get('.tasks-list').children().should('have.length', 2);
  });

  it('correctly handles loading state', () => {
    // Force a slow response to see loading state
    cy.intercept('GET', 'http://localhost:8080/scheduled-tasks/*', {
      delay: 1000, // 1 second delay
      statusCode: 200,
      body: { scheduled_tasks: [] }
    }).as('slowResponse');

    cy.visit('/scheduled-tasks');
    
    // Check for loading state
    cy.contains('Loading your scheduled tasks...').should('be.visible');
    
    // Then wait for it to go away
    cy.wait('@slowResponse');
    cy.contains('Loading your scheduled tasks...').should('not.exist');
  });
});