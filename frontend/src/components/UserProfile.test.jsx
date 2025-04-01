import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import UserProfile from './UserProfile';

describe('UserProfile Component', () => {
  test('renders user profile with name and username', () => {
    render(<UserProfile />);
    
    expect(screen.getByText('Deepika')).toBeInTheDocument();
    expect(screen.getByText('@deepika')).toBeInTheDocument();
  });

  test('displays profile sections with headings', () => {
    render(<UserProfile />);
    
    expect(screen.getByText('About Me')).toBeInTheDocument();
    expect(screen.getByText('Contact Information')).toBeInTheDocument();
    expect(screen.getByText('Interests & Skills')).toBeInTheDocument();
    expect(screen.getByText('Activity')).toBeInTheDocument();
  });

  test('shows edit profile and message buttons', () => {
    render(<UserProfile />);
    
    expect(screen.getByText('Edit Profile')).toBeInTheDocument();
    expect(screen.getByText('Message')).toBeInTheDocument();
  });

  test('displays activity statistics correctly', () => {
    render(<UserProfile />);
    
    expect(screen.getByText('25')).toBeInTheDocument();
    expect(screen.getByText('Tasks Completed')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('Posts')).toBeInTheDocument();
    expect(screen.getByText('4.8')).toBeInTheDocument();
    expect(screen.getByText('Rating')).toBeInTheDocument();
  });
});