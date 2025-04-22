import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TaskVerification from '../components/TaskVerification';
import { getUserEmailFromToken } from '../utils/auth';

// Mock dependencies
jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn()
}));

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

// Mock setTimeout
jest.useFakeTimers();

describe('TaskVerification Component', () => {
  const mockTasks = [
    {
      _id: 'task1',
      title: 'Task 1',
      description: 'This is task 1',
      task_date: '2025-04-20',
      task_time: '14:00',
      place_of_work: 'Remote',
      status: 'In Progress',
      selected_users: ['worker1@example.com', 'worker2@example.com']
    },
    {
      _id: 'task2',
      title: 'Task 2',
      description: 'This is task 2',
      task_date: '2025-04-22',
      task_time: '10:00',
      place_of_work: 'Office',
      status: 'Open',
      selected_users: ['worker3@example.com']
    },
    {
      _id: 'task3',
      title: 'Completed Task',
      description: 'This task is already completed',
      task_date: '2025-04-15',
      task_time: '09:00',
      place_of_work: 'Remote',
      status: 'Completed',
      selected_users: ['worker1@example.com']
    }
  ];
  
  beforeEach(() => {
    jest.clearAllMocks();
    getUserEmailFromToken.mockReturnValue('owner@example.com');
    
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ tasks: mockTasks })
    });
  });
  
  test('renders loading state initially', () => {
    render(<TaskVerification />);
    expect(screen.getByText('Loading pending verifications...')).toBeInTheDocument();
  });
  
  test('renders dashboard header', () => {
    render(<TaskVerification />);
    expect(screen.getByTestId('dashboard-header')).toBeInTheDocument();
  });
  
  test('displays error message when fetch fails', async () => {
    fetch.mockReset();
    fetch.mockRejectedValueOnce(new Error('Network error'));

    render(<TaskVerification />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load tasks/)).toBeInTheDocument();
    });
  });
  
  test('displays error message when API returns error status', async () => {
    fetch.mockReset();
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: () => Promise.resolve('Internal Server Error')
    });

    render(<TaskVerification />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load tasks/)).toBeInTheDocument();
      expect(screen.getByText(/HTTP error! status: 500/)).toBeInTheDocument();
    });
  });
  
  test('filters out completed tasks', async () => {
    render(<TaskVerification />);
    
    await waitFor(() => {
      expect(screen.getByText('Task 1')).toBeInTheDocument();
      expect(screen.getByText('Task 2')).toBeInTheDocument();
      expect(screen.queryByText('Completed Task')).not.toBeInTheDocument();
    });
  });
  
  test('displays "no verifications" message when no pending tasks', async () => {
    fetch.mockReset();
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ tasks: [
        {
          _id: 'task3',
          title: 'Completed Task',
          status: 'Completed',
          selected_users: ['worker1@example.com']
        }
      ]})
    });
    
    render(<TaskVerification />);
    
    await waitFor(() => {
      expect(screen.getByText("You don't have any tasks pending verification.")).toBeInTheDocument();
      expect(screen.getByText("When a worker completes a task, you'll receive an email with a verification code.")).toBeInTheDocument();
    });
  });
  
  test('renders task cards with correct information', async () => {
    render(<TaskVerification />);
    
    await waitFor(() => {
      expect(screen.getByText('Task 1')).toBeInTheDocument();
      expect(screen.getByText('This is task 1')).toBeInTheDocument();
      
      // Check for formatted date and other details
      const dateElements = screen.getAllByText(/Date:/);
      expect(dateElements[0].parentElement.textContent).toContain('2025');
      
      expect(screen.getByText(/Time: 14:00/)).toBeInTheDocument();
      expect(screen.getByText(/Location: Remote/)).toBeInTheDocument();
      expect(screen.getByText(/Worker\(s\): worker1@example.com, worker2@example.com/)).toBeInTheDocument();
    });
  });
  
  test('shows verification form when button is clicked', async () => {
    render(<TaskVerification />);
    
    await waitFor(() => {
      expect(screen.getByText('Task 1')).toBeInTheDocument();
    });
    
    const verifyButton = screen.getAllByText('Verify Task Completion')[0];
    fireEvent.click(verifyButton);
    
    expect(screen.getByText('Enter the verification code sent to your email:')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter OTP code')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });
  
  test('hides verification form when cancel is clicked', async () => {
    render(<TaskVerification />);
    
    await waitFor(() => {
      expect(screen.getByText('Task 1')).toBeInTheDocument();
    });
    
    const verifyButton = screen.getAllByText('Verify Task Completion')[0];
    fireEvent.click(verifyButton);
    
    expect(screen.getByText('Enter the verification code sent to your email:')).toBeInTheDocument();
    
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    
    expect(screen.queryByText('Enter the verification code sent to your email:')).not.toBeInTheDocument();
  });
  
  test('verify button is disabled when OTP is empty', async () => {
    render(<TaskVerification />);
    
    await waitFor(() => {
      expect(screen.getByText('Task 1')).toBeInTheDocument();
    });
    
    const verifyButton = screen.getAllByText('Verify Task Completion')[0];
    fireEvent.click(verifyButton);
    
    const submitButton = screen.getByText('Verify Completion');
    expect(submitButton).toBeDisabled();
    
    const otpInput = screen.getByPlaceholderText('Enter OTP code');
    fireEvent.change(otpInput, { target: { value: '123456' } });
    
    expect(submitButton).not.toBeDisabled();
  });
  
  test('handles successful verification', async () => {
    // First fetch for getting tasks
    fetch.mockImplementationOnce(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ tasks: mockTasks })
    }));
    
    // Second fetch for verification API call
    fetch.mockImplementationOnce(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ message: 'Task verification successful' })
    }));
    
    render(<TaskVerification />);
    
    await waitFor(() => {
      expect(screen.getByText('Task 1')).toBeInTheDocument();
    });
    
    // Start verification process
    const verifyButton = screen.getAllByText('Verify Task Completion')[0];
    fireEvent.click(verifyButton);
    
    // Enter OTP and submit
    const otpInput = screen.getByPlaceholderText('Enter OTP code');
    fireEvent.change(otpInput, { target: { value: '123456' } });
    
    const submitButton = screen.getByText('Verify Completion');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Task verified and marked as completed!')).toBeInTheDocument();
    });
    
    // Verify it made the correct API call
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:8080/validate-task-completion',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer fake-token'
        },
        body: JSON.stringify({
          task_id: 'task1',
          email: 'owner@example.com',
          otp: '123456'
        })
      }
    );
  });
  
  test('handles verification error', async () => {
    // First fetch for getting tasks
    fetch.mockImplementationOnce(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ tasks: mockTasks })
    }));
    
    // Second fetch for verification API call (error response)
    fetch.mockImplementationOnce(() => Promise.resolve({
      ok: false,
      json: () => Promise.resolve({ error: 'Invalid verification code' })
    }));
    
    render(<TaskVerification />);
    
    await waitFor(() => {
      expect(screen.getByText('Task 1')).toBeInTheDocument();
    });
    
    // Start verification process
    const verifyButton = screen.getAllByText('Verify Task Completion')[0];
    fireEvent.click(verifyButton);
    
    // Enter OTP and submit
    const otpInput = screen.getByPlaceholderText('Enter OTP code');
    fireEvent.change(otpInput, { target: { value: '123456' } });
    
    const submitButton = screen.getByText('Verify Completion');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Invalid verification code')).toBeInTheDocument();
    });
  });
  
  test('handles user email not found error', async () => {
    getUserEmailFromToken.mockReturnValue(null);
    
    render(<TaskVerification />);
    
    await waitFor(() => {
      expect(screen.getByText(/Failed to load tasks/)).toBeInTheDocument();
      expect(screen.getByText(/User email not found in token/)).toBeInTheDocument();
    });
  });
  
  test('formats date correctly', async () => {
    render(<TaskVerification />);
    
    await waitFor(() => {
      // Get the date element and verify it contains a properly formatted date
      const dateElement = screen.getAllByText(/Date:/)[0];
      
      // Check for date format rather than specific date
      // This regex matches patterns like: "Month DD, YYYY" or "MM/DD/YYYY" or "DD/MM/YYYY"
      const dateFormatRegex = /(\w+ \d{1,2}, \d{4}|\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2}-\d{1,2}-\d{4})/;
      
      // The date is split across multiple elements, so check the container
      const dateContainer = dateElement.closest('.task-meta');
      expect(dateContainer.textContent).toMatch(dateFormatRegex);
      
      // Also verify that the text includes "2025" somewhere as a simple check
      // that it's using the correct year from our mock data
      expect(dateContainer.textContent).toContain("2025");
    });
  });
});