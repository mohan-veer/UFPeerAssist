// cypress.config.js

const { defineConfig } = require("cypress");
const path = require("path");

module.exports = defineConfig({
  component: {
    devServer: {
      framework: "react",
      bundler: "webpack",
      webpackConfig: {
        resolve: {
          alias: {
            // Create an alias for components directory
            '@components': path.resolve(__dirname, 'src/components')
          },
          // This helps webpack find modules
          modules: [
            path.resolve(__dirname, '.'), // Project root
            path.resolve(__dirname, 'src'),
            'node_modules'
          ],
          extensions: ['.js', '.jsx', '.ts', '.tsx']
        }
      }
    },
    specPattern: "cypress/component/**/*.cy.js",
    supportFile: 'cypress/support/component.js',
    indexHtmlFile: 'cypress/support/component-index.html',
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
  
  e2e: {
    baseUrl: "http://localhost:3000", // Assuming your React app runs on port 3000
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
    specPattern: "cypress/e2e/**/*.cy.js",
    supportFile: 'cypress/support/e2e.js',
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