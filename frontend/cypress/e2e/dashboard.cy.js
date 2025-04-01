// cypress/e2e/dashboard.cy.js

describe('Dashboard Navigation and Functionality', () => {
    beforeEach(() => {
      // Set a token in localStorage before navigation
      cy.window().then((win) => {
        win.localStorage.setItem('token', 'fake-jwt-token');
      });
      
      // Intercept any potential redirect attempts
      cy.intercept('**/login*').as('loginRedirect');
      
      // Stub API calls to prevent failures
      cy.intercept('GET', '**/tasks/feed/**', { body: { tasks: [] } }).as('fetchTasks');
      cy.intercept('GET', '**/users/*/notifications', { body: { notifications: [] } }).as('fetchNotifications');
      
      // Also intercept any other API calls that might happen
      cy.intercept('GET', '**/users/**', { body: {} }).as('userRequests');
      cy.intercept('GET', '**/dashboard/**', { body: {} }).as('dashboardRequests');
    });
  
    it('displays the dashboard with debug information', () => {
      // Visit with logging
      cy.visit('/dashboard', {
        onBeforeLoad(win) {
          // Add some debugging
          win.addEventListener('error', (e) => {
            console.error('Page error: ', e);
          });
          
          // Monitor redirects
          const originalPushState = win.history.pushState;
          win.history.pushState = function() {
            console.log('Navigation occurred:', arguments);
            return originalPushState.apply(this, arguments);
          };
        }
      });
      
      // Check for redirects
      cy.on('url:changed', (newUrl) => {
        console.log('URL changed to:', newUrl);
      });
      
      // Log the document body to see what's actually rendering
      cy.document().then(doc => {
        console.log('Current HTML:', doc.body.innerHTML);
      });
      
      // First just check if ANY content rendered
      cy.get('body').should('not.be.empty');
      
      // Try some more general selectors first
      cy.contains('Dashboard', { timeout: 10000 }).should('exist');
      
      // Log what classes are actually present
      cy.get('body > *').then($elements => {
        const classes = [];
        $elements.each((i, el) => {
          if (el.classList && el.classList.length > 0) {
            for (let j = 0; j < el.classList.length; j++) {
              classes.push(el.classList[j]);
            }
          }
          // Also log the element's tag and first few children
          console.log('Element:', el.tagName, el.className);
          if (el.children && el.children.length > 0) {
            console.log('First child:', el.children[0].tagName, el.children[0].className);
          }
        });
        console.log('Available top-level classes:', classes);
      });
      
      // Try to log all elements with class containing 'dashboard'
      cy.get('[class*="dashboard"]').then($elements => {
        console.log('Elements with dashboard in class:', $elements.length);
        $elements.each((i, el) => {
          console.log('Dashboard element:', el.tagName, el.className);
        });
      });
      
      // Try to find header elements
      cy.get('header').then($headers => {
        console.log('Found headers:', $headers.length);
        $headers.each((i, el) => {
          console.log('Header:', el.className);
        });
      });
      
      // Check for nav elements
      cy.get('nav').then($navs => {
        console.log('Found navs:', $navs.length);
        $navs.each((i, el) => {
          console.log('Nav:', el.className);
        });
      });
  
      // Try a more basic check for dashboard structure
      cy.get('div').contains('Dashboard').should('exist');
      cy.get('div').contains('Tasks').should('exist');
    });
  
    it('has navigation links', () => {
      cy.visit('/dashboard');
      
      // Try to find any kind of navigation links
      cy.get('a').then($links => {
        console.log('Found links:', $links.length);
        $links.each((i, el) => {
          console.log('Link:', el.textContent, el.getAttribute('href'));
        });
      });
      
      // Try to interact with any visible links
      cy.get('a').first().should('be.visible');
    });
  
    it('checks for login redirect', () => {
      // Remove token to see if it redirects
      cy.window().then((win) => {
        win.localStorage.removeItem('token');
      });
      
      cy.visit('/dashboard');
      
      // Check if we get redirected to login
      cy.url().should('include', '/login');
    });
  });