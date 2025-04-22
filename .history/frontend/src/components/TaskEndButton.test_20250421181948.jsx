import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TaskEndButton from '../components/TaskEndButton';
import { getUserEmailFromToken } from '../utils/auth';

// Mock the auth utility
jest.mock('../utils/auth', () => ({
  getUserEmailFromToken: jest.fn()
}));

// Suppress React act() warnings
beforeAll(() => {
  const originalError = console.error;
  console.error = (...args) => {
    if (/Warning.*not wrapped in act/.test(args[0])) {
      return;
    }
    originalError.call(console, ...args);
  };
});

// Properly mock localStorage
beforeEach(() => {
  const localStorageMock = {
    getItem: jest.fn().mockReturnValue('fake-token'),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
  };
  
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true
  });
});

// Mock fetch
global.fetch = jest.fn();

// Mock console methods
console.log = jest.fn();
console.error = jest.fn();

describe('TaskEndButton Component', () => {
  const mockTask = {
    _id: 'task123',
    title: 'Test Task',
    description: 'This is a test task',
    selected_users: ['user@example.com'],
    creator_email: 'creator@example.com'
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
    getUserEmailFromToken.mockReturnValue('user@example.com');
  });
  
  test('renders end button correctly', () => {
    render(<TaskEndButton task={mockTask} />);
    
    expect(screen.getByText('End Task')).toBeInTheDocument();
    expect(screen.getByText('This will send a notification to the task owner to verify completion.')).toBeInTheDocument();
  });
  
  test('shows processing state during API call', async () => {
    fetch.mockImplementationOnce(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: () => Promise.resolve({ message: 'Success' })
      }), 100))
    );
    
    render(<TaskEndButton task={mockTask} />);
    
    const button = screen.getByText('End Task');
    fireEvent.click(button);
    
    expect(screen.getByText('Processing...')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.queryByText('Processing...')).not.toBeInTheDocument();
    });
  });
  
  test('handles successful task end', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ message: 'Task end initiated successfully' })
    });
    
    render(<TaskEndButton task={mockTask} />);
    
    const button = screen.getByText('End Task');
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText('✅ Task completion initiated')).toBeInTheDocument();
      expect(screen.getByText('An OTP has been sent to the task owner for verification.')).toBeInTheDocument();
    });
  });
  
  test('handles API error', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Failed to end task' })
    });
    
    render(<TaskEndButton task={mockTask} />);
    
    const button = screen.getByText('End Task');
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to end task')).toBeInTheDocument();
    });
  });
  
  test('handles network error', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'));
    
    render(<TaskEndButton task={mockTask} />);
    
    const button = screen.getByText('End Task');
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText('Connection error. Please try again.')).toBeInTheDocument();
    });
  });
  
  test('handles missing user email', async () => {
    getUserEmailFromToken.mockReturnValue(null);
    
    render(<TaskEndButton task={mockTask} />);
    
    const button = screen.getByText('End Task');
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText('You must be logged in to end this task')).toBeInTheDocument();
      expect(fetch).not.toHaveBeenCalled();
    });
  });
  
  test('handles unauthorized user', async () => {
    getUserEmailFromToken.mockReturnValue('another@example.com');
    
    render(<TaskEndButton task={mockTask} />);
    
    const button = screen.getByText('End Task');
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText('You are not authorized to end this task')).toBeInTheDocument();
      expect(fetch).not.toHaveBeenCalled();
    });
  });
  
  test('sends correct API request', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ message: 'Success' })
    });
    
    render(<TaskEndButton task={mockTask} />);
    
    const button = screen.getByText('End Task');
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        `http://localhost:8080/tasks/${mockTask._id}/end/user@example.com`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer fake-token'
          }
        }
      );
    });
  });
  
  test('logs success message', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ message: 'Success' })
    });
    
    render(<TaskEndButton task={mockTask} />);
    
    const button = screen.getByText('End Task');
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(console.log).toHaveBeenCalledWith('Successfully initiated task completion');
    });
  });
  
  test('logs error message', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Failed to end task' })
    });
    
    render(<TaskEndButton task={mockTask} />);
    
    const button = screen.getByText('End Task');
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(console.error).toHaveBeenCalledWith('Failed to end task:', expect.any(Object));
    });
  });
});