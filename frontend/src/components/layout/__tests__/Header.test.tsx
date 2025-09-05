import React from 'react';
import { render, screen, fireEvent, waitFor, userEvent, vi } from '../../../test';
import { TestDataFactory, setupApiMocks } from '../../../test';
import Header from '../Header';

const mockUser = TestDataFactory.user({
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  is_admin: false,
});

describe('Header', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupApiMocks.getCurrentUser(mockUser);
  });

  it('renders header correctly', () => {
    render(<Header />);

    expect(screen.getByText('Minecraft Server Manager')).toBeInTheDocument();
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  it('shows user menu when user is logged in', async () => {
    render(<Header />);

    await waitFor(() => {
      expect(screen.getByText('testuser')).toBeInTheDocument();
    });
  });

  it('shows login button when user is not logged in', () => {
    setupApiMocks.getCurrentUser.mockResolvedValue(null);
    render(<Header />);

    expect(screen.getByText('Sign In')).toBeInTheDocument();
  });

  it('opens user menu when user avatar is clicked', async () => {
    const user = userEvent.setup();
    render(<Header />);

    await waitFor(() => {
      expect(screen.getByText('testuser')).toBeInTheDocument();
    });

    const userMenu = screen.getByLabelText('User menu');
    await user.click(userMenu);

    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Sign Out')).toBeInTheDocument();
  });

  it('closes user menu when clicking outside', async () => {
    const user = userEvent.setup();
    render(<Header />);

    await waitFor(() => {
      expect(screen.getByText('testuser')).toBeInTheDocument();
    });

    const userMenu = screen.getByLabelText('User menu');
    await user.click(userMenu);

    expect(screen.getByText('Profile')).toBeInTheDocument();

    // Click outside the menu
    await user.click(document.body);

    await waitFor(() => {
      expect(screen.queryByText('Profile')).not.toBeInTheDocument();
    });
  });

  it('navigates to profile when profile is clicked', async () => {
    const user = userEvent.setup();
    render(<Header />);

    await waitFor(() => {
      expect(screen.getByText('testuser')).toBeInTheDocument();
    });

    const userMenu = screen.getByLabelText('User menu');
    await user.click(userMenu);

    const profileLink = screen.getByText('Profile');
    await user.click(profileLink);

    // Should navigate to profile page
    expect(mockNavigate).toHaveBeenCalledWith('/profile');
  });

  it('navigates to settings when settings is clicked', async () => {
    const user = userEvent.setup();
    render(<Header />);

    await waitFor(() => {
      expect(screen.getByText('testuser')).toBeInTheDocument();
    });

    const userMenu = screen.getByLabelText('User menu');
    await user.click(userMenu);

    const settingsLink = screen.getByText('Settings');
    await user.click(settingsLink);

    // Should navigate to settings page
    expect(mockNavigate).toHaveBeenCalledWith('/settings');
  });

  it('handles logout when sign out is clicked', async () => {
    const user = userEvent.setup();
    render(<Header />);

    await waitFor(() => {
      expect(screen.getByText('testuser')).toBeInTheDocument();
    });

    const userMenu = screen.getByLabelText('User menu');
    await user.click(userMenu);

    const signOutButton = screen.getByText('Sign Out');
    await user.click(signOutButton);

    // Should call logout function
    expect(setupApiMocks.logout).toHaveBeenCalled();
  });

  it('shows admin menu when user is admin', async () => {
    const adminUser = { ...mockUser, is_admin: true };
    setupApiMocks.getCurrentUser(adminUser);
    render(<Header />);

    await waitFor(() => {
      expect(screen.getByText('testuser')).toBeInTheDocument();
    });

    const userMenu = screen.getByLabelText('User menu');
    await user.click(userMenu);

    expect(screen.getByText('Admin Panel')).toBeInTheDocument();
  });

  it('navigates to admin panel when admin panel is clicked', async () => {
    const adminUser = { ...mockUser, is_admin: true };
    setupApiMocks.getCurrentUser(adminUser);
    const user = userEvent.setup();
    render(<Header />);

    await waitFor(() => {
      expect(screen.getByText('testuser')).toBeInTheDocument();
    });

    const userMenu = screen.getByLabelText('User menu');
    await user.click(userMenu);

    const adminPanelLink = screen.getByText('Admin Panel');
    await user.click(adminPanelLink);

    // Should navigate to admin panel
    expect(mockNavigate).toHaveBeenCalledWith('/admin');
  });

  it('shows navigation menu', () => {
    render(<Header />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Servers')).toBeInTheDocument();
    expect(screen.getByText('Backups')).toBeInTheDocument();
  });

  it('navigates to dashboard when dashboard is clicked', async () => {
    const user = userEvent.setup();
    render(<Header />);

    const dashboardLink = screen.getByText('Dashboard');
    await user.click(dashboardLink);

    // Should navigate to dashboard
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('navigates to servers when servers is clicked', async () => {
    const user = userEvent.setup();
    render(<Header />);

    const serversLink = screen.getByText('Servers');
    await user.click(serversLink);

    // Should navigate to servers page
    expect(mockNavigate).toHaveBeenCalledWith('/servers');
  });

  it('navigates to backups when backups is clicked', async () => {
    const user = userEvent.setup();
    render(<Header />);

    const backupsLink = screen.getByText('Backups');
    await user.click(backupsLink);

    // Should navigate to backups page
    expect(mockNavigate).toHaveBeenCalledWith('/backups');
  });

  it('shows active navigation state', () => {
    render(<Header currentPath="/dashboard" />);

    const dashboardLink = screen.getByText('Dashboard');
    expect(dashboardLink).toHaveClass('active');
  });

  it('shows mobile menu toggle button', () => {
    render(<Header />);

    expect(screen.getByLabelText('Toggle mobile menu')).toBeInTheDocument();
  });

  it('opens mobile menu when toggle button is clicked', async () => {
    const user = userEvent.setup();
    render(<Header />);

    const toggleButton = screen.getByLabelText('Toggle mobile menu');
    await user.click(toggleButton);

    expect(screen.getByText('Dashboard')).toHaveClass('mobile-menu-open');
  });

  it('closes mobile menu when toggle button is clicked again', async () => {
    const user = userEvent.setup();
    render(<Header />);

    const toggleButton = screen.getByLabelText('Toggle mobile menu');
    await user.click(toggleButton);
    await user.click(toggleButton);

    expect(screen.getByText('Dashboard')).not.toHaveClass('mobile-menu-open');
  });

  it('closes mobile menu when navigation item is clicked', async () => {
    const user = userEvent.setup();
    render(<Header />);

    const toggleButton = screen.getByLabelText('Toggle mobile menu');
    await user.click(toggleButton);

    const dashboardLink = screen.getByText('Dashboard');
    await user.click(dashboardLink);

    expect(dashboardLink).not.toHaveClass('mobile-menu-open');
  });

  it('shows search functionality', () => {
    render(<Header />);

    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
  });

  it('handles search input', async () => {
    const user = userEvent.setup();
    render(<Header />);

    const searchInput = screen.getByPlaceholderText('Search...');
    await user.type(searchInput, 'test search');

    expect(searchInput).toHaveValue('test search');
  });

  it('shows search results when typing', async () => {
    const user = userEvent.setup();
    render(<Header />);

    const searchInput = screen.getByPlaceholderText('Search...');
    await user.type(searchInput, 'test');

    await waitFor(() => {
      expect(screen.getByText('Search Results')).toBeInTheDocument();
    });
  });

  it('clears search when clear button is clicked', async () => {
    const user = userEvent.setup();
    render(<Header />);

    const searchInput = screen.getByPlaceholderText('Search...');
    await user.type(searchInput, 'test');

    const clearButton = screen.getByLabelText('Clear search');
    await user.click(clearButton);

    expect(searchInput).toHaveValue('');
  });

  it('shows notifications when available', () => {
    render(<Header />);

    expect(screen.getByLabelText('Notifications')).toBeInTheDocument();
  });

  it('shows notification count', () => {
    render(<Header notificationCount={5} />);

    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('opens notifications when notification bell is clicked', async () => {
    const user = userEvent.setup();
    render(<Header />);

    const notificationBell = screen.getByLabelText('Notifications');
    await user.click(notificationBell);

    expect(screen.getByText('Notifications')).toBeInTheDocument();
  });

  it('shows theme toggle button', () => {
    render(<Header />);

    expect(screen.getByLabelText('Toggle theme')).toBeInTheDocument();
  });

  it('toggles theme when theme button is clicked', async () => {
    const user = userEvent.setup();
    render(<Header />);

    const themeButton = screen.getByLabelText('Toggle theme');
    await user.click(themeButton);

    // Should toggle theme
    expect(setupApiMocks.toggleTheme).toHaveBeenCalled();
  });

  it('shows current theme icon', () => {
    render(<Header theme="dark" />);

    expect(screen.getByLabelText('Toggle theme')).toHaveClass('theme-dark');
  });

  it('handles keyboard navigation', async () => {
    const user = userEvent.setup();
    render(<Header />);

    const dashboardLink = screen.getByText('Dashboard');
    dashboardLink.focus();

    await user.keyboard('{Enter}');
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('shows loading state when user data is loading', () => {
    setupApiMocks.getCurrentUser.mockImplementation(() => new Promise(() => {}));
    render(<Header />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('handles user data error', async () => {
    setupApiMocks.getCurrentUser.mockRejectedValue(new Error('API Error'));
    render(<Header />);

    await waitFor(() => {
      expect(screen.getByText('Sign In')).toBeInTheDocument();
    });
  });

  it('shows user avatar when available', async () => {
    const userWithAvatar = { ...mockUser, avatar: 'https://example.com/avatar.jpg' };
    setupApiMocks.getCurrentUser(userWithAvatar);
    render(<Header />);

    await waitFor(() => {
      const avatar = screen.getByAltText('testuser avatar');
      expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg');
    });
  });

  it('shows default avatar when no avatar is available', async () => {
    render(<Header />);

    await waitFor(() => {
      expect(screen.getByText('testuser')).toBeInTheDocument();
    });

    const userMenu = screen.getByLabelText('User menu');
    expect(userMenu).toHaveClass('default-avatar');
  });

  it('shows user status indicator', async () => {
    render(<Header />);

    await waitFor(() => {
      expect(screen.getByText('testuser')).toBeInTheDocument();
    });

    expect(screen.getByLabelText('User status')).toBeInTheDocument();
  });

  it('shows online status', async () => {
    render(<Header />);

    await waitFor(() => {
      expect(screen.getByText('testuser')).toBeInTheDocument();
    });

    const statusIndicator = screen.getByLabelText('User status');
    expect(statusIndicator).toHaveClass('status-online');
  });

  it('shows offline status', async () => {
    const offlineUser = { ...mockUser, status: 'offline' };
    setupApiMocks.getCurrentUser(offlineUser);
    render(<Header />);

    await waitFor(() => {
      expect(screen.getByText('testuser')).toBeInTheDocument();
    });

    const statusIndicator = screen.getByLabelText('User status');
    expect(statusIndicator).toHaveClass('status-offline');
  });

  it('handles responsive design', () => {
    render(<Header />);

    expect(screen.getByRole('banner')).toHaveClass('responsive');
  });

  it('shows mobile navigation when screen is small', () => {
    // Mock small screen size
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 768,
    });

    render(<Header />);

    expect(screen.getByLabelText('Toggle mobile menu')).toBeInTheDocument();
  });

  it('shows desktop navigation when screen is large', () => {
    // Mock large screen size
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });

    render(<Header />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Servers')).toBeInTheDocument();
  });

  it('handles window resize events', () => {
    render(<Header />);

    // Simulate window resize
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 768,
    });

    fireEvent(window, new Event('resize'));

    expect(screen.getByLabelText('Toggle mobile menu')).toBeInTheDocument();
  });

  it('shows accessibility attributes', () => {
    render(<Header />);

    const header = screen.getByRole('banner');
    expect(header).toHaveAttribute('aria-label', 'Main navigation');
  });

  it('handles custom className', () => {
    render(<Header className="custom-header" />);

    const header = screen.getByRole('banner');
    expect(header).toHaveClass('custom-header');
  });

  it('handles custom styles', () => {
    render(<Header style={{ backgroundColor: 'red' }} />);

    const header = screen.getByRole('banner');
    expect(header).toHaveStyle('background-color: red');
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLElement>();
    render(<Header ref={ref} />);

    expect(ref.current).toBeInstanceOf(HTMLElement);
  });
});
