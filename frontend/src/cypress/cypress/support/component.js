// cypress/support/component.js

// Import commands.js using ES2015 syntax:
import './commands';

// Import React
import React from 'react';

// Import the mount function
import { mount } from 'cypress/react';

// Add the mount command
Cypress.Commands.add('mount', mount);

// Optional: If you're using any global providers, you can wrap the mount command
// For example, if you use React Router:
// Cypress.Commands.add('mount', (component, options = {}) => {
//   const { routerProps = { initialEntries: ['/'] }, ...mountOptions } = options;
//
//   const wrapped = (
//     <BrowserRouter {...routerProps}>
//       {component}
//     </BrowserRouter>
//   );
//
//   return mount(wrapped, mountOptions);
// });