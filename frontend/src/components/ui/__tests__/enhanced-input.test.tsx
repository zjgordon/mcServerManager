import React from 'react';
import { render, screen, fireEvent, waitFor, userEvent, vi } from '../../../test';
import EnhancedInput from '../enhanced-input';

describe('EnhancedInput', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders input with default props', () => {
    render(<EnhancedInput />);

    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();
    expect(input).toHaveClass('input');
  });

  it('renders input with label', () => {
    render(<EnhancedInput label="Test Label" />);

    expect(screen.getByLabelText('Test Label')).toBeInTheDocument();
    expect(screen.getByText('Test Label')).toBeInTheDocument();
  });

  it('renders input with placeholder', () => {
    render(<EnhancedInput placeholder="Enter text" />);

    const input = screen.getByPlaceholderText('Enter text');
    expect(input).toBeInTheDocument();
  });

  it('renders input with different types', () => {
    const { rerender } = render(<EnhancedInput type="text" />);
    expect(screen.getByRole('textbox')).toHaveAttribute('type', 'text');

    rerender(<EnhancedInput type="email" />);
    expect(screen.getByRole('textbox')).toHaveAttribute('type', 'email');

    rerender(<EnhancedInput type="password" />);
    expect(screen.getByRole('textbox')).toHaveAttribute('type', 'password');

    rerender(<EnhancedInput type="number" />);
    expect(screen.getByRole('spinbutton')).toHaveAttribute('type', 'number');
  });

  it('renders input with different sizes', () => {
    const { rerender } = render(<EnhancedInput size="sm" />);
    expect(screen.getByRole('textbox')).toHaveClass('input-sm');

    rerender(<EnhancedInput size="md" />);
    expect(screen.getByRole('textbox')).toHaveClass('input-md');

    rerender(<EnhancedInput size="lg" />);
    expect(screen.getByRole('textbox')).toHaveClass('input-lg');
  });

  it('renders input with different variants', () => {
    const { rerender } = render(<EnhancedInput variant="default" />);
    expect(screen.getByRole('textbox')).toHaveClass('input-default');

    rerender(<EnhancedInput variant="outlined" />);
    expect(screen.getByRole('textbox')).toHaveClass('input-outlined');

    rerender(<EnhancedInput variant="filled" />);
    expect(screen.getByRole('textbox')).toHaveClass('input-filled');
  });

  it('handles value changes', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<EnhancedInput onChange={handleChange} />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'test');

    expect(handleChange).toHaveBeenCalled();
    expect(input).toHaveValue('test');
  });

  it('handles controlled value', () => {
    const { rerender } = render(<EnhancedInput value="initial" />);
    expect(screen.getByRole('textbox')).toHaveValue('initial');

    rerender(<EnhancedInput value="updated" />);
    expect(screen.getByRole('textbox')).toHaveValue('updated');
  });

  it('shows error state', () => {
    render(<EnhancedInput error="Error message" />);

    expect(screen.getByText('Error message')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveClass('input-error');
  });

  it('shows success state', () => {
    render(<EnhancedInput success />);

    expect(screen.getByRole('textbox')).toHaveClass('input-success');
  });

  it('shows warning state', () => {
    render(<EnhancedInput warning />);

    expect(screen.getByRole('textbox')).toHaveClass('input-warning');
  });

  it('shows disabled state', () => {
    render(<EnhancedInput disabled />);

    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
    expect(input).toHaveClass('input-disabled');
  });

  it('shows readonly state', () => {
    render(<EnhancedInput readOnly />);

    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('readonly');
    expect(input).toHaveClass('input-readonly');
  });

  it('shows required indicator', () => {
    render(<EnhancedInput required label="Required Field" />);

    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('shows help text', () => {
    render(<EnhancedInput helpText="This is help text" />);

    expect(screen.getByText('This is help text')).toBeInTheDocument();
  });

  it('shows character count', () => {
    render(<EnhancedInput maxLength={100} showCharCount />);

    expect(screen.getByText('0 / 100')).toBeInTheDocument();
  });

  it('updates character count as user types', async () => {
    const user = userEvent.setup();
    render(<EnhancedInput maxLength={100} showCharCount />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'test');

    expect(screen.getByText('4 / 100')).toBeInTheDocument();
  });

  it('shows password visibility toggle', async () => {
    const user = userEvent.setup();
    render(<EnhancedInput type="password" />);

    const input = screen.getByDisplayValue('');
    const toggleButton = screen.getByLabelText('Toggle password visibility');

    expect(input).toHaveAttribute('type', 'password');

    await user.click(toggleButton);
    expect(input).toHaveAttribute('type', 'text');

    await user.click(toggleButton);
    expect(input).toHaveAttribute('type', 'password');
  });

  it('shows clear button when clearable', async () => {
    const user = userEvent.setup();
    render(<EnhancedInput clearable value="test" />);

    const input = screen.getByRole('textbox');
    const clearButton = screen.getByLabelText('Clear input');

    expect(clearButton).toBeInTheDocument();

    await user.click(clearButton);
    expect(input).toHaveValue('');
  });

  it('shows loading state', () => {
    render(<EnhancedInput loading />);

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveClass('input-loading');
  });

  it('shows icon when provided', () => {
    const TestIcon = () => <span data-testid="test-icon">Icon</span>;
    render(<EnhancedInput icon={<TestIcon />} />);

    expect(screen.getByTestId('test-icon')).toBeInTheDocument();
  });

  it('shows icon on the left by default', () => {
    const TestIcon = () => <span data-testid="test-icon">Icon</span>;
    render(<EnhancedInput icon={<TestIcon />} />);

    const input = screen.getByRole('textbox');
    const icon = screen.getByTestId('test-icon');
    expect(input.previousElementSibling).toBe(icon);
  });

  it('shows icon on the right when specified', () => {
    const TestIcon = () => <span data-testid="test-icon">Icon</span>;
    render(<EnhancedInput icon={<TestIcon />} iconPosition="right" />);

    const input = screen.getByRole('textbox');
    const icon = screen.getByTestId('test-icon');
    expect(input.nextElementSibling).toBe(icon);
  });

  it('handles focus events', () => {
    const handleFocus = vi.fn();
    const handleBlur = vi.fn();
    render(<EnhancedInput onFocus={handleFocus} onBlur={handleBlur} />);

    const input = screen.getByRole('textbox');
    fireEvent.focus(input);
    expect(handleFocus).toHaveBeenCalledTimes(1);

    fireEvent.blur(input);
    expect(handleBlur).toHaveBeenCalledTimes(1);
  });

  it('shows focus state', () => {
    render(<EnhancedInput />);

    const input = screen.getByRole('textbox');
    fireEvent.focus(input);

    expect(input).toHaveClass('input-focused');
  });

  it('handles keyboard events', async () => {
    const user = userEvent.setup();
    const handleKeyDown = vi.fn();
    const handleKeyUp = vi.fn();
    render(<EnhancedInput onKeyDown={handleKeyDown} onKeyUp={handleKeyUp} />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'a');

    expect(handleKeyDown).toHaveBeenCalled();
    expect(handleKeyUp).toHaveBeenCalled();
  });

  it('handles Enter key press', async () => {
    const user = userEvent.setup();
    const handleEnter = vi.fn();
    render(<EnhancedInput onEnter={handleEnter} />);

    const input = screen.getByRole('textbox');
    await user.type(input, '{Enter}');

    expect(handleEnter).toHaveBeenCalledTimes(1);
  });

  it('handles Escape key press', async () => {
    const user = userEvent.setup();
    const handleEscape = vi.fn();
    render(<EnhancedInput onEscape={handleEscape} />);

    const input = screen.getByRole('textbox');
    await user.type(input, '{Escape}');

    expect(handleEscape).toHaveBeenCalledTimes(1);
  });

  it('shows suggestions when provided', async () => {
    const user = userEvent.setup();
    const suggestions = ['apple', 'banana', 'cherry'];
    render(<EnhancedInput suggestions={suggestions} />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'a');

    await waitFor(() => {
      expect(screen.getByText('apple')).toBeInTheDocument();
      expect(screen.getByText('banana')).toBeInTheDocument();
    });
  });

  it('handles suggestion selection', async () => {
    const user = userEvent.setup();
    const suggestions = ['apple', 'banana', 'cherry'];
    const handleSuggestionSelect = vi.fn();
    render(<EnhancedInput suggestions={suggestions} onSuggestionSelect={handleSuggestionSelect} />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'a');

    await waitFor(() => {
      expect(screen.getByText('apple')).toBeInTheDocument();
    });

    const suggestion = screen.getByText('apple');
    await user.click(suggestion);

    expect(handleSuggestionSelect).toHaveBeenCalledWith('apple');
  });

  it('validates input in real-time', async () => {
    const user = userEvent.setup();
    const validator = (value: string) => value.length >= 3 ? null : 'Too short';
    render(<EnhancedInput validator={validator} />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'ab');

    await waitFor(() => {
      expect(screen.getByText('Too short')).toBeInTheDocument();
    });

    await user.type(input, 'c');

    await waitFor(() => {
      expect(screen.queryByText('Too short')).not.toBeInTheDocument();
    });
  });

  it('shows validation success', async () => {
    const user = userEvent.setup();
    const validator = (value: string) => value.length >= 3 ? 'Valid' : 'Too short';
    render(<EnhancedInput validator={validator} />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'abc');

    await waitFor(() => {
      expect(screen.getByText('Valid')).toBeInTheDocument();
    });
  });

  it('handles autocomplete', () => {
    render(<EnhancedInput autoComplete="email" />);

    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('autocomplete', 'email');
  });

  it('handles autoFocus', () => {
    render(<EnhancedInput autoFocus />);

    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('autofocus');
  });

  it('handles maxLength', () => {
    render(<EnhancedInput maxLength={10} />);

    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('maxlength', '10');
  });

  it('handles minLength', () => {
    render(<EnhancedInput minLength={3} />);

    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('minlength', '3');
  });

  it('handles pattern validation', () => {
    render(<EnhancedInput pattern="[0-9]+" />);

    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('pattern', '[0-9]+');
  });

  it('handles step for number inputs', () => {
    render(<EnhancedInput type="number" step="0.1" />);

    const input = screen.getByRole('spinbutton');
    expect(input).toHaveAttribute('step', '0.1');
  });

  it('handles min and max for number inputs', () => {
    render(<EnhancedInput type="number" min="0" max="100" />);

    const input = screen.getByRole('spinbutton');
    expect(input).toHaveAttribute('min', '0');
    expect(input).toHaveAttribute('max', '100');
  });

  it('applies custom className', () => {
    render(<EnhancedInput className="custom-class" />);

    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('custom-class');
  });

  it('applies custom styles', () => {
    render(<EnhancedInput style={{ backgroundColor: 'red' }} />);

    const input = screen.getByRole('textbox');
    expect(input).toHaveStyle('background-color: red');
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLInputElement>();
    render(<EnhancedInput ref={ref} />);

    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it('handles custom data attributes', () => {
    render(<EnhancedInput data-testid="custom-input" data-custom="value" />);

    const input = screen.getByTestId('custom-input');
    expect(input).toHaveAttribute('data-custom', 'value');
  });

  it('shows animation classes when animated', () => {
    render(<EnhancedInput animated />);

    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('input-animated');
  });

  it('handles full width', () => {
    render(<EnhancedInput fullWidth />);

    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('input-full-width');
  });

  it('shows different input states', () => {
    const { rerender } = render(<EnhancedInput />);
    expect(screen.getByRole('textbox')).not.toHaveClass('input-loading');

    rerender(<EnhancedInput loading />);
    expect(screen.getByRole('textbox')).toHaveClass('input-loading');

    rerender(<EnhancedInput disabled />);
    expect(screen.getByRole('textbox')).toHaveClass('input-disabled');
  });

  it('handles form submission', () => {
    const handleSubmit = vi.fn();
    render(
      <form onSubmit={handleSubmit}>
        <EnhancedInput name="test" />
        <button type="submit">Submit</button>
      </form>
    );

    const form = screen.getByRole('form');
    fireEvent.submit(form);

    expect(handleSubmit).toHaveBeenCalledTimes(1);
  });

  it('shows accessibility attributes', () => {
    render(
      <EnhancedInput 
        aria-label="Custom input"
        aria-describedby="description"
        aria-invalid="false"
      />
    );

    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-label', 'Custom input');
    expect(input).toHaveAttribute('aria-describedby', 'description');
    expect(input).toHaveAttribute('aria-invalid', 'false');
  });

  it('handles long text content', async () => {
    const user = userEvent.setup();
    const longText = 'This is a very long text that should be handled properly by the input component';
    render(<EnhancedInput />);

    const input = screen.getByRole('textbox');
    await user.type(input, longText);

    expect(input).toHaveValue(longText);
  });

  it('shows loading spinner when loading', () => {
    render(<EnhancedInput loading />);

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('disables interactions when disabled', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<EnhancedInput disabled onChange={handleChange} />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'test');

    expect(handleChange).not.toHaveBeenCalled();
  });

  it('handles different input modes', () => {
    const { rerender } = render(<EnhancedInput inputMode="text" />);
    expect(screen.getByRole('textbox')).toHaveAttribute('inputmode', 'text');

    rerender(<EnhancedInput inputMode="numeric" />);
    expect(screen.getByRole('textbox')).toHaveAttribute('inputmode', 'numeric');

    rerender(<EnhancedInput inputMode="email" />);
    expect(screen.getByRole('textbox')).toHaveAttribute('inputmode', 'email');
  });

  it('handles spell check', () => {
    const { rerender } = render(<EnhancedInput spellCheck />);
    expect(screen.getByRole('textbox')).toHaveAttribute('spellcheck', 'true');

    rerender(<EnhancedInput spellCheck={false} />);
    expect(screen.getByRole('textbox')).toHaveAttribute('spellcheck', 'false');
  });
});
