import React from 'react';
import { render, screen, fireEvent, waitFor, userEvent, vi } from '../../../test';
import { TestDataFactory, setupApiMocks } from '../../../test';
import UserManagementPanel from '../UserManagementPanel';

const mockUsers = TestDataFactory.users(5).map((user, index) => ({
  ...user,
  id: index + 1,
  username: `user${index + 1}`,
  email: `user${index + 1}@example.com`,
  is_admin: index === 0, // First user is admin
}));

describe('UserManagementPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupApiMocks.usersList(mockUsers);
  });

  it('renders user management panel correctly', async () => {
    render(<UserManagementPanel />);

    await waitFor(() => {
      expect(screen.getByText('User Management')).toBeInTheDocument();
      expect(screen.getByText('Create User')).toBeInTheDocument();
      expect(screen.getByText('user1')).toBeInTheDocument();
      expect(screen.getByText('user2')).toBeInTheDocument();
    });
  });

  it('shows loading state initially', () => {
    render(<UserManagementPanel />);

    expect(screen.getByText('Loading users...')).toBeInTheDocument();
  });

  it('shows empty state when no users', async () => {
    setupApiMocks.usersList([]);
    render(<UserManagementPanel />);

    await waitFor(() => {
      expect(screen.getByText('No users found')).toBeInTheDocument();
      expect(screen.getByText('Create the first user to get started')).toBeInTheDocument();
    });
  });

  it('opens create user dialog when create button is clicked', async () => {
    const user = userEvent.setup();
    render(<UserManagementPanel />);

    await waitFor(() => {
      expect(screen.getByText('Create User')).toBeInTheDocument();
    });

    const createButton = screen.getByText('Create User');
    await user.click(createButton);

    expect(screen.getByText('Create New User')).toBeInTheDocument();
    expect(screen.getByLabelText('Username')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  it('creates user successfully', async () => {
    setupApiMocks.userCreateSuccess();
    const user = userEvent.setup();
    render(<UserManagementPanel />);

    await waitFor(() => {
      expect(screen.getByText('Create User')).toBeInTheDocument();
    });

    const createButton = screen.getByText('Create User');
    await user.click(createButton);

    const usernameInput = screen.getByLabelText('Username');
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm Password');

    await user.type(usernameInput, 'newuser');
    await user.type(emailInput, 'newuser@example.com');
    await user.type(passwordInput, 'Password123');
    await user.type(confirmPasswordInput, 'Password123');

    const submitButton = screen.getByText('Create User');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('User created successfully')).toBeInTheDocument();
    });
  });

  it('handles user creation error', async () => {
    setupApiMocks.userCreateError();
    const user = userEvent.setup();
    render(<UserManagementPanel />);

    await waitFor(() => {
      expect(screen.getByText('Create User')).toBeInTheDocument();
    });

    const createButton = screen.getByText('Create User');
    await user.click(createButton);

    const usernameInput = screen.getByLabelText('Username');
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm Password');

    await user.type(usernameInput, 'newuser');
    await user.type(emailInput, 'newuser@example.com');
    await user.type(passwordInput, 'Password123');
    await user.type(confirmPasswordInput, 'Password123');

    const submitButton = screen.getByText('Create User');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Failed to create user')).toBeInTheDocument();
    });
  });

  it('validates user creation form', async () => {
    const user = userEvent.setup();
    render(<UserManagementPanel />);

    await waitFor(() => {
      expect(screen.getByText('Create User')).toBeInTheDocument();
    });

    const createButton = screen.getByText('Create User');
    await user.click(createButton);

    const submitButton = screen.getByText('Create User');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Username is required')).toBeInTheDocument();
      expect(screen.getByText('Email is required')).toBeInTheDocument();
      expect(screen.getByText('Password is required')).toBeInTheDocument();
    });
  });

  it('edits user successfully', async () => {
    setupApiMocks.userUpdateSuccess();
    const user = userEvent.setup();
    render(<UserManagementPanel />);

    await waitFor(() => {
      expect(screen.getByText('user1')).toBeInTheDocument();
    });

    const editButton = screen.getByTitle('Edit user1');
    await user.click(editButton);

    expect(screen.getByText('Edit User')).toBeInTheDocument();
    expect(screen.getByDisplayValue('user1')).toBeInTheDocument();
    expect(screen.getByDisplayValue('user1@example.com')).toBeInTheDocument();

    const usernameInput = screen.getByDisplayValue('user1');
    await user.clear(usernameInput);
    await user.type(usernameInput, 'updateduser');

    const submitButton = screen.getByText('Update User');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('User updated successfully')).toBeInTheDocument();
    });
  });

  it('deletes user successfully', async () => {
    setupApiMocks.userDeleteSuccess();
    const user = userEvent.setup();
    render(<UserManagementPanel />);

    await waitFor(() => {
      expect(screen.getByText('user1')).toBeInTheDocument();
    });

    const deleteButton = screen.getByTitle('Delete user1');
    await user.click(deleteButton);

    expect(screen.getByText('Delete User')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to delete user1?')).toBeInTheDocument();

    const confirmButton = screen.getByText('Delete');
    await user.click(confirmButton);

    await waitFor(() => {
      expect(screen.getByText('User deleted successfully')).toBeInTheDocument();
    });
  });

  it('cancels user deletion', async () => {
    const user = userEvent.setup();
    render(<UserManagementPanel />);

    await waitFor(() => {
      expect(screen.getByText('user1')).toBeInTheDocument();
    });

    const deleteButton = screen.getByTitle('Delete user1');
    await user.click(deleteButton);

    const cancelButton = screen.getByText('Cancel');
    await user.click(cancelButton);

    expect(screen.queryByText('Delete User')).not.toBeInTheDocument();
  });

  it('searches users by username', async () => {
    const user = userEvent.setup();
    render(<UserManagementPanel />);

    await waitFor(() => {
      expect(screen.getByText('user1')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search users...');
    await user.type(searchInput, 'user1');

    await waitFor(() => {
      expect(screen.getByText('user1')).toBeInTheDocument();
      expect(screen.queryByText('user2')).not.toBeInTheDocument();
    });
  });

  it('searches users by email', async () => {
    const user = userEvent.setup();
    render(<UserManagementPanel />);

    await waitFor(() => {
      expect(screen.getByText('user1')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search users...');
    await user.type(searchInput, 'user1@example.com');

    await waitFor(() => {
      expect(screen.getByText('user1')).toBeInTheDocument();
      expect(screen.queryByText('user2')).not.toBeInTheDocument();
    });
  });

  it('filters users by admin status', async () => {
    const user = userEvent.setup();
    render(<UserManagementPanel />);

    await waitFor(() => {
      expect(screen.getByText('user1')).toBeInTheDocument();
    });

    const filterSelect = screen.getByLabelText('Filter by role');
    await user.selectOptions(filterSelect, 'admin');

    await waitFor(() => {
      expect(screen.getByText('user1')).toBeInTheDocument();
      expect(screen.queryByText('user2')).not.toBeInTheDocument();
    });
  });

  it('filters users by regular user status', async () => {
    const user = userEvent.setup();
    render(<UserManagementPanel />);

    await waitFor(() => {
      expect(screen.getByText('user1')).toBeInTheDocument();
    });

    const filterSelect = screen.getByLabelText('Filter by role');
    await user.selectOptions(filterSelect, 'user');

    await waitFor(() => {
      expect(screen.queryByText('user1')).not.toBeInTheDocument();
      expect(screen.getByText('user2')).toBeInTheDocument();
      expect(screen.getByText('user3')).toBeInTheDocument();
    });
  });

  it('sorts users by username', async () => {
    const user = userEvent.setup();
    render(<UserManagementPanel />);

    await waitFor(() => {
      expect(screen.getByText('user1')).toBeInTheDocument();
    });

    const sortSelect = screen.getByLabelText('Sort by');
    await user.selectOptions(sortSelect, 'username');

    await waitFor(() => {
      const userElements = screen.getAllByText(/user\d+/);
      expect(userElements[0]).toHaveTextContent('user1');
      expect(userElements[1]).toHaveTextContent('user2');
      expect(userElements[2]).toHaveTextContent('user3');
    });
  });

  it('sorts users by creation date', async () => {
    const user = userEvent.setup();
    render(<UserManagementPanel />);

    await waitFor(() => {
      expect(screen.getByText('user1')).toBeInTheDocument();
    });

    const sortSelect = screen.getByLabelText('Sort by');
    await user.selectOptions(sortSelect, 'created_at');

    await waitFor(() => {
      const userElements = screen.getAllByText(/user\d+/);
      expect(userElements[0]).toHaveTextContent('user1');
      expect(userElements[1]).toHaveTextContent('user2');
    });
  });

  it('shows user statistics', async () => {
    render(<UserManagementPanel />);

    await waitFor(() => {
      expect(screen.getByText('5 users')).toBeInTheDocument();
      expect(screen.getByText('1 admin')).toBeInTheDocument();
      expect(screen.getByText('4 regular users')).toBeInTheDocument();
    });
  });

  it('handles error state', async () => {
    setupApiMocks.usersList.mockRejectedValue(new Error('API Error'));
    render(<UserManagementPanel />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load users')).toBeInTheDocument();
      expect(screen.getByText('Try again')).toBeInTheDocument();
    });
  });

  it('retries on error when retry button is clicked', async () => {
    const user = userEvent.setup();
    setupApiMocks.usersList
      .mockRejectedValueOnce(new Error('API Error'))
      .mockResolvedValueOnce(mockUsers);
    
    render(<UserManagementPanel />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load users')).toBeInTheDocument();
    });

    const retryButton = screen.getByText('Try again');
    await user.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText('user1')).toBeInTheDocument();
      expect(screen.getByText('user2')).toBeInTheDocument();
    });
  });

  it('shows admin badge for admin users', async () => {
    render(<UserManagementPanel />);

    await waitFor(() => {
      expect(screen.getByText('user1')).toBeInTheDocument();
    });

    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  it('shows regular user badge for non-admin users', async () => {
    render(<UserManagementPanel />);

    await waitFor(() => {
      expect(screen.getByText('user2')).toBeInTheDocument();
    });

    expect(screen.getByText('User')).toBeInTheDocument();
  });

  it('prevents deletion of the last admin user', async () => {
    const user = userEvent.setup();
    render(<UserManagementPanel />);

    await waitFor(() => {
      expect(screen.getByText('user1')).toBeInTheDocument();
    });

    const deleteButton = screen.getByTitle('Delete user1');
    await user.click(deleteButton);

    expect(screen.getByText('Cannot delete the last admin user')).toBeInTheDocument();
  });

  it('toggles user admin status', async () => {
    setupApiMocks.userUpdateSuccess();
    const user = userEvent.setup();
    render(<UserManagementPanel />);

    await waitFor(() => {
      expect(screen.getByText('user2')).toBeInTheDocument();
    });

    const toggleButton = screen.getByTitle('Toggle admin status for user2');
    await user.click(toggleButton);

    await waitFor(() => {
      expect(screen.getByText('User status updated successfully')).toBeInTheDocument();
    });
  });

  it('shows user creation date', async () => {
    render(<UserManagementPanel />);

    await waitFor(() => {
      expect(screen.getByText('user1')).toBeInTheDocument();
    });

    expect(screen.getByText(/Created/)).toBeInTheDocument();
  });

  it('shows user last login date', async () => {
    render(<UserManagementPanel />);

    await waitFor(() => {
      expect(screen.getByText('user1')).toBeInTheDocument();
    });

    expect(screen.getByText(/Last login/)).toBeInTheDocument();
  });

  it('handles bulk user operations', async () => {
    const user = userEvent.setup();
    render(<UserManagementPanel />);

    await waitFor(() => {
      expect(screen.getByText('user1')).toBeInTheDocument();
    });

    // Select multiple users
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[1]); // user1
    await user.click(checkboxes[2]); // user2

    expect(screen.getByText('2 users selected')).toBeInTheDocument();
    expect(screen.getByText('Delete Selected')).toBeInTheDocument();
  });

  it('performs bulk delete operation', async () => {
    setupApiMocks.userDeleteSuccess();
    const user = userEvent.setup();
    render(<UserManagementPanel />);

    await waitFor(() => {
      expect(screen.getByText('user1')).toBeInTheDocument();
    });

    // Select multiple users
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[1]); // user1
    await user.click(checkboxes[2]); // user2

    const bulkDeleteButton = screen.getByText('Delete Selected');
    await user.click(bulkDeleteButton);

    expect(screen.getByText('Delete 2 Users')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to delete 2 users?')).toBeInTheDocument();

    const confirmButton = screen.getByText('Delete');
    await user.click(confirmButton);

    await waitFor(() => {
      expect(screen.getByText('2 users deleted successfully')).toBeInTheDocument();
    });
  });
});
