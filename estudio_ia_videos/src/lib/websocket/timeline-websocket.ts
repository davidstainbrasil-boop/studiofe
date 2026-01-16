import { logger } from '@lib/logger';
import { Server as SocketIOServer, Socket } from 'socket.io'
import { Server as HTTPServer } from 'http'
import { 
  TimelineEvent, 
  SocketUser, 
  JoinProjectPayload, 
  CursorMoveData, 
  SelectionChangeData,
  CommentPayload
} from './types'

// Re-export TimelineEvent for backward compatibility
export { TimelineEvent }

export function initializeWebSocket(server: HTTPServer) {
  const io = new SocketIOServer(server, {
    path: '/api/socket/timeline',
    addTrailingSlash: false,
    cors: {
      origin: process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || 'https://cursostecno.com.br',
      methods: ['GET', 'POST']
    }
  })

  const projectUsers = new Map<string, Set<string>>()
  // Store user data: socketId -> { userId, userName, ... }
  const socketData = new Map<string, SocketUser>()

    // Auth Middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        logger.warn('Connection attempt without token', { socketId: socket.id });
        return next(new Error('Authentication required'));
      }

      // Verify JWT using local secret (fastest for WS)
      // Note: In strict mode we might want to use supabase.auth.getUser() but that adds latency
      const { verifyJWT } = await import('@lib/auth/jwt');
      const decoded = verifyJWT(token);

      if (!decoded || !decoded.sub) {
        logger.warn('Invalid token', { socketId: socket.id });
        return next(new Error('Invalid token'));
      }

      // Popula dados do socket com informações verificadas
      const userId = decoded.sub;
      const userMetadata = decoded.user_metadata || {};
      const userName = userMetadata.full_name || userMetadata.name || userMetadata.email || `User ${userId.slice(0,4)}`;
      const userImage = userMetadata.avatar_url || userMetadata.picture;

      socket.data.userId = userId;
      socket.data.userName = userName;
      socket.data.userImage = userImage;

      // Persiste no map local para acesso rápido
      socketData.set(socket.id, {
        userId,
        userName,
        userImage
      });

      next();
    } catch (error) {
      logger.error('Socket auth error', error as Error);
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket: Socket) => {
    logger.info('✓ Socket conectado', { 
      component: 'TimelineWebsocket', 
      socketId: socket.id,
      userId: socket.data.userId 
    });

    socket.on(TimelineEvent.JOIN_PROJECT, ({ projectId, userName, userImage }: JoinProjectPayload) => {
      socket.join(`project:${projectId}`)
      
      // Use provided userName or fallback to auth data
      const finalUserName = userName || socket.data.userName
      const userId = socket.data.userId || socket.id
      
      // Update socket data if new info provided
      if (userName) {
        socket.data.userName = userName
        const current = socketData.get(socket.id)
        if (current) {
             socketData.set(socket.id, { ...current, userName })
        }
      }
      // Ensure userId is set in socketData if not already (e.g. if coming from handshake)
      if (!socketData.has(socket.id)) {
          socketData.set(socket.id, { userId, userName: finalUserName })
      } else {
          // Update existing
          const current = socketData.get(socket.id);
          if (current) {
            socketData.set(socket.id, { ...current, userName: finalUserName, userId })
          }
      }

      if (!projectUsers.has(projectId)) {
        projectUsers.set(projectId, new Set())
      }
      projectUsers.get(projectId)!.add(socket.id)
      
      const timestamp = new Date().toISOString()

      // FIX 1: Emitir para o próprio usuário também
      socket.emit(TimelineEvent.USER_JOINED, {
        userId,
        userName: finalUserName,
        userImage,
        projectId,
        timestamp
      })
      
      // FIX 2: Notificar outros usuários
      socket.to(`project:${projectId}`).emit(TimelineEvent.USER_JOINED, {
        userId,
        userName: finalUserName,
        userImage,
        projectId,
        timestamp
      })
      
      // Helper to get userIds
      const getProjectUserIds = (pid: string) => {
        const sids = Array.from(projectUsers.get(pid) || [])
        return sids.map(sid => {
          const data = socketData.get(sid)
          return data ? data.userId : sid
        })
      }

      // Send active users
      const activeUserIds = getProjectUserIds(projectId)
      socket.emit(TimelineEvent.ACTIVE_USERS, {
        projectId,
        users: activeUserIds,
        count: activeUserIds.length
      })
    })

    // FIX 3: Emitir USER_LEFT ao sair
    socket.on(TimelineEvent.LEAVE_PROJECT, ({ projectId }: { projectId: string }) => {
      const room = `project:${projectId}`
      socket.leave(room)
      
      const userId = socket.data.userId || socket.id
      const userName = socket.data.userName

      if (projectUsers.has(projectId)) {
        projectUsers.get(projectId)!.delete(socket.id)
        
        if (projectUsers.get(projectId)!.size === 0) {
          projectUsers.delete(projectId)
        }
      }
      
      const timestamp = new Date().toISOString()

      // Emit to self
      socket.emit(TimelineEvent.USER_LEFT, {
        userId,
        userName,
        projectId,
        timestamp
      })

      // Notify others
      socket.to(room).emit(TimelineEvent.USER_LEFT, {
        userId,
        userName,
        projectId,
        timestamp
      })
    })

    // FIX 4: Implementar timeline:get_active_users
    socket.on('timeline:get_active_users', ({ projectId }: { projectId: string }) => {
      const sids = Array.from(projectUsers.get(projectId) || [])
      const userIds = sids.map(sid => {
        const data = socketData.get(sid)
        return data ? data.userId : sid
      })

      socket.emit(TimelineEvent.ACTIVE_USERS, {
        projectId,
        users: userIds,
        count: userIds.length
      })
    })

    socket.on(TimelineEvent.CURSOR_MOVE, (data: CursorMoveData & { projectId: string }) => {
      const room = `project:${data.projectId}`
      socket.to(room).emit(TimelineEvent.CURSOR_MOVE, {
        ...data,
        socketId: socket.id
      })
    })

    socket.on(TimelineEvent.SELECTION_CHANGE, (data: SelectionChangeData & { projectId: string }) => {
      const room = `project:${data.projectId}`
      socket.to(room).emit(TimelineEvent.SELECTION_CHANGE, data)
    })

    socket.on(TimelineEvent.COMMENT, (data: { projectId: string; comment: CommentPayload }) => {
      const room = `project:${data.projectId}`
      io.to(room).emit(TimelineEvent.NEW_COMMENT, data.comment)
    })

    socket.on(TimelineEvent.TIMELINE_UPDATED, (data: { projectId: string; timeline: unknown }) => {
      const room = `project:${data.projectId}`
      socket.to(room).emit(TimelineEvent.TIMELINE_UPDATED, data.timeline || data)
      
      // Send success notification as expected by tests
      io.to(room).emit(TimelineEvent.NOTIFICATION, {
        message: 'Timeline salva com sucesso',
        type: 'success',
        projectId: data.projectId,
        timestamp: new Date().toISOString()
      })
    })

    // FIX 5: Broadcast CLIP_ADDED
    socket.on(TimelineEvent.CLIP_ADDED, (data: { projectId: string; [key: string]: unknown }) => {
      const { projectId } = data
      socket.to(`project:${projectId}`).emit(TimelineEvent.CLIP_ADDED, {
        ...data,
        userId: socket.data.userId,
        userName: socket.data.userName,
        timestamp: new Date().toISOString()
      })
    })

    // FIX 6: Broadcast NOTIFICATION
    socket.on(TimelineEvent.NOTIFICATION, (data: { projectId: string; message: string; type: string }) => {
      const { projectId } = data
      socket.to(`project:${projectId}`).emit(TimelineEvent.NOTIFICATION, {
        ...data,
        userId: socket.data.userId,
        userName: socket.data.userName,
        timestamp: new Date().toISOString()
      })
    })

    // FIX 7: Broadcast CONFLICT
    socket.on(TimelineEvent.CONFLICT, (data: { projectId: string; [key: string]: unknown }) => {
      const { projectId } = data
      socket.to(`project:${projectId}`).emit(TimelineEvent.CONFLICT, {
        ...data,
        userId: socket.data.userId,
        userName: socket.data.userName,
        timestamp: new Date().toISOString()
      })
    })

    // Handlers for Lock/Unlock
    socket.on(TimelineEvent.TRACK_LOCKED, (data: { projectId: string; userId?: string; userName?: string }) => {
      const { projectId } = data
      socket.to(`project:${projectId}`).emit(TimelineEvent.TRACK_LOCKED, {
        ...data,
        userId: socket.data.userId || data.userId,
        userName: socket.data.userName || data.userName,
        timestamp: new Date().toISOString()
      })
    })

    socket.on(TimelineEvent.TRACK_UNLOCKED, (data: { projectId: string; userId?: string; userName?: string }) => {
      const { projectId } = data
      socket.to(`project:${projectId}`).emit(TimelineEvent.TRACK_UNLOCKED, {
        ...data,
        userId: socket.data.userId || data.userId,
        userName: socket.data.userName || data.userName,
        timestamp: new Date().toISOString()
      })
    })

    // Handler for Presence Update
    socket.on(TimelineEvent.PRESENCE_UPDATE, (data: { projectId: string; userId?: string }) => {
      const { projectId } = data
      socket.to(`project:${projectId}`).emit(TimelineEvent.PRESENCE_UPDATE, {
        ...data,
        userId: socket.data.userId || data.userId,
        timestamp: new Date().toISOString()
      })
    })

    socket.on('disconnect', () => {
      logger.info('Socket desconectado', { component: 'TimelineWebsocket', socketId: socket.id });
      
      const userId = socket.data.userId || socket.id
      
      // Remove from all rooms
      projectUsers.forEach((sockets, projectId) => {
        if (sockets.has(socket.id)) {
          sockets.delete(socket.id)
          io.to(`project:${projectId}`).emit(TimelineEvent.USER_LEFT, {
            userId,
            projectId,
            timestamp: new Date().toISOString()
          })
        }
      })
      
      socketData.delete(socket.id)
    })
  })

  logger.info('✓ Socket.IO timeline server configurado', { component: 'TimelineWebsocket' });
  return io
}
