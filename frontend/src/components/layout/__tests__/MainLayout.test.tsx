import React from 'react';
import { render, screen, waitFor, vi } from '../../../test';
import { TestDataFactory, setupApiMocks } from '../../../test';
import MainLayout from '../MainLayout';

const mockUser = TestDataFactory.user({
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  is_admin: false,
});

describe('MainLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupApiMocks.getCurrentUser(mockUser);
  });

  it('renders main layout correctly', () => {
    render(
      <MainLayout>
        <div>Main content</div>
      </MainLayout>
    );

    expect(screen.getByText('Main content')).toBeInTheDocument();
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('navigation')).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('renders header component', () => {
    render(
      <MainLayout>
        <div>Main content</div>
      </MainLayout>
    );

    expect(screen.getByText('Minecraft Server Manager')).toBeInTheDocument();
  });

  it('renders sidebar component', () => {
    render(
      <MainLayout>
        <div>Main content</div>
      </MainLayout>
    );

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Servers')).toBeInTheDocument();
    expect(screen.getByText('Backups')).toBeInTheDocument();
  });

  it('renders main content area', () => {
    render(
      <MainLayout>
        <div>Main content</div>
      </MainLayout>
    );

    const main = screen.getByRole('main');
    expect(main).toBeInTheDocument();
    expect(main).toHaveTextContent('Main content');
  });

  it('renders footer component', () => {
    render(
      <MainLayout>
        <div>Main content</div>
      </MainLayout>
    );

    expect(screen.getByText('© 2024 Minecraft Server Manager')).toBeInTheDocument();
  });

  it('shows loading state when user data is loading', () => {
    setupApiMocks.getCurrentUser.mockImplementation(() => new Promise(() => {}));
    render(
      <MainLayout>
        <div>Main content</div>
      </MainLayout>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows error state when user data fails to load', async () => {
    setupApiMocks.getCurrentUser.mockRejectedValue(new Error('API Error'));
    render(
      <MainLayout>
        <div>Main content</div>
      </MainLayout>
    );

    await waitFor(() => {
      expect(screen.getByText('Failed to load user data')).toBeInTheDocument();
    });
  });

  it('handles different layout variants', () => {
    const { rerender } = render(
      <MainLayout variant="default">
        <div>Main content</div>
      </MainLayout>
    );
    expect(screen.getByRole('main')).toHaveClass('layout-default');

    rerender(
      <MainLayout variant="compact">
        <div>Main content</div>
      </MainLayout>
    );
    expect(screen.getByRole('main')).toHaveClass('layout-compact');

    rerender(
      <MainLayout variant="wide">
        <div>Main content</div>
      </MainLayout>
    );
    expect(screen.getByRole('main')).toHaveClass('layout-wide');
  });

  it('handles different sidebar states', () => {
    const { rerender } = render(
      <MainLayout sidebarCollapsed={false}>
        <div>Main content</div>
      </MainLayout>
    );
    expect(screen.getByRole('main')).toHaveClass('sidebar-expanded');

    rerender(
      <MainLayout sidebarCollapsed={true}>
        <div>Main content</div>
      </MainLayout>
    );
    expect(screen.getByRole('main')).toHaveClass('sidebar-collapsed');
  });

  it('handles different header states', () => {
    const { rerender } = render(
      <MainLayout headerVisible={true}>
        <div>Main content</div>
      </MainLayout>
    );
    expect(screen.getByRole('banner')).toBeInTheDocument();

    rerender(
      <MainLayout headerVisible={false}>
        <div>Main content</div>
      </MainLayout>
    );
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
  });

  it('handles different footer states', () => {
    const { rerender } = render(
      <MainLayout footerVisible={true}>
        <div>Main content</div>
      </MainLayout>
    );
    expect(screen.getByText('© 2024 Minecraft Server Manager')).toBeInTheDocument();

    rerender(
      <MainLayout footerVisible={false}>
        <div>Main content</div>
      </MainLayout>
    );
    expect(screen.queryByText('© 2024 Minecraft Server Manager')).not.toBeInTheDocument();
  });

  it('handles different sidebar visibility states', () => {
    const { rerender } = render(
      <MainLayout sidebarVisible={true}>
        <div>Main content</div>
      </MainLayout>
    );
    expect(screen.getByRole('navigation')).toBeInTheDocument();

    rerender(
      <MainLayout sidebarVisible={false}>
        <div>Main content</div>
      </MainLayout>
    );
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });

  it('handles responsive design', () => {
    render(
      <MainLayout>
        <div>Main content</div>
      </MainLayout>
    );

    expect(screen.getByRole('main')).toHaveClass('responsive');
  });

  it('shows mobile layout when screen is small', () => {
    // Mock small screen size
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 768,
    });

    render(
      <MainLayout>
        <div>Main content</div>
      </MainLayout>
    );

    expect(screen.getByRole('main')).toHaveClass('mobile');
  });

  it('shows desktop layout when screen is large', () => {
    // Mock large screen size
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });

    render(
      <MainLayout>
        <div>Main content</div>
      </MainLayout>
    );

    expect(screen.getByRole('main')).not.toHaveClass('mobile');
  });

  it('handles window resize events', () => {
    render(
      <MainLayout>
        <div>Main content</div>
      </MainLayout>
    );

    // Simulate window resize
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 768,
    });

    fireEvent(window, new Event('resize'));

    expect(screen.getByRole('main')).toHaveClass('mobile');
  });

  it('handles different themes', () => {
    const { rerender } = render(
      <MainLayout theme="light">
        <div>Main content</div>
      </MainLayout>
    );
    expect(screen.getByRole('main')).toHaveClass('theme-light');

    rerender(
      <MainLayout theme="dark">
        <div>Main content</div>
      </MainLayout>
    );
    expect(screen.getByRole('main')).toHaveClass('theme-dark');
  });

  it('handles custom className', () => {
    render(
      <MainLayout className="custom-layout">
        <div>Main content</div>
      </MainLayout>
    );

    const main = screen.getByRole('main');
    expect(main).toHaveClass('custom-layout');
  });

  it('handles custom styles', () => {
    render(
      <MainLayout style={{ backgroundColor: 'red' }}>
        <div>Main content</div>
      </MainLayout>
    );

    const main = screen.getByRole('main');
    expect(main).toHaveStyle('background-color: red');
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLElement>();
    render(
      <MainLayout ref={ref}>
        <div>Main content</div>
      </MainLayout>
    );

    expect(ref.current).toBeInstanceOf(HTMLElement);
  });

  it('handles sidebar toggle', async () => {
    const user = userEvent.setup();
    render(
      <MainLayout>
        <div>Main content</div>
      </MainLayout>
    );

    const toggleButton = screen.getByLabelText('Toggle sidebar');
    await user.click(toggleButton);

    expect(screen.getByRole('main')).toHaveClass('sidebar-collapsed');
  });

  it('handles sidebar toggle callbacks', async () => {
    const user = userEvent.setup();
    const handleSidebarToggle = vi.fn();
    render(
      <MainLayout onSidebarToggle={handleSidebarToggle}>
        <div>Main content</div>
      </MainLayout>
    );

    const toggleButton = screen.getByLabelText('Toggle sidebar');
    await user.click(toggleButton);

    expect(handleSidebarToggle).toHaveBeenCalledWith(true);
  });

  it('handles header actions', async () => {
    const user = userEvent.setup();
    render(
      <MainLayout>
        <div>Main content</div>
      </MainLayout>
    );

    const searchButton = screen.getByLabelText('Search');
    await user.click(searchButton);

    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
  });

  it('handles navigation events', async () => {
    const user = userEvent.setup();
    render(
      <MainLayout>
        <div>Main content</div>
      </MainLayout>
    );

    const dashboardLink = screen.getByText('Dashboard');
    await user.click(dashboardLink);

    // Should navigate to dashboard
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('handles user menu events', async () => {
    const user = userEvent.setup();
    render(
      <MainLayout>
        <div>Main content</div>
      </MainLayout>
    );

    await waitFor(() => {
      expect(screen.getByText('testuser')).toBeInTheDocument();
    });

    const userMenu = screen.getByLabelText('User menu');
    await user.click(userMenu);

    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Sign Out')).toBeInTheDocument();
  });

  it('handles admin menu when user is admin', async () => {
    const adminUser = { ...mockUser, is_admin: true };
    setupApiMocks.getCurrentUser(adminUser);
    const user = userEvent.setup();
    render(
      <MainLayout>
        <div>Main content</div>
      </MainLayout>
    );

    await waitFor(() => {
      expect(screen.getByText('testuser')).toBeInTheDocument();
    });

    const userMenu = screen.getByLabelText('User menu');
    await user.click(userMenu);

    expect(screen.getByText('Admin Panel')).toBeInTheDocument();
  });

  it('handles keyboard shortcuts', async () => {
    const user = userEvent.setup();
    render(
      <MainLayout>
        <div>Main content</div>
      </MainLayout>
    );

    // Test Ctrl+K for search
    await user.keyboard('{Control>}k{/Control}');
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();

    // Test Escape to close search
    await user.keyboard('{Escape}');
    expect(screen.queryByPlaceholderText('Search...')).not.toBeInTheDocument();
  });

  it('handles breadcrumb navigation', () => {
    render(
      <MainLayout breadcrumbs={[
        { label: 'Home', path: '/' },
        { label: 'Servers', path: '/servers' },
        { label: 'Server Details', path: '/servers/1' },
      ]}>
        <div>Main content</div>
      </MainLayout>
    );

    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Servers')).toBeInTheDocument();
    expect(screen.getByText('Server Details')).toBeInTheDocument();
  });

  it('handles page title updates', () => {
    render(
      <MainLayout pageTitle="Server Details">
        <div>Main content</div>
      </MainLayout>
    );

    expect(document.title).toBe('Server Details - Minecraft Server Manager');
  });

  it('handles page meta updates', () => {
    render(
      <MainLayout 
        pageTitle="Server Details"
        pageDescription="View and manage server details"
        pageKeywords={['server', 'minecraft', 'management']}
      >
        <div>Main content</div>
      </MainLayout>
    );

    expect(document.title).toBe('Server Details - Minecraft Server Manager');
  });

  it('handles loading states for different sections', () => {
    render(
      <MainLayout 
        headerLoading={true}
        sidebarLoading={true}
        contentLoading={true}
      >
        <div>Main content</div>
      </MainLayout>
    );

    expect(screen.getByText('Loading header...')).toBeInTheDocument();
    expect(screen.getByText('Loading sidebar...')).toBeInTheDocument();
    expect(screen.getByText('Loading content...')).toBeInTheDocument();
  });

  it('handles error states for different sections', () => {
    render(
      <MainLayout 
        headerError="Header error"
        sidebarError="Sidebar error"
        contentError="Content error"
      >
        <div>Main content</div>
      </MainLayout>
    );

    expect(screen.getByText('Header error')).toBeInTheDocument();
    expect(screen.getByText('Sidebar error')).toBeInTheDocument();
    expect(screen.getByText('Content error')).toBeInTheDocument();
  });

  it('handles custom header content', () => {
    render(
      <MainLayout 
        headerContent={<div>Custom header content</div>}
      >
        <div>Main content</div>
      </MainLayout>
    );

    expect(screen.getByText('Custom header content')).toBeInTheDocument();
  });

  it('handles custom sidebar content', () => {
    render(
      <MainLayout 
        sidebarContent={<div>Custom sidebar content</div>}
      >
        <div>Main content</div>
      </MainLayout>
    );

    expect(screen.getByText('Custom sidebar content')).toBeInTheDocument();
  });

  it('handles custom footer content', () => {
    render(
      <MainLayout 
        footerContent={<div>Custom footer content</div>}
      >
        <div>Main content</div>
      </MainLayout>
    );

    expect(screen.getByText('Custom footer content')).toBeInTheDocument();
  });

  it('handles layout animations', () => {
    render(
      <MainLayout animated>
        <div>Main content</div>
      </MainLayout>
    );

    expect(screen.getByRole('main')).toHaveClass('animated');
  });

  it('handles layout transitions', () => {
    render(
      <MainLayout transition="fade">
        <div>Main content</div>
      </MainLayout>
    );

    expect(screen.getByRole('main')).toHaveClass('transition-fade');
  });

  it('handles layout overlays', () => {
    render(
      <MainLayout overlay={<div>Overlay content</div>}>
        <div>Main content</div>
      </MainLayout>
    );

    expect(screen.getByText('Overlay content')).toBeInTheDocument();
  });

  it('handles layout modals', () => {
    render(
      <MainLayout modal={<div>Modal content</div>}>
        <div>Main content</div>
      </MainLayout>
    );

    expect(screen.getByText('Modal content')).toBeInTheDocument();
  });

  it('handles layout notifications', () => {
    render(
      <MainLayout notifications={[
        { id: 1, message: 'Notification 1', type: 'info' },
        { id: 2, message: 'Notification 2', type: 'success' },
      ]}>
        <div>Main content</div>
      </MainLayout>
    );

    expect(screen.getByText('Notification 1')).toBeInTheDocument();
    expect(screen.getByText('Notification 2')).toBeInTheDocument();
  });

  it('handles layout alerts', () => {
    render(
      <MainLayout alerts={[
        { id: 1, message: 'Alert 1', type: 'warning' },
        { id: 2, message: 'Alert 2', type: 'error' },
      ]}>
        <div>Main content</div>
      </MainLayout>
    );

    expect(screen.getByText('Alert 1')).toBeInTheDocument();
    expect(screen.getByText('Alert 2')).toBeInTheDocument();
  });

  it('handles layout context', () => {
    const TestContext = React.createContext('default');
    render(
      <MainLayout context={TestContext.Provider} contextValue="test">
        <div>Main content</div>
      </MainLayout>
    );

    expect(screen.getByText('Main content')).toBeInTheDocument();
  });

  it('handles layout providers', () => {
    render(
      <MainLayout providers={[
        { component: TestContext.Provider, value: 'test' },
      ]}>
        <div>Main content</div>
      </MainLayout>
    );

    expect(screen.getByText('Main content')).toBeInTheDocument();
  });

  it('handles layout middleware', () => {
    const middleware = vi.fn();
    render(
      <MainLayout middleware={[middleware]}>
        <div>Main content</div>
      </MainLayout>
    );

    expect(middleware).toHaveBeenCalled();
  });

  it('handles layout hooks', () => {
    const hook = vi.fn();
    render(
      <MainLayout hooks={[hook]}>
        <div>Main content</div>
      </MainLayout>
    );

    expect(hook).toHaveBeenCalled();
  });

  it('handles layout effects', () => {
    const effect = vi.fn();
    render(
      <MainLayout effects={[effect]}>
        <div>Main content</div>
      </MainLayout>
    );

    expect(effect).toHaveBeenCalled();
  });

  it('handles layout cleanup', () => {
    const cleanup = vi.fn();
    const { unmount } = render(
      <MainLayout cleanup={cleanup}>
        <div>Main content</div>
      </MainLayout>
    );

    unmount();
    expect(cleanup).toHaveBeenCalled();
  });
});
