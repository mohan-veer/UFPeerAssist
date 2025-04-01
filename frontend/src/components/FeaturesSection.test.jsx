import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import FeaturesSection from './FeaturesSection';

describe('FeaturesSection Component', () => {
  test('renders features section title', () => {
    render(<FeaturesSection />);
    
    expect(screen.getByText('Platform Features')).toBeInTheDocument();
  });

  test('displays all feature cards with titles', () => {
    render(<FeaturesSection />);
    
    expect(screen.getByText('Post Tasks Easily')).toBeInTheDocument();
    expect(screen.getByText('Accept Tasks Freely')).toBeInTheDocument();
    expect(screen.getByText('Real-Time Notifications')).toBeInTheDocument();
    expect(screen.getByText('Secure Payments')).toBeInTheDocument();
  });

  test('displays feature descriptions', () => {
    render(<FeaturesSection />);
    
    expect(screen.getByText('Share tasks you need help with quickly and effortlessly.')).toBeInTheDocument();
    expect(screen.getByText('Browse tasks from fellow UF students and offer your assistance.')).toBeInTheDocument();
    expect(screen.getByText('Receive instant updates about task activities and communications.')).toBeInTheDocument();
    expect(screen.getByText('Enjoy secure, hassle-free payment processing for every transaction.')).toBeInTheDocument();
  });

  test('displays the correct number of feature cards', () => {
    render(<FeaturesSection />);
    
    // There should be 4 feature icons (one for each card)
    const featureIcons = screen.getAllByText(/[📝✅🔔🔒]/);
    expect(featureIcons).toHaveLength(4);
  });
});
