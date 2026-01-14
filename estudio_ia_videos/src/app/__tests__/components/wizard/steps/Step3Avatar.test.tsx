import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Step3Avatar } from '@/components/wizard/steps/Step3Avatar';

// Mock Lucide icons
jest.mock('lucide-react', () => ({
  Check: () => <div data-testid="check-icon" />,
  User: () => <div data-testid="user-icon" />,
}));

describe('Step3Avatar', () => {
  const mockOnNext = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    render(<Step3Avatar onNext={mockOnNext} />);
    expect(screen.getByText('Escolha um Apresentador')).toBeInTheDocument();
    expect(screen.getByText('Ana Silva')).toBeInTheDocument();
  });

  it('selects an avatar on click', () => {
    render(<Step3Avatar onNext={mockOnNext} />);
    
    // Find the card by text
    const avatarName = screen.getByText('Ana Silva');
    fireEvent.click(avatarName);
    
    // Check if Continue button is enabled (it starts disabled)
    const continueButton = screen.getByRole('button', { name: /Continuar/i });
    expect(continueButton).not.toBeDisabled();
  });

  it('calls onNext with selected avatar id', () => {
    render(<Step3Avatar onNext={mockOnNext} />);
    fireEvent.click(screen.getByText('Ana Silva')); // ID 1
    
    const continueButton = screen.getByRole('button', { name: /Continuar/i });
    fireEvent.click(continueButton);
    
    expect(mockOnNext).toHaveBeenCalledWith({ avatarId: '1' });
  });

  it('shows fallback when image fails to load', () => {
    render(<Step3Avatar onNext={mockOnNext} />);
    // Note: Since we switched to .svg, the test logic remains the same.
    // However, jsdom doesn't actually load images so error handling needs to be triggered manually.
    const img = screen.getByAltText('Ana Silva');
    
    // Simulate error
    fireEvent.error(img);
    
    // Since we mocked User icon with testid 'user-icon'
    // The fallback logic renders the User icon
    expect(screen.getAllByTestId('user-icon').length).toBeGreaterThan(0);
  });
});
