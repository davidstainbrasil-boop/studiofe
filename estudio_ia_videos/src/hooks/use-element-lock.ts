/**
 * 🔒 Element Lock Hook
 * Prevents conflicting edits by locking elements during selection
 */

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface ElementLock {
  elementId: string;
  lockedBy: string;
  lockedByName: string;
  lockedAt: Date;
}

interface UseElementLockOptions {
  projectId: string | null;
  userId?: string;
  userName?: string;
  lockTimeoutMs?: number; // Auto-release after this duration
}

export function useElementLock(options: UseElementLockOptions) {
  const { projectId, userId, userName, lockTimeoutMs = 30000 } = options;
  
  const [locks, setLocks] = useState<Map<string, ElementLock>>(new Map());
  const [myLockedElements, setMyLockedElements] = useState<Set<string>>(new Set());
  const socketRef = useRef<Socket | null>(null);
  const lockTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Connect to WebSocket
  useEffect(() => {
    if (!projectId) return;

    const socketUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    const socket = io(socketUrl, {
      path: '/api/socket/timeline',
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      socket.emit('join-project', { projectId });
    });

    // Handle element locked
    socket.on('element-locked', (data: { elementId: string; userId: string; userName: string }) => {
      if (data.userId === userId) return;
      
      setLocks(prev => {
        const next = new Map(prev);
        next.set(data.elementId, {
          elementId: data.elementId,
          lockedBy: data.userId,
          lockedByName: data.userName,
          lockedAt: new Date()
        });
        return next;
      });
    });

    // Handle element unlocked
    socket.on('element-unlocked', (data: { elementId: string }) => {
      setLocks(prev => {
        const next = new Map(prev);
        next.delete(data.elementId);
        return next;
      });
    });

    socketRef.current = socket;

    return () => {
      // Release all my locks before disconnecting
      myLockedElements.forEach(elementId => {
        socket.emit('element-unlocked', { projectId, elementId });
      });
      socket.disconnect();
    };
  }, [projectId, userId, myLockedElements]);

  // Request lock on an element
  const requestLock = useCallback((elementId: string): boolean => {
    // Check if already locked by someone else
    const existingLock = locks.get(elementId);
    if (existingLock && existingLock.lockedBy !== userId) {
      return false; // Cannot lock - already locked by another user
    }

    // Already locked by me
    if (myLockedElements.has(elementId)) {
      return true;
    }

    // Emit lock request
    if (socketRef.current?.connected && projectId) {
      socketRef.current.emit('element-locked', {
        projectId,
        elementId,
        userId,
        userName: userName || 'Anonymous'
      });
    }

    // Track my locked elements
    setMyLockedElements(prev => new Set(prev).add(elementId));

    // Set auto-release timeout
    const timeout = setTimeout(() => {
      releaseLock(elementId);
    }, lockTimeoutMs);
    lockTimeoutsRef.current.set(elementId, timeout);

    return true;
  }, [projectId, userId, userName, locks, myLockedElements, lockTimeoutMs]);

  // Release lock on an element
  const releaseLock = useCallback((elementId: string) => {
    if (!myLockedElements.has(elementId)) return;

    // Emit unlock
    if (socketRef.current?.connected && projectId) {
      socketRef.current.emit('element-unlocked', {
        projectId,
        elementId
      });
    }

    // Clear timeout
    const timeout = lockTimeoutsRef.current.get(elementId);
    if (timeout) {
      clearTimeout(timeout);
      lockTimeoutsRef.current.delete(elementId);
    }

    // Remove from my locked elements
    setMyLockedElements(prev => {
      const next = new Set(prev);
      next.delete(elementId);
      return next;
    });
  }, [projectId, myLockedElements]);

  // Release all my locks
  const releaseAllLocks = useCallback(() => {
    myLockedElements.forEach(elementId => {
      releaseLock(elementId);
    });
  }, [myLockedElements, releaseLock]);

  // Check if an element is locked
  const isLocked = useCallback((elementId: string): boolean => {
    const lock = locks.get(elementId);
    return !!lock && lock.lockedBy !== userId;
  }, [locks, userId]);

  // Get lock info for an element
  const getLockInfo = useCallback((elementId: string): ElementLock | null => {
    return locks.get(elementId) || null;
  }, [locks]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      lockTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      lockTimeoutsRef.current.clear();
    };
  }, []);

  return {
    locks: Array.from(locks.values()),
    myLockedElements: Array.from(myLockedElements),
    requestLock,
    releaseLock,
    releaseAllLocks,
    isLocked,
    getLockInfo
  };
}
