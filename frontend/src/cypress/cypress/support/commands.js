// Login command to be reused across tests
Cypress.Commands.add('login', (email, password) => {
    cy.visit('/login');
    cy.get('input[name="email"]').type(email);
    cy.get('input[name="password"]').type(password);
    cy.get('button[type="submit"]').click();
  });
  
  // Register command
  Cypress.Commands.add('register', (name, email, mobile, password) => {
    cy.visit('/register');
    cy.get('input[name="name"]').type(name);
    cy.get('input[name="email"]').type(email);
    cy.get('input[name="mobile"]').type(mobile);
    cy.get('input[name="password"]').type(password);
    cy.get('button[type="submit"]').click();
  });
  
  // Mock login to bypass actual login (using localStorage token)
  Cypress.Commands.add('mockLogin', () => {
    // Create a fake token
    const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJpYXQiOjE1MTYyMzkwMjJ9.4p3aLVSNlhIX8CHrVhKdz5R3VDrcwNO9hBs5kOzlkb0';
    
    // Set it in localStorage
    localStorage.setItem('token', fakeToken);
    
    // Visit the protected route
    cy.visit('/dashboard');
  });
  
  // Command to create a new task
  Cypress.Commands.add('createTask', (task) => {
    cy.visit('/post-task');
    cy.get('input[name="title"]').type(task.title);
    cy.get('textarea[name="description"]').type(task.description);
    cy.get('input[name="task_date"]').type(task.task_date);
    cy.get('input[name="task_time"]').type(task.task_time);
    cy.get('input[name="estimated_pay_rate"]').type(task.estimated_pay_rate);
    cy.get('input[name="place_of_work"]').type(task.place_of_work);
    cy.get('select[name="work_type"]').select(task.work_type);
    cy.get('input[name="people_needed"]').clear().type(task.people_needed);
    cy.get('button[type="submit"]').click();
  });
  
  // Command to intercept API calls
  Cypress.Commands.add('interceptAPI', () => {
    // Intercept login request
    cy.intercept('POST', 'http://localhost:8080/login', (req) => {
      req.reply({
        statusCode: 200,
        body: {
          token: 'fake-jwt-token'
        }
      });
    }).as('loginRequest');
    
    // Intercept tasks feed
    cy.intercept('GET', 'http://localhost:8080/tasks/feed/**', {
      fixture: 'tasks.json'
    }).as('fetchTasks');
    
    // Intercept task creation
    cy.intercept('POST', 'http://localhost:8080/users/*/post_task', {
      statusCode: 201,
      body: {
        success: true,
        message: 'Task created successfully'
      }
    }).as('createTask');
  
    // Intercept task application
    cy.intercept('POST', 'http://localhost:8080/tasks/*/apply/*', {
      statusCode: 200,
      body: {
        success: true,
        message: 'Applied successfully'
      }
    }).as('applyTask');
  });