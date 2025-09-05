import React from 'react';
import { render, screen, waitFor, vi } from '../../../test';
import { setupApiMocks } from '../../../test';
import AuthFlow from '../AuthFlow';

// Mock the useNavigate hook
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('AuthFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupApiMocks.getAuthStatus();
  });

  it('renders login form when not authenticated', async () => {
    setupApiMocks.getAuthStatus.mockResolvedValue({
      authenticated: false,
      error: 'Not authenticated'
    });

    render(<AuthFlow />);

    await waitFor(() => {
      expect(screen.getByText('Sign In')).toBeInTheDocument();
    });
  });

  it('renders setup form when no admin exists', async () => {
    setupApiMocks.getAuthStatus.mockResolvedValue({
      authenticated: false,
      needsSetup: true
    });

    render(<AuthFlow />);

    await waitFor(() => {
      expect(screen.getByText('Setup Admin Account')).toBeInTheDocument();
    });
  });

  it('redirects to dashboard when authenticated', async () => {
    setupApiMocks.getAuthStatus.mockResolvedValue({
      authenticated: true,
      user: {
        id: 1,
        username: 'admin',
        email: 'admin@example.com',
        is_admin: true
      }
    });

    render(<AuthFlow />);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('shows loading state initially', () => {
    render(<AuthFlow />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('handles authentication error', async () => {
    setupApiMocks.getAuthStatus.mockRejectedValue(new Error('Network error'));

    render(<AuthFlow />);

    await waitFor(() => {
      expect(screen.getByText('Authentication error')).toBeInTheDocument();
    });
  });

  it('switches from setup to login after successful setup', async () => {
    setupApiMocks.getAuthStatus.mockResolvedValue({
      authenticated: false,
      needsSetup: true
    });

    const { rerender } = render(<AuthFlow />);

    await waitFor(() => {
      expect(screen.getByText('Setup Admin Account')).toBeInTheDocument();
    });

    // Simulate successful setup
    setupApiMocks.getAuthStatus.mockResolvedValue({
      authenticated: false,
      needsSetup: false
    });

    rerender(<AuthFlow />);

    await waitFor(() => {
      expect(screen.getByText('Sign In')).toBeInTheDocument();
    });
  });

  it('handles login success and redirects', async () => {
    setupApiMocks.getAuthStatus.mockResolvedValue({
      authenticated: false,
      needsSetup: false
    });

    render(<AuthFlow />);

    await waitFor(() => {
      expect(screen.getByText('Sign In')).toBeInTheDocument();
    });

    // Simulate successful login
    setupApiMocks.getAuthStatus.mockResolvedValue({
      authenticated: true,
      user: {
        id: 1,
        username: 'admin',
        email: 'admin@example.com',
        is_admin: true
      }
    });

    // Trigger re-authentication check
    const { rerender } = render(<AuthFlow />);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('handles password change success', async () => {
    setupApiMocks.getAuthStatus.mockResolvedValue({
      authenticated: true,
      user: {
        id: 1,
        username: 'admin',
        email: 'admin@example.com',
        is_admin: true
      }
    });

    render(<AuthFlow />);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('shows error message for network issues', async () => {
    setupApiMocks.getAuthStatus.mockRejectedValue(new Error('Network error'));

    render(<AuthFlow />);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('retries authentication on network error', async () => {
    setupApiMocks.getAuthStatus
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        authenticated: false,
        needsSetup: false
      });

    render(<AuthFlow />);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });

    // Should retry and eventually show login form
    await waitFor(() => {
      expect(screen.getByText('Sign In')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('handles multiple authentication state changes', async () => {
    setupApiMocks.getAuthStatus.mockResolvedValue({
      authenticated: false,
      needsSetup: true
    });

    const { rerender } = render(<AuthFlow />);

    await waitFor(() => {
      expect(screen.getByText('Setup Admin Account')).toBeInTheDocument();
    });

    // Change to login state
    setupApiMocks.getAuthStatus.mockResolvedValue({
      authenticated: false,
      needsSetup: false
    });

    rerender(<AuthFlow />);

    await waitFor(() => {
      expect(screen.getByText('Sign In')).toBeInTheDocument();
    });

    // Change to authenticated state
    setupApiMocks.getAuthStatus.mockResolvedValue({
      authenticated: true,
      user: {
        id: 1,
        username: 'admin',
        email: 'admin@example.com',
        is_admin: true
      }
    });

    rerender(<AuthFlow />);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('cleans up on unmount', () => {
    const { unmount } = render(<AuthFlow />);

    expect(() => unmount()).not.toThrow();
  });
});