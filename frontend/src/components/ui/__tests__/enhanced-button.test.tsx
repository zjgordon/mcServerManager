import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EnhancedButton } from '../enhanced-button';
import { useReducedMotion } from '../../../utils/animations';

// Mock the useReducedMotion hook
vi.mock('../../../utils/animations');
const mockUseReducedMotion = vi.mocked(useReducedMotion);

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('EnhancedButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseReducedMotion.mockReturnValue(false);
  });

  it('renders with default props', () => {
    render(<EnhancedButton>Click me</EnhancedButton>, { wrapper: createWrapper() });
    
    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('renders with different variants', () => {
    const { rerender } = render(<EnhancedButton variant="destructive">Delete</EnhancedButton>, { wrapper: createWrapper() });
    expect(screen.getByRole('button')).toHaveClass('bg-destructive');

    rerender(<EnhancedButton variant="outline">Outline</EnhancedButton>);
    expect(screen.getByRole('button')).toHaveClass('border');

    rerender(<EnhancedButton variant="minecraft">Minecraft</EnhancedButton>);
    expect(screen.getByRole('button')).toHaveClass('bg-minecraft-green');
  });

  it('renders with different sizes', () => {
    const { rerender } = render(<EnhancedButton size="sm">Small</EnhancedButton>, { wrapper: createWrapper() });
    expect(screen.getByRole('button')).toHaveClass('h-9');

    rerender(<EnhancedButton size="lg">Large</EnhancedButton>);
    expect(screen.getByRole('button')).toHaveClass('h-11');

    rerender(<EnhancedButton size="xl">Extra Large</EnhancedButton>);
    expect(screen.getByRole('button')).toHaveClass('h-12');
  });

  it('shows loading state', () => {
    render(<EnhancedButton loading>Loading</EnhancedButton>, { wrapper: createWrapper() });
    
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('shows success state', () => {
    render(<EnhancedButton success>Success</EnhancedButton>, { wrapper: createWrapper() });
    
    expect(screen.getByTestId('success-icon')).toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveClass('bg-green-600');
  });

  it('shows error state', () => {
    render(<EnhancedButton error>Error</EnhancedButton>, { wrapper: createWrapper() });
    
    expect(screen.getByTestId('error-icon')).toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveClass('bg-destructive');
  });

  it('renders with icon', () => {
    render(
      <EnhancedButton icon={<span data-testid="test-icon">Icon</span>}>
        With Icon
      </EnhancedButton>,
      { wrapper: createWrapper() }
    );
    
    expect(screen.getByTestId('test-icon')).toBeInTheDocument();
  });

  it('renders with icon on the right', () => {
    render(
      <EnhancedButton 
        icon={<span data-testid="test-icon">Icon</span>} 
        iconPosition="right"
      >
        With Icon
      </EnhancedButton>,
      { wrapper: createWrapper() }
    );
    
    const button = screen.getByRole('button');
    const icon = screen.getByTestId('test-icon');
    const text = screen.getByText('With Icon');
    
    expect(button).toContainElement(icon);
    expect(button).toContainElement(text);
  });

  it('handles click events', () => {
    const handleClick = vi.fn();
    render(<EnhancedButton onClick={handleClick}>Click me</EnhancedButton>, { wrapper: createWrapper() });
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('creates ripple effect on click', async () => {
    render(<EnhancedButton ripple>Click me</EnhancedButton>, { wrapper: createWrapper() });
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(button.querySelector('.animate-ping')).toBeInTheDocument();
    });
  });

  it('does not create ripple when reduced motion is enabled', () => {
    mockUseReducedMotion.mockReturnValue(true);
    
    render(<EnhancedButton ripple>Click me</EnhancedButton>, { wrapper: createWrapper() });
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(button.querySelector('.animate-ping')).not.toBeInTheDocument();
  });

  it('handles keyboard events', () => {
    const handleClick = vi.fn();
    render(<EnhancedButton onClick={handleClick}>Click me</EnhancedButton>, { wrapper: createWrapper() });
    
    const button = screen.getByRole('button');
    fireEvent.keyDown(button, { key: 'Enter' });
    expect(handleClick).toHaveBeenCalledTimes(1);
    
    fireEvent.keyDown(button, { key: ' ' });
    expect(handleClick).toHaveBeenCalledTimes(2);
  });

  it('applies animation classes', () => {
    render(<EnhancedButton animation="pulse">Pulse</EnhancedButton>, { wrapper: createWrapper() });
    
    expect(screen.getByRole('button')).toHaveClass('animate-pulse-slow');
  });

  it('does not apply animation when reduced motion is enabled', () => {
    mockUseReducedMotion.mockReturnValue(true);
    
    render(<EnhancedButton animation="pulse">Pulse</EnhancedButton>, { wrapper: createWrapper() });
    
    expect(screen.getByRole('button')).not.toHaveClass('animate-pulse-slow');
  });

  it('renders as child component when asChild is true', () => {
    render(
      <EnhancedButton asChild>
        <a href="/test">Link Button</a>
      </EnhancedButton>,
      { wrapper: createWrapper() }
    );
    
    expect(screen.getByRole('link')).toBeInTheDocument();
    expect(screen.getByText('Link Button')).toBeInTheDocument();
  });

  it('shows tooltip when provided', () => {
    render(<EnhancedButton tooltip="This is a tooltip">Button</EnhancedButton>, { wrapper: createWrapper() });
    
    expect(screen.getByRole('button')).toHaveAttribute('title', 'This is a tooltip');
  });

  it('is disabled when loading', () => {
    render(<EnhancedButton loading>Loading</EnhancedButton>, { wrapper: createWrapper() });
    
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('is disabled when disabled prop is true', () => {
    render(<EnhancedButton disabled>Disabled</EnhancedButton>, { wrapper: createWrapper() });
    
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('does not trigger click when disabled', () => {
    const handleClick = vi.fn();
    render(
      <EnhancedButton disabled onClick={handleClick}>
        Disabled
      </EnhancedButton>,
      { wrapper: createWrapper() }
    );
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('does not trigger click when loading', () => {
    const handleClick = vi.fn();
    render(
      <EnhancedButton loading onClick={handleClick}>
        Loading
      </EnhancedButton>,
      { wrapper: createWrapper() }
    );
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('applies custom className', () => {
    render(<EnhancedButton className="custom-class">Button</EnhancedButton>, { wrapper: createWrapper() });
    
    expect(screen.getByRole('button')).toHaveClass('custom-class');
  });

  it('handles mouse events for pressed state', () => {
    render(<EnhancedButton>Button</EnhancedButton>, { wrapper: createWrapper() });
    
    const button = screen.getByRole('button');
    
    fireEvent.mouseDown(button);
    expect(button).toHaveClass('scale-95');
    
    fireEvent.mouseUp(button);
    expect(button).not.toHaveClass('scale-95');
  });

  it('shows success animation', () => {
    render(<EnhancedButton success>Success</EnhancedButton>, { wrapper: createWrapper() });
    
    expect(screen.getByRole('button')).toHaveClass('animate-scale-in');
  });

  it('shows error animation', () => {
    render(<EnhancedButton error>Error</EnhancedButton>, { wrapper: createWrapper() });
    
    expect(screen.getByRole('button')).toHaveClass('animate-wiggle');
  });
});
