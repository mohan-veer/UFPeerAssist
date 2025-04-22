import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import TaskApplications from '../components/TaskApplications';
import { getUserEmailFromToken } from '../utils/auth';

// Mock dependencies
jest.mock('../utils/auth', () => ({
  getUserEmailFromToken: jest.fn()
}));

// Mock fetch
global.fetch = jest.fn();

// Suppress React act() warnings in tests
// This is needed because some state updates happen asynchronously in the components
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
    // No need to set localStorage.getItem mock return value here as it's set in the global beforeEach
    
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ tasks: mockTasks })
    });
  });

  test('renders loading state initially', () => {
    render(<TaskApplications />);
    expect(screen.getByText('Loading your tasks...')).toBeInTheDocument();
  });

  test('displays error message when fetch fails', async () => {
    fetch.mockReset();
    fetch.mockRejectedValueOnce(new Error('Network error'));

    render(<TaskApplications />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load tasks/)).toBeInTheDocument();
    });
  });

  test('displays "no tasks" message when no tasks are returned', async () => {
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

  test('renders tasks and applicants when data is loaded', async () => {
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

  test('shows correct number of people selected', async () => {
    render(<TaskApplications />);

    await waitFor(() => {
      // The text is split across multiple elements, so we need to use a function matcher
      const peopleSelectedElement1 = screen.getAllByText(/People Selected/)[0];
      const peopleSelectedElement2 = screen.getAllByText(/People Selected/)[1];
      
      expect(peopleSelectedElement1.textContent).toMatch(/1\s*\/\s*2/);
      expect(peopleSelectedElement2.textContent).toMatch(/1\s*\/\s*1/);
    });
  });

  test('disables Accept button when people limit is reached', async () => {
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

  test('shows warning when people limit is reached', async () => {
    render(<TaskApplications />);

    await waitFor(() => {
      // Task2 has reached its limit (1/1)
      const task2Card = screen.getByText('Test Task 2').closest('.task-with-applicants');
      const warning = task2Card.querySelector('.limit-reached-warning');
      expect(warning).toBeInTheDocument();
      expect(warning).toHaveTextContent('Maximum number of people (1) already selected for this task.');
    });
  });

  test('handles accept applicant action', async () => {
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

  test('handles API errors during accept applicant action', async () => {
    // Reset any previous mock implementations
    fetch.mockReset();
    
    // First fetch call - get tasks
    fetch.mockImplementationOnce(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ tasks: mockTasks })
    }));
    
    // Second fetch call - error when accepting applicant
    fetch.mockImplementationOnce(() => Promise.resolve({
      ok: false,
      json: () => Promise.resolve({ error: 'Failed to accept applicant' })
    }));

    render(<TaskApplications />);

    // Wait for the component to render and display data
    await waitFor(() => {
      expect(screen.getByText('Test Task 1')).toBeInTheDocument();
    });

    // Clear any previous alert calls
    alert.mockClear();

    // Find and click the Accept button for an applicant
    const acceptButton = screen.getAllByText('Accept')[0]; // First accept button
    fireEvent.click(acceptButton);

    // Check if error alert was shown
    await waitFor(() => {
      expect(alert).toHaveBeenCalledWith('Error: Failed to accept applicant');
    });
  });

  test('disables Accept button during processing', async () => {
    // Reset any previous mock implementations
    fetch.mockReset();
    jest.useFakeTimers();
    
    // First fetch call - get tasks
    fetch.mockImplementationOnce(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ tasks: mockTasks })
    }));
    
    // Second fetch call with resolved promise for accept action
    const mockSuccessResponse = {
      ok: true,
      json: () => Promise.resolve({ message: 'Success' })
    };
    
    fetch.mockImplementationOnce(() => Promise.resolve(mockSuccessResponse));

    render(<TaskApplications />);

    // Wait for the component to render and display data
    await waitFor(() => {
      expect(screen.getByText('Test Task 1')).toBeInTheDocument();
    });

    // Find and click the Accept button for an applicant
    const acceptButton = screen.getAllByText('Accept')[0]; // First accept button
    
    // Store button text before click for later comparison
    const originalButtonText = acceptButton.textContent;
    
    fireEvent.click(acceptButton);

    // Check if the button is disabled after click
    expect(acceptButton).toBeDisabled();
    
    // Complete any pending promises
    await waitFor(() => {
      expect(alert).toHaveBeenCalled();
    });
    
    jest.useRealTimers();
  });

  test('formats date correctly', async () => {
    render(<TaskApplications />);

    await waitFor(() => {
      // Get the date element and verify it contains a properly formatted date
      const dateElement = screen.getAllByText(/Date:/)[0];
      
      // Check for date format rather than specific date
      // This regex matches patterns like: "Month DD, YYYY" or "MM/DD/YYYY" or "DD/MM/YYYY"
      const dateFormatRegex = /(\w+ \d{1,2}, \d{4}|\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2}-\d{1,2}-\d{4})/;
      
      // The date is split across multiple elements, so check the container
      const dateContainer = dateElement.closest('.task-details');
      expect(dateContainer.textContent).toMatch(dateFormatRegex);
      
      // Also verify that the text includes "2025" somewhere as a simple check
      // that it's using the correct year from our mock data
      expect(dateContainer.textContent).toContain("2025");
    });
  });
});