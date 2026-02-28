import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ErrorBoundary from '../components/ErrorBoundary';
import React from 'react';

describe('ErrorBoundary', () => {
  it('hata yakalandığında fallback gösterir', () => {
    const ProblemChild = () => { throw new Error('Test error'); };
    render(
      <ErrorBoundary>
        <ProblemChild />
      </ErrorBoundary>
    );
    expect(screen.getByText(/Bir hata oluştu/i)).toBeInTheDocument();
  });
});
