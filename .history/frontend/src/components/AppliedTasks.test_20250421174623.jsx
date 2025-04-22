import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AppliedTasks from '../components/AppliedTasks';
import { getUserEmailFromToken } from '../utils/auth';

// Mock the auth utility
jest.mock('../utils/auth', () => ({
  getUserEmailFromToken: jest.fn()
}));

// Mock fetch
global.fetch = jest.fn();

// Properly mock localStorage
beforeEach(() => {
  // Set up a mock implementation of localStorage
  const localStorageMock = {
    getItem: jest.fn().mockReturnValue('fake-token'),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
  };
  
  // Replace the global localStorage object
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true
  });
});

describe('AppliedTasks Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getUserEmailFromToken.mockReturnValue('test@example.com');
    // No need to set localStorage.getItem mock return value here as it's set in the global beforeEach
  });

  test('renders loading state initially', () => {
    fetch.mockImplementationOnce(() => 
      new Promise(resolve => setTimeout(() => resolve({ 
        ok: true, 
        json: () => Promise.resolve({ applied_tasks: [] }) 
      }), 100))
    );

    render(<AppliedTasks />);
    expect(screen.getByText('Loading your applied tasks...')).toBeInTheDocument();
  });

  test('displays error message when fetch fails', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'));

    render(<AppliedTasks />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load applied tasks/)).toBeInTheDocument();
    });
  });

  test('displays "no tasks" message when no tasks are returned', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ applied_tasks: [] })
    });

    render(<AppliedTasks />);

    await waitFor(() => {
      expect(screen.getByText("You haven't applied for any tasks yet.")).toBeInTheDocument();
    });
  });

  test('renders applied tasks when data is loaded', async () => {
    const mockAppliedTasks = [
      {
        task: {
          id: 1,
          title: 'Test Task',
          description: 'This is a test task',
          task_date: '2025-04-20',
          task_time: '14:00',
          estimated_pay_rate: 25,
          place_of_work: 'Remote'
        },
        creator: {
          name: 'John Doe',
          email: 'john@example.com',
          mobile: '123-456-7890'
        },
        selected: false
      }
    ];

    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ applied_tasks: mockAppliedTasks })
    });

    render(<AppliedTasks />);

    await waitFor(() => {
      expect(screen.getByText('Test Task')).toBeInTheDocument();
      expect(screen.getByText('This is a test task')).toBeInTheDocument();
      expect(screen.getByText(/John Doe/)).toBeInTheDocument();
      expect(screen.getByText('Pending')).toBeInTheDocument();
    });
  });

  test('shows selected status when user is selected for a task', async () => {
    const mockAppliedTasks = [
      {
        task: {
          id: 1,
          title: 'Selected Task',
          description: 'This is a selected task',
          task_date: '2025-04-20',
          task_time: '14:00',
          estimated_pay_rate: 25,
          place_of_work: 'Remote'
        },
        creator: {
          name: 'John Doe',
          email: 'john@example.com',
          mobile: '123-456-7890'
        },
        selected: true
      }
    ];

    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ applied_tasks: mockAppliedTasks })
    });

    render(<AppliedTasks />);

    await waitFor(() => {
      expect(screen.getByText('Selected Task')).toBeInTheDocument();
      expect(screen.getByText('✓ Selected')).toBeInTheDocument();
      expect(screen.getByText('You have been selected for this task!')).toBeInTheDocument();
    });
  });

  test('handles error when user email is not found in token', async () => {
    getUserEmailFromToken.mockReturnValue(null);

    render(<AppliedTasks />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load applied tasks/)).toBeInTheDocument();
      expect(screen.getByText(/User email not found in token/)).toBeInTheDocument();
    });
  });

  test('handles HTTP error from API', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 500
    });

    render(<AppliedTasks />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load applied tasks/)).toBeInTheDocument();
      expect(screen.getByText(/HTTP error! status: 500/)).toBeInTheDocument();
    });
  });

  test('formats date correctly', async () => {
    const mockAppliedTasks = [
      {
        task: {
          id: 1,
          title: 'Test Task',
          description: 'This is a test task',
          task_date: '2025-04-20',
          task_time: '14:00',
          estimated_pay_rate: 25,
          place_of_work: 'Remote'
        },
        creator: {
          name: 'John Doe',
          email: 'john@example.com',
          mobile: '123-456-7890'
        },
        selected: false
      }
    ];

    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ applied_tasks: mockAppliedTasks })
    });

    render(<AppliedTasks />);

    await waitFor(() => {
      // The exact format will depend on the locale, but should contain 2025, April, and 20
      const dateElement = screen.getByText(/Date:/);
      expect(dateElement.nextSibling.textContent).toMatch(/April 20, 2025|4\/20\/2025|20\/4\/2025/);
    });
  });
});