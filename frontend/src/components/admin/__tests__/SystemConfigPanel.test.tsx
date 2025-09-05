import React from 'react';
import { render, screen, fireEvent, waitFor, userEvent, vi } from '../../../test';
import { setupApiMocks } from '../../../test';
import SystemConfigPanel from '../SystemConfigPanel';

const mockSystemConfig = {
  max_memory_per_server: 2048,
  max_servers_per_user: 5,
  default_server_memory: 1024,
  auto_backup_enabled: true,
  backup_retention_days: 7,
  log_level: 'INFO',
  maintenance_mode: false,
};

describe('SystemConfigPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupApiMocks.systemConfig(mockSystemConfig);
  });

  it('renders system config panel correctly', async () => {
    render(<SystemConfigPanel />);

    await waitFor(() => {
      expect(screen.getByText('System Configuration')).toBeInTheDocument();
      expect(screen.getByText('Memory Settings')).toBeInTheDocument();
      expect(screen.getByText('Server Limits')).toBeInTheDocument();
      expect(screen.getByText('Backup Settings')).toBeInTheDocument();
    });
  });

  it('shows loading state initially', () => {
    render(<SystemConfigPanel />);

    expect(screen.getByText('Loading configuration...')).toBeInTheDocument();
  });

  it('displays current configuration values', async () => {
    render(<SystemConfigPanel />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('2048')).toBeInTheDocument();
      expect(screen.getByDisplayValue('5')).toBeInTheDocument();
      expect(screen.getByDisplayValue('1024')).toBeInTheDocument();
      expect(screen.getByDisplayValue('7')).toBeInTheDocument();
    });
  });

  it('updates max memory per server', async () => {
    setupApiMocks.updateSystemConfig.mockResolvedValue({
      ...mockSystemConfig,
      max_memory_per_server: 4096,
    });
    const user = userEvent.setup();
    render(<SystemConfigPanel />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('2048')).toBeInTheDocument();
    });

    const memoryInput = screen.getByLabelText('Max Memory per Server (MB)');
    await user.clear(memoryInput);
    await user.type(memoryInput, '4096');

    const saveButton = screen.getByText('Save Configuration');
    await user.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Configuration updated successfully')).toBeInTheDocument();
    });
  });

  it('updates max servers per user', async () => {
    setupApiMocks.updateSystemConfig.mockResolvedValue({
      ...mockSystemConfig,
      max_servers_per_user: 10,
    });
    const user = userEvent.setup();
    render(<SystemConfigPanel />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('5')).toBeInTheDocument();
    });

    const serversInput = screen.getByLabelText('Max Servers per User');
    await user.clear(serversInput);
    await user.type(serversInput, '10');

    const saveButton = screen.getByText('Save Configuration');
    await user.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Configuration updated successfully')).toBeInTheDocument();
    });
  });

  it('updates default server memory', async () => {
    setupApiMocks.updateSystemConfig.mockResolvedValue({
      ...mockSystemConfig,
      default_server_memory: 2048,
    });
    const user = userEvent.setup();
    render(<SystemConfigPanel />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('1024')).toBeInTheDocument();
    });

    const defaultMemoryInput = screen.getByLabelText('Default Server Memory (MB)');
    await user.clear(defaultMemoryInput);
    await user.type(defaultMemoryInput, '2048');

    const saveButton = screen.getByText('Save Configuration');
    await user.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Configuration updated successfully')).toBeInTheDocument();
    });
  });

  it('toggles auto backup enabled', async () => {
    setupApiMocks.updateSystemConfig.mockResolvedValue({
      ...mockSystemConfig,
      auto_backup_enabled: false,
    });
    const user = userEvent.setup();
    render(<SystemConfigPanel />);

    await waitFor(() => {
      expect(screen.getByLabelText('Enable Auto Backup')).toBeInTheDocument();
    });

    const autoBackupToggle = screen.getByLabelText('Enable Auto Backup');
    await user.click(autoBackupToggle);

    const saveButton = screen.getByText('Save Configuration');
    await user.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Configuration updated successfully')).toBeInTheDocument();
    });
  });

  it('updates backup retention days', async () => {
    setupApiMocks.updateSystemConfig.mockResolvedValue({
      ...mockSystemConfig,
      backup_retention_days: 14,
    });
    const user = userEvent.setup();
    render(<SystemConfigPanel />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('7')).toBeInTheDocument();
    });

    const retentionInput = screen.getByLabelText('Backup Retention (Days)');
    await user.clear(retentionInput);
    await user.type(retentionInput, '14');

    const saveButton = screen.getByText('Save Configuration');
    await user.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Configuration updated successfully')).toBeInTheDocument();
    });
  });

  it('updates log level', async () => {
    setupApiMocks.updateSystemConfig.mockResolvedValue({
      ...mockSystemConfig,
      log_level: 'DEBUG',
    });
    const user = userEvent.setup();
    render(<SystemConfigPanel />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('INFO')).toBeInTheDocument();
    });

    const logLevelSelect = screen.getByLabelText('Log Level');
    await user.selectOptions(logLevelSelect, 'DEBUG');

    const saveButton = screen.getByText('Save Configuration');
    await user.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Configuration updated successfully')).toBeInTheDocument();
    });
  });

  it('toggles maintenance mode', async () => {
    setupApiMocks.updateSystemConfig.mockResolvedValue({
      ...mockSystemConfig,
      maintenance_mode: true,
    });
    const user = userEvent.setup();
    render(<SystemConfigPanel />);

    await waitFor(() => {
      expect(screen.getByLabelText('Maintenance Mode')).toBeInTheDocument();
    });

    const maintenanceToggle = screen.getByLabelText('Maintenance Mode');
    await user.click(maintenanceToggle);

    const saveButton = screen.getByText('Save Configuration');
    await user.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Configuration updated successfully')).toBeInTheDocument();
    });
  });

  it('validates memory settings', async () => {
    const user = userEvent.setup();
    render(<SystemConfigPanel />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('2048')).toBeInTheDocument();
    });

    const memoryInput = screen.getByLabelText('Max Memory per Server (MB)');
    await user.clear(memoryInput);
    await user.type(memoryInput, '100'); // Too low

    const saveButton = screen.getByText('Save Configuration');
    await user.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Max memory per server must be at least 512 MB')).toBeInTheDocument();
    });
  });

  it('validates server limits', async () => {
    const user = userEvent.setup();
    render(<SystemConfigPanel />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('5')).toBeInTheDocument();
    });

    const serversInput = screen.getByLabelText('Max Servers per User');
    await user.clear(serversInput);
    await user.type(serversInput, '0'); // Too low

    const saveButton = screen.getByText('Save Configuration');
    await user.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Max servers per user must be at least 1')).toBeInTheDocument();
    });
  });

  it('validates backup retention days', async () => {
    const user = userEvent.setup();
    render(<SystemConfigPanel />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('7')).toBeInTheDocument();
    });

    const retentionInput = screen.getByLabelText('Backup Retention (Days)');
    await user.clear(retentionInput);
    await user.type(retentionInput, '0'); // Too low

    const saveButton = screen.getByText('Save Configuration');
    await user.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Backup retention must be at least 1 day')).toBeInTheDocument();
    });
  });

  it('handles configuration update error', async () => {
    setupApiMocks.updateSystemConfig.mockRejectedValue(new Error('Update failed'));
    const user = userEvent.setup();
    render(<SystemConfigPanel />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('2048')).toBeInTheDocument();
    });

    const memoryInput = screen.getByLabelText('Max Memory per Server (MB)');
    await user.clear(memoryInput);
    await user.type(memoryInput, '4096');

    const saveButton = screen.getByText('Save Configuration');
    await user.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Failed to update configuration')).toBeInTheDocument();
    });
  });

  it('shows loading state during save', async () => {
    const user = userEvent.setup();
    render(<SystemConfigPanel />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('2048')).toBeInTheDocument();
    });

    const memoryInput = screen.getByLabelText('Max Memory per Server (MB)');
    await user.clear(memoryInput);
    await user.type(memoryInput, '4096');

    const saveButton = screen.getByText('Save Configuration');
    await user.click(saveButton);

    expect(saveButton).toBeDisabled();
    expect(screen.getByText('Saving...')).toBeInTheDocument();
  });

  it('resets form to original values when reset is clicked', async () => {
    const user = userEvent.setup();
    render(<SystemConfigPanel />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('2048')).toBeInTheDocument();
    });

    const memoryInput = screen.getByLabelText('Max Memory per Server (MB)');
    await user.clear(memoryInput);
    await user.type(memoryInput, '4096');

    const resetButton = screen.getByText('Reset');
    await user.click(resetButton);

    expect(screen.getByDisplayValue('2048')).toBeInTheDocument();
  });

  it('shows confirmation dialog for maintenance mode', async () => {
    const user = userEvent.setup();
    render(<SystemConfigPanel />);

    await waitFor(() => {
      expect(screen.getByLabelText('Maintenance Mode')).toBeInTheDocument();
    });

    const maintenanceToggle = screen.getByLabelText('Maintenance Mode');
    await user.click(maintenanceToggle);

    expect(screen.getByText('Enable Maintenance Mode')).toBeInTheDocument();
    expect(screen.getByText('This will put the system in maintenance mode. Users will not be able to access the system.')).toBeInTheDocument();
  });

  it('cancels maintenance mode activation', async () => {
    const user = userEvent.setup();
    render(<SystemConfigPanel />);

    await waitFor(() => {
      expect(screen.getByLabelText('Maintenance Mode')).toBeInTheDocument();
    });

    const maintenanceToggle = screen.getByLabelText('Maintenance Mode');
    await user.click(maintenanceToggle);

    const cancelButton = screen.getByText('Cancel');
    await user.click(cancelButton);

    expect(screen.queryByText('Enable Maintenance Mode')).not.toBeInTheDocument();
  });

  it('confirms maintenance mode activation', async () => {
    setupApiMocks.updateSystemConfig.mockResolvedValue({
      ...mockSystemConfig,
      maintenance_mode: true,
    });
    const user = userEvent.setup();
    render(<SystemConfigPanel />);

    await waitFor(() => {
      expect(screen.getByLabelText('Maintenance Mode')).toBeInTheDocument();
    });

    const maintenanceToggle = screen.getByLabelText('Maintenance Mode');
    await user.click(maintenanceToggle);

    const confirmButton = screen.getByText('Enable Maintenance Mode');
    await user.click(confirmButton);

    await waitFor(() => {
      expect(screen.getByText('Configuration updated successfully')).toBeInTheDocument();
    });
  });

  it('shows help text for configuration options', async () => {
    render(<SystemConfigPanel />);

    await waitFor(() => {
      expect(screen.getByText('Maximum memory that can be allocated to a single server')).toBeInTheDocument();
      expect(screen.getByText('Maximum number of servers a user can create')).toBeInTheDocument();
      expect(screen.getByText('Default memory allocation for new servers')).toBeInTheDocument();
    });
  });

  it('handles configuration load error', async () => {
    setupApiMocks.systemConfig.mockRejectedValue(new Error('Load failed'));
    render(<SystemConfigPanel />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load configuration')).toBeInTheDocument();
      expect(screen.getByText('Try again')).toBeInTheDocument();
    });
  });

  it('retries configuration load on error', async () => {
    const user = userEvent.setup();
    setupApiMocks.systemConfig
      .mockRejectedValueOnce(new Error('Load failed'))
      .mockResolvedValueOnce(mockSystemConfig);
    
    render(<SystemConfigPanel />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load configuration')).toBeInTheDocument();
    });

    const retryButton = screen.getByText('Try again');
    await user.click(retryButton);

    await waitFor(() => {
      expect(screen.getByDisplayValue('2048')).toBeInTheDocument();
    });
  });

  it('shows current system status', async () => {
    render(<SystemConfigPanel />);

    await waitFor(() => {
      expect(screen.getByText('System Status')).toBeInTheDocument();
      expect(screen.getByText('Online')).toBeInTheDocument();
      expect(screen.getByText('Maintenance Mode: Disabled')).toBeInTheDocument();
    });
  });

  it('updates system status when maintenance mode is enabled', async () => {
    setupApiMocks.updateSystemConfig.mockResolvedValue({
      ...mockSystemConfig,
      maintenance_mode: true,
    });
    const user = userEvent.setup();
    render(<SystemConfigPanel />);

    await waitFor(() => {
      expect(screen.getByText('Maintenance Mode: Disabled')).toBeInTheDocument();
    });

    const maintenanceToggle = screen.getByLabelText('Maintenance Mode');
    await user.click(maintenanceToggle);

    const confirmButton = screen.getByText('Enable Maintenance Mode');
    await user.click(confirmButton);

    await waitFor(() => {
      expect(screen.getByText('Maintenance Mode: Enabled')).toBeInTheDocument();
    });
  });

  it('shows warning for high memory limits', async () => {
    const user = userEvent.setup();
    render(<SystemConfigPanel />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('2048')).toBeInTheDocument();
    });

    const memoryInput = screen.getByLabelText('Max Memory per Server (MB)');
    await user.clear(memoryInput);
    await user.type(memoryInput, '16384'); // 16GB

    expect(screen.getByText('Warning: High memory limits may impact system performance')).toBeInTheDocument();
  });

  it('shows warning for low server limits', async () => {
    const user = userEvent.setup();
    render(<SystemConfigPanel />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('5')).toBeInTheDocument();
    });

    const serversInput = screen.getByLabelText('Max Servers per User');
    await user.clear(serversInput);
    await user.type(serversInput, '1');

    expect(screen.getByText('Warning: Low server limits may restrict user functionality')).toBeInTheDocument();
  });
});
