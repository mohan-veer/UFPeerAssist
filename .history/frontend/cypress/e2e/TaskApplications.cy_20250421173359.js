// cypress/e2e/taskapplications.cy.js
describe('Task Applications Page', () => {
    beforeEach(() => {
      // Mock the auth token
      cy.window().then((win) => {
        win.localStorage.setItem('token', 'fake-jwt-token');
      });
  
      // Stub the network request for fetching tasks
      cy.intercept('GET', 'http://localhost:8080/users/*/created-tasks', {
        statusCode: 200,
        body: {
          tasks: [
            {
              _id: 'task1',
              title: 'Cypress Task 1',
              description: 'This is a test task from Cypress',
              task_date: '2025-04-20',
              task_time: '14:00',
              estimated_pay_rate: 25,
              place_of_work: 'Remote',
              status: 'Open',
              people_needed: 2,
              selected_users: ['selected@example.com'],
              applicants: ['applicant1@example.com', 'applicant2@example.com', 'selected@example.com']
            },
            {
              _id: 'task2',
              title: 'Cypress Task 2',
              description: 'This is another test task from Cypress',
              task_date: '2025-04-22',
              task_time: '10:00',
              estimated_pay_rate: 30,
              place_of_work: 'Office',
              status: 'Open',
              people_needed: 1,
              selected_users: ['selected@example.com'],
              applicants: ['applicant3@example.com', 'selected@example.com']
            }
          ]
        }
      });
  
      // Visit the task applications page
      cy.visit('/task-applications');
    });
  
    it('displays the task applications heading', () => {
      cy.contains('h2', 'Task Applications').should('be.visible');
    });
  
    it('displays all task cards', () => {
      cy.contains('Cypress Task 1').should('be.visible');
      cy.contains('Cypress Task 2').should('be.visible');
    });
  
    it('shows correct task details', () => {
      cy.contains('Cypress Task 1')
        .parents('.task-with-applicants')
        .within(() => {
          cy.contains('Date: April 20, 2025').should('be.visible');
          cy.contains('Time: 14:00').should('be.visible');
          cy.contains('Pay Rate: $25/hr').should('be.visible');
          cy.contains('Location: Remote').should('be.visible');
          cy.contains('Status: Open').should('be.visible');
          cy.contains('People Needed: 2').should('be.visible');
          cy.contains('People Selected: 1 / 2').should('be.visible');
        });
    });
  
    it('displays applicants correctly', () => {
      cy.contains('Cypress Task 1')
        .parents('.task-with-applicants')
        .within(() => {
          cy.contains('Applicants (3)').should('be.visible');
          cy.contains('applicant1@example.com').should('be.visible');
          cy.contains('applicant2@example.com').should('be.visible');
          cy.contains('selected@example.com').should('be.visible');
        });
    });
  
    it('shows selected badge for selected applicants', () => {
      cy.contains('selected@example.com')
        .parents('li')
        .within(() => {
          cy.contains('Selected').should('be.visible');
          cy.get('button').should('not.exist'); // No Accept button for selected applicants
        });
    });
  
    it('shows Accept button for non-selected applicants', () => {
      cy.contains('applicant1@example.com')
        .parents('li')
        .within(() => {
          cy.contains('Selected').should('not.exist');
          cy.contains('button', 'Accept').should('be.visible');
        });
    });
  
    it('shows limit reached warning when applicable', () => {
      cy.contains('Cypress Task 2')
        .parents('.task-with-applicants')
        .within(() => {
          cy.contains('Maximum number of people (1) already selected for this task.').should('be.visible');
        });
    });
  
    it('shows disabled Limit Reached button when limit is reached', () => {
      cy.contains('Cypress Task 2')
        .parents('.task-with-applicants')
        .contains('applicant3@example.com')
        .parents('li')
        .within(() => {
          cy.contains('button', 'Limit Reached').should('be.visible');
          cy.contains('button', 'Limit Reached').should('be.disabled');
        });
    });
  
    it('accepts an applicant when clicking Accept', () => {
      // Stub the accept applicant API call
      cy.intercept('POST', 'http://localhost:8080/tasks/task1/accept/applicant1@example.com', {
        statusCode: 200,
        body: { message: 'Applicant accepted successfully' }
      }).as('acceptApplicant');
  
      // Click the Accept button
      cy.contains('applicant1@example.com')
        .parents('li')
        .contains('button', 'Accept')
        .click();
  
      // Verify the API call was made
      cy.wait('@acceptApplicant');
  
      // Check that the alert was shown (requires stub of window.alert)
      cy.on('window:alert', (text) => {
        expect(text).to.equal('Successfully accepted applicant1@example.com for this task');
      });
    });
  
    it('handles error when accepting an applicant', () => {
      // Stub the accept applicant API call with an error
      cy.intercept('POST', 'http://localhost:8080/tasks/task1/accept/applicant1@example.com', {
        statusCode: 400,
        body: { error: 'Failed to accept applicant' }
      }).as('acceptApplicantError');
  
      // Click the Accept button
      cy.contains('applicant1@example.com')
        .parents('li')
        .contains('button', 'Accept')
        .click();
  
      // Verify the API call was made
      cy.wait('@acceptApplicantError');
  
      // Check that the error alert was shown
      cy.on('window:alert', (text) => {
        expect(text).to.equal('Error: Failed to accept applicant');
      });
    });
  
    it('disables Accept button during processing', () => {
      // Stub the accept applicant API call with a delay
      cy.intercept('POST', 'http://localhost:8080/tasks/task1/accept/applicant1@example.com', {
        delay: 1000, // Add a 1-second delay
        statusCode: 200,
        body: { message: 'Applicant accepted successfully' }
      }).as('acceptApplicantSlow');
  
      // Click the Accept button
      cy.contains('applicant1@example.com')
        .parents('li')
        .contains('button', 'Accept')
        .click();
  
      // Verify the button is disabled and shows "Processing..."
      cy.contains('applicant1@example.com')
        .parents('li')
        .contains('button', 'Processing...')
        .should('be.disabled');
  
      // Wait for the request to complete
      cy.wait('@acceptApplicantSlow');
  
      // Verify the button is back to normal (this may need to be adjusted based on your implementation)
      cy.contains('applicant1@example.com').should('not.exist'); // Assuming the UI updates to remove this applicant
    });
  
    it('handles empty applicants list', () => {
      // Intercept with a task that has no applicants
      cy.intercept('GET', 'http://localhost:8080/users/*/created-tasks', {
        statusCode: 200,
        body: {
          tasks: [
            {
              _id: 'task3',
              title: 'Cypress Task No Applicants',
              task_date: '2025-04-20',
              task_time: '14:00',
              estimated_pay_rate: 25,
              place_of_work: 'Remote',
              status: 'Open',
              people_needed: 2,
              selected_users: [],
              applicants: []
            }
          ]
        }
      });
  
      cy.visit('/task-applications');
      cy.contains('Cypress Task No Applicants').should('be.visible');
      cy.contains('No applicants yet.').should('be.visible');
    });
  
    it('handles error state', () => {
      cy.intercept('GET', 'http://localhost:8080/users/*/created-tasks', {
        statusCode: 500,
        body: { error: 'Server error' }
      });
  
      cy.visit('/task-applications');
      cy.contains('Failed to load tasks').should('be.visible');
    });
  
    it('handles empty tasks list', () => {
      cy.intercept('GET', 'http://localhost:8080/users/*/created-tasks', {
        statusCode: 200,
        body: { tasks: [] }
      });
  
      cy.visit('/task-applications');
      cy.contains("You haven't created any tasks yet.").should('be.visible');
    });
  });