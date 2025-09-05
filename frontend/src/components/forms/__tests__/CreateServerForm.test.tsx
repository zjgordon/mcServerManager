import React from 'react';
import { render, screen, fireEvent, waitFor, userEvent, vi } from '../../../test';
import { setupApiMocks } from '../../../test';
import CreateServerForm from '../CreateServerForm';

describe('CreateServerForm', () => {
  const mockOnSuccess = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    setupApiMocks.serverCreateSuccess();
  });

  it('renders create server form correctly', () => {
    render(<CreateServerForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    expect(screen.getByText('Create New Server')).toBeInTheDocument();
    expect(screen.getByLabelText('Server Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Minecraft Version')).toBeInTheDocument();
    expect(screen.getByLabelText('Memory (MB)')).toBeInTheDocument();
    expect(screen.getByLabelText('Port')).toBeInTheDocument();
  });

  it('shows progress indicator', () => {
    render(<CreateServerForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
    expect(screen.getByText('Basic Settings')).toBeInTheDocument();
  });

  it('shows validation errors for empty fields', async () => {
    render(<CreateServerForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText('Server name is required')).toBeInTheDocument();
      expect(screen.getByText('Minecraft version is required')).toBeInTheDocument();
      expect(screen.getByText('Memory allocation is required')).toBeInTheDocument();
    });
  });

  it('shows validation error for invalid server name', async () => {
    render(<CreateServerForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    const serverNameInput = screen.getByLabelText('Server Name');
    fireEvent.change(serverNameInput, { target: { value: 'ab' } });

    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText('Server name must be at least 3 characters long')).toBeInTheDocument();
    });
  });

  it('shows validation error for invalid memory allocation', async () => {
    render(<CreateServerForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    const memoryInput = screen.getByLabelText('Memory (MB)');
    fireEvent.change(memoryInput, { target: { value: '100' } });

    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText('Memory must be between 512 MB and 8192 MB')).toBeInTheDocument();
    });
  });

  it('advances to next step with valid basic settings', async () => {
    const user = userEvent.setup();
    render(<CreateServerForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    const serverNameInput = screen.getByLabelText('Server Name');
    const versionSelect = screen.getByLabelText('Minecraft Version');
    const memoryInput = screen.getByLabelText('Memory (MB)');
    const portInput = screen.getByLabelText('Port');

    await user.type(serverNameInput, 'Test Server');
    await user.selectOptions(versionSelect, '1.21.8');
    await user.type(memoryInput, '1024');
    await user.type(portInput, '25565');

    const nextButton = screen.getByText('Next');
    await user.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText('Step 2 of 3')).toBeInTheDocument();
      expect(screen.getByText('Game Settings')).toBeInTheDocument();
    });
  });

  it('shows game settings step', async () => {
    const user = userEvent.setup();
    render(<CreateServerForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    // Fill basic settings and advance
    const serverNameInput = screen.getByLabelText('Server Name');
    const versionSelect = screen.getByLabelText('Minecraft Version');
    const memoryInput = screen.getByLabelText('Memory (MB)');
    const portInput = screen.getByLabelText('Port');

    await user.type(serverNameInput, 'Test Server');
    await user.selectOptions(versionSelect, '1.21.8');
    await user.type(memoryInput, '1024');
    await user.type(portInput, '25565');

    const nextButton = screen.getByText('Next');
    await user.click(nextButton);

    await waitFor(() => {
      expect(screen.getByLabelText('Game Mode')).toBeInTheDocument();
      expect(screen.getByLabelText('Difficulty')).toBeInTheDocument();
      expect(screen.getByLabelText('Seed (optional)')).toBeInTheDocument();
      expect(screen.getByLabelText('Message of the Day')).toBeInTheDocument();
    });
  });

  it('shows advanced settings step', async () => {
    const user = userEvent.setup();
    render(<CreateServerForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    // Fill basic settings and advance
    const serverNameInput = screen.getByLabelText('Server Name');
    const versionSelect = screen.getByLabelText('Minecraft Version');
    const memoryInput = screen.getByLabelText('Memory (MB)');
    const portInput = screen.getByLabelText('Port');

    await user.type(serverNameInput, 'Test Server');
    await user.selectOptions(versionSelect, '1.21.8');
    await user.type(memoryInput, '1024');
    await user.type(portInput, '25565');

    const nextButton = screen.getByText('Next');
    await user.click(nextButton);

    // Fill game settings and advance
    const gameModeSelect = screen.getByLabelText('Game Mode');
    const difficultySelect = screen.getByLabelText('Difficulty');
    const motdInput = screen.getByLabelText('Message of the Day');

    await user.selectOptions(gameModeSelect, 'survival');
    await user.selectOptions(difficultySelect, 'normal');
    await user.type(motdInput, 'Welcome to Test Server!');

    const nextButton2 = screen.getByText('Next');
    await user.click(nextButton2);

    await waitFor(() => {
      expect(screen.getByText('Step 3 of 3')).toBeInTheDocument();
      expect(screen.getByText('Advanced Settings')).toBeInTheDocument();
      expect(screen.getByLabelText('Hardcore Mode')).toBeInTheDocument();
      expect(screen.getByLabelText('PvP Enabled')).toBeInTheDocument();
      expect(screen.getByLabelText('Spawn Monsters')).toBeInTheDocument();
    });
  });

  it('goes back to previous step', async () => {
    const user = userEvent.setup();
    render(<CreateServerForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    // Fill basic settings and advance
    const serverNameInput = screen.getByLabelText('Server Name');
    const versionSelect = screen.getByLabelText('Minecraft Version');
    const memoryInput = screen.getByLabelText('Memory (MB)');
    const portInput = screen.getByLabelText('Port');

    await user.type(serverNameInput, 'Test Server');
    await user.selectOptions(versionSelect, '1.21.8');
    await user.type(memoryInput, '1024');
    await user.type(portInput, '25565');

    const nextButton = screen.getByText('Next');
    await user.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText('Step 2 of 3')).toBeInTheDocument();
    });

    const backButton = screen.getByText('Back');
    await user.click(backButton);

    await waitFor(() => {
      expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
      expect(screen.getByLabelText('Server Name')).toBeInTheDocument();
    });
  });

  it('shows confirmation step before creating server', async () => {
    const user = userEvent.setup();
    render(<CreateServerForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    // Fill all steps
    const serverNameInput = screen.getByLabelText('Server Name');
    const versionSelect = screen.getByLabelText('Minecraft Version');
    const memoryInput = screen.getByLabelText('Memory (MB)');
    const portInput = screen.getByLabelText('Port');

    await user.type(serverNameInput, 'Test Server');
    await user.selectOptions(versionSelect, '1.21.8');
    await user.type(memoryInput, '1024');
    await user.type(portInput, '25565');

    const nextButton = screen.getByText('Next');
    await user.click(nextButton);

    // Fill game settings
    const gameModeSelect = screen.getByLabelText('Game Mode');
    const difficultySelect = screen.getByLabelText('Difficulty');
    const motdInput = screen.getByLabelText('Message of the Day');

    await user.selectOptions(gameModeSelect, 'survival');
    await user.selectOptions(difficultySelect, 'normal');
    await user.type(motdInput, 'Welcome to Test Server!');

    const nextButton2 = screen.getByText('Next');
    await user.click(nextButton2);

    // Fill advanced settings
    const hardcoreCheckbox = screen.getByLabelText('Hardcore Mode');
    const pvpCheckbox = screen.getByLabelText('PvP Enabled');
    const monstersCheckbox = screen.getByLabelText('Spawn Monsters');

    await user.click(hardcoreCheckbox);
    await user.click(pvpCheckbox);
    await user.click(monstersCheckbox);

    const createButton = screen.getByText('Create Server');
    await user.click(createButton);

    await waitFor(() => {
      expect(screen.getByText('Confirm Server Creation')).toBeInTheDocument();
      expect(screen.getByText('Test Server')).toBeInTheDocument();
      expect(screen.getByText('1.21.8')).toBeInTheDocument();
      expect(screen.getByText('1024 MB')).toBeInTheDocument();
      expect(screen.getByText('Port 25565')).toBeInTheDocument();
    });
  });

  it('creates server successfully', async () => {
    const user = userEvent.setup();
    render(<CreateServerForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    // Fill all steps and create server
    const serverNameInput = screen.getByLabelText('Server Name');
    const versionSelect = screen.getByLabelText('Minecraft Version');
    const memoryInput = screen.getByLabelText('Memory (MB)');
    const portInput = screen.getByLabelText('Port');

    await user.type(serverNameInput, 'Test Server');
    await user.selectOptions(versionSelect, '1.21.8');
    await user.type(memoryInput, '1024');
    await user.type(portInput, '25565');

    const nextButton = screen.getByText('Next');
    await user.click(nextButton);

    // Fill game settings
    const gameModeSelect = screen.getByLabelText('Game Mode');
    const difficultySelect = screen.getByLabelText('Difficulty');
    const motdInput = screen.getByLabelText('Message of the Day');

    await user.selectOptions(gameModeSelect, 'survival');
    await user.selectOptions(difficultySelect, 'normal');
    await user.type(motdInput, 'Welcome to Test Server!');

    const nextButton2 = screen.getByText('Next');
    await user.click(nextButton2);

    const createButton = screen.getByText('Create Server');
    await user.click(createButton);

    const confirmButton = screen.getByText('Create Server');
    await user.click(confirmButton);

    await waitFor(() => {
      expect(screen.getByText('Server created successfully!')).toBeInTheDocument();
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('handles server creation error', async () => {
    setupApiMocks.serverCreateError();
    const user = userEvent.setup();
    render(<CreateServerForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    // Fill all steps and create server
    const serverNameInput = screen.getByLabelText('Server Name');
    const versionSelect = screen.getByLabelText('Minecraft Version');
    const memoryInput = screen.getByLabelText('Memory (MB)');
    const portInput = screen.getByLabelText('Port');

    await user.type(serverNameInput, 'Test Server');
    await user.selectOptions(versionSelect, '1.21.8');
    await user.type(memoryInput, '1024');
    await user.type(portInput, '25565');

    const nextButton = screen.getByText('Next');
    await user.click(nextButton);

    // Fill game settings
    const gameModeSelect = screen.getByLabelText('Game Mode');
    const difficultySelect = screen.getByLabelText('Difficulty');
    const motdInput = screen.getByLabelText('Message of the Day');

    await user.selectOptions(gameModeSelect, 'survival');
    await user.selectOptions(difficultySelect, 'normal');
    await user.type(motdInput, 'Welcome to Test Server!');

    const nextButton2 = screen.getByText('Next');
    await user.click(nextButton2);

    const createButton = screen.getByText('Create Server');
    await user.click(createButton);

    const confirmButton = screen.getByText('Create Server');
    await user.click(confirmButton);

    await waitFor(() => {
      expect(screen.getByText('Failed to create server')).toBeInTheDocument();
    });
  });

  it('shows loading state during server creation', async () => {
    const user = userEvent.setup();
    render(<CreateServerForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    // Fill all steps and create server
    const serverNameInput = screen.getByLabelText('Server Name');
    const versionSelect = screen.getByLabelText('Minecraft Version');
    const memoryInput = screen.getByLabelText('Memory (MB)');
    const portInput = screen.getByLabelText('Port');

    await user.type(serverNameInput, 'Test Server');
    await user.selectOptions(versionSelect, '1.21.8');
    await user.type(memoryInput, '1024');
    await user.type(portInput, '25565');

    const nextButton = screen.getByText('Next');
    await user.click(nextButton);

    // Fill game settings
    const gameModeSelect = screen.getByLabelText('Game Mode');
    const difficultySelect = screen.getByLabelText('Difficulty');
    const motdInput = screen.getByLabelText('Message of the Day');

    await user.selectOptions(gameModeSelect, 'survival');
    await user.selectOptions(difficultySelect, 'normal');
    await user.type(motdInput, 'Welcome to Test Server!');

    const nextButton2 = screen.getByText('Next');
    await user.click(nextButton2);

    const createButton = screen.getByText('Create Server');
    await user.click(createButton);

    const confirmButton = screen.getByText('Create Server');
    await user.click(confirmButton);

    expect(screen.getByText('Creating server...')).toBeInTheDocument();
    expect(confirmButton).toBeDisabled();
  });

  it('calls onCancel when cancel button is clicked', () => {
    render(<CreateServerForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('validates server name uniqueness', async () => {
    setupApiMocks.serversList([{ id: 1, server_name: 'Existing Server' }]);
    const user = userEvent.setup();
    render(<CreateServerForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    const serverNameInput = screen.getByLabelText('Server Name');
    await user.type(serverNameInput, 'Existing Server');

    const nextButton = screen.getByText('Next');
    await user.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText('A server with this name already exists')).toBeInTheDocument();
    });
  });

  it('validates port availability', async () => {
    setupApiMocks.serversList([{ id: 1, port: 25565 }]);
    const user = userEvent.setup();
    render(<CreateServerForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    const portInput = screen.getByLabelText('Port');
    await user.type(portInput, '25565');

    const nextButton = screen.getByText('Next');
    await user.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText('Port 25565 is already in use')).toBeInTheDocument();
    });
  });

  it('shows help text for advanced settings', async () => {
    const user = userEvent.setup();
    render(<CreateServerForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    // Navigate to advanced settings step
    const serverNameInput = screen.getByLabelText('Server Name');
    const versionSelect = screen.getByLabelText('Minecraft Version');
    const memoryInput = screen.getByLabelText('Memory (MB)');
    const portInput = screen.getByLabelText('Port');

    await user.type(serverNameInput, 'Test Server');
    await user.selectOptions(versionSelect, '1.21.8');
    await user.type(memoryInput, '1024');
    await user.type(portInput, '25565');

    const nextButton = screen.getByText('Next');
    await user.click(nextButton);

    // Fill game settings
    const gameModeSelect = screen.getByLabelText('Game Mode');
    const difficultySelect = screen.getByLabelText('Difficulty');
    const motdInput = screen.getByLabelText('Message of the Day');

    await user.selectOptions(gameModeSelect, 'survival');
    await user.selectOptions(difficultySelect, 'normal');
    await user.type(motdInput, 'Welcome to Test Server!');

    const nextButton2 = screen.getByText('Next');
    await user.click(nextButton2);

    expect(screen.getByText('These settings can be changed later in the server configuration')).toBeInTheDocument();
  });
});