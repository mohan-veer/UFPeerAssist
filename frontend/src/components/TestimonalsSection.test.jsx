import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import TestimonialsSection from './TestimonialsSection';

describe('TestimonialsSection Component', () => {
  test('renders section title', () => {
    render(<TestimonialsSection />);
    
    expect(screen.getByText('What Our Users Say')).toBeInTheDocument();
  });

  test('displays all testimonial cards with names', () => {
    render(<TestimonialsSection />);
    
    expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    expect(screen.getByText('Bob Smith')).toBeInTheDocument();
    expect(screen.getByText('Cathy Brown')).toBeInTheDocument();
  });

  test('displays testimonial roles', () => {
    render(<TestimonialsSection />);
    
    expect(screen.getByText('Undergraduate Student')).toBeInTheDocument();
    expect(screen.getByText('Graduate Student')).toBeInTheDocument();
    expect(screen.getByText('UF Student')).toBeInTheDocument();
  });

  test('displays testimonial quotes', () => {
    render(<TestimonialsSection />);
    
    expect(screen.getByText(/UFPeerAssist has been instrumental in connecting me with peers/)).toBeInTheDocument();
    expect(screen.getByText(/The platform's secure payment system and seamless collaboration features/)).toBeInTheDocument();
    expect(screen.getByText(/I love how easy it is to find assistance and offer help on tasks/)).toBeInTheDocument();
  });

  test('displays all testimonial images', () => {
    render(<TestimonialsSection />);
    
    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(3);
    
    expect(images[0]).toHaveAttribute('alt', 'Alice Johnson');
    expect(images[1]).toHaveAttribute('alt', 'Bob Smith');
    expect(images[2]).toHaveAttribute('alt', 'Cathy Brown');
  });
});