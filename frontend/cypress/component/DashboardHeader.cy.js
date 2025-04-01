// cypress/component/DashboardHeader.cy.js - Simplified version

import React from 'react';
import { mount } from 'cypress/react';
import { BrowserRouter } from 'react-router-dom';
import DashboardHeader from '../../src/components/DashboardHeader';

describe('DashboardHeader Component', () => {
  it('renders header components correctly', () => {
    cy.mount(
      <BrowserRouter>
        <DashboardHeader />
      </BrowserRouter>
    );
    
    // Check logo
    cy.get('.logo img').should('be.visible');
    cy.get('.logo img').should('have.attr', 'alt', 'UF Peer Assist Logo');
    
    // Check navigation links
    cy.get('.header-nav ul li').should('have.length', 3);
    cy.get('.header-nav ul li').eq(0).should('contain', 'Home');
    cy.get('.header-nav ul li').eq(1).should('contain', 'Post a Task');
    cy.get('.header-nav ul li').eq(2).should('contain', 'Messages');
    
    // Check profile section
    cy.get('.profile-section').should('be.visible');
    cy.get('.profile-link img').should('be.visible');
    cy.get('.profile-link span').should('contain', 'Student Name');
    
    // Check logout button
    cy.get('.logout-button').should('be.visible');
    cy.get('.logout-button').should('contain', 'Logout');
  });

  it('has navigation links with correct URLs', () => {
    cy.mount(
      <BrowserRouter>
        <DashboardHeader />
      </BrowserRouter>
    );
    
    // Verify the href attributes of links
    cy.get('.header-nav ul li').eq(0).find('a')
      .should('have.attr', 'href', '/dashboard');
    
    cy.get('.header-nav ul li').eq(1).find('a')
      .should('have.attr', 'href', '/post-task');
    
    cy.get('.header-nav ul li').eq(2).find('a')
      .should('have.attr', 'href', '/messages');
    
    cy.get('.profile-link')
      .should('have.attr', 'href', '/profile');
  });

  it('has a clickable logout button', () => {
    cy.mount(
      <BrowserRouter>
        <DashboardHeader />
      </BrowserRouter>
    );
    
    // Just verify the button exists and can be clicked
    // We don't test the actual logout functionality in component tests
    cy.get('.logout-button').should('be.visible').click();
  });
});