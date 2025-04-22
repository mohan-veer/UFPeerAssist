import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TaskCompletionVerification from '../components/TaskCompletionVerification';

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

describe('TaskCompletionVerification Component', () => {
  const mockTask = {
    _id: 'task123',
    title: 'Test Task',
    description: 'This is a test task',
    creator_email: 'creator@example.com',
    task_date: '2025-04-20',
    task_time: '14:00',
    estimated_pay_rate: 25,
    place_of_work: 'Remote'
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock process.env.NODE_ENV for testing development mode features
    process.env.NODE_ENV = 'development';
  });
  
  afterEach(() => {
    // Reset NODE_ENV after each test
    delete process.env.NODE_ENV;
  });
  
  test('renders verification form correctly', () => {
    render(<TaskCompletionVerification task={mockTask} />);
    
    expect(screen.getByText('Verify Task Completion')).toBeInTheDocument();
    expect(screen.getByLabelText('Enter Verification Code:')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter OTP from email')).toBeInTheDocument();
    expect(screen.getByText('Verify Completion')).toBeInTheDocument();
    expect(screen.getByText('Show Developer Tools')).toBeInTheDocument();
  });
  
  test('verify button is disabled when OTP is empty', () => {
    render(<TaskCompletionVerification task={mockTask} />);
    
    const button = screen.getByText('Verify Completion');
    expect(button).toBeDisabled();
    
    const input = screen.getByPlaceholderText('Enter OTP from email');
    fireEvent.change(input, { target: { value: '123456' } });
    
    expect(button).not.toBeDisabled();
  });
  
  test('shows verifying state during submission', async () => {
    fetch.mockImplementationOnce(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: () => Promise.resolve({ message: 'Success' })
      }), 100))
    );
    
    render(<TaskCompletionVerification task={mockTask} />);
    
    const input = screen.getByPlaceholderText('Enter OTP from email');
    fireEvent.change(input, { target: { value: '123456' } });
    
    const button = screen.getByText('Verify Completion');
    fireEvent.click(button);
    
    expect(screen.getByText('Verifying...')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.queryByText('Verifying...')).not.toBeInTheDocument();
    });
  });
  
  test('handles successful verification', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ message: 'Task completion verified successfully' })
    });
    
    render(<TaskCompletionVerification task={mockTask} />);
    
    const input = screen.getByPlaceholderText('Enter OTP from email');
    fireEvent.change(input, { target: { value: '123456' } });
    
    const button = screen.getByText('Verify Completion');
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText('✅ Task Completed Successfully!')).toBeInTheDocument();
      expect(screen.getByText('This task has been marked as completed. Thank you!')).toBeInTheDocument();
    });
  });
  
  test('handles verification error', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Invalid verification code' })
    });
    
    render(<TaskCompletionVerification task={mockTask} />);
    
    const input = screen.getByPlaceholderText('Enter OTP from email');
    fireEvent.change(input, { target: { value: '123456' } });
    
    const button = screen.getByText('Verify Completion');
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText('Invalid verification code')).toBeInTheDocument();
    });
  });
  
  test('handles network error', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'));
    
    render(<TaskCompletionVerification task={mockTask} />);
    
    const input = screen.getByPlaceholderText('Enter OTP from email');
    fireEvent.change(input, { target: { value: '123456' } });
    
    const button = screen.getByText('Verify Completion');
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText('Connection error. Please try again.')).toBeInTheDocument();
    });
  });
  
  test('toggles developer tools in development mode', () => {
    render(<TaskCompletionVerification task={mockTask} />);
    
    const toggleButton = screen.getByText('Show Developer Tools');
    expect(screen.queryByText('Developer Testing Tools')).not.toBeInTheDocument();
    
    fireEvent.click(toggleButton);
    
    expect(screen.getByText('Developer Testing Tools')).toBeInTheDocument();
    expect(screen.getByText('Hide Developer Tools')).toBeInTheDocument();
    expect(screen.getByText(`Current task ID: ${mockTask._id}`)).toBeInTheDocument();
    expect(screen.getByText(`Current owner: ${mockTask.creator_email}`)).toBeInTheDocument();
    
    fireEvent.click(screen.getByText('Hide Developer Tools'));
    
    expect(screen.queryByText('Developer Testing Tools')).not.toBeInTheDocument();
  });
  
  test('does not show developer tools in production mode', () => {
    process.env.NODE_ENV = 'production';
    
    render(<TaskCompletionVerification task={mockTask} />);
    
    expect(screen.queryByText('Show Developer Tools')).not.toBeInTheDocument();
  });
  
  test('logs verification attempts correctly', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ message: 'Success' })
    });
    
    render(<TaskCompletionVerification task={mockTask} />);
    
    const input = screen.getByPlaceholderText('Enter OTP from email');
    fireEvent.change(input, { target: { value: '123456' } });
    
    const button = screen.getByText('Verify Completion');
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(console.log).toHaveBeenCalledWith('Verifying task completion for task ID:', mockTask._id);
      expect(console.log).toHaveBeenCalledWith('Using OTP:', '123456');
      expect(console.log).toHaveBeenCalledWith('Task owner email:', mockTask.creator_email);
      expect(console.log).toHaveBeenCalledWith('Task successfully verified as complete');
    });
  });
  
  test('verifies with correct API parameters', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ message: 'Success' })
    });
    
    render(<TaskCompletionVerification task={mockTask} />);
    
    const input = screen.getByPlaceholderText('Enter OTP from email');
    fireEvent.change(input, { target: { value: '123456' } });
    
    const button = screen.getByText('Verify Completion');
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8080/validate-task-completion',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer fake-token'
          },
          body: JSON.stringify({
            task_id: mockTask._id,
            email: mockTask.creator_email,
            otp: '123456'
          })
        }
      );
    });
  });
  
  test('renders help section', () => {
    render(<TaskCompletionVerification task={mockTask} />);
    
    expect(screen.getByText('Didn\'t receive the code?')).toBeInTheDocument();
    expect(screen.getByText('Check your spam/junk folder')).toBeInTheDocument();
    expect(screen.getByText('Verify your email address is correct')).toBeInTheDocument();
    expect(screen.getByText('Ask the worker to end the task again')).toBeInTheDocument();
  });
});