import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import TaskApplications from '../components/TaskApplications';
import { getUserEmailFromToken } from "../utils/auth";

// Mock dependencies
jest.mock('../utils/auth', () => ({
  getUserEmailFromToken: jest.fn()
}));

// Mock fetch and localStorage
global.fetch = jest.fn();
global.localStorage = {
  getItem: jest.fn()
};

// Mock window.alert
global.alert = jest.fn();

describe('TaskApplications Component', () => {
  const mockTasks = [
    {
      _id: 'task1',
      title: 'Test Task 1',
      description: 'This is test task 1',
      task_date: '2025-04-20',
      task_time: '14:00',
      estimated_pay_rate: 25,
      place_of_work: 'Remote',
      status: 'Open',
      people_needed: 2,
      selected_users: ['selected@example.com'],
      applicants: ['applicant1@example.com', 'applicant2@example.com', 'selected@example.com']
    },
    {
      _id: 'task2',
      title: 'Test Task 2',
      description: 'This is test task 2',
      task_date: '2025-04-22',
      task_time: '10:00',
      estimated_pay_rate: 30,
      place_of_work: 'Office',
      status: 'Open',
      people_needed: 1,
      selected_users: ['selected@example.com'],
      applicants: ['applicant3@example.com', 'selected@example.com']
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    getUserEmailFromToken.mockReturnValue('creator@example.com');
    localStorage.getItem.mockReturnValue('fake-token');
    
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ tasks: mockTasks })
    });
  });

  it('renders loading state initially', () => {
    render(<TaskApplications />);
    expect(screen.getByText('Loading your tasks...')).toBeInTheDocument();
  });

  it('displays error message when fetch fails', async () => {
    fetch.mockReset();
    fetch.mockRejectedValueOnce(new Error('Network error'));

    render(<TaskApplications />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load tasks/)).toBeInTheDocument();
    });
  });

  it('displays "no tasks" message when no tasks are returned', async () => {
    fetch.mockReset();
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ tasks: [] })
    });

    render(<TaskApplications />);

    await waitFor(() => {
      expect(screen.getByText("You haven't created any tasks yet.")).toBeInTheDocument();
    });
  });

  it('renders tasks and applicants when data is loaded', async () => {
    render(<TaskApplications />);

    await waitFor(() => {
      expect(screen.getByText('Test Task 1')).toBeInTheDocument();
      expect(screen.getByText('Test Task 2')).toBeInTheDocument();
      expect(screen.getAllByText('Selected').length).toBe(2); // One for each task
      expect(screen.getByText('applicant1@example.com')).toBeInTheDocument();
      expect(screen.getByText('applicant2@example.com')).toBeInTheDocument();
      expect(screen.getByText('applicant3@example.com')).toBeInTheDocument();
    });
  });

  it('shows correct number of people selected', async () => {
    render(<TaskApplications />);

    await waitFor(() => {
      expect(screen.getByText('People Selected: 1 / 2')).toBeInTheDocument(); // For task1
      expect(screen.getByText('People Selected: 1 / 1')).toBeInTheDocument(); // For task2
    });
  });

  it('disables Accept button when people limit is reached', async () => {
    render(<TaskApplications />);

    await waitFor(() => {
      // Task2 has reached its limit (1/1)
      const task2Card = screen.getByText('Test Task 2').closest('.task-with-applicants');
      const limitReachedButton = task2Card.querySelector('button.disabled');
      expect(limitReachedButton).toBeInTheDocument();
      expect(limitReachedButton).toHaveAttribute('disabled');
      expect(limitReachedButton).toHaveTextContent('Limit Reached');
    });
  });

  it('shows warning when people limit is reached', async () => {
    render(<TaskApplications />);

    await waitFor(() => {
      // Task2 has reached its limit (1/1)
      const task2Card = screen.getByText('Test Task 2').closest('.task-with-applicants');
      const warning = task2Card.querySelector('.limit-reached-warning');
      expect(warning).toBeInTheDocument();
      expect(warning).toHaveTextContent('Maximum number of people (1) already selected for this task.');
    });
  });

  it('handles accept applicant action', async () => {
    // Setup the fetch mock for the second call (accept action)
    fetch.mockImplementationOnce(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ tasks: mockTasks })
    }));
    
    fetch.mockImplementationOnce(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ message: 'Applicant accepted successfully' })
    }));

    render(<TaskApplications />);

    // Wait for the component to render and display data
    await waitFor(() => {
      expect(screen.getByText('Test Task 1')).toBeInTheDocument();
    });

    // Find and click the Accept button for an applicant
    const acceptButton = screen.getAllByText('Accept')[0]; // First accept button
    fireEvent.click(acceptButton);

    // Verify the fetch request was made correctly
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8080/tasks/task1/accept/applicant1@example.com',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer fake-token'
          })
        })
      );
    });

    // Check if success alert was shown
    expect(alert).toHaveBeenCalledWith(
      'Successfully accepted applicant1@example.com for this task'
    );
  });

  it('handles API errors during accept applicant action', async () => {
    // Setup the fetch mock for the second call (accept action with error)
    fetch.mockImplementationOnce(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ tasks: mockTasks })
    }));
    
    fetch.mockImplementationOnce(() => Promise.resolve({
      ok: false,
      json: () => Promise.resolve({ error: 'Failed to accept applicant' })
    }));

    render(<TaskApplications />);

    // Wait for the component to render and display data
    await waitFor(() => {
      expect(screen.getByText('Test Task 1')).toBeInTheDocument();
    });

    // Find and click the Accept button for an applicant
    const acceptButton = screen.getAllByText('Accept')[0]; // First accept button
    fireEvent.click(acceptButton);

    // Check if error alert was shown
    await waitFor(() => {
      expect(alert).toHaveBeenCalledWith('Error: Failed to accept applicant');
    });
  });

  it('disables Accept button during processing', async () => {
    // Add a delay to the second fetch call to simulate processing time
    fetch.mockImplementationOnce(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ tasks: mockTasks })
    }));
    
    fetch.mockImplementationOnce(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: () => Promise.resolve({ message: 'Success' })
      }), 100))
    );

    render(<TaskApplications />);

    // Wait for the component to render and display data
    await waitFor(() => {
      expect(screen.getByText('Test Task 1')).toBeInTheDocument();
    });

    // Find and click the Accept button for an applicant
    const acceptButton = screen.getAllByText('Accept')[0]; // First accept button
    fireEvent.click(acceptButton);

    // Check if the button shows "Processing..." and is disabled
    expect(acceptButton).toHaveTextContent('Processing...');
    expect(acceptButton).toBeDisabled();

    // Wait for the process to complete
    await waitFor(() => {
      expect(acceptButton).not.toHaveTextContent('Processing...');
    });
  });

  it('formats date correctly', async () => {
    render(<TaskApplications />);

    await waitFor(() => {
      // The exact format will depend on the locale, but should contain 2025, April, and 20
      const dateElement = screen.getAllByText(/Date:/)[0];
      expect(dateElement.nextSibling.textContent).toMatch(/April 20, 2025|4\/20\/2025|20\/4\/2025/);
    });
  });
});