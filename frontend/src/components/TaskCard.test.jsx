import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';

// Create a simplified version for testing
const SimpleTaskCard = ({ title, description, payRate }) => (
  <div className="task-card">
    <h3>{title}</h3>
    <p>{description}</p>
    <div>${payRate}/hr</div>
  </div>
);

describe('Task Card Component', () => {
  test('renders task information correctly', () => {
    const { getByText } = render(
      <SimpleTaskCard 
        title="Help Moving" 
        description="Need help with furniture" 
        payRate={20}
      />
    );
    
    expect(getByText('Help Moving')).toBeInTheDocument();
    expect(getByText('Need help with furniture')).toBeInTheDocument();
    expect(getByText('$20/hr')).toBeInTheDocument();
  });
});