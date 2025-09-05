import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import RealtimeStatusIndicator from '../RealtimeStatusIndicator';
import { useWebSocket } from '../../../contexts/WebSocketContext';

// Mock the WebSocket context
vi.mock('../../../contexts/WebSocketContext');
const mockUseWebSocket = vi.mocked(useWebSocket);

// Mock WebSocket context values
const mockWebSocketContext = {
  isConnected: true,
  isConnecting: false,
  reconnectAttempts: 0,
  serverStatusUpdates: new Map(),
  systemStats: null,
  systemAlerts: [],
  userUpdates: [],
  connect: vi.fn(),
  disconnect: vi.fn(),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
  clearAlerts: vi.fn(),
  clearUserUpdates: vi.fn(),
  onServerStatusUpdate: vi.fn(() => vi.fn()),
  onSystemStatsUpdate: vi.fn(() => vi.fn()),
  onUserUpdate: vi.fn(() => vi.fn()),
  onSystemAlert: vi.fn(() => vi.fn()),
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('RealtimeStatusIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseWebSocket.mockReturnValue(mockWebSocketContext);
  });

  it('renders connected status correctly', () => {
    render(<RealtimeStatusIndicator />, { wrapper: createWrapper() });
    
    expect(screen.getByText('Connected')).toBeInTheDocument();
    expect(screen.getByText('Real-time updates active')).toBeInTheDocument();
  });

  it('renders connecting status correctly', () => {
    mockUseWebSocket.mockReturnValue({
      ...mockWebSocketContext,
      isConnected: false,
      isConnecting: true,
    });

    render(<RealtimeStatusIndicator />, { wrapper: createWrapper() });
    
    expect(screen.getByText('Connecting...')).toBeInTheDocument();
  });

  it('renders disconnected status correctly', () => {
    mockUseWebSocket.mockReturnValue({
      ...mockWebSocketContext,
      isConnected: false,
      isConnecting: false,
    });

    render(<RealtimeStatusIndicator />, { wrapper: createWrapper() });
    
    expect(screen.getByText('Disconnected')).toBeInTheDocument();
  });

  it('renders reconnecting status with attempt count', () => {
    mockUseWebSocket.mockReturnValue({
      ...mockWebSocketContext,
      isConnected: false,
      isConnecting: false,
      reconnectAttempts: 3,
    });

    render(<RealtimeStatusIndicator />, { wrapper: createWrapper() });
    
    expect(screen.getByText('Reconnecting (3)')).toBeInTheDocument();
  });

  it('shows tooltip on hover', async () => {
    render(<RealtimeStatusIndicator />, { wrapper: createWrapper() });
    
    const button = screen.getByRole('button');
    fireEvent.mouseEnter(button);
    
    await waitFor(() => {
      expect(screen.getByText(/Since/)).toBeInTheDocument();
    });
  });

  it('handles connect button click when disconnected', () => {
    mockUseWebSocket.mockReturnValue({
      ...mockWebSocketContext,
      isConnected: false,
      isConnecting: false,
    });

    render(<RealtimeStatusIndicator />, { wrapper: createWrapper() });
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(mockWebSocketContext.connect).toHaveBeenCalled();
  });

  it('handles disconnect button click when connected', () => {
    render(<RealtimeStatusIndicator />, { wrapper: createWrapper() });
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(mockWebSocketContext.disconnect).toHaveBeenCalled();
  });

  it('renders detailed view when showDetails is true', () => {
    render(<RealtimeStatusIndicator showDetails={true} />, { wrapper: createWrapper() });
    
    expect(screen.getByText('Real-time Connection')).toBeInTheDocument();
    expect(screen.getByText('Status:')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('shows reconnect button in detailed view when disconnected', () => {
    mockUseWebSocket.mockReturnValue({
      ...mockWebSocketContext,
      isConnected: false,
      isConnecting: false,
    });

    render(<RealtimeStatusIndicator showDetails={true} />, { wrapper: createWrapper() });
    
    expect(screen.getByText('Reconnect')).toBeInTheDocument();
  });

  it('shows disconnect button in detailed view when connected', () => {
    render(<RealtimeStatusIndicator showDetails={true} />, { wrapper: createWrapper() });
    
    expect(screen.getByText('Disconnect')).toBeInTheDocument();
  });

  it('displays last connected time in detailed view', () => {
    const lastConnected = new Date('2024-01-01T12:00:00Z');
    mockUseWebSocket.mockReturnValue({
      ...mockWebSocketContext,
      lastConnected,
    });

    render(<RealtimeStatusIndicator showDetails={true} />, { wrapper: createWrapper() });
    
    expect(screen.getByText(/Last Connected:/)).toBeInTheDocument();
  });

  it('displays last disconnected time in detailed view', () => {
    const lastDisconnected = new Date('2024-01-01T11:00:00Z');
    mockUseWebSocket.mockReturnValue({
      ...mockWebSocketContext,
      lastDisconnected,
    });

    render(<RealtimeStatusIndicator showDetails={true} />, { wrapper: createWrapper() });
    
    expect(screen.getByText(/Last Disconnected:/)).toBeInTheDocument();
  });

  it('displays reconnect attempts in detailed view', () => {
    mockUseWebSocket.mockReturnValue({
      ...mockWebSocketContext,
      isConnected: false,
      reconnectAttempts: 5,
    });

    render(<RealtimeStatusIndicator showDetails={true} />, { wrapper: createWrapper() });
    
    expect(screen.getByText('Reconnect Attempts:')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <RealtimeStatusIndicator className="custom-class" />, 
      { wrapper: createWrapper() }
    );
    
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('shows correct status colors', () => {
    const { rerender } = render(<RealtimeStatusIndicator />, { wrapper: createWrapper() });
    
    // Connected - should have green color
    expect(screen.getByText('Connected')).toBeInTheDocument();
    
    // Connecting - should have orange color
    mockUseWebSocket.mockReturnValue({
      ...mockWebSocketContext,
      isConnected: false,
      isConnecting: true,
    });
    
    rerender(<RealtimeStatusIndicator />);
    expect(screen.getByText('Connecting...')).toBeInTheDocument();
    
    // Disconnected with reconnect attempts - should have red color
    mockUseWebSocket.mockReturnValue({
      ...mockWebSocketContext,
      isConnected: false,
      isConnecting: false,
      reconnectAttempts: 1,
    });
    
    rerender(<RealtimeStatusIndicator />);
    expect(screen.getByText('Reconnecting (1)')).toBeInTheDocument();
  });
});
