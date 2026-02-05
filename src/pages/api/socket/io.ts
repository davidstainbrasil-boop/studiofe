import { Server } from 'socket.io';
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/database/prisma';

export const config = {
  api: {
    bodyParser: false,
  },
};

interface CollaborationEvent {
  type:
    | 'cursor_move'
    | 'edit_slide'
    | 'add_slide'
    | 'delete_slide'
    | 'user_join'
    | 'user_leave'
    | 'chat_message';
  data: any;
  userId: string;
  projectId: string;
  timestamp: number;
}

interface ConnectedUser {
  userId: string;
  name: string;
  email: string;
  avatar?: string;
  joinedAt: number;
  cursor?: { x: number; y: number };
}

const SocketHandler = (req: NextApiRequest, res: NextApiResponse) => {
  if (!res.socket.server.io) {
    console.log('Setting up socket server');

    const io = new Server(res.socket.server, {
      path: '/api/socket/io',
      addTrailingSlash: false,
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
    });

    // Store connected users per project
    const projectUsers = new Map<string, Map<string, ConnectedUser>>();
    // Store user sessions
    const userSessions = new Map<string, any>();

    // Authentication middleware
    io.use(async (socket, next) => {
      try {
        const session = await getServerSession(req);
        if (!session?.user?.id) {
          return next(new Error('Unauthorized'));
        }

        socket.userId = session.user.id;
        socket.userName = session.user.name;
        socket.userEmail = session.user.email;
        userSessions.set(socket.id, session.user);

        next();
      } catch (error) {
        next(new Error('Authentication failed'));
      }
    });

    io.on('connection', (socket) => {
      console.log(`User ${socket.userId} connected`);

      // Join project room
      socket.on('join_project', async (projectId: string) => {
        try {
          // Verify user has access to project
          const project = await prisma.project.findFirst({
            where: {
              id: projectId,
              OR: [
                { userId: socket.userId },
                {
                  shares: {
                    some: {
                      userId: socket.userId,
                    },
                  },
                },
              ],
            },
          });

          if (!project) {
            socket.emit('error', 'Acesso não autorizado ao projeto');
            return;
          }

          // Join room
          socket.join(projectId);
          socket.currentProject = projectId;

          // Add user to project users
          if (!projectUsers.has(projectId)) {
            projectUsers.set(projectId, new Map());
          }

          const userInfo: ConnectedUser = {
            userId: socket.userId,
            name: socket.userName,
            email: socket.userEmail,
            avatar: (userSessions.get(socket.id) as any)?.image,
            joinedAt: Date.now(),
          };

          projectUsers.get(projectId)!.set(socket.userId, userInfo);

          // Notify others
          socket.to(projectId).emit('user_joined', userInfo);

          // Send current users list
          const users = Array.from(projectUsers.get(projectId)!.values());
          socket.emit('users_list', users);

          console.log(`User ${socket.userId} joined project ${projectId}`);
        } catch (error) {
          console.error('Error joining project:', error);
          socket.emit('error', 'Erro ao entrar no projeto');
        }
      });

      // Leave project
      socket.on('leave_project', (projectId: string) => {
        handleUserLeave(socket, projectId);
      });

      // Handle cursor movement
      socket.on('cursor_move', (data: { x: number; y: number }) => {
        if (!socket.currentProject) return;

        const projectUsersMap = projectUsers.get(socket.currentProject);
        if (projectUsersMap) {
          const user = projectUsersMap.get(socket.userId);
          if (user) {
            user.cursor = { x: data.x, y: data.y };

            socket.to(socket.currentProject).emit('cursor_update', {
              userId: socket.userId,
              cursor: data,
            });
          }
        }
      });

      // Handle slide editing
      socket.on('slide_edit', (data: { slideId: string; changes: any }) => {
        if (!socket.currentProject) return;

        const event: CollaborationEvent = {
          type: 'edit_slide',
          data,
          userId: socket.userId,
          projectId: socket.currentProject,
          timestamp: Date.now(),
        };

        socket.to(socket.currentProject).emit('slide_edited', event);

        // Store event in database for history
        storeCollaborationEvent(event);
      });

      // Handle slide addition
      socket.on('slide_add', (data: { position: number; slideData: any }) => {
        if (!socket.currentProject) return;

        const event: CollaborationEvent = {
          type: 'add_slide',
          data,
          userId: socket.userId,
          projectId: socket.currentProject,
          timestamp: Date.now(),
        };

        socket.to(socket.currentProject).emit('slide_added', event);
        storeCollaborationEvent(event);
      });

      // Handle slide deletion
      socket.on('slide_delete', (data: { slideId: string }) => {
        if (!socket.currentProject) return;

        const event: CollaborationEvent = {
          type: 'delete_slide',
          data,
          userId: socket.userId,
          projectId: socket.currentProject,
          timestamp: Date.now(),
        };

        socket.to(socket.currentProject).emit('slide_deleted', event);
        storeCollaborationEvent(event);
      });

      // Handle chat messages
      socket.on('chat_message', (data: { message: string; timestamp?: number }) => {
        if (!socket.currentProject) return;

        const messageData = {
          id: Date.now().toString(),
          userId: socket.userId,
          userName: socket.userName,
          userAvatar: (userSessions.get(socket.id) as any)?.image,
          message: data.message,
          timestamp: data.timestamp || Date.now(),
        };

        io.to(socket.currentProject).emit('chat_message', messageData);

        // Store chat message
        storeChatMessage(socket.currentProject, messageData);
      });

      // Handle typing indicators
      socket.on('typing_start', () => {
        if (!socket.currentProject) return;

        socket.to(socket.currentProject).emit('user_typing', {
          userId: socket.userId,
          userName: socket.userName,
          typing: true,
        });
      });

      socket.on('typing_stop', () => {
        if (!socket.currentProject) return;

        socket.to(socket.currentProject).emit('user_typing', {
          userId: socket.userId,
          userName: socket.userName,
          typing: false,
        });
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`User ${socket.userId} disconnected`);

        if (socket.currentProject) {
          handleUserLeave(socket, socket.currentProject);
        }

        userSessions.delete(socket.id);
      });

      // Helper function to handle user leaving
      function handleUserLeave(socket: any, projectId: string) {
        socket.leave(projectId);

        const projectUsersMap = projectUsers.get(projectId);
        if (projectUsersMap) {
          projectUsersMap.delete(socket.userId);

          if (projectUsersMap.size === 0) {
            projectUsers.delete(projectId);
          } else {
            // Notify remaining users
            socket.to(projectId).emit('user_left', {
              userId: socket.userId,
              userName: socket.userName,
            });
          }
        }

        // Send typing stop notification
        socket.to(projectId).emit('user_typing', {
          userId: socket.userId,
          userName: socket.userName,
          typing: false,
        });
      }
    });

    // Helper function to store collaboration events
    async function storeCollaborationEvent(event: CollaborationEvent) {
      try {
        // This would store in a database table for collaboration history
        // For now, we'll just log it
        console.log('Collaboration event:', event);
      } catch (error) {
        console.error('Error storing collaboration event:', error);
      }
    }

    // Helper function to store chat messages
    async function storeChatMessage(projectId: string, messageData: any) {
      try {
        // This would store in a database table for chat history
        console.log('Chat message:', { projectId, ...messageData });
      } catch (error) {
        console.error('Error storing chat message:', error);
      }
    }

    res.socket.server.io = io;
  }

  res.end();
};

export default SocketHandler;
