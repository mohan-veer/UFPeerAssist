import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CompletedTasks from '../components/CompletedTasks';
import { getUserEmailFromToken } from '../utils/auth';

// Mock dependencies
jest.mock('../components/TaskCard', () => {
  return function MockTaskCard({ task }) {
    return <div data-testid="task-card">{task.title}</div>;
  };
});

jest.mock('../components/DashboardHeader', () => {
  return function MockDashboardHeader() {
    return <div data-testid="dashboard-header">Dashboard Header</div>;
  };
});

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

// Mock fetch
global.fetch = jest.fn();

// Mock console.log and console.error to avoid cluttering test output
console.log = jest.fn();
console.error = jest.fn();

describe('CompletedTasks Component', () => {
  const mockCompletedTasks = [
    {
      _id: 'task1',
      title: 'Completed Task 1',
      description: 'This is a completed task',
      task_date: '2025-04-20',
      task_time: '14:00',
      estimated_pay_rate: 25,
      place_of_work: 'Remote',
      status: 'Completed'
    },
    {
      _id: 'task2',
      title: 'Completed Task 2',
      description: 'This is another completed task',
      task_date: '2025-04-22',
      task_time: '10:00',
      estimated_pay_rate: 30,
      place_of_work: 'Office',
      status: 'Completed'
    }
  ];

  const mockTasks = [
    ...mockCompletedTasks,
    {
      _id: 'task3',
      title: 'Open Task',
      description: 'This is an open task',
      task_date: '2025-04-25',
      task_time: '09:00',
      estimated_pay_rate: 20,
      place_of_work: 'Remote',
      status: 'Open'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    getUserEmailFromToken.mockReturnValue('test@example.com');
    
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ tasks: mockTasks })
    });
  });

  test('renders loading state initially', () => {
    render(<CompletedTasks />);
    expect(screen.getByText('Loading your completed tasks...')).toBeInTheDocument();
  });

  test('displays error message when fetch fails', async () => {
    fetch.mockReset();
    fetch.mockRejectedValueOnce(new Error('Network error'));

    render(<CompletedTasks />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load completed tasks/)).toBeInTheDocument();
    });
  });

  test('displays error message when API returns error status', async () => {
    fetch.mockReset();
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: () => Promise.resolve('Internal Server Error')
    });

    render(<CompletedTasks />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load completed tasks/)).toBeInTheDocument();
      expect(screen.getByText(/HTTP error! status: 500/)).toBeInTheDocument();
    });
  });

  test('displays "no tasks" message when no completed tasks are available', async () => {
    fetch.mockReset();
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ tasks: [
        {
          _id: 'task3',
          title: 'Open Task',
          description: 'This is an open task',
          status: 'Open'
        }
      ]})
    });

    render(<CompletedTasks />);

    await waitFor(() => {
      expect(screen.getByText("You don't have any completed tasks yet.")).toBeInTheDocument();
    });
  });

  test('renders completed tasks when data is loaded', async () => {
    render(<CompletedTasks />);

    await waitFor(() => {
      expect(screen.getAllByTestId('task-card')).toHaveLength(2);
      expect(screen.getByText('Completed Task 1')).toBeInTheDocument();
      expect(screen.getByText('Completed Task 2')).toBeInTheDocument();
      expect(screen.queryByText('Open Task')).not.toBeInTheDocument(); // Open task should be filtered out
    });
  });

  test('renders completed task badges', async () => {
    render(<CompletedTasks />);

    await waitFor(() => {
      const completedBadges = screen.getAllByText('✓ Completed');
      expect(completedBadges).toHaveLength(2);
    });
  });

  test('handles error when user email is not found in token', async () => {
    getUserEmailFromToken.mockReturnValue(null);

    render(<CompletedTasks />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load completed tasks/)).toBeInTheDocument();
      expect(screen.getByText(/User email not found in token/)).toBeInTheDocument();
    });
  });

  test('renders dashboard header', () => {
    render(<CompletedTasks />);
    expect(screen.getByTestId('dashboard-header')).toBeInTheDocument();
  });
});