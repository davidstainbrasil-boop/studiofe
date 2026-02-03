#!/usr/bin/env node
/**
 * 🌐 Standalone Collaboration WebSocket Server
 * 
 * Executa o servidor de colaboração em uma porta separada.
 * Útil para desenvolvimento e produção onde o Next.js não suporta WebSocket nativamente.
 * 
 * Uso:
 *   npx tsx scripts/collaboration-server.ts
 *   # ou
 *   node --loader tsx scripts/collaboration-server.ts
 */

import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

// ============================================================================
// Configuration
// ============================================================================

const PORT = parseInt(process.env.COLLABORATION_PORT || '3001', 10);
const CORS_ORIGIN = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

// ============================================================================
// Types
// ============================================================================

interface User {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
}

interface CollaboratorPresence {
  socketId: string;
  userId: string;
  name: string;
  email?: string;
  avatar?: string;
  color: string;
  cursor: { x: number; y: number; timestamp: number } | null;
  selection: { elementIds: string[]; trackIds: string[] } | null;
  activeTrackId: string | null;
  lastSeenAt: Date;
  status: 'active' | 'idle' | 'away';
}

interface TrackLock {
  id: string;
  projectId: string;
  trackId: string;
  userId: string;
  userName: string;
  userColor: string;
  createdAt: Date;
  expiresAt: Date;
}

interface ProjectRoom {
  projectId: string;
  collaborators: Map<string, CollaboratorPresence>;
  locks: Map<string, TrackLock>;
  lastActivity: Date;
}

// ============================================================================
// Color Palette
// ============================================================================

const COLORS = [
  '#EF4444', '#F97316', '#EAB308', '#22C55E', '#14B8A6',
  '#3B82F6', '#8B5CF6', '#EC4899', '#06B6D4', '#6366F1'
];

function getColor(index: number): string {
  return COLORS[index % COLORS.length];
}

// ============================================================================
// Server Setup
// ============================================================================

const httpServer = createServer((req, res) => {
  // Health check endpoint
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      rooms: rooms.size,
      timestamp: new Date().toISOString()
    }));
    return;
  }
  
  // Stats endpoint
  if (req.url === '/stats') {
    let totalCollaborators = 0;
    let totalLocks = 0;
    
    for (const room of rooms.values()) {
      totalCollaborators += room.collaborators.size;
      totalLocks += room.locks.size;
    }
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      connections: io.engine.clientsCount,
      rooms: rooms.size,
      collaborators: totalCollaborators,
      locks: totalLocks,
      uptime: process.uptime()
    }));
    return;
  }
  
  res.writeHead(404);
  res.end('Not Found');
});

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: CORS_ORIGIN,
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling']
});

// ============================================================================
// State Management
// ============================================================================

const rooms = new Map<string, ProjectRoom>();
const socketToProject = new Map<string, string>();
const socketToUser = new Map<string, string>();

// ============================================================================
// Event Handlers
// ============================================================================

io.on('connection', (socket) => {
  console.log(`[${new Date().toISOString()}] 🔌 Client connected: ${socket.id}`);
  
  let currentProjectId: string | null = null;
  let currentUser: User | null = null;
  
  // Join Project
  socket.on('collab:join', ({ projectId, user }: { projectId: string; user: User }) => {
    const startTime = Date.now();
    
    // Leave previous project if any
    if (currentProjectId) {
      leaveProject(socket, currentProjectId, currentUser?.id || '');
    }
    
    currentProjectId = projectId;
    currentUser = user;
    
    // Create room if not exists
    if (!rooms.has(projectId)) {
      rooms.set(projectId, {
        projectId,
        collaborators: new Map(),
        locks: new Map(),
        lastActivity: new Date()
      });
    }
    
    const room = rooms.get(projectId)!;
    
    // Create presence
    const colorIndex = room.collaborators.size;
    const presence: CollaboratorPresence = {
      socketId: socket.id,
      userId: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      color: getColor(colorIndex),
      cursor: null,
      selection: null,
      activeTrackId: null,
      lastSeenAt: new Date(),
      status: 'active'
    };
    
    room.collaborators.set(socket.id, presence);
    room.lastActivity = new Date();
    
    socketToProject.set(socket.id, projectId);
    socketToUser.set(socket.id, user.id);
    
    socket.join(`project:${projectId}`);
    
    // Send current state
    socket.emit('collab:state', {
      projectId,
      collaborators: Array.from(room.collaborators.values()),
      locks: Array.from(room.locks.values()),
      pendingChanges: []
    });
    
    // Notify others
    socket.to(`project:${projectId}`).emit('user:joined', presence);
    
    const latency = Date.now() - startTime;
    console.log(`[${new Date().toISOString()}] ✅ ${user.name} joined project ${projectId} (${latency}ms, ${room.collaborators.size} users)`);
  });
  
  // Cursor Move
  socket.on('cursor:move', ({ projectId, cursor }) => {
    const room = rooms.get(projectId);
    if (!room) return;
    
    const collaborator = room.collaborators.get(socket.id);
    if (collaborator) {
      collaborator.cursor = cursor;
      collaborator.lastSeenAt = new Date();
      collaborator.status = 'active';
    }
    
    socket.to(`project:${projectId}`).emit('cursor:move', {
      socketId: socket.id,
      cursor
    });
  });
  
  // Selection Change
  socket.on('selection:change', ({ projectId, selection }) => {
    const room = rooms.get(projectId);
    if (!room) return;
    
    const collaborator = room.collaborators.get(socket.id);
    if (collaborator) {
      collaborator.selection = selection;
    }
    
    socket.to(`project:${projectId}`).emit('selection:change', {
      socketId: socket.id,
      selection
    });
  });
  
  // Lock Request
  socket.on('lock:request', ({ projectId, trackId }) => {
    const room = rooms.get(projectId);
    if (!room || !currentUser) return;
    
    const collaborator = room.collaborators.get(socket.id);
    const existingLock = room.locks.get(trackId);
    
    if (existingLock && existingLock.userId !== currentUser.id) {
      socket.emit('lock:denied', {
        trackId,
        error: `Track bloqueada por ${existingLock.userName}`,
        existingLock
      });
      return;
    }
    
    const lock: TrackLock = {
      id: `lock_${Date.now()}`,
      projectId,
      trackId,
      userId: currentUser.id,
      userName: currentUser.name,
      userColor: collaborator?.color || '#3B82F6',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000)
    };
    
    room.locks.set(trackId, lock);
    
    socket.emit('lock:acquired', { projectId, trackId, lock });
    socket.to(`project:${projectId}`).emit('lock:acquired', { projectId, trackId, lock });
    
    console.log(`[${new Date().toISOString()}] 🔒 ${currentUser.name} locked track ${trackId}`);
  });
  
  // Lock Release
  socket.on('lock:release', ({ projectId, trackId }) => {
    const room = rooms.get(projectId);
    if (!room || !currentUser) return;
    
    const lock = room.locks.get(trackId);
    if (!lock || lock.userId !== currentUser.id) return;
    
    room.locks.delete(trackId);
    
    io.to(`project:${projectId}`).emit('lock:released', {
      projectId,
      trackId,
      userId: currentUser.id
    });
    
    console.log(`[${new Date().toISOString()}] 🔓 ${currentUser.name} released track ${trackId}`);
  });
  
  // Change Broadcast
  socket.on('change:broadcast', ({ projectId, change }) => {
    const startTime = Date.now();
    const room = rooms.get(projectId);
    if (!room || !currentUser) return;
    
    // Check lock if change is on a specific track
    if (change.trackId) {
      const lock = room.locks.get(change.trackId);
      if (lock && lock.userId !== currentUser.id) {
        socket.emit('change:conflict', {
          changeId: change.id,
          conflictWith: lock.userId,
          reason: `Track bloqueada por ${lock.userName}`
        });
        return;
      }
    }
    
    // Enrich change
    const enrichedChange = {
      ...change,
      userId: currentUser.id,
      timestamp: change.timestamp || Date.now()
    };
    
    // Broadcast to others
    socket.to(`project:${projectId}`).emit('change:broadcast', { change: enrichedChange });
    
    // ACK to sender
    const latency = Date.now() - startTime;
    socket.emit('change:ack', {
      changeId: change.id,
      accepted: true,
      latency
    });
    
    room.lastActivity = new Date();
  });
  
  // Leave Project
  socket.on('collab:leave', () => {
    if (currentProjectId && currentUser) {
      leaveProject(socket, currentProjectId, currentUser.id);
      currentProjectId = null;
      currentUser = null;
    }
  });
  
  // Disconnect
  socket.on('disconnect', (reason) => {
    console.log(`[${new Date().toISOString()}] 🔌 Client disconnected: ${socket.id} (${reason})`);
    
    if (currentProjectId && currentUser) {
      leaveProject(socket, currentProjectId, currentUser.id);
    }
    
    socketToProject.delete(socket.id);
    socketToUser.delete(socket.id);
  });
});

function leaveProject(socket: any, projectId: string, userId: string) {
  const room = rooms.get(projectId);
  if (!room) return;
  
  // Remove collaborator
  const collaborator = room.collaborators.get(socket.id);
  room.collaborators.delete(socket.id);
  
  // Release all locks from this user
  for (const [trackId, lock] of room.locks) {
    if (lock.userId === userId) {
      room.locks.delete(trackId);
      io.to(`project:${projectId}`).emit('lock:released', {
        projectId,
        trackId,
        userId
      });
    }
  }
  
  // Notify others
  socket.to(`project:${projectId}`).emit('user:left', {
    socketId: socket.id,
    userId
  });
  
  socket.leave(`project:${projectId}`);
  
  // Clean up empty rooms after 5 minutes
  if (room.collaborators.size === 0) {
    setTimeout(() => {
      const currentRoom = rooms.get(projectId);
      if (currentRoom && currentRoom.collaborators.size === 0) {
        rooms.delete(projectId);
        console.log(`[${new Date().toISOString()}] 🗑️ Room ${projectId} cleaned up`);
      }
    }, 5 * 60 * 1000);
  }
  
  console.log(`[${new Date().toISOString()}] 👋 ${collaborator?.name || userId} left project ${projectId}`);
}

// ============================================================================
// Start Server
// ============================================================================

httpServer.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║     🤝 Collaboration WebSocket Server                        ║
╠══════════════════════════════════════════════════════════════╣
║  Port:   ${PORT.toString().padEnd(50)}║
║  CORS:   ${CORS_ORIGIN.substring(0, 48).padEnd(50)}║
║  Health: http://localhost:${PORT}/health                          ║
║  Stats:  http://localhost:${PORT}/stats                           ║
╚══════════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n[SIGTERM] Shutting down...');
  
  io.emit('notification', {
    type: 'server_shutdown',
    message: 'Servidor será reiniciado'
  });
  
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n[SIGINT] Shutting down...');
  process.exit(0);
});
