/**
 * 🌐 Collaboration Server
 * Servidor WebSocket para colaboração em tempo real usando Socket.io
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { logger } from '@lib/logger';
import { lockService } from './lock-service';
import {
  CollabEvent,
  CollaboratorPresence,
  TrackLock,
  TimelineChange,
  JoinProjectPayload,
  ProjectStatePayload,
  CursorMovePayload,
  SelectionChangePayload,
  LockRequestPayload,
  ChangeBroadcastPayload,
  getCollaboratorColor
} from './types';

// ============================================================================
// Types
// ============================================================================

interface ProjectRoom {
  projectId: string;
  collaborators: Map<string, CollaboratorPresence>;
  locks: Map<string, TrackLock>;
  pendingChanges: Map<string, TimelineChange>;
  lastActivity: Date;
}

interface SocketData {
  userId: string;
  projectId: string | null;
  user: {
    id: string;
    name: string;
    email?: string;
    avatar?: string;
  } | null;
}

// ============================================================================
// Collaboration Server Class
// ============================================================================

export class CollaborationServer {
  private io: SocketIOServer;
  private rooms: Map<string, ProjectRoom> = new Map();
  private socketToUser: Map<string, string> = new Map();
  private userToSocket: Map<string, string> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      path: '/api/collaboration',
      cors: {
        origin: process.env.NEXT_PUBLIC_SITE_URL || '*',
        methods: ['GET', 'POST'],
        credentials: true
      },
      pingTimeout: 60000,
      pingInterval: 25000,
      transports: ['websocket', 'polling']
    });

    this.setupEventHandlers();
    
    // Cleanup de rooms inativas a cada 5 minutos
    this.cleanupInterval = setInterval(() => this.cleanupInactiveRooms(), 5 * 60 * 1000);
    
    logger.info('Collaboration server initialized', { component: 'CollaborationServer' });
  }

  // ============================================================================
  // Event Handlers
  // ============================================================================

  private setupEventHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      const socketData: SocketData = {
        userId: '',
        projectId: null,
        user: null
      };

      logger.info('Client connected', { 
        component: 'CollaborationServer',
        socketId: socket.id 
      });

      // Join Project
      socket.on(CollabEvent.JOIN_PROJECT, async (payload: JoinProjectPayload) => {
        await this.handleJoinProject(socket, socketData, payload);
      });

      // Leave Project
      socket.on(CollabEvent.LEAVE_PROJECT, async () => {
        await this.handleLeaveProject(socket, socketData);
      });

      // Cursor Move
      socket.on(CollabEvent.CURSOR_MOVE, (payload: CursorMovePayload) => {
        this.handleCursorMove(socket, socketData, payload);
      });

      // Selection Change
      socket.on(CollabEvent.SELECTION_CHANGE, (payload: SelectionChangePayload) => {
        this.handleSelectionChange(socket, socketData, payload);
      });

      // Lock Request
      socket.on(CollabEvent.LOCK_REQUEST, async (payload: LockRequestPayload) => {
        await this.handleLockRequest(socket, socketData, payload);
      });

      // Lock Release
      socket.on(CollabEvent.LOCK_RELEASE, async (payload: LockRequestPayload) => {
        await this.handleLockRelease(socket, socketData, payload);
      });

      // Timeline Change
      socket.on(CollabEvent.CHANGE_BROADCAST, async (payload: ChangeBroadcastPayload) => {
        await this.handleChangeBroadcast(socket, socketData, payload);
      });

      // Disconnect
      socket.on('disconnect', async (reason) => {
        await this.handleDisconnect(socket, socketData, reason);
      });
    });
  }

  // ============================================================================
  // Join/Leave Handlers
  // ============================================================================

  private async handleJoinProject(
    socket: Socket,
    socketData: SocketData,
    payload: JoinProjectPayload
  ): Promise<void> {
    const { projectId, user } = payload;
    const startTime = Date.now();

    try {
      // Sair do projeto anterior se existir
      if (socketData.projectId) {
        await this.handleLeaveProject(socket, socketData);
      }

      // Criar room se não existir
      if (!this.rooms.has(projectId)) {
        this.rooms.set(projectId, {
          projectId,
          collaborators: new Map(),
          locks: new Map(),
          pendingChanges: new Map(),
          lastActivity: new Date()
        });
      }

      const room = this.rooms.get(projectId)!;
      
      // Criar presença do colaborador
      const colorIndex = room.collaborators.size;
      const presence: CollaboratorPresence = {
        id: socket.id,
        odiserId: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        color: getCollaboratorColor(colorIndex),
        cursor: null,
        selection: null,
        activeTrackId: null,
        lastSeenAt: new Date(),
        status: 'active'
      };

      // Adicionar colaborador
      room.collaborators.set(socket.id, presence);
      room.lastActivity = new Date();

      // Atualizar dados do socket
      socketData.userId = user.id;
      socketData.projectId = projectId;
      socketData.user = user;

      // Mapear socket <-> user
      this.socketToUser.set(socket.id, user.id);
      this.userToSocket.set(user.id, socket.id);

      // Entrar na room do Socket.io
      socket.join(`project:${projectId}`);

      // Buscar locks atuais do banco
      const dbLocks = await lockService.getProjectLocks(projectId);
      dbLocks.forEach(lock => {
        room.locks.set(lock.trackId, lock);
      });

      // Enviar estado atual para o novo colaborador
      const state: ProjectStatePayload = {
        projectId,
        collaborators: Array.from(room.collaborators.values()),
        locks: Array.from(room.locks.values()),
        pendingChanges: Array.from(room.pendingChanges.values())
      };

      socket.emit(CollabEvent.PROJECT_STATE, state);

      // Notificar outros colaboradores
      socket.to(`project:${projectId}`).emit(CollabEvent.USER_JOINED, presence);

      const latency = Date.now() - startTime;
      logger.info('User joined project', {
        component: 'CollaborationServer',
        projectId,
        userId: user.id,
        collaboratorCount: room.collaborators.size,
        latency
      });

    } catch (error) {
      logger.error('Failed to join project', error as Error, {
        component: 'CollaborationServer',
        projectId
      });
      socket.emit(CollabEvent.ERROR, { message: 'Falha ao entrar no projeto' });
    }
  }

  private async handleLeaveProject(socket: Socket, socketData: SocketData): Promise<void> {
    const { projectId, userId } = socketData;
    
    if (!projectId) return;

    try {
      const room = this.rooms.get(projectId);
      
      if (room) {
        // Remover colaborador
        room.collaborators.delete(socket.id);
        
        // Liberar locks do usuário
        await lockService.releaseAllUserLocks(projectId, userId);
        
        // Remover locks da memória
        for (const [trackId, lock] of room.locks) {
          if (lock.userId === userId) {
            room.locks.delete(trackId);
            this.io.to(`project:${projectId}`).emit(CollabEvent.LOCK_RELEASED, {
              projectId,
              trackId,
              userId
            });
          }
        }

        // Notificar outros
        socket.to(`project:${projectId}`).emit(CollabEvent.USER_LEFT, {
          socketId: socket.id,
          userId
        });
      }

      // Sair da room do Socket.io
      socket.leave(`project:${projectId}`);

      // Limpar dados
      this.socketToUser.delete(socket.id);
      this.userToSocket.delete(userId);
      socketData.projectId = null;

      logger.info('User left project', {
        component: 'CollaborationServer',
        projectId,
        userId
      });

    } catch (error) {
      logger.error('Failed to leave project', error as Error, {
        component: 'CollaborationServer',
        projectId
      });
    }
  }

  // ============================================================================
  // Presence Handlers
  // ============================================================================

  private handleCursorMove(
    socket: Socket,
    socketData: SocketData,
    payload: CursorMovePayload
  ): void {
    const { projectId } = socketData;
    if (!projectId) return;

    const room = this.rooms.get(projectId);
    if (!room) return;

    const collaborator = room.collaborators.get(socket.id);
    if (collaborator) {
      collaborator.cursor = payload.cursor;
      collaborator.lastSeenAt = new Date();
      collaborator.status = 'active';
    }

    // Broadcast para outros colaboradores (exceto o remetente)
    socket.to(`project:${projectId}`).emit(CollabEvent.CURSOR_MOVE, {
      socketId: socket.id,
      cursor: payload.cursor
    });
  }

  private handleSelectionChange(
    socket: Socket,
    socketData: SocketData,
    payload: SelectionChangePayload
  ): void {
    const { projectId } = socketData;
    if (!projectId) return;

    const room = this.rooms.get(projectId);
    if (!room) return;

    const collaborator = room.collaborators.get(socket.id);
    if (collaborator) {
      collaborator.selection = payload.selection;
      collaborator.lastSeenAt = new Date();
    }

    socket.to(`project:${projectId}`).emit(CollabEvent.SELECTION_CHANGE, {
      socketId: socket.id,
      selection: payload.selection
    });
  }

  // ============================================================================
  // Lock Handlers
  // ============================================================================

  private async handleLockRequest(
    socket: Socket,
    socketData: SocketData,
    payload: LockRequestPayload
  ): Promise<void> {
    const { projectId, userId, user } = socketData;
    const { trackId } = payload;
    
    if (!projectId || !userId || !user) {
      socket.emit(CollabEvent.LOCK_DENIED, {
        trackId,
        error: 'Não autenticado'
      });
      return;
    }

    const room = this.rooms.get(projectId);
    if (!room) return;

    // Verificar lock existente na memória primeiro (mais rápido)
    const existingLock = room.locks.get(trackId);
    if (existingLock && existingLock.userId !== userId) {
      socket.emit(CollabEvent.LOCK_DENIED, {
        trackId,
        error: `Track bloqueada por ${existingLock.userName}`,
        existingLock
      });
      return;
    }

    // Tentar adquirir lock no banco
    const collaborator = room.collaborators.get(socket.id);
    const result = await lockService.acquireLock({
      projectId,
      trackId,
      userId,
      userName: user.name,
      userColor: collaborator?.color || '#3B82F6'
    });

    if (result.success && result.lock) {
      // Atualizar memória
      room.locks.set(trackId, result.lock);

      // Notificar sucesso ao requisitante
      socket.emit(CollabEvent.LOCK_ACQUIRED, {
        projectId,
        trackId,
        lock: result.lock
      });

      // Notificar outros colaboradores
      socket.to(`project:${projectId}`).emit(CollabEvent.LOCK_ACQUIRED, {
        projectId,
        trackId,
        lock: result.lock
      });

      logger.info('Lock acquired via WebSocket', {
        component: 'CollaborationServer',
        projectId,
        trackId,
        userId
      });

    } else {
      socket.emit(CollabEvent.LOCK_DENIED, {
        trackId,
        error: result.error,
        existingLock: result.existingLock
      });
    }
  }

  private async handleLockRelease(
    socket: Socket,
    socketData: SocketData,
    payload: LockRequestPayload
  ): Promise<void> {
    const { projectId, userId } = socketData;
    const { trackId } = payload;
    
    if (!projectId || !userId) return;

    const room = this.rooms.get(projectId);
    if (!room) return;

    // Verificar se o lock pertence ao usuário
    const lock = room.locks.get(trackId);
    if (!lock || lock.userId !== userId) {
      return;
    }

    // Liberar no banco
    const released = await lockService.releaseLock(projectId, trackId, userId);
    
    if (released) {
      // Remover da memória
      room.locks.delete(trackId);

      // Notificar todos
      this.io.to(`project:${projectId}`).emit(CollabEvent.LOCK_RELEASED, {
        projectId,
        trackId,
        userId
      });

      logger.info('Lock released via WebSocket', {
        component: 'CollaborationServer',
        projectId,
        trackId,
        userId
      });
    }
  }

  // ============================================================================
  // Change Handlers
  // ============================================================================

  private async handleChangeBroadcast(
    socket: Socket,
    socketData: SocketData,
    payload: ChangeBroadcastPayload
  ): Promise<void> {
    const startTime = Date.now();
    const { projectId, userId } = socketData;
    const { change } = payload;
    
    if (!projectId || !userId) return;

    const room = this.rooms.get(projectId);
    if (!room) return;

    // Verificar lock se a mudança é em uma track específica
    if (change.trackId) {
      const lock = room.locks.get(change.trackId);
      if (lock && lock.userId !== userId) {
        // Conflito: track está bloqueada por outro usuário
        socket.emit(CollabEvent.CHANGE_CONFLICT, {
          changeId: change.id,
          conflictWith: lock.userId,
          reason: `Track bloqueada por ${lock.userName}`
        });
        return;
      }
    }

    // Adicionar timestamp e user se não existir
    const enrichedChange: TimelineChange = {
      ...change,
      userId,
      timestamp: change.timestamp || Date.now()
    };

    // Armazenar mudança pendente
    room.pendingChanges.set(change.id, enrichedChange);
    room.lastActivity = new Date();

    // Broadcast para outros colaboradores (target: <100ms)
    socket.to(`project:${projectId}`).emit(CollabEvent.CHANGE_BROADCAST, {
      change: enrichedChange
    });

    // ACK para o remetente
    const latency = Date.now() - startTime;
    socket.emit(CollabEvent.CHANGE_ACK, {
      changeId: change.id,
      accepted: true,
      latency
    });

    // Limpar mudanças antigas (manter últimas 100)
    if (room.pendingChanges.size > 100) {
      const entries = Array.from(room.pendingChanges.entries());
      const toRemove = entries.slice(0, entries.length - 100);
      toRemove.forEach(([id]) => room.pendingChanges.delete(id));
    }

    logger.debug('Change broadcast', {
      component: 'CollaborationServer',
      projectId,
      changeType: change.type,
      latency
    });
  }

  // ============================================================================
  // Disconnect Handler
  // ============================================================================

  private async handleDisconnect(
    socket: Socket,
    socketData: SocketData,
    reason: string
  ): Promise<void> {
    logger.info('Client disconnected', {
      component: 'CollaborationServer',
      socketId: socket.id,
      reason
    });

    await this.handleLeaveProject(socket, socketData);
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Limpa rooms inativas (sem atividade por 30 minutos)
   */
  private cleanupInactiveRooms(): void {
    const threshold = Date.now() - 30 * 60 * 1000;
    
    for (const [projectId, room] of this.rooms) {
      if (room.lastActivity.getTime() < threshold && room.collaborators.size === 0) {
        this.rooms.delete(projectId);
        logger.info('Inactive room cleaned up', {
          component: 'CollaborationServer',
          projectId
        });
      }
    }
  }

  /**
   * Obtém estatísticas do servidor
   */
  getStats(): {
    totalConnections: number;
    activeRooms: number;
    totalCollaborators: number;
  } {
    let totalCollaborators = 0;
    for (const room of this.rooms.values()) {
      totalCollaborators += room.collaborators.size;
    }

    return {
      totalConnections: this.io.engine.clientsCount,
      activeRooms: this.rooms.size,
      totalCollaborators
    };
  }

  /**
   * Envia notificação para um projeto
   */
  notifyProject(projectId: string, event: CollabEvent, data: unknown): void {
    this.io.to(`project:${projectId}`).emit(event, data);
  }

  /**
   * Para o servidor
   */
  async shutdown(): Promise<void> {
    clearInterval(this.cleanupInterval);
    
    // Notificar todos os clientes
    this.io.emit(CollabEvent.NOTIFICATION, {
      type: 'server_shutdown',
      message: 'Servidor será reiniciado'
    });

    // Fechar conexões
    await new Promise<void>((resolve) => {
      this.io.close(() => resolve());
    });

    logger.info('Collaboration server shut down', { component: 'CollaborationServer' });
  }
}

// Singleton para uso na aplicação
let collaborationServer: CollaborationServer | null = null;

export function initCollaborationServer(server: HTTPServer): CollaborationServer {
  if (!collaborationServer) {
    collaborationServer = new CollaborationServer(server);
  }
  return collaborationServer;
}

export function getCollaborationServer(): CollaborationServer | null {
  return collaborationServer;
}
