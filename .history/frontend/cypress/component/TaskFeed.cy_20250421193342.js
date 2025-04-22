// cypress/component/TaskFeed.cy.js

import React from 'react';
import { mount } from 'cypress/react';
import TaskFeed from '../../src/components/TaskFeed';
import * as authUtils from '../../src/utils/auth';

describe('TaskFeed Component', () => {
  beforeEach(() => {
    // Mock tasks data
    const mockTasks = [
      {
        id: '1',
        title: 'Math Tutoring Help',
        description: 'Need help with Calculus homework',
        task_date: '2025-04-15',
        task_time: '14:00',
        estimated_pay_rate: 20,
        place_of_work: 'Library West',
        work_type: 'Tutoring',
        people_needed: 1,
        creator_email: 'creator@example.com',
        views: 15,
        applicants: []
      },
      {
        id: '2',
        title: 'Help Moving Furniture',
        description: 'Need help moving furniture to new apartment',
        task_date: '2025-04-20',
        task_time: '10:00',
        estimated_pay_rate: 25,
        place_of_work: 'Gainesville Place Apartments',
        work_type: 'HouseShifting',
        people_needed: 2,
        creator_email: 'creator@example.com',
        views: 8,
        applicants: []
      }
    ];
    
    // Mock the getUserEmailFromToken function
    cy.stub(authUtils, 'getUserEmailFromToken').returns('test@example.com');
    
    // Set token in localStorage
    cy.window().then((win) => {
      win.localStorage.setItem('token', 'fake-token');
      
      // Suppress console logs for cleaner test output
      cy.stub(win.console, 'log');
      cy.stub(win.console, 'error');
    });
    
    // Mock the fetch call directly instead of using intercept
    cy.window().then((win) => {
      cy.stub(win, 'fetch').callsFake((url) => {
        console.log('Mocked fetch call to:', url);
        
        // Return filtered data if URL contains a category
        if (url.includes('category=Tutoring')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ 
              tasks: [mockTasks[0]] // Only the tutoring task
            })
          });
        } 
        // Return empty data for empty task test
        else if (url.includes('empty=true')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ tasks: [] })
          });
        }
        // Return error for error test
        else if (url.includes('error=true')) {
          return Promise.resolve({
            ok: false,
            status: 500,
            text: () => Promise.resolve('Server error')
          });
        }
        // Default return all tasks
        else {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ tasks: mockTasks })
          });
        }
      });
    });
  });

  it('renders the task feed with tasks', () => {
    cy.mount(<TaskFeed />);
    
    // Check title (wait for it to be visible to ensure component has loaded)
    cy.get('h2').should('be.visible').and('contain', 'Available Tasks');
    
    // Check if filter controls are visible
    cy.get('.filter-controls').should('be.visible');
    
    // Wait for tasks to load and be visible
    cy.get('.tasks-container').should('be.visible');
    cy.get('.task-card').should('have.length.at.least', 1);
    
    // Check first task details
    cy.get('.task-card').first().within(() => {
      cy.contains('Math Tutoring Help').should('be.visible');
    });
  });

  it('displays loading state correctly', () => {
    // Modify fetch to delay the response
    cy.window().then((win) => {
      const originalFetch = win.fetch;
      cy.stub(win, 'fetch').callsFake((url) => {
        // Return a promise that resolves after a delay
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: () => Promise.resolve({ tasks: [] })
            });
          }, 500);
        });
      });
    });
    
    cy.mount(<TaskFeed />);
    
    // Loading state should be visible
    cy.get('.loading-container').should('be.visible');
    cy.get('.loading-container').should('contain', 'Loading tasks...');
    
    // After delay, loading should disappear
    cy.get('.loading-container').should('not.exist', { timeout: 6000 });
  });

  it('handles filter changes', () => {
    cy.mount(<TaskFeed />);
    
    // Wait for tasks to load
    cy.get('.tasks-container').should('be.visible');
    cy.get('.task-card').should('have.length.at.least', 1);
    
    // Use force option to select category even if disabled
    cy.get('select[name="category"]').select('Tutoring', { force: true });
    
    // Verify filtered results (only the tutoring task should remain)
    cy.contains('Math Tutoring Help').should('be.visible');
    cy.contains('Help Moving Furniture').should('not.exist');
  });

  it('handles empty task list', () => {
    // Mount the component with a special parameter that will trigger the empty response
    cy.mount(<TaskFeed emptyTest={true} />);
    
    // We need to trigger a filter change to get the empty response
    cy.get('select[name="category"]').select('', { force: true });
    cy.window().then(win => {
      // Force the URL to include empty=true to trigger our empty response
      win.fetch = cy.stub().resolves({
        ok: true,
        json: () => Promise.resolve({ tasks: [] })
      });
    });
    
    // Trigger a filter change to reload data
    cy.get('button.clear-filters-btn').click();
    
    // Check if no tasks message is displayed
    cy.contains('No tasks available').should('be.visible');
  });

  it('handles fetch errors', () => {
    // Mount the component with a special parameter that will trigger the error response
    cy.mount(<TaskFeed errorTest={true} />);
    
    // We need to trigger a filter change to get the error response
    cy.window().then(win => {
      // Force fetch to return an error
      win.fetch = cy.stub().resolves({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Server error')
      });
    });
    
    // Trigger a filter change to reload data
    cy.get('button.clear-filters-btn').click();
    
    // Error message should be visible
    cy.contains('Failed to load tasks').should('be.visible');
  });
});