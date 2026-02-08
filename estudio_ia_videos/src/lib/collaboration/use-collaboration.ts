/**
 * 🤝 useCollaboration Hook
 * Hook React para colaboração em tempo real na timeline
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { logger } from '@/lib/logger';
import { io, Socket } from 'socket.io-client';
import { useTimelineStore } from '@lib/stores/timeline-store';
import {
  CollabEvent,
  CollaboratorPresence,
  TrackLock,
  TimelineChange,
  CursorState,
  SelectionState,
  ProjectStatePayload,
  getCollaboratorColor
} from './types';

// ============================================================================
// Types
// ============================================================================

export interface UseCollaborationOptions {
  projectId: string;
  user: {
    id: string;
    name: string;
    email?: string;
    avatar?: string;
  };
  onUserJoined?: (user: CollaboratorPresence) => void;
  onUserLeft?: (userId: string) => void;
  onLockAcquired?: (lock: TrackLock) => void;
  onLockReleased?: (trackId: string) => void;
  onConflict?: (changeId: string, reason: string) => void;
  onRemoteChange?: (change: TimelineChange) => void;
}

export interface UseCollaborationReturn {
  // Status
  isConnected: boolean;
  latency: number;
  
  // Collaborators
  collaborators: CollaboratorPresence[];
  myPresence: CollaboratorPresence | null;
  
  // Locks
  locks: Map<string, TrackLock>;
  myLocks: string[];
  requestLock: (trackId: string) => Promise<boolean>;
  releaseLock: (trackId: string) => void;
  hasLock: (trackId: string) => boolean;
  isLockedByOther: (trackId: string) => boolean;
  getLockOwner: (trackId: string) => CollaboratorPresence | null;
  
  // Cursor & Selection
  updateCursor: (cursor: CursorState) => void;
  updateSelection: (selection: SelectionState) => void;
  
  // Changes
  broadcastChange: (change: Omit<TimelineChange, 'id' | 'userId' | 'timestamp'>) => void;
  
  // Connection
  disconnect: () => void;
  reconnect: () => void;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useCollaboration(options: UseCollaborationOptions): UseCollaborationReturn {
  const { projectId, user, onUserJoined, onUserLeft, onLockAcquired, onLockReleased, onConflict, onRemoteChange } = options;
  
  // State
  const [isConnected, setIsConnected] = useState(false);
  const [latency, setLatency] = useState(0);
  const [collaborators, setCollaborators] = useState<CollaboratorPresence[]>([]);
  const [locks, setLocks] = useState<Map<string, TrackLock>>(new Map());
  const [myPresence, setMyPresence] = useState<CollaboratorPresence | null>(null);
  
  // Refs
  const socketRef = useRef<Socket | null>(null);
  const reconnectAttempts = useRef(0);
  const pendingLockRequests = useRef<Map<string, { resolve: (value: boolean) => void; reject: (error: Error) => void }>>(new Map());
  const cursorThrottle = useRef<NodeJS.Timeout | null>(null);
  
  // Timeline store
  const { updateElement, addElement, removeElement } = useTimelineStore();
  
  // ============================================================================
  // Socket Connection
  // ============================================================================
  
  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;
    
    const socket = io({
      path: '/api/collaboration',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000
    });
    
    socketRef.current = socket;
    
    // Connection Events
    socket.on('connect', () => {
      setIsConnected(true);
      reconnectAttempts.current = 0;
      
      // Join project
      socket.emit(CollabEvent.JOIN_PROJECT, {
        projectId,
        user
      });
    });
    
    socket.on('disconnect', () => {
      setIsConnected(false);
    });
    
    socket.on('connect_error', (error) => {
      logger.error('Connection error:', error instanceof Error ? error : new Error(String(error)));
      reconnectAttempts.current++;
    });
    
    // Project State
    socket.on(CollabEvent.PROJECT_STATE, (state: ProjectStatePayload) => {
      setCollaborators(state.collaborators);
      setLocks(new Map(state.locks.map(l => [l.trackId, l])));
      
      // Find my presence
      const me = state.collaborators.find(c => c.odiserId === user.id);
      setMyPresence(me || null);
    });
    
    // User Events
    socket.on(CollabEvent.USER_JOINED, (newUser: CollaboratorPresence) => {
      setCollaborators(prev => [...prev.filter(c => c.odiserId !== newUser.odiserId), newUser]);
      onUserJoined?.(newUser);
    });
    
    socket.on(CollabEvent.USER_LEFT, ({ userId }: { userId: string }) => {
      setCollaborators(prev => prev.filter(c => c.odiserId !== userId));
      onUserLeft?.(userId);
    });
    
    // Cursor Events
    socket.on(CollabEvent.CURSOR_MOVE, ({ socketId, cursor }: { socketId: string; cursor: CursorState }) => {
      setCollaborators(prev => prev.map(c => 
        c.id === socketId ? { ...c, cursor, lastSeenAt: new Date(), status: 'active' } : c
      ));
    });
    
    // Selection Events
    socket.on(CollabEvent.SELECTION_CHANGE, ({ socketId, selection }: { socketId: string; selection: SelectionState }) => {
      setCollaborators(prev => prev.map(c => 
        c.id === socketId ? { ...c, selection } : c
      ));
    });
    
    // Lock Events
    socket.on(CollabEvent.LOCK_ACQUIRED, ({ trackId, lock }: { trackId: string; lock: TrackLock }) => {
      setLocks(prev => new Map(prev).set(trackId, lock));
      
      // Resolve pending request if it's ours
      const pending = pendingLockRequests.current.get(trackId);
      if (pending && lock.userId === user.id) {
        pending.resolve(true);
        pendingLockRequests.current.delete(trackId);
      }
      
      onLockAcquired?.(lock);
    });
    
    socket.on(CollabEvent.LOCK_DENIED, ({ trackId, error }: { trackId: string; error: string }) => {
      const pending = pendingLockRequests.current.get(trackId);
      if (pending) {
        pending.resolve(false);
        pendingLockRequests.current.delete(trackId);
      }
      logger.warn('Lock denied:', error);
    });
    
    socket.on(CollabEvent.LOCK_RELEASED, ({ trackId }: { trackId: string }) => {
      setLocks(prev => {
        const next = new Map(prev);
        next.delete(trackId);
        return next;
      });
      onLockReleased?.(trackId);
    });
    
    // Change Events
    socket.on(CollabEvent.CHANGE_BROADCAST, ({ change }: { change: TimelineChange }) => {
      // Aplicar mudança remota na timeline
      applyRemoteChange(change);
      onRemoteChange?.(change);
    });
    
    socket.on(CollabEvent.CHANGE_ACK, ({ changeId, accepted, latency: changeLatency }: { changeId: string; accepted: boolean; latency: number }) => {
      if (changeLatency) {
        setLatency(changeLatency);
      }
    });
    
    socket.on(CollabEvent.CHANGE_CONFLICT, ({ changeId, reason }: { changeId: string; reason: string }) => {
      onConflict?.(changeId, reason);
    });
    
    return socket;
  }, [projectId, user, onUserJoined, onUserLeft, onLockAcquired, onLockReleased, onConflict, onRemoteChange]);
  
  // ============================================================================
  // Remote Change Application
  // ============================================================================
  
  const applyRemoteChange = useCallback((change: TimelineChange) => {
    switch (change.type) {
      case 'element:add':
        if (change.data.element) {
          addElement(change.data.element as Parameters<typeof addElement>[0]);
        }
        break;
        
      case 'element:update':
        if (change.elementId && change.data) {
          updateElement(change.elementId, change.data as Parameters<typeof updateElement>[1]);
        }
        break;
        
      case 'element:delete':
        if (change.elementId) {
          removeElement(change.elementId);
        }
        break;
        
      case 'element:move':
        if (change.elementId && change.data.newLayerId !== undefined && change.data.newTime !== undefined) {
          // O moveElement do store deve ser chamado
          useTimelineStore.getState().moveElement(
            change.elementId,
            change.data.newLayerId as string,
            change.data.newTime as number
          );
        }
        break;
        
      // TODO: Implementar outros tipos de mudança
    }
  }, [addElement, updateElement, removeElement]);
  
  // ============================================================================
  // Lock Methods
  // ============================================================================
  
  const requestLock = useCallback(async (trackId: string): Promise<boolean> => {
    if (!socketRef.current?.connected) return false;
    
    // Verificar se já temos o lock
    const existingLock = locks.get(trackId);
    if (existingLock?.userId === user.id) return true;
    
    // Criar promise para aguardar resposta
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        pendingLockRequests.current.delete(trackId);
        resolve(false);
      }, 5000);
      
      pendingLockRequests.current.set(trackId, {
        resolve: (value) => {
          clearTimeout(timeout);
          resolve(value);
        },
        reject
      });
      
      socketRef.current?.emit(CollabEvent.LOCK_REQUEST, {
        projectId,
        trackId
      });
    });
  }, [locks, user.id, projectId]);
  
  const releaseLock = useCallback((trackId: string) => {
    socketRef.current?.emit(CollabEvent.LOCK_RELEASE, {
      projectId,
      trackId
    });
  }, [projectId]);
  
  const hasLock = useCallback((trackId: string): boolean => {
    const lock = locks.get(trackId);
    return lock?.userId === user.id;
  }, [locks, user.id]);
  
  const isLockedByOther = useCallback((trackId: string): boolean => {
    const lock = locks.get(trackId);
    return !!lock && lock.userId !== user.id;
  }, [locks, user.id]);
  
  const getLockOwner = useCallback((trackId: string): CollaboratorPresence | null => {
    const lock = locks.get(trackId);
    if (!lock) return null;
    return collaborators.find(c => c.odiserId === lock.userId) || null;
  }, [locks, collaborators]);
  
  const myLocks = Array.from(locks.values())
    .filter(l => l.userId === user.id)
    .map(l => l.trackId);
  
  // ============================================================================
  // Cursor & Selection Methods
  // ============================================================================
  
  const updateCursor = useCallback((cursor: CursorState) => {
    // Throttle cursor updates para max 60fps
    if (cursorThrottle.current) return;
    
    cursorThrottle.current = setTimeout(() => {
      cursorThrottle.current = null;
    }, 16); // ~60fps
    
    socketRef.current?.emit(CollabEvent.CURSOR_MOVE, {
      projectId,
      cursor
    });
  }, [projectId]);
  
  const updateSelection = useCallback((selection: SelectionState) => {
    socketRef.current?.emit(CollabEvent.SELECTION_CHANGE, {
      projectId,
      selection
    });
  }, [projectId]);
  
  // ============================================================================
  // Change Broadcasting
  // ============================================================================
  
  const broadcastChange = useCallback((change: Omit<TimelineChange, 'id' | 'userId' | 'timestamp'>) => {
    const fullChange: TimelineChange = {
      ...change,
      id: `change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: user.id,
      timestamp: Date.now(),
      projectId
    };
    
    socketRef.current?.emit(CollabEvent.CHANGE_BROADCAST, {
      projectId,
      change: fullChange
    });
  }, [user.id, projectId]);
  
  // ============================================================================
  // Connection Management
  // ============================================================================
  
  const disconnect = useCallback(() => {
    socketRef.current?.disconnect();
    socketRef.current = null;
    setIsConnected(false);
  }, []);
  
  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(connect, 100);
  }, [disconnect, connect]);
  
  // ============================================================================
  // Effects
  // ============================================================================
  
  // Connect on mount
  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);
  
  // Update idle status
  useEffect(() => {
    let idleTimeout: NodeJS.Timeout;
    
    const resetIdle = () => {
      clearTimeout(idleTimeout);
      idleTimeout = setTimeout(() => {
        // Mark as idle after 2 minutes of inactivity
        if (myPresence && myPresence.status !== 'idle') {
          socketRef.current?.emit(CollabEvent.PRESENCE_UPDATE, {
            projectId,
            status: 'idle'
          });
        }
      }, 2 * 60 * 1000);
    };
    
    window.addEventListener('mousemove', resetIdle);
    window.addEventListener('keydown', resetIdle);
    
    return () => {
      clearTimeout(idleTimeout);
      window.removeEventListener('mousemove', resetIdle);
      window.removeEventListener('keydown', resetIdle);
    };
  }, [myPresence, projectId]);
  
  // ============================================================================
  // Return
  // ============================================================================
  
  return {
    isConnected,
    latency,
    collaborators,
    myPresence,
    locks,
    myLocks,
    requestLock,
    releaseLock,
    hasLock,
    isLockedByOther,
    getLockOwner,
    updateCursor,
    updateSelection,
    broadcastChange,
    disconnect,
    reconnect
  };
}
