// cypress/component/UserProfile.cy.js

import React from 'react';
import { mount } from 'cypress/react';
import UserProfile from '../../src/components/UserProfile';
import * as authUtils from '../../src/utils/auth';
import { BrowserRouter } from 'react-router-dom';

describe('UserProfile Component - Basic Tests', () => {
  // Sample user profile data for testing
  const mockUserProfile = {
    email: 'test@example.com',
    name: 'Test User',
    bio: 'This is a test bio for the user profile.',
    mobile: '555-123-4567',
    skills: ['JavaScript', 'React', 'Node.js'],
    completed_tasks: 15,
    rating: 4.8,
    profileImage: null
  };

  beforeEach(() => {
    // Set up localStorage mock
    cy.window().then(win => {
      win.localStorage.setItem('token', 'fake-token');
    });

    // Stub the auth utility
    cy.stub(authUtils, 'getUserEmailFromToken').returns('test@example.com');
    
    // Suppress console logs and errors
    cy.window().then(win => {
      cy.stub(win.console, 'log');
      cy.stub(win.console, 'error');
    });
    
    // Mock fetch to return user profile data
    cy.window().then(win => {
      cy.stub(win, 'fetch').resolves({
        ok: true,
        json: () => Promise.resolve(mockUserProfile)
      });
    });
  });

  it('renders user profile', () => {
    mount(
      <BrowserRouter>
        <UserProfile />
      </BrowserRouter>
    );
    
    // Check that basic elements render
    cy.contains('h2', 'About Me').should('be.visible');
    cy.contains('p', 'This is a test bio for the user profile.').should('be.visible');
  });

  it('displays contact information', () => {
    mount(
      <BrowserRouter>
        <UserProfile />
      </BrowserRouter>
    );
    
    // Check contact section
    cy.contains('h2', 'Contact Information').should('be.visible');
    cy.contains('test@example.com').should('be.visible');
    cy.contains('555-123-4567').should('be.visible');
  });

  it('displays skills', () => {
    mount(
      <BrowserRouter>
        <UserProfile />
      </BrowserRouter>
    );
    
    // Check skills section
    cy.contains('h2', 'Skills').should('be.visible');
    cy.contains('JavaScript').should('be.visible');
    cy.contains('React').should('be.visible');
    cy.contains('Node.js').should('be.visible');
  });

  it('displays activity statistics', () => {
    mount(
      <BrowserRouter>
        <UserProfile />
      </BrowserRouter>
    );
    
    // Check activity section
    cy.contains('h2', 'Activity').should('be.visible');
    cy.contains('15').should('be.visible');
    cy.contains('4.8').should('be.visible');
  });

  it('shows edit button for own profile', () => {
    mount(
      <BrowserRouter>
        <UserProfile />
      </BrowserRouter>
    );
    
    // Check for edit button
    cy.contains('button', 'Edit Profile').should('be.visible');
  });
});