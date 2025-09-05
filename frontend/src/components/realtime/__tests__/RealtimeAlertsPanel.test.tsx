import React from 'react';
import { render, screen, waitFor, userEvent, vi } from '../../../test';
import { setupWebSocketMocks } from '../../../test';
import RealtimeAlertsPanel from '../RealtimeAlertsPanel';

describe('RealtimeAlertsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupWebSocketMocks.connectSuccess();
  });

  it('renders alerts panel correctly', () => {
    render(<RealtimeAlertsPanel />);
    expect(screen.getByText('Real-time Alerts')).toBeInTheDocument();
  });

  it('shows empty state when no alerts', () => {
    render(<RealtimeAlertsPanel />);
    expect(screen.getByText('No alerts')).toBeInTheDocument();
  });

  it('displays incoming alerts', async () => {
    render(<RealtimeAlertsPanel />);

    setupWebSocketMocks.simulateAlert({
      id: 1,
      type: 'warning',
      message: 'Server memory usage is high',
      timestamp: Date.now(),
    });

    await waitFor(() => {
      expect(screen.getByText('Server memory usage is high')).toBeInTheDocument();
    });
  });

  it('handles different alert types', async () => {
    render(<RealtimeAlertsPanel />);

    setupWebSocketMocks.simulateAlert({
      id: 1,
      type: 'error',
      message: 'Server crashed',
      timestamp: Date.now(),
    });

    await waitFor(() => {
      expect(screen.getByText('Server crashed')).toBeInTheDocument();
    });
  });

  it('dismisses alerts when dismiss button is clicked', async () => {
    const user = userEvent.setup();
    render(<RealtimeAlertsPanel />);

    setupWebSocketMocks.simulateAlert({
      id: 1,
      type: 'info',
      message: 'Test alert',
      timestamp: Date.now(),
    });

    await waitFor(() => {
      expect(screen.getByText('Test alert')).toBeInTheDocument();
    });

    const dismissButton = screen.getByLabelText('Dismiss alert');
    await user.click(dismissButton);

    await waitFor(() => {
      expect(screen.queryByText('Test alert')).not.toBeInTheDocument();
    });
  });

  it('auto-dismisses alerts after timeout', async () => {
    render(<RealtimeAlertsPanel autoDismiss={true} dismissTimeout={1000} />);

    setupWebSocketMocks.simulateAlert({
      id: 1,
      type: 'info',
      message: 'Auto-dismiss alert',
      timestamp: Date.now(),
    });

    await waitFor(() => {
      expect(screen.getByText('Auto-dismiss alert')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.queryByText('Auto-dismiss alert')).not.toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('shows alert timestamps', async () => {
    render(<RealtimeAlertsPanel />);

    setupWebSocketMocks.simulateAlert({
      id: 1,
      type: 'info',
      message: 'Timestamped alert',
      timestamp: Date.now(),
    });

    await waitFor(() => {
      expect(screen.getByText(/just now/)).toBeInTheDocument();
    });
  });

  it('handles multiple alerts', async () => {
    render(<RealtimeAlertsPanel />);

    setupWebSocketMocks.simulateAlert({
      id: 1,
      type: 'warning',
      message: 'Alert 1',
      timestamp: Date.now(),
    });

    setupWebSocketMocks.simulateAlert({
      id: 2,
      type: 'error',
      message: 'Alert 2',
      timestamp: Date.now(),
    });

    await waitFor(() => {
      expect(screen.getByText('Alert 1')).toBeInTheDocument();
      expect(screen.getByText('Alert 2')).toBeInTheDocument();
    });
  });

  it('limits number of displayed alerts', async () => {
    render(<RealtimeAlertsPanel maxAlerts={2} />);

    // Add 3 alerts
    for (let i = 1; i <= 3; i++) {
      setupWebSocketMocks.simulateAlert({
        id: i,
        type: 'info',
        message: `Alert ${i}`,
        timestamp: Date.now(),
      });
    }

    await waitFor(() => {
      expect(screen.getByText('Alert 2')).toBeInTheDocument();
      expect(screen.getByText('Alert 3')).toBeInTheDocument();
      expect(screen.queryByText('Alert 1')).not.toBeInTheDocument();
    });
  });

  it('clears all alerts when clear all button is clicked', async () => {
    const user = userEvent.setup();
    render(<RealtimeAlertsPanel />);

    setupWebSocketMocks.simulateAlert({
      id: 1,
      type: 'info',
      message: 'Alert 1',
      timestamp: Date.now(),
    });

    setupWebSocketMocks.simulateAlert({
      id: 2,
      type: 'warning',
      message: 'Alert 2',
      timestamp: Date.now(),
    });

    await waitFor(() => {
      expect(screen.getByText('Alert 1')).toBeInTheDocument();
      expect(screen.getByText('Alert 2')).toBeInTheDocument();
    });

    const clearAllButton = screen.getByText('Clear All');
    await user.click(clearAllButton);

    await waitFor(() => {
      expect(screen.queryByText('Alert 1')).not.toBeInTheDocument();
      expect(screen.queryByText('Alert 2')).not.toBeInTheDocument();
    });
  });

  it('filters alerts by type', async () => {
    const user = userEvent.setup();
    render(<RealtimeAlertsPanel />);

    setupWebSocketMocks.simulateAlert({
      id: 1,
      type: 'error',
      message: 'Error alert',
      timestamp: Date.now(),
    });

    setupWebSocketMocks.simulateAlert({
      id: 2,
      type: 'warning',
      message: 'Warning alert',
      timestamp: Date.now(),
    });

    await waitFor(() => {
      expect(screen.getByText('Error alert')).toBeInTheDocument();
      expect(screen.getByText('Warning alert')).toBeInTheDocument();
    });

    const filterSelect = screen.getByLabelText('Filter alerts');
    await user.selectOptions(filterSelect, 'error');

    await waitFor(() => {
      expect(screen.getByText('Error alert')).toBeInTheDocument();
      expect(screen.queryByText('Warning alert')).not.toBeInTheDocument();
    });
  });

  it('sorts alerts by timestamp', async () => {
    render(<RealtimeAlertsPanel />);

    setupWebSocketMocks.simulateAlert({
      id: 1,
      type: 'info',
      message: 'Older alert',
      timestamp: Date.now() - 1000,
    });

    setupWebSocketMocks.simulateAlert({
      id: 2,
      type: 'info',
      message: 'Newer alert',
      timestamp: Date.now(),
    });

    await waitFor(() => {
      const alerts = screen.getAllByText(/alert/);
      expect(alerts[0]).toHaveTextContent('Newer alert');
      expect(alerts[1]).toHaveTextContent('Older alert');
    });
  });

  it('handles alert actions', async () => {
    const user = userEvent.setup();
    render(<RealtimeAlertsPanel />);

    setupWebSocketMocks.simulateAlert({
      id: 1,
      type: 'warning',
      message: 'Actionable alert',
      timestamp: Date.now(),
      actions: [
        { label: 'View Details', action: 'view' },
        { label: 'Dismiss', action: 'dismiss' },
      ],
    });

    await waitFor(() => {
      expect(screen.getByText('View Details')).toBeInTheDocument();
      expect(screen.getByText('Dismiss')).toBeInTheDocument();
    });

    const viewDetailsButton = screen.getByText('View Details');
    await user.click(viewDetailsButton);

    // Should handle action
    expect(setupApiMocks.handleAlertAction).toHaveBeenCalledWith(1, 'view');
  });

  it('shows alert count badge', async () => {
    render(<RealtimeAlertsPanel />);

    setupWebSocketMocks.simulateAlert({
      id: 1,
      type: 'info',
      message: 'Alert 1',
      timestamp: Date.now(),
    });

    setupWebSocketMocks.simulateAlert({
      id: 2,
      type: 'warning',
      message: 'Alert 2',
      timestamp: Date.now(),
    });

    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  it('handles WebSocket connection errors', async () => {
    setupWebSocketMocks.connectError();
    render(<RealtimeAlertsPanel />);

    await waitFor(() => {
      expect(screen.getByText('Connection failed')).toBeInTheDocument();
    });
  });

  it('handles WebSocket reconnection', async () => {
    setupWebSocketMocks.connectError();
    render(<RealtimeAlertsPanel />);

    await waitFor(() => {
      expect(screen.getByText('Reconnecting...')).toBeInTheDocument();
    });

    setupWebSocketMocks.connectSuccess();

    await waitFor(() => {
      expect(screen.getByText('Connected')).toBeInTheDocument();
    });
  });

  it('shows loading state', () => {
    render(<RealtimeAlertsPanel loading />);
    expect(screen.getByText('Loading alerts...')).toBeInTheDocument();
  });

  it('handles custom className', () => {
    render(<RealtimeAlertsPanel className="custom-class" />);
    expect(screen.getByText('Real-time Alerts')).toHaveClass('custom-class');
  });

  it('handles custom styles', () => {
    render(<RealtimeAlertsPanel style={{ backgroundColor: 'red' }} />);
    expect(screen.getByText('Real-time Alerts')).toHaveStyle('background-color: red');
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<RealtimeAlertsPanel ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});
