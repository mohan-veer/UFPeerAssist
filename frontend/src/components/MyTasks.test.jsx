import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import MyTasks from './MyTasks';
import { getUserEmailFromToken } from '../utils/auth';

// Mock dependencies
jest.mock('../utils/auth', () => ({
  getUserEmailFromToken: jest.fn()
}));

// Mock TaskCard component
jest.mock('./TaskCard', () => ({ task }) => (
  <div data-testid="task-card">{task.title}</div>
));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(() => 'fake-token')
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock fetch API
global.fetch = jest.fn();

describe('MyTasks Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders loading state initially', () => {
    // Mock fetch to never resolve
    global.fetch.mockImplementationOnce(() => new Promise(() => {}));
    
    getUserEmailFromToken.mockReturnValue('test@example.com');
    
    render(<MyTasks />);
    
    expect(screen.getByText('Loading your tasks...')).toBeInTheDocument();
  });

  test('displays error when user email not found', async () => {
    getUserEmailFromToken.mockReturnValue(null);
    
    render(<MyTasks />);
    
    await waitFor(() => {
      expect(screen.getByText(/Failed to load tasks: User email not found in token/)).toBeInTheDocument();
    });
  });

  test('displays tasks when loaded successfully', async () => {
    getUserEmailFromToken.mockReturnValue('test@example.com');
    
    const mockTasks = {
      tasks: [
        { id: '1', title: 'Task 1' },
        { id: '2', title: 'Task 2' }
      ]
    };
    
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTasks
    });
    
    render(<MyTasks />);
    
    await waitFor(() => {
      expect(screen.getByText('Task 1')).toBeInTheDocument();
      expect(screen.getByText('Task 2')).toBeInTheDocument();
    });
  });

  test('displays message when no tasks available', async () => {
    getUserEmailFromToken.mockReturnValue('test@example.com');
    
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ tasks: [] })
    });
    
    render(<MyTasks />);
    
    await waitFor(() => {
      expect(screen.getByText("You haven't created any tasks yet.")).toBeInTheDocument();
    });
  });

  test('displays error message when fetch fails', async () => {
    getUserEmailFromToken.mockReturnValue('test@example.com');
    
    global.fetch.mockRejectedValueOnce(new Error('Network error'));
    
    render(<MyTasks />);
    
    await waitFor(() => {
      expect(screen.getByText(/Failed to load tasks: Network error/)).toBeInTheDocument();
    });
  });
});