// cypress.config.js

const { defineConfig } = require("cypress");

module.exports = defineConfig({
  component: {
    devServer: {
        framework: "react",
        bundler: "webpack",
    },
    specPattern: "cypress/component/**/*.cy.js", // This is the default pattern
    supportFile: 'cypress/support/component.js',
    indexHtmlFile: 'cypress/support/component-index.html',    
  },
  e2e: {
    baseUrl: "http://localhost:3000", // Assuming your React app runs on port 3000
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
    specPattern: "cypress/e2e/**/*.cy.js",
    supportFile: 'cypress/support/e2e.js',

  },

  component: {
    devServer: {
      framework: "react",
      bundler: "webpack",
    },
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
  
  // Configuration options
  viewportWidth: 1280,
  viewportHeight: 800,
  defaultCommandTimeout: 5000,
  requestTimeout: 5000,
  responseTimeout: 5000,
  video: false, // Disable video recording to speed up test runs
  screenshotOnRunFailure: true,
  
  // Custom configuration
  env: {
    apiUrl: "http://localhost:8080", // Your backend API URL
  },
});