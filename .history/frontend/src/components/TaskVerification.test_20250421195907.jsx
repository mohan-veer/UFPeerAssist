import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TaskVerification from '../components/TaskVerification';
import { getUserEmailFromToken } from '../utils/auth';

// Mock dependencies
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate
}));

jest.mock('../components/DashboardHeader', () => {
  return function MockDashboardHeader() {
    return <div data-testid="dashboard-header">Dashboard Header</div>;
  };
});

jest.mock('../utils/auth', () => ({
  getUserEmailFromToken: jest.fn()
}));

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
  
  // Mock fetch globally
  global.fetch = jest.fn();
  
  // Mock console methods
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  
  // Mock setTimeout
  jest.useFakeTimers();
});

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

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
    getUserEmailFromToken.mockReturnValue('owner@example.com');
    
    // Default fetch mock for getting tasks
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
    });
  });
  
  test('renders task cards with correct information', async () => {
    render(<TaskVerification />);
    
    await waitFor(() => {
      expect(screen.getByText('Task 1')).toBeInTheDocument();
      expect(screen.getByText('This is task 1')).toBeInTheDocument();
      
      expect(screen.getByText(/Time: 14:00/)).toBeInTheDocument();
      expect(screen.getByText(/Location: Remote/)).toBeInTheDocument();
    });
  });
  
  test('shows verification form when button is clicked', async () => {
    render(<TaskVerification />);
    
    await waitFor(() => {
      expect(screen.getByText('Task 1')).toBeInTheDocument();
    });
    
    const verifyButtons = screen.getAllByText('Verify Task Completion');
    fireEvent.click(verifyButtons[0]);
    
    expect(screen.getByText('Enter the verification code sent to your email:')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter OTP code')).toBeInTheDocument();
  });
  
  test('handles successful verification', async () => {
    fetch.mockImplementationOnce(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ tasks: mockTasks })
    }));
    
    fetch.mockImplementationOnce(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ message: 'Task verification successful' })
    }));
    
    render(<TaskVerification />);
    
    await waitFor(() => {
      expect(screen.getByText('Task 1')).toBeInTheDocument();
    });
    
    const verifyButtons = screen.getAllByText('Verify Task Completion');
    fireEvent.click(verifyButtons[0]);
    
    const otpInput = screen.getByPlaceholderText('Enter OTP code');
    fireEvent.change(otpInput, { target: { value: '123456' } });
    
    const submitButton = screen.getByText('Verify Completion');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Task verified and marked as completed!')).toBeInTheDocument();
    });
    
    jest.advanceTimersByTime(2000);
    expect(mockNavigate).toHaveBeenCalledWith('/completed-tasks');
  });
});
