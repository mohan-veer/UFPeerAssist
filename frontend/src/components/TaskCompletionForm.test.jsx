import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TaskCompletionForm from '../components/TaskCompletionForm';

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

describe('TaskCompletionForm Component', () => {
  const mockTaskId = 'task123';
  const mockOwnerEmail = 'owner@example.com';
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  test('renders form elements correctly', () => {
    render(<TaskCompletionForm taskId={mockTaskId} ownerEmail={mockOwnerEmail} />);
    
    expect(screen.getByText('Verify Task Completion')).toBeInTheDocument();
    expect(screen.getByLabelText('Enter the verification code:')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter verification code')).toBeInTheDocument();
    expect(screen.getByText('Complete Task')).toBeInTheDocument();
    expect(screen.getByText('The task owner should have received this code via email.')).toBeInTheDocument();
  });
  
  test('button is disabled when OTP is empty', () => {
    render(<TaskCompletionForm taskId={mockTaskId} ownerEmail={mockOwnerEmail} />);
    
    const button = screen.getByText('Complete Task');
    expect(button).toBeDisabled();
    
    const input = screen.getByPlaceholderText('Enter verification code');
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
    
    render(<TaskCompletionForm taskId={mockTaskId} ownerEmail={mockOwnerEmail} />);
    
    const input = screen.getByPlaceholderText('Enter verification code');
    fireEvent.change(input, { target: { value: '123456' } });
    
    const button = screen.getByText('Complete Task');
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
    
    render(<TaskCompletionForm taskId={mockTaskId} ownerEmail={mockOwnerEmail} />);
    
    const input = screen.getByPlaceholderText('Enter verification code');
    fireEvent.change(input, { target: { value: '123456' } });
    
    const button = screen.getByText('Complete Task');
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText('✅ Task Completed Successfully!')).toBeInTheDocument();
      expect(screen.getByText('This task has been marked as completed.')).toBeInTheDocument();
    });
  });
  
  test('handles verification error', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Invalid verification code' })
    });
    
    render(<TaskCompletionForm taskId={mockTaskId} ownerEmail={mockOwnerEmail} />);
    
    const input = screen.getByPlaceholderText('Enter verification code');
    fireEvent.change(input, { target: { value: '123456' } });
    
    const button = screen.getByText('Complete Task');
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText('Invalid verification code')).toBeInTheDocument();
    });
  });
  
  test('handles network error', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'));
    
    render(<TaskCompletionForm taskId={mockTaskId} ownerEmail={mockOwnerEmail} />);
    
    const input = screen.getByPlaceholderText('Enter verification code');
    fireEvent.change(input, { target: { value: '123456' } });
    
    const button = screen.getByText('Complete Task');
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText('Connection error. Please try again.')).toBeInTheDocument();
    });
  });
  
  test('verifies with correct API parameters', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ message: 'Success' })
    });
    
    render(<TaskCompletionForm taskId={mockTaskId} ownerEmail={mockOwnerEmail} />);
    
    const input = screen.getByPlaceholderText('Enter verification code');
    fireEvent.change(input, { target: { value: '123456' } });
    
    const button = screen.getByText('Complete Task');
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
            task_id: mockTaskId,
            email: mockOwnerEmail,
            otp: '123456'
          })
        }
      );
    });
  });
});