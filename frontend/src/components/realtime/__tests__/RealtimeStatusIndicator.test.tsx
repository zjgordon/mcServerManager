import React from 'react';
import { render, screen, waitFor, vi } from '../../../test';
import { setupWebSocketMocks } from '../../../test';
import RealtimeStatusIndicator from '../RealtimeStatusIndicator';

describe('RealtimeStatusIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders status indicator correctly', () => {
    render(<RealtimeStatusIndicator />);
    expect(screen.getByLabelText('Real-time connection status')).toBeInTheDocument();
  });

  it('shows connected state', async () => {
    setupWebSocketMocks.connectSuccess();
    render(<RealtimeStatusIndicator />);

    await waitFor(() => {
      expect(screen.getByText('Connected')).toBeInTheDocument();
    });
  });

  it('shows disconnected state', async () => {
    setupWebSocketMocks.connectError();
    render(<RealtimeStatusIndicator />);

    await waitFor(() => {
      expect(screen.getByText('Disconnected')).toBeInTheDocument();
    });
  });

  it('shows connecting state', () => {
    render(<RealtimeStatusIndicator />);
    expect(screen.getByText('Connecting...')).toBeInTheDocument();
  });

  it('handles connection status changes', async () => {
    setupWebSocketMocks.connectSuccess();
    render(<RealtimeStatusIndicator />);

    await waitFor(() => {
      expect(screen.getByText('Connected')).toBeInTheDocument();
    });

    setupWebSocketMocks.simulateDisconnect();
    
    await waitFor(() => {
      expect(screen.getByText('Disconnected')).toBeInTheDocument();
    });
  });

  it('shows connection error', async () => {
    setupWebSocketMocks.connectError();
    render(<RealtimeStatusIndicator />);

    await waitFor(() => {
      expect(screen.getByText('Connection failed')).toBeInTheDocument();
    });
  });

  it('handles reconnection attempts', async () => {
    setupWebSocketMocks.connectError();
    render(<RealtimeStatusIndicator />);

    await waitFor(() => {
      expect(screen.getByText('Reconnecting...')).toBeInTheDocument();
    });
  });

  it('shows connection quality indicator', async () => {
    setupWebSocketMocks.connectSuccess();
    render(<RealtimeStatusIndicator />);

    await waitFor(() => {
      expect(screen.getByLabelText('Connection quality')).toBeInTheDocument();
    });
  });

  it('handles custom status messages', () => {
    render(<RealtimeStatusIndicator status="Custom status" />);
    expect(screen.getByText('Custom status')).toBeInTheDocument();
  });

  it('shows last activity timestamp', async () => {
    setupWebSocketMocks.connectSuccess();
    render(<RealtimeStatusIndicator />);

    await waitFor(() => {
      expect(screen.getByText(/Last activity/)).toBeInTheDocument();
    });
  });

  it('handles click events', async () => {
    const handleClick = vi.fn();
    render(<RealtimeStatusIndicator onClick={handleClick} />);

    const indicator = screen.getByLabelText('Real-time connection status');
    fireEvent.click(indicator);

    expect(handleClick).toHaveBeenCalled();
  });

  it('shows tooltip on hover', async () => {
    const user = userEvent.setup();
    render(<RealtimeStatusIndicator />);

    const indicator = screen.getByLabelText('Real-time connection status');
    await user.hover(indicator);

    await waitFor(() => {
      expect(screen.getByText('Real-time connection status')).toBeInTheDocument();
    });
  });

  it('handles different status types', () => {
    const { rerender } = render(<RealtimeStatusIndicator type="success" />);
    expect(screen.getByLabelText('Real-time connection status')).toHaveClass('status-success');

    rerender(<RealtimeStatusIndicator type="warning" />);
    expect(screen.getByLabelText('Real-time connection status')).toHaveClass('status-warning');

    rerender(<RealtimeStatusIndicator type="error" />);
    expect(screen.getByLabelText('Real-time connection status')).toHaveClass('status-error');
  });

  it('shows connection statistics', async () => {
    setupWebSocketMocks.connectSuccess();
    render(<RealtimeStatusIndicator showStats />);

    await waitFor(() => {
      expect(screen.getByText('Messages sent')).toBeInTheDocument();
      expect(screen.getByText('Messages received')).toBeInTheDocument();
    });
  });

  it('handles custom className', () => {
    render(<RealtimeStatusIndicator className="custom-class" />);
    expect(screen.getByLabelText('Real-time connection status')).toHaveClass('custom-class');
  });

  it('handles custom styles', () => {
    render(<RealtimeStatusIndicator style={{ backgroundColor: 'red' }} />);
    expect(screen.getByLabelText('Real-time connection status')).toHaveStyle('background-color: red');
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<RealtimeStatusIndicator ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});