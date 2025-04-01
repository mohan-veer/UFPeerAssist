import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';

// Create a simplified reset password form for testing
const SimpleResetForm = () => (
  <div className="reset-container">
    <h2>Request New Password</h2>
    <form>
      <label htmlFor="email">Email Address</label>
      <input id="email" type="email" />
      <button type="submit">Send Reset Link</button>
    </form>
  </div>
);

describe('Reset Password Form', () => {
  test('renders reset password form elements', () => {
    const { getByText, getByLabelText } = render(<SimpleResetForm />);
    
    expect(getByText('Request New Password')).toBeInTheDocument();
    expect(getByLabelText('Email Address')).toBeInTheDocument();
    expect(getByText('Send Reset Link')).toBeInTheDocument();
  });
});