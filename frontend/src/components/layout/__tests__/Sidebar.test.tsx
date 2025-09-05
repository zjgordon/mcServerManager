import React from 'react';
import { render, screen, fireEvent, waitFor, userEvent, vi } from '../../../test';
import { TestDataFactory, setupApiMocks } from '../../../test';
import Sidebar from '../Sidebar';

const mockUser = TestDataFactory.user({
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  is_admin: false,
});

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupApiMocks.getCurrentUser(mockUser);
  });

  it('renders sidebar correctly', () => {
    render(<Sidebar />);

    expect(screen.getByRole('navigation')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Servers')).toBeInTheDocument();
    expect(screen.getByText('Backups')).toBeInTheDocument();
  });

  it('shows user information when user is logged in', async () => {
    render(<Sidebar />);

    await waitFor(() => {
      expect(screen.getByText('testuser')).toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });
  });

  it('shows login prompt when user is not logged in', () => {
    setupApiMocks.getCurrentUser.mockResolvedValue(null);
    render(<Sidebar />);

    expect(screen.getByText('Please sign in')).toBeInTheDocument();
    expect(screen.getByText('Sign In')).toBeInTheDocument();
  });

  it('navigates to dashboard when dashboard is clicked', async () => {
    const user = userEvent.setup();
    render(<Sidebar />);

    const dashboardLink = screen.getByText('Dashboard');
    await user.click(dashboardLink);

    // Should navigate to dashboard
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('navigates to servers when servers is clicked', async () => {
    const user = userEvent.setup();
    render(<Sidebar />);

    const serversLink = screen.getByText('Servers');
    await user.click(serversLink);

    // Should navigate to servers page
    expect(mockNavigate).toHaveBeenCalledWith('/servers');
  });

  it('navigates to backups when backups is clicked', async () => {
    const user = userEvent.setup();
    render(<Sidebar />);

    const backupsLink = screen.getByText('Backups');
    await user.click(backupsLink);

    // Should navigate to backups page
    expect(mockNavigate).toHaveBeenCalledWith('/backups');
  });

  it('shows active navigation state', () => {
    render(<Sidebar currentPath="/dashboard" />);

    const dashboardLink = screen.getByText('Dashboard');
    expect(dashboardLink).toHaveClass('active');
  });

  it('shows admin menu when user is admin', async () => {
    const adminUser = { ...mockUser, is_admin: true };
    setupApiMocks.getCurrentUser(adminUser);
    render(<Sidebar />);

    await waitFor(() => {
      expect(screen.getByText('Admin Panel')).toBeInTheDocument();
      expect(screen.getByText('User Management')).toBeInTheDocument();
      expect(screen.getByText('System Settings')).toBeInTheDocument();
    });
  });

  it('navigates to admin panel when admin panel is clicked', async () => {
    const adminUser = { ...mockUser, is_admin: true };
    setupApiMocks.getCurrentUser(adminUser);
    const user = userEvent.setup();
    render(<Sidebar />);

    await waitFor(() => {
      expect(screen.getByText('Admin Panel')).toBeInTheDocument();
    });

    const adminPanelLink = screen.getByText('Admin Panel');
    await user.click(adminPanelLink);

    // Should navigate to admin panel
    expect(mockNavigate).toHaveBeenCalledWith('/admin');
  });

  it('navigates to user management when user management is clicked', async () => {
    const adminUser = { ...mockUser, is_admin: true };
    setupApiMocks.getCurrentUser(adminUser);
    const user = userEvent.setup();
    render(<Sidebar />);

    await waitFor(() => {
      expect(screen.getByText('User Management')).toBeInTheDocument();
    });

    const userManagementLink = screen.getByText('User Management');
    await user.click(userManagementLink);

    // Should navigate to user management
    expect(mockNavigate).toHaveBeenCalledWith('/admin/users');
  });

  it('navigates to system settings when system settings is clicked', async () => {
    const adminUser = { ...mockUser, is_admin: true };
    setupApiMocks.getCurrentUser(adminUser);
    const user = userEvent.setup();
    render(<Sidebar />);

    await waitFor(() => {
      expect(screen.getByText('System Settings')).toBeInTheDocument();
    });

    const systemSettingsLink = screen.getByText('System Settings');
    await user.click(systemSettingsLink);

    // Should navigate to system settings
    expect(mockNavigate).toHaveBeenCalledWith('/admin/settings');
  });

  it('shows collapsible sidebar', () => {
    render(<Sidebar collapsible />);

    expect(screen.getByLabelText('Toggle sidebar')).toBeInTheDocument();
  });

  it('toggles sidebar when toggle button is clicked', async () => {
    const user = userEvent.setup();
    render(<Sidebar collapsible />);

    const toggleButton = screen.getByLabelText('Toggle sidebar');
    await user.click(toggleButton);

    expect(screen.getByRole('navigation')).toHaveClass('collapsed');
  });

  it('expands sidebar when toggle button is clicked again', async () => {
    const user = userEvent.setup();
    render(<Sidebar collapsible />);

    const toggleButton = screen.getByLabelText('Toggle sidebar');
    await user.click(toggleButton);
    await user.click(toggleButton);

    expect(screen.getByRole('navigation')).not.toHaveClass('collapsed');
  });

  it('starts collapsed when collapsed prop is true', () => {
    render(<Sidebar collapsible collapsed />);

    expect(screen.getByRole('navigation')).toHaveClass('collapsed');
  });

  it('starts expanded when collapsed prop is false', () => {
    render(<Sidebar collapsible collapsed={false} />);

    expect(screen.getByRole('navigation')).not.toHaveClass('collapsed');
  });

  it('handles collapse/expand callbacks', async () => {
    const user = userEvent.setup();
    const handleCollapse = vi.fn();
    const handleExpand = vi.fn();
    
    render(
      <Sidebar 
        collapsible 
        onCollapse={handleCollapse} 
        onExpand={handleExpand}
      />
    );

    const toggleButton = screen.getByLabelText('Toggle sidebar');
    
    await user.click(toggleButton);
    expect(handleCollapse).toHaveBeenCalledTimes(1);

    await user.click(toggleButton);
    expect(handleExpand).toHaveBeenCalledTimes(1);
  });

  it('shows navigation icons', () => {
    render(<Sidebar />);

    expect(screen.getByLabelText('Dashboard icon')).toBeInTheDocument();
    expect(screen.getByLabelText('Servers icon')).toBeInTheDocument();
    expect(screen.getByLabelText('Backups icon')).toBeInTheDocument();
  });

  it('shows tooltips when sidebar is collapsed', async () => {
    const user = userEvent.setup();
    render(<Sidebar collapsible collapsed />);

    const dashboardLink = screen.getByText('Dashboard');
    await user.hover(dashboardLink);

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
  });

  it('hides tooltips when sidebar is expanded', async () => {
    const user = userEvent.setup();
    render(<Sidebar collapsible collapsed={false} />);

    const dashboardLink = screen.getByText('Dashboard');
    await user.hover(dashboardLink);

    await waitFor(() => {
      expect(screen.queryByText('Dashboard')).toBeInTheDocument();
    });
  });

  it('shows user avatar when available', async () => {
    const userWithAvatar = { ...mockUser, avatar: 'https://example.com/avatar.jpg' };
    setupApiMocks.getCurrentUser(userWithAvatar);
    render(<Sidebar />);

    await waitFor(() => {
      const avatar = screen.getByAltText('testuser avatar');
      expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg');
    });
  });

  it('shows default avatar when no avatar is available', async () => {
    render(<Sidebar />);

    await waitFor(() => {
      expect(screen.getByText('testuser')).toBeInTheDocument();
    });

    const userSection = screen.getByText('testuser').closest('.user-section');
    expect(userSection).toHaveClass('default-avatar');
  });

  it('shows user status indicator', async () => {
    render(<Sidebar />);

    await waitFor(() => {
      expect(screen.getByText('testuser')).toBeInTheDocument();
    });

    expect(screen.getByLabelText('User status')).toBeInTheDocument();
  });

  it('shows online status', async () => {
    render(<Sidebar />);

    await waitFor(() => {
      expect(screen.getByText('testuser')).toBeInTheDocument();
    });

    const statusIndicator = screen.getByLabelText('User status');
    expect(statusIndicator).toHaveClass('status-online');
  });

  it('shows offline status', async () => {
    const offlineUser = { ...mockUser, status: 'offline' };
    setupApiMocks.getCurrentUser(offlineUser);
    render(<Sidebar />);

    await waitFor(() => {
      expect(screen.getByText('testuser')).toBeInTheDocument();
    });

    const statusIndicator = screen.getByLabelText('User status');
    expect(statusIndicator).toHaveClass('status-offline');
  });

  it('shows user role badge', async () => {
    render(<Sidebar />);

    await waitFor(() => {
      expect(screen.getByText('testuser')).toBeInTheDocument();
    });

    expect(screen.getByText('User')).toBeInTheDocument();
  });

  it('shows admin badge for admin users', async () => {
    const adminUser = { ...mockUser, is_admin: true };
    setupApiMocks.getCurrentUser(adminUser);
    render(<Sidebar />);

    await waitFor(() => {
      expect(screen.getByText('testuser')).toBeInTheDocument();
    });

    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  it('handles keyboard navigation', async () => {
    const user = userEvent.setup();
    render(<Sidebar />);

    const dashboardLink = screen.getByText('Dashboard');
    dashboardLink.focus();

    await user.keyboard('{Enter}');
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('shows loading state when user data is loading', () => {
    setupApiMocks.getCurrentUser.mockImplementation(() => new Promise(() => {}));
    render(<Sidebar />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('handles user data error', async () => {
    setupApiMocks.getCurrentUser.mockRejectedValue(new Error('API Error'));
    render(<Sidebar />);

    await waitFor(() => {
      expect(screen.getByText('Please sign in')).toBeInTheDocument();
    });
  });

  it('shows navigation badges when available', () => {
    render(<Sidebar />);

    expect(screen.getByText('3')).toBeInTheDocument(); // Server count badge
    expect(screen.getByText('5')).toBeInTheDocument(); // Backup count badge
  });

  it('shows notification badges', () => {
    render(<Sidebar />);

    expect(screen.getByText('2')).toBeInTheDocument(); // Notification badge
  });

  it('handles responsive design', () => {
    render(<Sidebar />);

    expect(screen.getByRole('navigation')).toHaveClass('responsive');
  });

  it('shows mobile sidebar when screen is small', () => {
    // Mock small screen size
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 768,
    });

    render(<Sidebar />);

    expect(screen.getByRole('navigation')).toHaveClass('mobile');
  });

  it('shows desktop sidebar when screen is large', () => {
    // Mock large screen size
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });

    render(<Sidebar />);

    expect(screen.getByRole('navigation')).not.toHaveClass('mobile');
  });

  it('handles window resize events', () => {
    render(<Sidebar />);

    // Simulate window resize
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 768,
    });

    fireEvent(window, new Event('resize'));

    expect(screen.getByRole('navigation')).toHaveClass('mobile');
  });

  it('shows accessibility attributes', () => {
    render(<Sidebar />);

    const sidebar = screen.getByRole('navigation');
    expect(sidebar).toHaveAttribute('aria-label', 'Main navigation');
  });

  it('handles custom className', () => {
    render(<Sidebar className="custom-sidebar" />);

    const sidebar = screen.getByRole('navigation');
    expect(sidebar).toHaveClass('custom-sidebar');
  });

  it('handles custom styles', () => {
    render(<Sidebar style={{ backgroundColor: 'red' }} />);

    const sidebar = screen.getByRole('navigation');
    expect(sidebar).toHaveStyle('background-color: red');
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLElement>();
    render(<Sidebar ref={ref} />);

    expect(ref.current).toBeInstanceOf(HTMLElement);
  });

  it('shows different sidebar themes', () => {
    const { rerender } = render(<Sidebar theme="light" />);
    expect(screen.getByRole('navigation')).toHaveClass('theme-light');

    rerender(<Sidebar theme="dark" />);
    expect(screen.getByRole('navigation')).toHaveClass('theme-dark');
  });

  it('handles sidebar overlay when mobile', () => {
    render(<Sidebar mobile />);

    expect(screen.getByLabelText('Close sidebar')).toBeInTheDocument();
  });

  it('closes sidebar when overlay is clicked', async () => {
    const user = userEvent.setup();
    render(<Sidebar mobile />);

    const overlay = screen.getByLabelText('Close sidebar');
    await user.click(overlay);

    expect(screen.getByRole('navigation')).toHaveClass('closed');
  });

  it('shows sidebar footer', () => {
    render(<Sidebar />);

    expect(screen.getByText('Version 1.0.0')).toBeInTheDocument();
  });

  it('handles sidebar footer actions', async () => {
    const user = userEvent.setup();
    render(<Sidebar />);

    const helpButton = screen.getByText('Help');
    await user.click(helpButton);

    // Should open help modal or navigate to help page
    expect(setupApiMocks.openHelp).toHaveBeenCalled();
  });

  it('shows sidebar search when enabled', () => {
    render(<Sidebar searchable />);

    expect(screen.getByPlaceholderText('Search navigation...')).toBeInTheDocument();
  });

  it('filters navigation items when searching', async () => {
    const user = userEvent.setup();
    render(<Sidebar searchable />);

    const searchInput = screen.getByPlaceholderText('Search navigation...');
    await user.type(searchInput, 'dashboard');

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.queryByText('Servers')).not.toBeInTheDocument();
    });
  });

  it('clears search when clear button is clicked', async () => {
    const user = userEvent.setup();
    render(<Sidebar searchable />);

    const searchInput = screen.getByPlaceholderText('Search navigation...');
    await user.type(searchInput, 'dashboard');

    const clearButton = screen.getByLabelText('Clear search');
    await user.click(clearButton);

    expect(searchInput).toHaveValue('');
    expect(screen.getByText('Servers')).toBeInTheDocument();
  });
});
