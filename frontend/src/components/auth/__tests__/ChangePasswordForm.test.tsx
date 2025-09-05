import React from 'react';
import { render, screen, fireEvent, waitFor, userEvent, vi } from '../../../test';
import { setupApiMocks } from '../../../test';
import ChangePasswordForm from '../ChangePasswordForm';

describe('ChangePasswordForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupApiMocks.loginSuccess();
  });

  it('renders change password form correctly', () => {
    render(<ChangePasswordForm />);
    
    expect(screen.getByText('Change Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Current Password')).toBeInTheDocument();
    expect(screen.getByLabelText('New Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm New Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Change Password' })).toBeInTheDocument();
  });

  it('shows validation errors for empty fields', async () => {
    render(<ChangePasswordForm />);
    
    const submitButton = screen.getByRole('button', { name: 'Change Password' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Current password is required')).toBeInTheDocument();
      expect(screen.getByText('New password is required')).toBeInTheDocument();
      expect(screen.getByText('Please confirm your new password')).toBeInTheDocument();
    });
  });

  it('shows validation error for short new password', async () => {
    render(<ChangePasswordForm />);
    
    const newPasswordInput = screen.getByLabelText('New Password');
    fireEvent.change(newPasswordInput, { target: { value: '123' } });
    
    const submitButton = screen.getByRole('button', { name: 'Change Password' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('New password must be at least 8 characters long')).toBeInTheDocument();
    });
  });

  it('shows validation error for weak new password', async () => {
    render(<ChangePasswordForm />);
    
    const newPasswordInput = screen.getByLabelText('New Password');
    fireEvent.change(newPasswordInput, { target: { value: 'password' } });
    
    const submitButton = screen.getByRole('button', { name: 'Change Password' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('New password must contain at least one uppercase letter, one lowercase letter, and one number')).toBeInTheDocument();
    });
  });

  it('shows validation error for password mismatch', async () => {
    render(<ChangePasswordForm />);
    
    const newPasswordInput = screen.getByLabelText('New Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm New Password');
    
    fireEvent.change(newPasswordInput, { target: { value: 'NewPassword123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'NewPassword456' } });
    
    const submitButton = screen.getByRole('button', { name: 'Change Password' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('New passwords do not match')).toBeInTheDocument();
    });
  });

  it('shows validation error when new password is same as current', async () => {
    render(<ChangePasswordForm />);
    
    const currentPasswordInput = screen.getByLabelText('Current Password');
    const newPasswordInput = screen.getByLabelText('New Password');
    
    fireEvent.change(currentPasswordInput, { target: { value: 'CurrentPassword123' } });
    fireEvent.change(newPasswordInput, { target: { value: 'CurrentPassword123' } });
    
    const submitButton = screen.getByRole('button', { name: 'Change Password' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('New password must be different from current password')).toBeInTheDocument();
    });
  });

  it('toggles current password visibility', () => {
    render(<ChangePasswordForm />);
    
    const currentPasswordInput = screen.getByLabelText('Current Password') as HTMLInputElement;
    const toggleButton = screen.getByRole('button', { name: 'Toggle current password visibility' });
    
    expect(currentPasswordInput.type).toBe('password');
    
    fireEvent.click(toggleButton);
    expect(currentPasswordInput.type).toBe('text');
    
    fireEvent.click(toggleButton);
    expect(currentPasswordInput.type).toBe('password');
  });

  it('toggles new password visibility', () => {
    render(<ChangePasswordForm />);
    
    const newPasswordInput = screen.getByLabelText('New Password') as HTMLInputElement;
    const toggleButton = screen.getByRole('button', { name: 'Toggle new password visibility' });
    
    expect(newPasswordInput.type).toBe('password');
    
    fireEvent.click(toggleButton);
    expect(newPasswordInput.type).toBe('text');
    
    fireEvent.click(toggleButton);
    expect(newPasswordInput.type).toBe('password');
  });

  it('toggles confirm password visibility', () => {
    render(<ChangePasswordForm />);
    
    const confirmPasswordInput = screen.getByLabelText('Confirm New Password') as HTMLInputElement;
    const toggleButton = screen.getByRole('button', { name: 'Toggle confirm password visibility' });
    
    expect(confirmPasswordInput.type).toBe('password');
    
    fireEvent.click(toggleButton);
    expect(confirmPasswordInput.type).toBe('text');
    
    fireEvent.click(toggleButton);
    expect(confirmPasswordInput.type).toBe('password');
  });

  it('shows password strength indicator for new password', async () => {
    render(<ChangePasswordForm />);
    
    const newPasswordInput = screen.getByLabelText('New Password');
    fireEvent.change(newPasswordInput, { target: { value: 'NewPassword123' } });

    await waitFor(() => {
      expect(screen.getByText('Strong')).toBeInTheDocument();
    });
  });

  it('handles successful password change', async () => {
    const user = userEvent.setup();
    render(<ChangePasswordForm />);
    
    const currentPasswordInput = screen.getByLabelText('Current Password');
    const newPasswordInput = screen.getByLabelText('New Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm New Password');
    const submitButton = screen.getByRole('button', { name: 'Change Password' });
    
    await user.type(currentPasswordInput, 'CurrentPassword123');
    await user.type(newPasswordInput, 'NewPassword123');
    await user.type(confirmPasswordInput, 'NewPassword123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Password changed successfully')).toBeInTheDocument();
    });
  });

  it('handles password change error', async () => {
    setupApiMocks.loginError();
    const user = userEvent.setup();
    render(<ChangePasswordForm />);
    
    const currentPasswordInput = screen.getByLabelText('Current Password');
    const newPasswordInput = screen.getByLabelText('New Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm New Password');
    const submitButton = screen.getByRole('button', { name: 'Change Password' });
    
    await user.type(currentPasswordInput, 'WrongPassword123');
    await user.type(newPasswordInput, 'NewPassword123');
    await user.type(confirmPasswordInput, 'NewPassword123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Current password is incorrect')).toBeInTheDocument();
    });
  });

  it('shows loading state during password change', async () => {
    const user = userEvent.setup();
    render(<ChangePasswordForm />);
    
    const currentPasswordInput = screen.getByLabelText('Current Password');
    const newPasswordInput = screen.getByLabelText('New Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm New Password');
    const submitButton = screen.getByRole('button', { name: 'Change Password' });
    
    await user.type(currentPasswordInput, 'CurrentPassword123');
    await user.type(newPasswordInput, 'NewPassword123');
    await user.type(confirmPasswordInput, 'NewPassword123');
    await user.click(submitButton);

    expect(submitButton).toBeDisabled();
    expect(screen.getByText('Changing password...')).toBeInTheDocument();
  });

  it('clears field errors when user starts typing', async () => {
    render(<ChangePasswordForm />);
    
    const submitButton = screen.getByRole('button', { name: 'Change Password' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Current password is required')).toBeInTheDocument();
    });

    const currentPasswordInput = screen.getByLabelText('Current Password');
    fireEvent.change(currentPasswordInput, { target: { value: 'password' } });

    await waitFor(() => {
      expect(screen.queryByText('Current password is required')).not.toBeInTheDocument();
    });
  });

  it('calls onSuccess callback on successful password change', async () => {
    const onSuccess = vi.fn();
    const user = userEvent.setup();
    render(<ChangePasswordForm onSuccess={onSuccess} />);
    
    const currentPasswordInput = screen.getByLabelText('Current Password');
    const newPasswordInput = screen.getByLabelText('New Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm New Password');
    const submitButton = screen.getByRole('button', { name: 'Change Password' });
    
    await user.type(currentPasswordInput, 'CurrentPassword123');
    await user.type(newPasswordInput, 'NewPassword123');
    await user.type(confirmPasswordInput, 'NewPassword123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('calls onCancel callback when cancel button is clicked', () => {
    const onCancel = vi.fn();
    render(<ChangePasswordForm onCancel={onCancel} />);
    
    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelButton);

    expect(onCancel).toHaveBeenCalled();
  });

  it('resets form after successful password change', async () => {
    const user = userEvent.setup();
    render(<ChangePasswordForm />);
    
    const currentPasswordInput = screen.getByLabelText('Current Password');
    const newPasswordInput = screen.getByLabelText('New Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm New Password');
    const submitButton = screen.getByRole('button', { name: 'Change Password' });
    
    await user.type(currentPasswordInput, 'CurrentPassword123');
    await user.type(newPasswordInput, 'NewPassword123');
    await user.type(confirmPasswordInput, 'NewPassword123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Password changed successfully')).toBeInTheDocument();
    });

    // Form should be reset
    expect(currentPasswordInput).toHaveValue('');
    expect(newPasswordInput).toHaveValue('');
    expect(confirmPasswordInput).toHaveValue('');
  });
});
