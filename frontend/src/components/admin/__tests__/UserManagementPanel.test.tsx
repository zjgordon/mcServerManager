import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import UserManagementPanel from '../UserManagementPanel';
import type { User } from '../../../../types/api';

// Mock the hooks
jest.mock('../../../../hooks/useAdmin', () => ({
  useUsers: () => ({
    data: [
      {
        id: 1,
        username: 'admin',
        is_admin: true,
        server_count: 3,
        total_memory_allocated: 3072,
        created_at: '2024-01-01T00:00:00Z'
      },
      {
        id: 2,
        username: 'user1',
        is_admin: false,
        server_count: 1,
        total_memory_allocated: 1024,
        created_at: '2024-01-02T00:00:00Z'
      }
    ],
    isLoading: false,
  }),
  useCreateUser: () => ({
    mutateAsync: jest.fn(),
    isPending: false,
  }),
  useUpdateUser: () => ({
    mutateAsync: jest.fn(),
    isPending: false,
  }),
  useDeleteUser: () => ({
    mutateAsync: jest.fn(),
    isPending: false,
  }),
}));

// Mock the auth context
jest.mock('../../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 1,
      username: 'admin',
      is_admin: true
    }
  }),
}));

// Mock the toast hook
jest.mock('../../../../hooks/use-toast', () => ({
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

describe('UserManagementPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the user management panel correctly', () => {
    render(<UserManagementPanel />, { wrapper: createWrapper() });
    
    expect(screen.getByText('User Management')).toBeInTheDocument();
    expect(screen.getByText('Manage user accounts, permissions, and access control')).toBeInTheDocument();
    expect(screen.getByText('Add User')).toBeInTheDocument();
  });

  it('displays users list correctly', () => {
    render(<UserManagementPanel />, { wrapper: createWrapper() });
    
    expect(screen.getByText('admin')).toBeInTheDocument();
    expect(screen.getByText('user1')).toBeInTheDocument();
    expect(screen.getByText('3 servers • 3072 MB allocated')).toBeInTheDocument();
    expect(screen.getByText('1 servers • 1024 MB allocated')).toBeInTheDocument();
  });

  it('shows admin badge for admin users', () => {
    render(<UserManagementPanel />, { wrapper: createWrapper() });
    
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  it('opens create user dialog when Add User button is clicked', async () => {
    render(<UserManagementPanel />, { wrapper: createWrapper() });
    
    const addButton = screen.getByText('Add User');
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('Create New User')).toBeInTheDocument();
      expect(screen.getByText('Create a new user account with custom permissions')).toBeInTheDocument();
    });
  });

  it('validates username field in create user form', async () => {
    render(<UserManagementPanel />, { wrapper: createWrapper() });
    
    const addButton = screen.getByText('Add User');
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('Create New User')).toBeInTheDocument();
    });

    const createButton = screen.getByText('Create User');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText('Username is required')).toBeInTheDocument();
    });
  });

  it('validates password field in create user form', async () => {
    render(<UserManagementPanel />, { wrapper: createWrapper() });
    
    const addButton = screen.getByText('Add User');
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('Create New User')).toBeInTheDocument();
    });

    const usernameInput = screen.getByLabelText('Username');
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });

    const createButton = screen.getByText('Create User');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText('Password is required')).toBeInTheDocument();
    });
  });

  it('validates username format', async () => {
    render(<UserManagementPanel />, { wrapper: createWrapper() });
    
    const addButton = screen.getByText('Add User');
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('Create New User')).toBeInTheDocument();
    });

    const usernameInput = screen.getByLabelText('Username');
    fireEvent.change(usernameInput, { target: { value: 'test user!' } });

    const createButton = screen.getByText('Create User');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText('Username can only contain letters, numbers, and underscores')).toBeInTheDocument();
    });
  });

  it('validates username length', async () => {
    render(<UserManagementPanel />, { wrapper: createWrapper() });
    
    const addButton = screen.getByText('Add User');
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('Create New User')).toBeInTheDocument();
    });

    const usernameInput = screen.getByLabelText('Username');
    fireEvent.change(usernameInput, { target: { value: 'ab' } });

    const createButton = screen.getByText('Create User');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText('Username must be at least 3 characters long')).toBeInTheDocument();
    });
  });

  it('validates password length', async () => {
    render(<UserManagementPanel />, { wrapper: createWrapper() });
    
    const addButton = screen.getByText('Add User');
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('Create New User')).toBeInTheDocument();
    });

    const usernameInput = screen.getByLabelText('Username');
    const passwordInput = screen.getByLabelText('Password');
    
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: '123' } });

    const createButton = screen.getByText('Create User');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText('Password must be at least 8 characters long')).toBeInTheDocument();
    });
  });

  it('shows admin checkbox in create user form', async () => {
    render(<UserManagementPanel />, { wrapper: createWrapper() });
    
    const addButton = screen.getByText('Add User');
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('Admin privileges')).toBeInTheDocument();
      expect(screen.getByLabelText('Admin privileges')).toBeInTheDocument();
    });
  });

  it('opens edit user dialog when edit button is clicked', async () => {
    render(<UserManagementPanel />, { wrapper: createWrapper() });
    
    const editButtons = screen.getAllByRole('button', { name: /edit/i });
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Edit User')).toBeInTheDocument();
      expect(screen.getByText('Update user information and permissions')).toBeInTheDocument();
    });
  });

  it('opens delete user dialog when delete button is clicked', async () => {
    render(<UserManagementPanel />, { wrapper: createWrapper() });
    
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Delete User')).toBeInTheDocument();
      expect(screen.getByText(/Are you sure you want to delete "user1"/)).toBeInTheDocument();
    });
  });

  it('shows warning in delete dialog', async () => {
    render(<UserManagementPanel />, { wrapper: createWrapper() });
    
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/This will permanently delete the user account and all associated servers/)).toBeInTheDocument();
    });
  });

  it('filters users based on search term', () => {
    render(<UserManagementPanel />, { wrapper: createWrapper() });
    
    const searchInput = screen.getByPlaceholderText('Search users...');
    fireEvent.change(searchInput, { target: { value: 'admin' } });

    expect(screen.getByText('admin')).toBeInTheDocument();
    expect(screen.queryByText('user1')).not.toBeInTheDocument();
  });

  it('shows no users message when search returns no results', () => {
    render(<UserManagementPanel />, { wrapper: createWrapper() });
    
    const searchInput = screen.getByPlaceholderText('Search users...');
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

    expect(screen.getByText('No users found matching your search')).toBeInTheDocument();
  });

  it('displays user creation dates', () => {
    render(<UserManagementPanel />, { wrapper: createWrapper() });
    
    expect(screen.getByText('Created: 1/1/2024')).toBeInTheDocument();
    expect(screen.getByText('Created: 1/2/2024')).toBeInTheDocument();
  });

  it('shows server count and memory allocation for each user', () => {
    render(<UserManagementPanel />, { wrapper: createWrapper() });
    
    expect(screen.getByText('3 servers • 3072 MB allocated')).toBeInTheDocument();
    expect(screen.getByText('1 servers • 1024 MB allocated')).toBeInTheDocument();
  });
});
