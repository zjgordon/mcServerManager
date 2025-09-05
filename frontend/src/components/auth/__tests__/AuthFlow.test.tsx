import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AuthFlow from '../AuthFlow';
import { useAuth } from '../../../contexts/AuthContext';
import { apiService } from '../../../services/api';

// Mock the dependencies
jest.mock('../../../contexts/AuthContext');
jest.mock('../../../services/api');

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockApiService = apiService as jest.Mocked<typeof apiService>;

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    {children}
  </BrowserRouter>
);

describe('AuthFlow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows loading state initially', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      login: jest.fn(),
      logout: jest.fn(),
      checkAuth: jest.fn(),
    });

    mockApiService.getSetupStatus.mockImplementation(() => 
      new Promise(() => {}) // Never resolves to keep loading state
    );

    render(
      <TestWrapper>
        <AuthFlow>
          <div>App Content</div>
        </AuthFlow>
      </TestWrapper>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.getByText('Checking authentication status')).toBeInTheDocument();
  });

  it('redirects to setup when setup is required', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: jest.fn(),
      logout: jest.fn(),
      checkAuth: jest.fn(),
    });

    mockApiService.getSetupStatus.mockResolvedValue({
      setup_required: true,
      has_admin: false,
    });

    render(
      <TestWrapper>
        <AuthFlow>
          <div>App Content</div>
        </AuthFlow>
      </TestWrapper>
    );

    await waitFor(() => {
      expect(mockApiService.getSetupStatus).toHaveBeenCalled();
    });
  });

  it('redirects to login when not authenticated and setup not required', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: jest.fn(),
      logout: jest.fn(),
      checkAuth: jest.fn(),
    });

    mockApiService.getSetupStatus.mockResolvedValue({
      setup_required: false,
      has_admin: true,
    });

    render(
      <TestWrapper>
        <AuthFlow>
          <div>App Content</div>
        </AuthFlow>
      </TestWrapper>
    );

    await waitFor(() => {
      expect(mockApiService.getSetupStatus).toHaveBeenCalled();
    });
  });

  it('renders app content when authenticated and setup complete', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, username: 'testuser', is_admin: false },
      isAuthenticated: true,
      isLoading: false,
      login: jest.fn(),
      logout: jest.fn(),
      checkAuth: jest.fn(),
    });

    mockApiService.getSetupStatus.mockResolvedValue({
      setup_required: false,
      has_admin: true,
    });

    render(
      <TestWrapper>
        <AuthFlow>
          <div>App Content</div>
        </AuthFlow>
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('App Content')).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: jest.fn(),
      logout: jest.fn(),
      checkAuth: jest.fn(),
    });

    mockApiService.getSetupStatus.mockRejectedValue(new Error('API Error'));

    render(
      <TestWrapper>
        <AuthFlow>
          <div>App Content</div>
        </AuthFlow>
      </TestWrapper>
    );

    await waitFor(() => {
      expect(mockApiService.getSetupStatus).toHaveBeenCalled();
    });
  });

  it('shows loading while auth is loading', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      login: jest.fn(),
      logout: jest.fn(),
      checkAuth: jest.fn(),
    });

    mockApiService.getSetupStatus.mockResolvedValue({
      setup_required: false,
      has_admin: true,
    });

    render(
      <TestWrapper>
        <AuthFlow>
          <div>App Content</div>
        </AuthFlow>
      </TestWrapper>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows loading while setup status is loading', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: jest.fn(),
      logout: jest.fn(),
      checkAuth: jest.fn(),
    });

    mockApiService.getSetupStatus.mockImplementation(() => 
      new Promise(() => {}) // Never resolves to keep loading state
    );

    render(
      <TestWrapper>
        <AuthFlow>
          <div>App Content</div>
        </AuthFlow>
      </TestWrapper>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});
