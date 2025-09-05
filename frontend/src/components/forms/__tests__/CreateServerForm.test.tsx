import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CreateServerForm from '../CreateServerForm';

// Mock the API service
jest.mock('../../../services/api', () => ({
  apiService: {
    getAvailableVersions: jest.fn(),
    createServer: jest.fn(),
  },
}));

// Mock the hooks
jest.mock('../../../hooks/useServer', () => ({
  useCreateServer: () => ({
    mutateAsync: jest.fn(),
    isPending: false,
  }),
  useServers: () => ({
    data: [],
  }),
}));

// Mock the toast hook
jest.mock('../../../hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('CreateServerForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the form correctly', () => {
    render(<CreateServerForm />, { wrapper: createWrapper() });
    
    expect(screen.getByText('Create New Server')).toBeInTheDocument();
    expect(screen.getByText('Basic Server Information')).toBeInTheDocument();
    expect(screen.getByLabelText('Server Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Minecraft Version')).toBeInTheDocument();
  });

  it('shows validation errors for empty required fields', async () => {
    render(<CreateServerForm />, { wrapper: createWrapper() });
    
    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText('Server name is required')).toBeInTheDocument();
    });
  });

  it('validates server name format', async () => {
    render(<CreateServerForm />, { wrapper: createWrapper() });
    
    const serverNameInput = screen.getByLabelText('Server Name');
    fireEvent.change(serverNameInput, { target: { value: 'invalid name!' } });
    
    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText('Server name can only contain letters, numbers, underscores, and hyphens')).toBeInTheDocument();
    });
  });

  it('validates server name length', async () => {
    render(<CreateServerForm />, { wrapper: createWrapper() });
    
    const serverNameInput = screen.getByLabelText('Server Name');
    fireEvent.change(serverNameInput, { target: { value: 'ab' } });
    
    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText('Server name must be at least 3 characters long')).toBeInTheDocument();
    });
  });

  it('validates server name confirmation', async () => {
    render(<CreateServerForm />, { wrapper: createWrapper() });
    
    const serverNameInput = screen.getByLabelText('Server Name');
    const confirmInput = screen.getByLabelText('Confirm Server Name');
    
    fireEvent.change(serverNameInput, { target: { value: 'MyServer' } });
    fireEvent.change(confirmInput, { target: { value: 'DifferentName' } });
    
    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText('Server names do not match')).toBeInTheDocument();
    });
  });

  it('validates memory allocation', async () => {
    render(<CreateServerForm />, { wrapper: createWrapper() });
    
    const serverNameInput = screen.getByLabelText('Server Name');
    const confirmInput = screen.getByLabelText('Confirm Server Name');
    const memoryInput = screen.getByLabelText('Memory Allocation (MB)');
    
    fireEvent.change(serverNameInput, { target: { value: 'MyServer' } });
    fireEvent.change(confirmInput, { target: { value: 'MyServer' } });
    fireEvent.change(memoryInput, { target: { value: '256' } });
    
    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText('Memory must be at least 512 MB')).toBeInTheDocument();
    });
  });

  it('navigates through steps correctly', async () => {
    render(<CreateServerForm />, { wrapper: createWrapper() });
    
    // Fill in step 1
    const serverNameInput = screen.getByLabelText('Server Name');
    const confirmInput = screen.getByLabelText('Confirm Server Name');
    
    fireEvent.change(serverNameInput, { target: { value: 'MyServer' } });
    fireEvent.change(confirmInput, { target: { value: 'MyServer' } });
    
    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText('Game Settings')).toBeInTheDocument();
    });

    // Go to step 3
    fireEvent.click(screen.getByText('Next'));

    await waitFor(() => {
      expect(screen.getByText('Advanced Settings')).toBeInTheDocument();
    });

    // Go back to step 2
    fireEvent.click(screen.getByText('Previous'));

    await waitFor(() => {
      expect(screen.getByText('Game Settings')).toBeInTheDocument();
    });
  });

  it('shows progress indicator correctly', () => {
    render(<CreateServerForm />, { wrapper: createWrapper() });
    
    // Should show step 1 as active
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('handles checkbox changes correctly', async () => {
    render(<CreateServerForm />, { wrapper: createWrapper() });
    
    // Navigate to step 3
    const serverNameInput = screen.getByLabelText('Server Name');
    const confirmInput = screen.getByLabelText('Confirm Server Name');
    
    fireEvent.change(serverNameInput, { target: { value: 'MyServer' } });
    fireEvent.change(confirmInput, { target: { value: 'MyServer' } });
    
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Next'));

    await waitFor(() => {
      expect(screen.getByText('Advanced Settings')).toBeInTheDocument();
    });

    // Test hardcore checkbox
    const hardcoreCheckbox = screen.getByLabelText('Hardcore Mode');
    expect(hardcoreCheckbox).not.toBeChecked();
    
    fireEvent.click(hardcoreCheckbox);
    expect(hardcoreCheckbox).toBeChecked();
  });

  it('calls onCancel when cancel button is clicked', () => {
    const mockOnCancel = jest.fn();
    render(<CreateServerForm onCancel={mockOnCancel} />, { wrapper: createWrapper() });
    
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    
    expect(mockOnCancel).toHaveBeenCalled();
  });
});
