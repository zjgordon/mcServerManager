import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { useAuth } from '../useAuth';
import { setupApiMocks } from '../../test';

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns initial auth state', () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('loads user data on mount', async () => {
    const mockUser = { id: 1, username: 'testuser', email: 'test@example.com' };
    setupApiMocks.getCurrentUser(mockUser);

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('handles user data load error', async () => {
    setupApiMocks.getCurrentUser.mockRejectedValue(new Error('API Error'));

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('API Error');
    });
  });

  it('logs in user successfully', async () => {
    const mockUser = { id: 1, username: 'testuser', email: 'test@example.com' };
    setupApiMocks.loginSuccess(mockUser);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.login('testuser', 'password123');
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('handles login error', async () => {
    setupApiMocks.loginError();

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.login('testuser', 'wrongpassword');
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.error).toBe('Invalid credentials');
  });

  it('logs out user successfully', async () => {
    const mockUser = { id: 1, username: 'testuser', email: 'test@example.com' };
    setupApiMocks.getCurrentUser(mockUser);
    setupApiMocks.logoutSuccess();

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('handles logout error', async () => {
    const mockUser = { id: 1, username: 'testuser', email: 'test@example.com' };
    setupApiMocks.getCurrentUser(mockUser);
    setupApiMocks.logoutError();

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.error).toBe('Logout failed');
  });

  it('updates user profile successfully', async () => {
    const mockUser = { id: 1, username: 'testuser', email: 'test@example.com' };
    const updatedUser = { ...mockUser, email: 'newemail@example.com' };
    setupApiMocks.getCurrentUser(mockUser);
    setupApiMocks.updateUserSuccess(updatedUser);

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });

    await act(async () => {
      await result.current.updateProfile({ email: 'newemail@example.com' });
    });

    expect(result.current.user).toEqual(updatedUser);
    expect(result.current.error).toBeNull();
  });

  it('handles profile update error', async () => {
    const mockUser = { id: 1, username: 'testuser', email: 'test@example.com' };
    setupApiMocks.getCurrentUser(mockUser);
    setupApiMocks.updateUserError();

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });

    await act(async () => {
      await result.current.updateProfile({ email: 'newemail@example.com' });
    });

    expect(result.current.error).toBe('Profile update failed');
  });

  it('changes password successfully', async () => {
    const mockUser = { id: 1, username: 'testuser', email: 'test@example.com' };
    setupApiMocks.getCurrentUser(mockUser);
    setupApiMocks.changePasswordSuccess();

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });

    await act(async () => {
      await result.current.changePassword('oldpassword', 'newpassword');
    });

    expect(result.current.error).toBeNull();
  });

  it('handles password change error', async () => {
    const mockUser = { id: 1, username: 'testuser', email: 'test@example.com' };
    setupApiMocks.getCurrentUser(mockUser);
    setupApiMocks.changePasswordError();

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });

    await act(async () => {
      await result.current.changePassword('wrongpassword', 'newpassword');
    });

    expect(result.current.error).toBe('Current password is incorrect');
  });

  it('refreshes user data', async () => {
    const mockUser = { id: 1, username: 'testuser', email: 'test@example.com' };
    const updatedUser = { ...mockUser, email: 'updated@example.com' };
    setupApiMocks.getCurrentUser(mockUser);

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });

    setupApiMocks.getCurrentUser(updatedUser);

    await act(async () => {
      await result.current.refreshUser();
    });

    expect(result.current.user).toEqual(updatedUser);
  });

  it('handles refresh user error', async () => {
    const mockUser = { id: 1, username: 'testuser', email: 'test@example.com' };
    setupApiMocks.getCurrentUser(mockUser);

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });

    setupApiMocks.getCurrentUser.mockRejectedValue(new Error('Refresh failed'));

    await act(async () => {
      await result.current.refreshUser();
    });

    expect(result.current.error).toBe('Refresh failed');
  });

  it('clears error when clearError is called', async () => {
    setupApiMocks.getCurrentUser.mockRejectedValue(new Error('API Error'));

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.error).toBe('API Error');
    });

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });

  it('handles token refresh', async () => {
    const mockUser = { id: 1, username: 'testuser', email: 'test@example.com' };
    setupApiMocks.getCurrentUser(mockUser);
    setupApiMocks.refreshTokenSuccess();

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });

    await act(async () => {
      await result.current.refreshToken();
    });

    expect(result.current.error).toBeNull();
  });

  it('handles token refresh error', async () => {
    const mockUser = { id: 1, username: 'testuser', email: 'test@example.com' };
    setupApiMocks.getCurrentUser(mockUser);
    setupApiMocks.refreshTokenError();

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });

    await act(async () => {
      await result.current.refreshToken();
    });

    expect(result.current.error).toBe('Token refresh failed');
  });

  it('handles session timeout', async () => {
    const mockUser = { id: 1, username: 'testuser', email: 'test@example.com' };
    setupApiMocks.getCurrentUser(mockUser);

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });

    act(() => {
      result.current.handleSessionTimeout();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('handles network errors gracefully', async () => {
    setupApiMocks.getCurrentUser.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.error).toBe('Network error');
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('handles concurrent login attempts', async () => {
    setupApiMocks.loginSuccess({ id: 1, username: 'testuser' });

    const { result } = renderHook(() => useAuth());

    const loginPromise1 = result.current.login('testuser', 'password');
    const loginPromise2 = result.current.login('testuser', 'password');

    await act(async () => {
      await Promise.all([loginPromise1, loginPromise2]);
    });

    expect(result.current.isAuthenticated).toBe(true);
  });

  it('handles concurrent logout attempts', async () => {
    const mockUser = { id: 1, username: 'testuser', email: 'test@example.com' };
    setupApiMocks.getCurrentUser(mockUser);
    setupApiMocks.logoutSuccess();

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });

    const logoutPromise1 = result.current.logout();
    const logoutPromise2 = result.current.logout();

    await act(async () => {
      await Promise.all([logoutPromise1, logoutPromise2]);
    });

    expect(result.current.isAuthenticated).toBe(false);
  });

  it('handles user data updates from external sources', async () => {
    const mockUser = { id: 1, username: 'testuser', email: 'test@example.com' };
    setupApiMocks.getCurrentUser(mockUser);

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });

    const updatedUser = { ...mockUser, email: 'updated@example.com' };

    act(() => {
      result.current.updateUser(updatedUser);
    });

    expect(result.current.user).toEqual(updatedUser);
  });

  it('handles user deletion', async () => {
    const mockUser = { id: 1, username: 'testuser', email: 'test@example.com' };
    setupApiMocks.getCurrentUser(mockUser);

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });

    act(() => {
      result.current.deleteUser();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('handles authentication state persistence', async () => {
    const mockUser = { id: 1, username: 'testuser', email: 'test@example.com' };
    setupApiMocks.getCurrentUser(mockUser);

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });

    // Simulate page refresh
    const { result: newResult } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(newResult.current.user).toEqual(mockUser);
      expect(newResult.current.isAuthenticated).toBe(true);
    });
  });

  it('handles authentication state cleanup', async () => {
    const mockUser = { id: 1, username: 'testuser', email: 'test@example.com' };
    setupApiMocks.getCurrentUser(mockUser);

    const { result, unmount } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });

    unmount();

    // Should clean up any ongoing requests
    expect(setupApiMocks.getCurrentUser).toHaveBeenCalled();
  });
});
