/**
 * 👥 Collaborators Hook
 * Real-time presence tracking for project collaborators
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { TimelineEvent } from '@lib/websocket/types';

export interface Collaborator {
  id: string;
  name: string;
  avatarUrl?: string;
  color: string;
  isOnline: boolean;
  joinedAt: Date;
  cursorPosition?: { x: number; y: number };
  selectedElementId?: string;
}

interface UseCollaboratorsOptions {
  projectId: string | null;
  userId?: string;
  userName?: string;
  userAvatar?: string;
}

// Predefined colors for collaborators
const COLLABORATOR_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
  '#BB8FCE', '#85C1E9', '#F8B500', '#00CED1'
];

export function useCollaborators(options: UseCollaboratorsOptions) {
  const { projectId, userId, userName, userAvatar } = options;
  
  const [collaborators, setCollaborators] = useState<Map<string, Collaborator>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const colorIndexRef = useRef(0);

  // Assign a color to a new collaborator
  const getNextColor = useCallback(() => {
    const color = COLLABORATOR_COLORS[colorIndexRef.current % COLLABORATOR_COLORS.length];
    colorIndexRef.current++;
    return color;
  }, []);

  // Connect to WebSocket
  useEffect(() => {
    if (!projectId) return;

    const socketUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    const socket = io(socketUrl, {
      path: '/api/socket/timeline',
      transports: ['websocket', 'polling'],
      auth: {
        token: typeof window !== 'undefined' 
          ? document.cookie.split('; ').find(c => c.startsWith('sb-'))?.split('=')[1] 
          : undefined
      }
    });

    socket.on('connect', () => {
      setIsConnected(true);
      
      // Join project room
      socket.emit(TimelineEvent.JOIN_PROJECT, {
        projectId,
        userName: userName || 'Anonymous',
        userImage: userAvatar
      });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    // Handle user joined
    socket.on(TimelineEvent.USER_JOINED, (data: { userId: string; userName: string; userImage?: string }) => {
      if (data.userId === userId) return; // Skip self
      
      setCollaborators(prev => {
        const next = new Map(prev);
        if (!next.has(data.userId)) {
          next.set(data.userId, {
            id: data.userId,
            name: data.userName || 'Anonymous',
            avatarUrl: data.userImage,
            color: getNextColor(),
            isOnline: true,
            joinedAt: new Date()
          });
        }
        return next;
      });
    });

    // Handle user left
    socket.on(TimelineEvent.USER_LEFT, (data: { userId: string }) => {
      setCollaborators(prev => {
        const next = new Map(prev);
        const user = next.get(data.userId);
        if (user) {
          next.set(data.userId, { ...user, isOnline: false });
        }
        return next;
      });
    });

    // Handle active users list
    socket.on(TimelineEvent.ACTIVE_USERS, (data: { users: string[] }) => {
      // Mark users as online/offline based on active list
      setCollaborators(prev => {
        const next = new Map(prev);
        for (const [id, collab] of next) {
          const isOnline = data.users.includes(id);
          if (collab.isOnline !== isOnline) {
            next.set(id, { ...collab, isOnline });
          }
        }
        return next;
      });
    });

    // Handle cursor move from other users
    socket.on(TimelineEvent.CURSOR_MOVE, (data: { userId: string; x: number; y: number }) => {
      if (data.userId === userId) return;
      
      setCollaborators(prev => {
        const next = new Map(prev);
        const user = next.get(data.userId);
        if (user) {
          next.set(data.userId, {
            ...user,
            cursorPosition: { x: data.x, y: data.y }
          });
        }
        return next;
      });
    });

    // Handle selection change from other users
    socket.on(TimelineEvent.SELECTION_CHANGE, (data: { userId: string; selectedIds: string[] }) => {
      if (data.userId === userId) return;
      
      setCollaborators(prev => {
        const next = new Map(prev);
        const user = next.get(data.userId);
        if (user) {
          next.set(data.userId, {
            ...user,
            selectedElementId: data.selectedIds[0] // Track first selected element
          });
        }
        return next;
      });
    });

    socketRef.current = socket;

    return () => {
      if (socket.connected && projectId) {
        socket.emit(TimelineEvent.LEAVE_PROJECT, { projectId });
      }
      socket.disconnect();
    };
  }, [projectId, userId, userName, userAvatar, getNextColor]);

  // Emit cursor position (throttled)
  const emitCursorPosition = useCallback((x: number, y: number) => {
    if (socketRef.current?.connected && projectId) {
      socketRef.current.emit(TimelineEvent.CURSOR_MOVE, {
        projectId,
        x,
        y
      });
    }
  }, [projectId]);

  // Emit selection change
  const emitSelectionChange = useCallback((selectedIds: string[]) => {
    if (socketRef.current?.connected && projectId) {
      socketRef.current.emit(TimelineEvent.SELECTION_CHANGE, {
        projectId,
        selectedIds
      });
    }
  }, [projectId]);

  // Get online collaborators
  const onlineCollaborators = Array.from(collaborators.values()).filter(c => c.isOnline);

  return {
    collaborators: Array.from(collaborators.values()),
    onlineCollaborators,
    isConnected,
    emitCursorPosition,
    emitSelectionChange
  };
}
