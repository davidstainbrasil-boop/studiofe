/**
 * 🔄 Real-Time Collaboration Server
 * WebSocket server for multi-user project editing
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { logger } from '@lib/logger';
import { prisma } from '@lib/prisma';
import { verifyJWT } from '@lib/auth/jwt';

interface AuthenticatedSocket extends Socket {
  userId: string;
  userEmail: string;
  userName?: string;
  userAvatar?: string;
  projectId?: string;
  roomId?: string;
}

interface RoomData {
  projectId: string;
  users: Map<string, UserPresence>;
  documentState: DocumentState;
  lastActivity: Date;
}

interface UserPresence {
  userId: string;
  email: string;
  name?: string;
  avatar?: string;
  cursor?: CursorPosition;
  selection?: SelectionRange;
  isActive: boolean;
  joinedAt: Date;
  lastSeen: Date;
}

interface DocumentState {
  slides: any[];
  version: number;
  lastEditedBy: string;
  lastEditedAt: Date;
}

interface CursorPosition {
  slideId: string;
  elementId?: string;
  offset: number;
  line?: number;
  column?: number;
}

interface SelectionRange {
  slideId: string;
  start: CursorPosition;
  end: CursorPosition;
}

interface CollaborationEvent {
  type: 'operation' | 'cursor' | 'selection' | 'presence';
  userId: string;
  timestamp: Date;
  data: any;
}

class CollaborationServer {
  private io: SocketIOServer;
  private rooms: Map<string, RoomData> = new Map();
  private userSockets: Map<string, Set<string>> = new Map(); // userId -> socketIds
  
  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000
    });

    this.setupMiddleware();
    this.setupEventHandlers();
    this.startCleanupInterval();
    
    logger.info('Collaboration server initialized', { service: 'CollaborationServer' });
  }

  /**
   * Setup authentication middleware
   */
  private setupMiddleware() {
    this.io.use(async (socket: any, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        const payload = await verifyJWT(token);
        if (!payload) {
          return next(new Error('Invalid token'));
        }

        const user = await prisma.users.findUnique({
          where: { id: payload.sub },
          select: { id: true, email: true, name: true, avatarUrl: true }
        });

        if (!user) {
          return next(new Error('User not found'));
        }

        socket.userId = user.id;
        socket.userEmail = user.email;
        socket.userName = user.name ?? undefined;
        socket.userAvatar = user.avatarUrl ?? undefined;

        logger.info('User authenticated for collaboration', {
          userId: user.id,
          email: user.email,
          service: 'CollaborationServer'
        });

        next();
      } catch (error) {
        logger.error('Authentication failed for collaboration', error instanceof Error ? error : new Error(String(error)), {
          service: 'CollaborationServer'
        });
        next(new Error('Authentication failed'));
      }
    });
  }

  /**
   * Setup main event handlers
   */
  private setupEventHandlers() {
    (this.io as any).on('connection', (socket: AuthenticatedSocket) => {
      logger.info('User connected to collaboration server', {
        userId: socket.userId,
        socketId: socket.id,
        service: 'CollaborationServer'
      });

      // Track user sockets
      if (!this.userSockets.has(socket.userId)) {
        this.userSockets.set(socket.userId, new Set());
      }
      this.userSockets.get(socket.userId)!.add(socket.id);

      // Handle project joining
      socket.on('join-project', async (data: { projectId: string }) => {
        await this.handleJoinProject(socket, data.projectId);
      });

      // Handle document operations
      socket.on('operation', async (data: CollaborationEvent) => {
        await this.handleOperation(socket, data);
      });

      // Handle cursor movement
      socket.on('cursor-move', (data: CursorPosition) => {
        this.handleCursorMove(socket, data);
      });

      // Handle selection changes
      socket.on('selection-change', (data: SelectionRange) => {
        this.handleSelectionChange(socket, data);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });

      // Error handling
      socket.on('error', (error) => {
        logger.error('Socket error', error instanceof Error ? error : new Error(String(error)), {
          userId: socket.userId,
          socketId: socket.id,
          service: 'CollaborationServer'
        });
      });
    });
  }

  /**
   * Handle user joining a project room
   */
  private async handleJoinProject(socket: AuthenticatedSocket, projectId: string) {
    try {
      // Verify user has access to project
      const project = await prisma.projects.findFirst({
        where: {
          id: projectId,
          OR: [
            { userId: socket.userId },
            { 
              project_collaborators: {
                some: {
                  user_id: socket.userId,
                  accepted_at: { not: null }
                }
              }
            }
          ]
        }
      });

      if (!project) {
        socket.emit('error', { message: 'Access denied to project' });
        return;
      }

      // Leave previous room if any
      if (socket.roomId) {
        await this.leaveRoom(socket, socket.roomId);
      }

      // Join new room
      socket.roomId = projectId;
      socket.projectId = projectId;
      socket.join(`project:${projectId}`);

      // Get or create room data
      let room = this.rooms.get(projectId);
      if (!room) {
        room = await this.initializeRoom(projectId);
        this.rooms.set(projectId, room);
      }

      // Add user to room
      const userPresence: UserPresence = {
        userId: socket.userId,
        email: socket.userEmail,
        name: socket.userName,
        avatar: socket.userAvatar,
        isActive: true,
        joinedAt: new Date(),
        lastSeen: new Date()
      };

      room.users.set(socket.userId, userPresence);
      room.lastActivity = new Date();

      // Notify others in room
      socket.to(`project:${projectId}`).emit('user-joined', {
        user: userPresence,
        timestamp: new Date()
      });

      // Send current state to new user
      socket.emit('project-joined', {
        room: {
          users: Array.from(room.users.values()),
          documentState: room.documentState
        },
        timestamp: new Date()
      });

      logger.info('User joined project room', {
        userId: socket.userId,
        projectId,
        totalUsers: room.users.size,
        service: 'CollaborationServer'
      });

    } catch (error) {
      logger.error('Error handling join project', error instanceof Error ? error : new Error(String(error)), {
        userId: socket.userId,
        projectId,
        service: 'CollaborationServer'
      });
      
      socket.emit('error', { message: 'Failed to join project' });
    }
  }

  /**
   * Initialize room with project data
   */
  private async initializeRoom(projectId: string): Promise<RoomData> {
    const project = await prisma.projects.findUnique({
      where: { id: projectId },
      include: {
        slides: true
      }
    });

    return {
      projectId,
      users: new Map(),
      documentState: {
        slides: project?.slides || [],
        version: 1,
        lastEditedBy: '',
        lastEditedAt: new Date()
      },
      lastActivity: new Date()
    };
  }

  /**
   * Handle collaborative operations (edit, insert, delete)
   */
  private async handleOperation(socket: AuthenticatedSocket, event: CollaborationEvent) {
    if (!socket.roomId) return;

    try {
      const room = this.rooms.get(socket.roomId);
      if (!room) return;

      // Apply operation to document state
      const updatedState = await this.applyOperation(room.documentState, event.data);
      
      if (updatedState) {
        room.documentState = updatedState;
        room.documentState.version++;
        room.documentState.lastEditedBy = socket.userId;
        room.documentState.lastEditedAt = new Date();
        room.lastActivity = new Date();

        // Save to database (debounced)
        await this.saveProjectState(socket.roomId, room.documentState);

        // Broadcast to other users in room
        socket.to(`project:${socket.roomId}`).emit('operation', {
          ...event,
          timestamp: new Date()
        });
      }

    } catch (error) {
      logger.error('Error handling operation', error instanceof Error ? error : new Error(String(error)), {
        userId: socket.userId,
        projectId: socket.roomId,
        service: 'CollaborationServer'
      });
      
      socket.emit('error', { message: 'Operation failed' });
    }
  }

  /**
   * Apply operation to document state
   */
  private async applyOperation(state: DocumentState, operation: any): Promise<DocumentState | null> {
    // Implementation of operational transformation
    switch (operation.type) {
      case 'slide-update':
        return this.updateSlide(state, operation.slideId, operation.data);
      case 'slide-insert':
        return this.insertSlide(state, operation.index, operation.data);
      case 'slide-delete':
        return this.deleteSlide(state, operation.slideId);
      case 'slide-reorder':
        return this.reorderSlides(state, operation.slideIds);
      default:
        logger.warn('Unknown operation type', { type: operation.type, service: 'CollaborationServer' });
        return null;
    }
  }

  /**
   * Handle cursor movement
   */
  private handleCursorMove(socket: AuthenticatedSocket, cursor: CursorPosition) {
    if (!socket.roomId) return;

    const room = this.rooms.get(socket.roomId);
    if (!room) return;

    const user = room.users.get(socket.userId);
    if (user) {
      user.cursor = cursor;
      user.lastSeen = new Date();
      room.lastActivity = new Date();

      // Broadcast cursor position to other users
      socket.to(`project:${socket.roomId}`).emit('cursor-update', {
        userId: socket.userId,
        cursor,
        timestamp: new Date()
      });
    }
  }

  /**
   * Handle selection changes
   */
  private handleSelectionChange(socket: AuthenticatedSocket, selection: SelectionRange) {
    if (!socket.roomId) return;

    const room = this.rooms.get(socket.roomId);
    if (!room) return;

    const user = room.users.get(socket.userId);
    if (user) {
      user.selection = selection;
      user.lastSeen = new Date();
      room.lastActivity = new Date();

      // Broadcast selection to other users
      socket.to(`project:${socket.roomId}`).emit('selection-update', {
        userId: socket.userId,
        selection,
        timestamp: new Date()
      });
    }
  }

  /**
   * Handle user disconnection
   */
  private handleDisconnect(socket: AuthenticatedSocket) {
    logger.info('User disconnected from collaboration server', {
      userId: socket.userId,
      socketId: socket.id,
      service: 'CollaborationServer'
    });

    // Remove socket from user tracking
    const userSockets = this.userSockets.get(socket.userId);
    if (userSockets) {
      userSockets.delete(socket.id);
      if (userSockets.size === 0) {
        this.userSockets.delete(socket.userId);
      }
    }

    // Remove from room if user is fully disconnected
    if (!this.userSockets.has(socket.userId) && socket.roomId) {
      this.leaveRoom(socket, socket.roomId);
    }
  }

  /**
   * Remove user from room
   */
  private async leaveRoom(socket: AuthenticatedSocket, roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.users.delete(socket.userId);
    
    // Notify others
    socket.to(`project:${roomId}`).emit('user-left', {
      userId: socket.userId,
      timestamp: new Date()
    });

    // Clean up empty rooms
    if (room.users.size === 0) {
      this.rooms.delete(roomId);
      await this.saveProjectState(roomId, room.documentState);
    }

    socket.leave(`project:${roomId}`);
    socket.roomId = undefined;
    socket.projectId = undefined;
  }

  /**
   * Document operation methods
   */
  private updateSlide(state: DocumentState, slideId: string, data: any): DocumentState {
    return {
      ...state,
      slides: state.slides.map(slide => 
        slide.id === slideId ? { ...slide, ...data } : slide
      )
    };
  }

  private insertSlide(state: DocumentState, index: number, data: any): DocumentState {
    const newSlide = {
      id: `slide-${Date.now()}`,
      order: index,
      content: data.content || '',
      ...data
    };

    const slides = [...state.slides];
    slides.splice(index, 0, newSlide);

    return {
      ...state,
      slides: slides.map((slide, i) => ({ ...slide, order: i }))
    };
  }

  private deleteSlide(state: DocumentState, slideId: string): DocumentState {
    return {
      ...state,
      slides: state.slides.filter(slide => slide.id !== slideId)
        .map((slide, i) => ({ ...slide, order: i }))
    };
  }

  private reorderSlides(state: DocumentState, slideIds: string[]): DocumentState {
    const slideMap = new Map(state.slides.map(slide => [slide.id, slide]));
    const slides = slideIds.map(id => slideMap.get(id)).filter(Boolean) as any[];

    return {
      ...state,
      slides: slides.map((slide, i) => ({ ...slide, order: i }))
    };
  }

  /**
   * Save project state to database (debounced)
   */
  private async saveProjectState(projectId: string, state: DocumentState) {
    try {
      // Implementation would update database with current state
      // For now, just log
      logger.debug('Saving project state', {
        projectId,
        version: state.version,
        slidesCount: state.slides.length,
        service: 'CollaborationServer'
      });
    } catch (error) {
      logger.error('Error saving project state', error instanceof Error ? error : new Error(String(error)), {
        projectId,
        service: 'CollaborationServer'
      });
    }
  }

  /**
   * Cleanup inactive users and empty rooms
   */
  private startCleanupInterval() {
    setInterval(() => {
      const now = new Date();
      const timeout = 5 * 60 * 1000; // 5 minutes

      for (const [roomId, room] of this.rooms.entries()) {
        // Remove inactive users
        for (const [userId, user] of room.users.entries()) {
          if (now.getTime() - user.lastSeen.getTime() > timeout) {
            room.users.delete(userId);
            
            // Notify others
            this.io.to(`project:${roomId}`).emit('user-left', {
              userId,
              timestamp: now
            });
          }
        }

        // Remove empty rooms
        if (room.users.size === 0) {
          this.rooms.delete(roomId);
        }
      }
    }, 60000); // Run every minute
  }

  /**
   * Get server statistics
   */
  getStats() {
    return {
      connectedSockets: this.io.sockets.sockets.size,
      activeRooms: this.rooms.size,
      totalActiveUsers: Array.from(this.rooms.values())
        .reduce((total, room) => total + room.users.size, 0)
    };
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    logger.info('Shutting down collaboration server', { service: 'CollaborationServer' });
    
    // Save all room states
    for (const [roomId, room] of this.rooms.entries()) {
      await this.saveProjectState(roomId, room.documentState);
    }

    // Close all connections
    this.io.close();
    
    logger.info('Collaboration server shut down complete', { service: 'CollaborationServer' });
  }
}

export { CollaborationServer };
export type { 
  AuthenticatedSocket, 
  RoomData, 
  UserPresence, 
  DocumentState, 
  CollaborationEvent,
  CursorPosition,
  SelectionRange 
};