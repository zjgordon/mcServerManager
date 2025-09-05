import React from 'react';
import { render, screen, fireEvent, waitFor, userEvent, vi } from '../../../test';
import { setupApiMocks } from '../../../test';
import SetupForm from '../SetupForm';

describe('SetupForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupApiMocks.loginSuccess();
  });

  it('renders setup form correctly', () => {
    render(<SetupForm />);
    
    expect(screen.getByText('Setup Admin Account')).toBeInTheDocument();
    expect(screen.getByLabelText('Username')).toBeInTheDocument();
    expect(screen.getByLabelText('Email (optional)')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Admin Account' })).toBeInTheDocument();
  });

  it('shows validation errors for empty fields', async () => {
    render(<SetupForm />);
    
    const submitButton = screen.getByRole('button', { name: 'Create Admin Account' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Username is required')).toBeInTheDocument();
      expect(screen.getByText('Password is required')).toBeInTheDocument();
      expect(screen.getByText('Please confirm your password')).toBeInTheDocument();
    });
  });

  it('shows validation error for short username', async () => {
    render(<SetupForm />);
    
    const usernameInput = screen.getByLabelText('Username');
    fireEvent.change(usernameInput, { target: { value: 'ab' } });
    
    const submitButton = screen.getByRole('button', { name: 'Create Admin Account' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Username must be at least 3 characters long')).toBeInTheDocument();
    });
  });

  it('shows validation error for invalid username characters', async () => {
    render(<SetupForm />);
    
    const usernameInput = screen.getByLabelText('Username');
    fireEvent.change(usernameInput, { target: { value: 'user@name' } });
    
    const submitButton = screen.getByRole('button', { name: 'Create Admin Account' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Username can only contain letters, numbers, underscores, and hyphens')).toBeInTheDocument();
    });
  });

  it('shows validation error for short password', async () => {
    render(<SetupForm />);
    
    const passwordInput = screen.getByLabelText('Password');
    fireEvent.change(passwordInput, { target: { value: '123' } });
    
    const submitButton = screen.getByRole('button', { name: 'Create Admin Account' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Password must be at least 8 characters long')).toBeInTheDocument();
    });
  });

  it('shows validation error for weak password', async () => {
    render(<SetupForm />);
    
    const passwordInput = screen.getByLabelText('Password');
    fireEvent.change(passwordInput, { target: { value: 'password' } });
    
    const submitButton = screen.getByRole('button', { name: 'Create Admin Account' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Password must contain at least one uppercase letter, one lowercase letter, and one number')).toBeInTheDocument();
    });
  });

  it('shows validation error for password mismatch', async () => {
    render(<SetupForm />);
    
    const passwordInput = screen.getByLabelText('Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm Password');
    
    fireEvent.change(passwordInput, { target: { value: 'Password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'Password456' } });
    
    const submitButton = screen.getByRole('button', { name: 'Create Admin Account' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    });
  });

  it('shows validation error for invalid email', async () => {
    render(<SetupForm />);
    
    const emailInput = screen.getByLabelText('Email (optional)');
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    
    const submitButton = screen.getByRole('button', { name: 'Create Admin Account' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    });
  });

  it('toggles password visibility', () => {
    render(<SetupForm />);
    
    const passwordInput = screen.getByLabelText('Password') as HTMLInputElement;
    const toggleButton = screen.getByRole('button', { name: 'Toggle password visibility' });
    
    expect(passwordInput.type).toBe('password');
    
    fireEvent.click(toggleButton);
    expect(passwordInput.type).toBe('text');
    
    fireEvent.click(toggleButton);
    expect(passwordInput.type).toBe('password');
  });

  it('toggles confirm password visibility', () => {
    render(<SetupForm />);
    
    const confirmPasswordInput = screen.getByLabelText('Confirm Password') as HTMLInputElement;
    const toggleButton = screen.getByRole('button', { name: 'Toggle confirm password visibility' });
    
    expect(confirmPasswordInput.type).toBe('password');
    
    fireEvent.click(toggleButton);
    expect(confirmPasswordInput.type).toBe('text');
    
    fireEvent.click(toggleButton);
    expect(confirmPasswordInput.type).toBe('password');
  });

  it('shows password strength indicator', async () => {
    render(<SetupForm />);
    
    const passwordInput = screen.getByLabelText('Password');
    fireEvent.change(passwordInput, { target: { value: 'Password123' } });

    await waitFor(() => {
      expect(screen.getByText('Strong')).toBeInTheDocument();
    });
  });

  it('handles successful setup', async () => {
    const user = userEvent.setup();
    render(<SetupForm />);
    
    const usernameInput = screen.getByLabelText('Username');
    const emailInput = screen.getByLabelText('Email (optional)');
    const passwordInput = screen.getByLabelText('Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm Password');
    const submitButton = screen.getByRole('button', { name: 'Create Admin Account' });
    
    await user.type(usernameInput, 'admin');
    await user.type(emailInput, 'admin@example.com');
    await user.type(passwordInput, 'Password123');
    await user.type(confirmPasswordInput, 'Password123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Admin account created successfully')).toBeInTheDocument();
    });
  });

  it('handles setup error', async () => {
    setupApiMocks.loginError();
    const user = userEvent.setup();
    render(<SetupForm />);
    
    const usernameInput = screen.getByLabelText('Username');
    const passwordInput = screen.getByLabelText('Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm Password');
    const submitButton = screen.getByRole('button', { name: 'Create Admin Account' });
    
    await user.type(usernameInput, 'admin');
    await user.type(passwordInput, 'Password123');
    await user.type(confirmPasswordInput, 'Password123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Failed to create admin account')).toBeInTheDocument();
    });
  });

  it('shows loading state during setup', async () => {
    const user = userEvent.setup();
    render(<SetupForm />);
    
    const usernameInput = screen.getByLabelText('Username');
    const passwordInput = screen.getByLabelText('Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm Password');
    const submitButton = screen.getByRole('button', { name: 'Create Admin Account' });
    
    await user.type(usernameInput, 'admin');
    await user.type(passwordInput, 'Password123');
    await user.type(confirmPasswordInput, 'Password123');
    await user.click(submitButton);

    expect(submitButton).toBeDisabled();
    expect(screen.getByText('Creating admin account...')).toBeInTheDocument();
  });

  it('clears field errors when user starts typing', async () => {
    render(<SetupForm />);
    
    const submitButton = screen.getByRole('button', { name: 'Create Admin Account' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Username is required')).toBeInTheDocument();
    });

    const usernameInput = screen.getByLabelText('Username');
    fireEvent.change(usernameInput, { target: { value: 'admin' } });

    await waitFor(() => {
      expect(screen.queryByText('Username is required')).not.toBeInTheDocument();
    });
  });

  it('calls onSuccess callback on successful setup', async () => {
    const onSuccess = vi.fn();
    const user = userEvent.setup();
    render(<SetupForm onSuccess={onSuccess} />);
    
    const usernameInput = screen.getByLabelText('Username');
    const passwordInput = screen.getByLabelText('Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm Password');
    const submitButton = screen.getByRole('button', { name: 'Create Admin Account' });
    
    await user.type(usernameInput, 'admin');
    await user.type(passwordInput, 'Password123');
    await user.type(confirmPasswordInput, 'Password123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('calls onCancel callback when cancel button is clicked', () => {
    const onCancel = vi.fn();
    render(<SetupForm onCancel={onCancel} />);
    
    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelButton);

    expect(onCancel).toHaveBeenCalled();
  });
});
