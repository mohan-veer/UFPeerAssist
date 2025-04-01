import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import HowItWorksSection from './HowItWorksSection';

describe('HowItWorksSection Component', () => {
  test('renders section title', () => {
    render(<HowItWorksSection />);
    
    expect(screen.getByText('How It Works')).toBeInTheDocument();
  });

  test('displays all step cards with titles', () => {
    render(<HowItWorksSection />);
    
    expect(screen.getByText('Sign Up')).toBeInTheDocument();
    expect(screen.getByText('Post/Accept Tasks')).toBeInTheDocument();
    expect(screen.getByText('Collaborate')).toBeInTheDocument();
  });

  test('displays step descriptions', () => {
    render(<HowItWorksSection />);
    
    expect(screen.getByText('Register using your UF email address.')).toBeInTheDocument();
    expect(screen.getByText('Create tasks you need help with or offer assistance.')).toBeInTheDocument();
    expect(screen.getByText('Engage with fellow UF students and get things done.')).toBeInTheDocument();
  });

  test('displays the correct number of steps', () => {
    render(<HowItWorksSection />);
    
    // There should be 3 step cards
    const stepIcons = screen.getAllByText(/[🔑📝🤝]/);
    expect(stepIcons).toHaveLength(3);
  });
});
