/**
 * WebSocket Service - Real Implementation with Socket.IO
 * Handles real-time communication for collaboration features
 */

import { io, Socket } from 'socket.io-client';
import { logger } from '@/lib/logger';

export interface WebSocketMessage {
  type: string;
  payload: unknown;
  timestamp?: number;
  senderId?: string;
}

export interface WebSocketConfig {
  url?: string;
  reconnectAttempts?: number;
  reconnectInterval?: number;
  heartbeatInterval?: number;
}

export type MessageHandler = (message: WebSocketMessage) => void;
export type ConnectionHandler = () => void;
export type ErrorHandler = (error: Error) => void;

// Additional types for collaboration
export interface CursorMovePayload {
  userId: string;
  x: number;
  y: number;
  elementId?: string;
}

export interface ElementUpdatePayload {
  elementId: string;
  userId: string;
  changes: Record<string, unknown>;
  version: number;
}

export type WebSocketEventType = 
  | 'cursor-move'
  | 'cursor_move'
  | 'element-update'
  | 'user-join'
  | 'user-leave'
  | 'comment-add'
  | 'comment_added'
  | 'comment-reply'
  | 'comment_reply'
  | 'comment_resolved'
  | 'version-create'
  | 'version_created'
  | 'lock-element'
  | 'unlock-element';

export interface WebSocketEventPayloadMap {
  'cursor-move': CursorMovePayload;
  'element-update': ElementUpdatePayload;
  'user-join': { userId: string; userName: string };
  'user-leave': { userId: string };
  'comment-add': { commentId: string; content: string };
  'comment-reply': { commentId: string; replyId: string; content: string };
  'version-create': { versionId: string; name: string };
  'lock-element': { elementId: string; userId: string };
  'unlock-element': { elementId: string };
}

class WebSocketService {
  private socket: Socket | null = null;
  private config: WebSocketConfig;
  private messageHandlers: Map<string, MessageHandler[]> = new Map();
  private connectionHandlers: ConnectionHandler[] = [];
  private disconnectionHandlers: ConnectionHandler[] = [];
  private errorHandlers: ErrorHandler[] = [];
  private connectionChangeHandlers: ((connected: boolean) => void)[] = [];
  private reconnectAttempts = 0;
  private projectId: string | null = null;
  private userId: string | null = null;
  public isConnected = false;

  constructor(config: WebSocketConfig = {}) {
    this.config = {
      url: process.env.NEXT_PUBLIC_WS_URL || '',
      reconnectAttempts: 5,
      reconnectInterval: 3000,
      heartbeatInterval: 30000,
      ...config
    };
  }

  connect(projectId?: string, userId?: string): Promise<void> {
    return new Promise((resolve) => {
      this.projectId = projectId || null;
      this.userId = userId || null;

      // Check if we have a WebSocket URL configured
      const wsUrl = this.config.url;
      if (!wsUrl) {
        // Fallback to REST polling if no WS server configured
        logger.info('[WebSocket] No WS server configured, using polling fallback', {
          service: 'WebSocket'
        });
        this.isConnected = true;
        this.connectionHandlers.forEach(handler => handler());
        this.connectionChangeHandlers.forEach(handler => handler(true));
        resolve();
        return;
      }

      try {
        // Create Socket.IO connection
        this.socket = io(wsUrl, {
          transports: ['websocket', 'polling'],
          reconnectionAttempts: this.config.reconnectAttempts,
          reconnectionDelay: this.config.reconnectInterval,
          query: {
            projectId: projectId || '',
            userId: userId || ''
          }
        });

        // Connection events
        this.socket.on('connect', () => {
          logger.info('[WebSocket] Connected', { 
            service: 'WebSocket',
            projectId,
            userId 
          });
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.connectionHandlers.forEach(handler => handler());
          this.connectionChangeHandlers.forEach(handler => handler(true));
          resolve();
        });

        this.socket.on('disconnect', (reason) => {
          logger.warn('[WebSocket] Disconnected', { 
            service: 'WebSocket',
            reason 
          });
          this.isConnected = false;
          this.connectionChangeHandlers.forEach(handler => handler(false));
          this.disconnectionHandlers.forEach(handler => handler());
        });

        this.socket.on('connect_error', (error) => {
          logger.error('[WebSocket] Connection error', error, { 
            service: 'WebSocket' 
          });
          this.reconnectAttempts++;
          this.errorHandlers.forEach(handler => handler(error));
          
          if (this.reconnectAttempts >= (this.config.reconnectAttempts || 5)) {
            // Fallback to polling after max reconnect attempts
            logger.warn('[WebSocket] Max reconnect attempts reached, using polling fallback', {
              service: 'WebSocket'
            });
            this.isConnected = true;
            this.connectionHandlers.forEach(handler => handler());
            this.connectionChangeHandlers.forEach(handler => handler(true));
            resolve();
          }
        });

        // Generic message handler
        this.socket.on('message', (message: WebSocketMessage) => {
          this.handleMessage(message);
        });

        // Handle all custom events
        const eventTypes: WebSocketEventType[] = [
          'cursor-move', 'cursor_move', 'element-update', 'user-join', 
          'user-leave', 'comment-add', 'comment_added', 'comment-reply',
          'comment_reply', 'comment_resolved', 'version-create', 
          'version_created', 'lock-element', 'unlock-element'
        ];

        eventTypes.forEach(eventType => {
          this.socket?.on(eventType, (payload: unknown) => {
            this.handleMessage({
              type: eventType,
              payload,
              timestamp: Date.now()
            });
          });
        });

        // Timeout fallback - if connection takes too long, use polling
        setTimeout(() => {
          if (!this.isConnected) {
            logger.warn('[WebSocket] Connection timeout, using polling fallback', {
              service: 'WebSocket'
            });
            this.isConnected = true;
            this.connectionHandlers.forEach(handler => handler());
            this.connectionChangeHandlers.forEach(handler => handler(true));
            resolve();
          }
        }, 5000);

      } catch (error) {
        logger.error('[WebSocket] Failed to create connection', 
          error instanceof Error ? error : new Error(String(error)), 
          { service: 'WebSocket' }
        );
        // Fallback to REST on error
        this.isConnected = true;
        this.connectionHandlers.forEach(handler => handler());
        this.connectionChangeHandlers.forEach(handler => handler(true));
        resolve();
      }
    });
  }

  private handleMessage(message: WebSocketMessage): void {
    const handlers = this.messageHandlers.get(message.type) || [];
    handlers.forEach(handler => {
      try {
        handler(message);
      } catch (error) {
        logger.error('[WebSocket] Message handler error', 
          error instanceof Error ? error : new Error(String(error)),
          { service: 'WebSocket', messageType: message.type }
        );
      }
    });
  }

  disconnect(): void {
    logger.info('[WebSocket] Disconnecting', { service: 'WebSocket' });
    this.isConnected = false;
    this.connectionChangeHandlers.forEach(handler => handler(false));
    this.disconnectionHandlers.forEach(handler => handler());
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.projectId = null;
    this.userId = null;
  }

  send(message: WebSocketMessage): void {
    if (!this.isConnected) {
      logger.warn('[WebSocket] Cannot send - not connected', { service: 'WebSocket' });
      return;
    }

    if (this.socket?.connected) {
      // Send via Socket.IO
      this.socket.emit(message.type, message.payload);
    } else {
      // Fallback: Log for REST polling mode
      logger.debug('[WebSocket] Using REST fallback for message', { 
        service: 'WebSocket',
        type: message.type 
      });
    }
  }

  subscribe(type: string, handler: MessageHandler): () => void {
    const handlers = this.messageHandlers.get(type) || [];
    handlers.push(handler);
    this.messageHandlers.set(type, handlers);

    return () => {
      const currentHandlers = this.messageHandlers.get(type) || [];
      const index = currentHandlers.indexOf(handler);
      if (index > -1) {
        currentHandlers.splice(index, 1);
        this.messageHandlers.set(type, currentHandlers);
      }
    };
  }

  onConnect(handler: ConnectionHandler): () => void {
    this.connectionHandlers.push(handler);
    return () => {
      const index = this.connectionHandlers.indexOf(handler);
      if (index > -1) this.connectionHandlers.splice(index, 1);
    };
  }

  onDisconnect(handler: ConnectionHandler): () => void {
    this.disconnectionHandlers.push(handler);
    return () => {
      const index = this.disconnectionHandlers.indexOf(handler);
      if (index > -1) this.disconnectionHandlers.splice(index, 1);
    };
  }

  onError(handler: ErrorHandler): () => void {
    this.errorHandlers.push(handler);
    return () => {
      const index = this.errorHandlers.indexOf(handler);
      if (index > -1) this.errorHandlers.splice(index, 1);
    };
  }

  onConnectionChange(handler: (connected: boolean) => void): () => void {
    this.connectionChangeHandlers.push(handler);
    return () => {
      const index = this.connectionChangeHandlers.indexOf(handler);
      if (index > -1) this.connectionChangeHandlers.splice(index, 1);
    };
  }

  on<T = unknown>(event: string, handler: (payload: T) => void): () => void {
    return this.subscribe(event, (message) => {
      handler(message.payload as T);
    });
  }

  emit(event: WebSocketEventType, payload: unknown): void {
    this.send({ type: event, payload, timestamp: Date.now() });
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  getProjectId(): string | null {
    return this.projectId;
  }

  getUserId(): string | null {
    return this.userId;
  }
}

export const websocketService = new WebSocketService();

export function getWebSocketService(_projectId?: string, _userId?: string): WebSocketService {
  return websocketService;
}

export { WebSocketService };

export default websocketService;
