/**
 * Timeline WebSocket Server
 * 
 * Servidor Socket.IO para colaboração em tempo real na timeline.
 * Gerencia: autenticação por token, presença de usuários, broadcast de eventos.
 */

import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { logger } from '@lib/logger';

/** Event name constants for Socket.IO timeline collaboration */
export const TimelineEvent = {
  JOIN_PROJECT: 'join-project',
  LEAVE_PROJECT: 'leave-project',
  USER_JOINED: 'user-joined',
  USER_LEFT: 'user-left',
  ACTIVE_USERS: 'active-users',
  CURSOR_MOVE: 'cursor-move',
  SELECTION_CHANGE: 'selection-change',
  TIMELINE_UPDATED: 'timeline-updated',
  NOTIFICATION: 'notification',
  ELEMENT_ADDED: 'element-added',
  ELEMENT_REMOVED: 'element-removed',
  ELEMENT_UPDATED: 'element-updated',
  TRACK_ADDED: 'track-added',
  TRACK_REMOVED: 'track-removed',
} as const;

export type TimelineEventType = typeof TimelineEvent[keyof typeof TimelineEvent];

/** Map of projectId → Set of userIds currently connected */
const projectUsers = new Map<string, Map<string, { userName: string; socketId: string }>>();

/**
 * Inicializa o servidor WebSocket para colaboração na timeline.
 * 
 * @param httpServer - Servidor HTTP do Node.js
 * @returns Instância do Socket.IO Server
 */
export function initializeWebSocket(httpServer: HttpServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  // Middleware de autenticação
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;

    if (!token) {
      logger.warn('Connection attempt without token', { socketId: socket.id });
      return next(new Error('Authentication required'));
    }

    try {
      const { verifyJWT } = await import('@lib/auth/jwt');
      const payload = verifyJWT(token);

      if (!payload) {
        logger.warn('Invalid token', { socketId: socket.id });
        return next(new Error('Invalid token'));
      }

      socket.data.userId = payload.sub;
      socket.data.userName = payload.user_metadata?.full_name || 'Anonymous';
      next();
    } catch (err) {
      logger.error('WebSocket auth error', { socketId: socket.id, error: err });
      next(new Error('Authentication failed'));
    }
  });

  // Handler de conexão
  io.on('connection', (socket) => {
    const { userId, userName } = socket.data;

    logger.info('WebSocket connected', { socketId: socket.id, userId });

    // Entrar em um projeto
    socket.on(TimelineEvent.JOIN_PROJECT, (data: { projectId: string }) => {
      const { projectId } = data;
      const room = `project:${projectId}`;

      socket.join(room);

      // Registrar presença
      if (!projectUsers.has(projectId)) {
        projectUsers.set(projectId, new Map());
      }
      projectUsers.get(projectId)!.set(userId, { userName, socketId: socket.id });

      const users = Array.from(projectUsers.get(projectId)!.keys());

      // Notificar o próprio socket
      socket.emit(TimelineEvent.USER_JOINED, {
        userId,
        userName,
        projectId,
      });

      socket.emit(TimelineEvent.ACTIVE_USERS, {
        projectId,
        count: users.length,
        users,
      });

      // Broadcast para os demais no room
      socket.to(room).emit(TimelineEvent.USER_JOINED, {
        userId,
        userName,
        projectId,
      });
    });

    // Sair de um projeto
    socket.on(TimelineEvent.LEAVE_PROJECT, (data: { projectId: string }) => {
      const { projectId } = data;
      const room = `project:${projectId}`;

      socket.leave(room);

      if (projectUsers.has(projectId)) {
        projectUsers.get(projectId)!.delete(userId);
        if (projectUsers.get(projectId)!.size === 0) {
          projectUsers.delete(projectId);
        }
      }

      socket.to(room).emit(TimelineEvent.USER_LEFT, {
        userId,
        userName,
        projectId,
      });
    });

    // Timeline atualizada
    socket.on(TimelineEvent.TIMELINE_UPDATED, (data: { projectId: string; timeline: unknown }) => {
      const { projectId, timeline } = data;
      const room = `project:${projectId}`;

      // Broadcast timeline update para todos no room
      socket.to(room).emit(TimelineEvent.TIMELINE_UPDATED, timeline);

      // Notificação de sucesso
      io.to(room).emit(TimelineEvent.NOTIFICATION, {
        type: 'success',
        projectId,
        message: 'Timeline salva com sucesso',
      });
    });

    // Cursor move
    socket.on(TimelineEvent.CURSOR_MOVE, (data: { projectId: string; x: number; y: number }) => {
      const room = `project:${data.projectId}`;
      socket.to(room).emit(TimelineEvent.CURSOR_MOVE, {
        userId,
        ...data,
      });
    });

    // Seleção alterada
    socket.on(TimelineEvent.SELECTION_CHANGE, (data: { projectId: string; selectedIds: string[] }) => {
      const room = `project:${data.projectId}`;
      socket.to(room).emit(TimelineEvent.SELECTION_CHANGE, {
        userId,
        ...data,
      });
    });

    // Desconexão
    socket.on('disconnect', () => {
      logger.info('WebSocket disconnected', { socketId: socket.id, userId });

      // Limpar presença de todos os projetos
      for (const [projectId, users] of projectUsers.entries()) {
        if (users.has(userId)) {
          users.delete(userId);
          const room = `project:${projectId}`;

          io.to(room).emit(TimelineEvent.USER_LEFT, {
            userId,
            userName,
            projectId,
          });

          if (users.size === 0) {
            projectUsers.delete(projectId);
          }
        }
      }
    });
  });

  return io;
}
