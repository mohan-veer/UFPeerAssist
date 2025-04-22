import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import TaskEndButton from '../components/TaskEndButton';
import * as authUtils from '../utils/auth';

// Mock the auth utility
jest.mock('../utils/auth');

describe('TaskEndButton Component', () => {
  const mockTask = {
    _id: 'task123',
    title: 'Test Task',
    description: 'This is a test task',
    selected_users: ['user@example.com'],
    creator_email: 'creator@example.com'
  };

  beforeEach(() => {
    // Setup fetch mock
    global.fetch = jest.fn();
    
    // Setup localStorage mock
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(() => 'fake-token'),
        setItem: jest.fn(),
        removeItem: jest.fn()
      },
      writable: true
    });
    
    // Mock getUserEmailFromToken to return selected user email
    authUtils.getUserEmailFromToken.mockReturnValue('user@example.com');
    
    // Properly mock console.error as a Jest spy
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    // Clean up mocks
    jest.clearAllMocks();
  });

  it('renders end button correctly', () => {
    render(<TaskEndButton task={mockTask} />);
    
    // Check button text
    expect(screen.getByText('End Task')).toBeInTheDocument();
    
    // Check help text
    expect(screen.getByText('This will send a notification to the task owner to verify completion.')).toBeInTheDocument();
  });

  it('shows success message after clicking end button', async () => {
    // Mock successful API response
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ message: 'Success' })
    });

    render(<TaskEndButton task={mockTask} />);
    
    // Click end button
    fireEvent.click(screen.getByText('End Task'));
    
    // Wait for success message
    await waitFor(() => {
      expect(screen.getByText('✅ Task completion initiated')).toBeInTheDocument();
    });
    
    // Check for OTP message
    expect(screen.getByText('An OTP has been sent to the task owner for verification.')).toBeInTheDocument();
    
    // End button should not be visible anymore
    expect(screen.queryByText('End Task')).not.toBeInTheDocument();
    
    // Verify console.log was called with success message
    expect(console.log).toHaveBeenCalledWith('Successfully initiated task completion');
  });

  it('shows error message when API returns error', async () => {
    // Mock API error response
    global.fetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Failed to end task' })
    });

    render(<TaskEndButton task={mockTask} />);
    
    // Click end button
    fireEvent.click(screen.getByText('End Task'));
    
    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText('Failed to end task')).toBeInTheDocument();
    });
    
    // Verify console.error was called
    expect(console.error).toHaveBeenCalled();
  });

  it('shows error when user email is not found', async () => {
    // Mock getUserEmailFromToken to return null
    authUtils.getUserEmailFromToken.mockReturnValue(null);

    render(<TaskEndButton task={mockTask} />);
    
    // Click end button
    fireEvent.click(screen.getByText('End Task'));
    
    // Check error message
    expect(screen.getByText('You must be logged in to end this task')).toBeInTheDocument();
  });

  it('shows error when user is not authorized', async () => {
    // Mock getUserEmailFromToken to return a different email
    authUtils.getUserEmailFromToken.mockReturnValue('another@example.com');

    render(<TaskEndButton task={mockTask} />);
    
    // Click end button
    fireEvent.click(screen.getByText('End Task'));
    
    // Check error message
    expect(screen.getByText('You are not authorized to end this task')).toBeInTheDocument();
  });

  it('handles network errors gracefully', async () => {
    // Mock fetch to reject with network error
    global.fetch.mockRejectedValue(new Error('Network error'));

    render(<TaskEndButton task={mockTask} />);
    
    // Click end button
    fireEvent.click(screen.getByText('End Task'));
    
    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText('Connection error. Please try again.')).toBeInTheDocument();
    });
  });
});