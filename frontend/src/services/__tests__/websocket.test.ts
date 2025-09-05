import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import createWebSocketService, { WebSocketService } from '../websocket';

// Mock WebSocket
class MockWebSocket {
  public onopen: ((event: Event) => void) | null = null;
  public onclose: ((event: CloseEvent) => void) | null = null;
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;
  public readyState: number = WebSocket.CONNECTING;
  public url: string;

  constructor(url: string) {
    this.url = url;
    // Simulate connection after a short delay
    setTimeout(() => {
      this.readyState = WebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 10);
  }

  send(data: string) {
    // Mock send implementation
  }

  close(code?: number, reason?: string) {
    this.readyState = WebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close', { code, reason }));
    }
  }
}

// Replace global WebSocket with mock
(global as any).WebSocket = MockWebSocket;

describe('WebSocketService', () => {
  let wsService: WebSocketService;
  const mockConfig = {
    url: 'ws://localhost:5000/ws',
    reconnectInterval: 1000,
    maxReconnectAttempts: 3,
    heartbeatInterval: 5000,
  };

  beforeEach(() => {
    wsService = createWebSocketService(mockConfig);
    vi.clearAllMocks();
  });

  afterEach(() => {
    wsService.disconnect();
  });

  it('should create WebSocket service with correct configuration', () => {
    expect(wsService).toBeDefined();
    expect(wsService.connected).toBe(false);
    expect(wsService.connecting).toBe(false);
  });

  it('should connect successfully', async () => {
    const connectPromise = wsService.connect();
    
    // Wait for connection
    await new Promise(resolve => setTimeout(resolve, 20));
    
    await expect(connectPromise).resolves.toBeUndefined();
    expect(wsService.connected).toBe(true);
  });

  it('should handle connection events', async () => {
    const connectedSpy = vi.fn();
    const disconnectedSpy = vi.fn();
    const errorSpy = vi.fn();

    wsService.on('connected', connectedSpy);
    wsService.on('disconnected', disconnectedSpy);
    wsService.on('error', errorSpy);

    await wsService.connect();
    
    expect(connectedSpy).toHaveBeenCalled();
    expect(disconnectedSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('should send messages when connected', async () => {
    const sendSpy = vi.spyOn(MockWebSocket.prototype, 'send');
    
    await wsService.connect();
    
    const message = {
      type: 'test',
      data: { test: 'data' },
      timestamp: Date.now(),
    };
    
    wsService.send(message);
    
    expect(sendSpy).toHaveBeenCalledWith(JSON.stringify(message));
  });

  it('should queue messages when not connected', () => {
    const sendSpy = vi.spyOn(MockWebSocket.prototype, 'send');
    
    const message = {
      type: 'test',
      data: { test: 'data' },
      timestamp: Date.now(),
    };
    
    wsService.send(message);
    
    // Should not send immediately when not connected
    expect(sendSpy).not.toHaveBeenCalled();
  });

  it('should handle incoming messages', async () => {
    const messageSpy = vi.fn();
    const serverStatusSpy = vi.fn();
    
    wsService.on('message', messageSpy);
    wsService.on('serverStatusUpdate', serverStatusSpy);
    
    await wsService.connect();
    
    // Simulate incoming message
    const mockMessage = {
      type: 'server_status_update',
      data: {
        serverId: 1,
        status: 'Running',
        pid: 12345,
        memoryUsage: 512,
        cpuUsage: 15.5,
        uptime: 3600,
      },
      timestamp: Date.now(),
    };
    
    // Trigger message event
    const mockEvent = new MessageEvent('message', {
      data: JSON.stringify(mockMessage),
    });
    
    // Access the internal WebSocket instance and trigger onmessage
    const ws = (wsService as any).ws;
    if (ws && ws.onmessage) {
      ws.onmessage(mockEvent);
    }
    
    expect(serverStatusSpy).toHaveBeenCalledWith(mockMessage.data);
  });

  it('should handle subscription and unsubscription', async () => {
    const sendSpy = vi.spyOn(MockWebSocket.prototype, 'send');
    
    await wsService.connect();
    
    wsService.subscribe('test-channel');
    wsService.unsubscribe('test-channel');
    
    expect(sendSpy).toHaveBeenCalledWith(
      expect.stringContaining('"type":"subscribe"')
    );
    expect(sendSpy).toHaveBeenCalledWith(
      expect.stringContaining('"type":"unsubscribe"')
    );
  });

  it('should handle heartbeat', async () => {
    const sendSpy = vi.spyOn(MockWebSocket.prototype, 'send');
    
    await wsService.connect();
    
    // Wait for heartbeat
    await new Promise(resolve => setTimeout(resolve, 6000));
    
    expect(sendSpy).toHaveBeenCalledWith(
      expect.stringContaining('"type":"heartbeat"')
    );
  });

  it('should disconnect properly', async () => {
    const closeSpy = vi.spyOn(MockWebSocket.prototype, 'close');
    
    await wsService.connect();
    wsService.disconnect();
    
    expect(closeSpy).toHaveBeenCalledWith(1000, 'Client disconnect');
    expect(wsService.connected).toBe(false);
  });

  it('should handle connection errors', async () => {
    const errorSpy = vi.fn();
    wsService.on('error', errorSpy);
    
    // Mock WebSocket to throw error
    const originalWebSocket = global.WebSocket;
    global.WebSocket = vi.fn().mockImplementation(() => {
      throw new Error('Connection failed');
    });
    
    await expect(wsService.connect()).rejects.toThrow('Connection failed');
    
    // Restore original WebSocket
    global.WebSocket = originalWebSocket;
  });

  it('should handle reconnection attempts', async () => {
    const disconnectedSpy = vi.fn();
    wsService.on('disconnected', disconnectedSpy);
    
    await wsService.connect();
    
    // Simulate connection close
    const ws = (wsService as any).ws;
    if (ws && ws.onclose) {
      ws.onclose(new CloseEvent('close', { code: 1006, reason: 'Abnormal closure' }));
    }
    
    expect(disconnectedSpy).toHaveBeenCalled();
  });

  it('should process message queue on reconnection', async () => {
    const sendSpy = vi.spyOn(MockWebSocket.prototype, 'send');
    
    // Send message while disconnected
    const message = {
      type: 'test',
      data: { test: 'data' },
      timestamp: Date.now(),
    };
    wsService.send(message);
    
    // Connect and verify queued message is sent
    await wsService.connect();
    
    expect(sendSpy).toHaveBeenCalledWith(JSON.stringify(message));
  });
});
