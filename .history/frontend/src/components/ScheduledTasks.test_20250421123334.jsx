import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ScheduledTasks from '../components/ScheduledTasks';
import { getUserEmailFromToken } from '../utils/auth';

// Mock dependencies
jest.mock('../components/TaskCard', () => {
  return function MockTaskCard({ task }) {
    return <div data-testid="task-card">{task.title}</div>;
  };
});

jest.mock('../utils/auth', () => ({
  getUserEmailFromToken: jest.fn()
}));

// Mock fetch and localStorage
global.fetch = jest.fn();
global.localStorage = {
  getItem: jest.fn()
};

// Mock console.log to avoid cluttering test output
console.log = jest.fn();
console.error = jest.fn();

describe('ScheduledTasks Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getUserEmailFromToken.mockReturnValue('test@example.com');
    localStorage.getItem.mockReturnValue('fake-token');
  });

  test('renders loading state initially', () => {
    fetch.mockImplementationOnce(() => 
      new Promise(resolve => setTimeout(() => resolve({ 
        ok: true, 
        json: () => Promise.resolve({ scheduled_tasks: [] }) 
      }), 100))
    );

    render(<ScheduledTasks />);
    expect(screen.getByText('Loading your scheduled tasks...')).toBeInTheDocument();
  });

  test('displays error message when fetch fails', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'));

    render(<ScheduledTasks />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load scheduled tasks/)).toBeInTheDocument();
    });
  });

  test('displays error message when API returns error status', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: () => Promise.resolve('Internal Server Error')
    });

    render(<ScheduledTasks />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load scheduled tasks/)).toBeInTheDocument();
      expect(screen.getByText(/HTTP error! status: 500/)).toBeInTheDocument();
    });
  });

  test('displays "no tasks" message when no tasks are returned', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ scheduled_tasks: [] })
    });

    render(<ScheduledTasks />);

    await waitFor(() => {
      expect(screen.getByText("You don't have any scheduled tasks yet.")).toBeInTheDocument();
    });
  });

  test('renders scheduled tasks when data is loaded', async () => {
    const mockScheduledTasks = [
      {
        id: 1,
        title: 'Scheduled Task 1',
        description: 'This is a scheduled task'
      },
      {
        id: 2,
        title: 'Scheduled Task 2',
        description: 'This is another scheduled task'
      }
    ];

    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ scheduled_tasks: mockScheduledTasks })
    });

    render(<ScheduledTasks />);

    await waitFor(() => {
      expect(screen.getAllByTestId('task-card')).toHaveLength(2);
      expect(screen.getByText('Scheduled Task 1')).toBeInTheDocument();
      expect(screen.getByText('Scheduled Task 2')).toBeInTheDocument();
    });
  });

  test('handles tasks with _id property instead of id', async () => {
    const mockMongoTasks = [
      {
        _id: 'abc123',
        title: 'Task with MongoDB ID',
        description: 'This task has a MongoDB-style _id'
      }
    ];

    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ scheduled_tasks: mockMongoTasks })
    });

    render(<ScheduledTasks />);

    await waitFor(() => {
      expect(screen.getByText('Task with MongoDB ID')).toBeInTheDocument();
    });
  });

  test('handles error when user email is not found in token', async () => {
    getUserEmailFromToken.mockReturnValue(null);

    render(<ScheduledTasks />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load scheduled tasks/)).toBeInTheDocument();
      expect(screen.getByText(/User email not found in token/)).toBeInTheDocument();
    });
  });

  test('logs received tasks to console', async () => {
    const mockScheduledTasks = [
      {
        id: 1,
        title: 'Console Log Test',
        description: 'This task should be logged to console'
      }
    ];

    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ scheduled_tasks: mockScheduledTasks })
    });

    render(<ScheduledTasks />);

    await waitFor(() => {
      expect(console.log).toHaveBeenCalledWith("Received scheduled tasks:", expect.any(Object));
    });
  });
});