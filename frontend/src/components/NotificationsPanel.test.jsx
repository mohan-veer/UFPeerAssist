import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import NotificationsPanel from './NotificationsPanel';

describe('NotificationsPanel Component', () => {
  test('renders notifications panel with title', () => {
    render(<NotificationsPanel />);
    
    expect(screen.getByText('Notifications')).toBeInTheDocument();
  });

  test('displays all notifications', () => {
    render(<NotificationsPanel />);
    
    // Check for specific notification messages
    expect(screen.getByText('New task posted: "Help with Calculus Homework"')).toBeInTheDocument();
    expect(screen.getByText('Alice accepted your task.')).toBeInTheDocument();
    expect(screen.getByText('Reminder: update task status for "Group Project Assistance".')).toBeInTheDocument();
  });

  test('renders correct number of notifications', () => {
    render(<NotificationsPanel />);
    
    // There should be 3 notification items
    const notificationItems = screen.getAllByRole('listitem');
    expect(notificationItems).toHaveLength(3);
  });
});