import React from 'react';
import { render, screen, fireEvent, waitFor, userEvent, vi } from '../../../test';
import EnhancedButton from '../enhanced-button';

describe('EnhancedButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders button with default props', () => {
    render(<EnhancedButton>Click me</EnhancedButton>);

    const button = screen.getByRole('button', { name: 'Click me' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('btn');
  });

  it('renders button with different variants', () => {
    const { rerender } = render(<EnhancedButton variant="primary">Primary</EnhancedButton>);
    expect(screen.getByRole('button')).toHaveClass('btn-primary');

    rerender(<EnhancedButton variant="secondary">Secondary</EnhancedButton>);
    expect(screen.getByRole('button')).toHaveClass('btn-secondary');

    rerender(<EnhancedButton variant="destructive">Destructive</EnhancedButton>);
    expect(screen.getByRole('button')).toHaveClass('btn-destructive');

    rerender(<EnhancedButton variant="outline">Outline</EnhancedButton>);
    expect(screen.getByRole('button')).toHaveClass('btn-outline');

    rerender(<EnhancedButton variant="ghost">Ghost</EnhancedButton>);
    expect(screen.getByRole('button')).toHaveClass('btn-ghost');
  });

  it('renders button with different sizes', () => {
    const { rerender } = render(<EnhancedButton size="sm">Small</EnhancedButton>);
    expect(screen.getByRole('button')).toHaveClass('btn-sm');

    rerender(<EnhancedButton size="md">Medium</EnhancedButton>);
    expect(screen.getByRole('button')).toHaveClass('btn-md');

    rerender(<EnhancedButton size="lg">Large</EnhancedButton>);
    expect(screen.getByRole('button')).toHaveClass('btn-lg');
  });

  it('handles click events', () => {
    const handleClick = vi.fn();
    render(<EnhancedButton onClick={handleClick}>Click me</EnhancedButton>);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('shows loading state', () => {
    render(<EnhancedButton loading>Loading</EnhancedButton>);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows disabled state', () => {
    render(<EnhancedButton disabled>Disabled</EnhancedButton>);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('shows ripple effect on click', async () => {
    const user = userEvent.setup();
    render(<EnhancedButton>Click me</EnhancedButton>);

    const button = screen.getByRole('button');
    await user.click(button);

    // Check for ripple effect element
    expect(button.querySelector('.ripple')).toBeInTheDocument();
  });

  it('handles keyboard events', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<EnhancedButton onClick={handleClick}>Click me</EnhancedButton>);

    const button = screen.getByRole('button');
    button.focus();

    await user.keyboard('{Enter}');
    expect(handleClick).toHaveBeenCalledTimes(1);

    await user.keyboard(' ');
    expect(handleClick).toHaveBeenCalledTimes(2);
  });

  it('shows icon when provided', () => {
    const TestIcon = () => <span data-testid="test-icon">Icon</span>;
    render(<EnhancedButton icon={<TestIcon />}>With Icon</EnhancedButton>);

    expect(screen.getByTestId('test-icon')).toBeInTheDocument();
  });

  it('shows icon on the left by default', () => {
    const TestIcon = () => <span data-testid="test-icon">Icon</span>;
    render(<EnhancedButton icon={<TestIcon />}>With Icon</EnhancedButton>);

    const button = screen.getByRole('button');
    const icon = screen.getByTestId('test-icon');
    expect(button.firstChild).toBe(icon);
  });

  it('shows icon on the right when specified', () => {
    const TestIcon = () => <span data-testid="test-icon">Icon</span>;
    render(<EnhancedButton icon={<TestIcon />} iconPosition="right">With Icon</EnhancedButton>);

    const button = screen.getByRole('button');
    const icon = screen.getByTestId('test-icon');
    expect(button.lastChild).toBe(icon);
  });

  it('shows only icon when iconOnly prop is true', () => {
    const TestIcon = () => <span data-testid="test-icon">Icon</span>;
    render(<EnhancedButton icon={<TestIcon />} iconOnly>Icon Only</EnhancedButton>);

    expect(screen.getByTestId('test-icon')).toBeInTheDocument();
    expect(screen.queryByText('Icon Only')).not.toBeInTheDocument();
  });

  it('shows tooltip when provided', async () => {
    const user = userEvent.setup();
    render(<EnhancedButton tooltip="This is a tooltip">Hover me</EnhancedButton>);

    const button = screen.getByRole('button');
    await user.hover(button);

    await waitFor(() => {
      expect(screen.getByText('This is a tooltip')).toBeInTheDocument();
    });
  });

  it('applies custom className', () => {
    render(<EnhancedButton className="custom-class">Custom</EnhancedButton>);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('custom-class');
  });

  it('applies custom styles', () => {
    render(<EnhancedButton style={{ backgroundColor: 'red' }}>Styled</EnhancedButton>);

    const button = screen.getByRole('button');
    expect(button).toHaveStyle('background-color: red');
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLButtonElement>();
    render(<EnhancedButton ref={ref}>Ref Button</EnhancedButton>);

    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    expect(ref.current).toHaveTextContent('Ref Button');
  });

  it('handles focus events', () => {
    const handleFocus = vi.fn();
    const handleBlur = vi.fn();
    render(
      <EnhancedButton onFocus={handleFocus} onBlur={handleBlur}>
        Focus Button
      </EnhancedButton>
    );

    const button = screen.getByRole('button');
    fireEvent.focus(button);
    expect(handleFocus).toHaveBeenCalledTimes(1);

    fireEvent.blur(button);
    expect(handleBlur).toHaveBeenCalledTimes(1);
  });

  it('handles mouse events', () => {
    const handleMouseEnter = vi.fn();
    const handleMouseLeave = vi.fn();
    render(
      <EnhancedButton onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
        Mouse Button
      </EnhancedButton>
    );

    const button = screen.getByRole('button');
    fireEvent.mouseEnter(button);
    expect(handleMouseEnter).toHaveBeenCalledTimes(1);

    fireEvent.mouseLeave(button);
    expect(handleMouseLeave).toHaveBeenCalledTimes(1);
  });

  it('shows success state', () => {
    render(<EnhancedButton success>Success</EnhancedButton>);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('btn-success');
  });

  it('shows error state', () => {
    render(<EnhancedButton error>Error</EnhancedButton>);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('btn-error');
  });

  it('shows warning state', () => {
    render(<EnhancedButton warning>Warning</EnhancedButton>);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('btn-warning');
  });

  it('shows info state', () => {
    render(<EnhancedButton info>Info</EnhancedButton>);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('btn-info');
  });

  it('handles long text content', () => {
    const longText = 'This is a very long button text that should wrap properly';
    render(<EnhancedButton>{longText}</EnhancedButton>);

    const button = screen.getByRole('button');
    expect(button).toHaveTextContent(longText);
  });

  it('handles empty text content', () => {
    render(<EnhancedButton></EnhancedButton>);

    const button = screen.getByRole('button');
    expect(button).toBeEmptyDOMElement();
  });

  it('shows loading spinner when loading', () => {
    render(<EnhancedButton loading>Loading</EnhancedButton>);

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('disables button when loading', () => {
    render(<EnhancedButton loading>Loading</EnhancedButton>);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('shows custom loading text', () => {
    render(<EnhancedButton loading loadingText="Processing...">Submit</EnhancedButton>);

    expect(screen.getByText('Processing...')).toBeInTheDocument();
    expect(screen.queryByText('Submit')).not.toBeInTheDocument();
  });

  it('handles multiple rapid clicks gracefully', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<EnhancedButton onClick={handleClick}>Click me</EnhancedButton>);

    const button = screen.getByRole('button');
    
    // Click multiple times rapidly
    await user.click(button);
    await user.click(button);
    await user.click(button);

    expect(handleClick).toHaveBeenCalledTimes(3);
  });

  it('shows accessibility attributes', () => {
    render(
      <EnhancedButton 
        aria-label="Custom label"
        aria-describedby="description"
        role="button"
      >
        Accessible Button
      </EnhancedButton>
    );

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Custom label');
    expect(button).toHaveAttribute('aria-describedby', 'description');
  });

  it('handles form submission', () => {
    const handleSubmit = vi.fn();
    render(
      <form onSubmit={handleSubmit}>
        <EnhancedButton type="submit">Submit</EnhancedButton>
      </form>
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(handleSubmit).toHaveBeenCalledTimes(1);
  });

  it('handles form reset', () => {
    const handleReset = vi.fn();
    render(
      <form onReset={handleReset}>
        <EnhancedButton type="reset">Reset</EnhancedButton>
      </form>
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(handleReset).toHaveBeenCalledTimes(1);
  });

  it('shows different states based on props', () => {
    const { rerender } = render(<EnhancedButton>Normal</EnhancedButton>);
    expect(screen.getByRole('button')).not.toHaveClass('btn-loading');

    rerender(<EnhancedButton loading>Loading</EnhancedButton>);
    expect(screen.getByRole('button')).toHaveClass('btn-loading');

    rerender(<EnhancedButton disabled>Disabled</EnhancedButton>);
    expect(screen.getByRole('button')).toHaveClass('btn-disabled');
  });

  it('handles custom data attributes', () => {
    render(<EnhancedButton data-testid="custom-button" data-custom="value">Custom</EnhancedButton>);

    const button = screen.getByTestId('custom-button');
    expect(button).toHaveAttribute('data-custom', 'value');
  });

  it('shows animation classes when animated', () => {
    render(<EnhancedButton animated>Animated</EnhancedButton>);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('btn-animated');
  });

  it('handles full width', () => {
    render(<EnhancedButton fullWidth>Full Width</EnhancedButton>);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('btn-full-width');
  });

  it('shows different button types', () => {
    const { rerender } = render(<EnhancedButton type="button">Button</EnhancedButton>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');

    rerender(<EnhancedButton type="submit">Submit</EnhancedButton>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');

    rerender(<EnhancedButton type="reset">Reset</EnhancedButton>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'reset');
  });
});