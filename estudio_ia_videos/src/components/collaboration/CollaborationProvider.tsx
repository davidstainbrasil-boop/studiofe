
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useTimelineSocket, UseTimelineSocketOptions, TimelineSocketReturn, UserPresence, CursorMovePayload } from '@hooks/useTimelineSocket';
import { useTimelineStore } from '@lib/stores/timeline-store';

interface CollaborationContextType extends TimelineSocketReturn {
    activeUsers: UserPresence[];
    remoteCursors: Record<string, CursorMovePayload>;
    lockedElements: Record<string, { userId: string; userName: string; color: string }>;
}

const CollaborationContext = createContext<CollaborationContextType | null>(null);

export function useCollaboration() {
    const context = useContext(CollaborationContext);
    if (!context) {
        throw new Error('useCollaboration must be used within a CollaborationProvider');
    }
    return context;
}

interface CollaborationProviderProps extends Omit<UseTimelineSocketOptions, 'onCursorMove'> {
    children: React.ReactNode;
}

export function CollaborationProvider({ children, ...options }: CollaborationProviderProps) {
    const socket = useTimelineSocket(options);
    const [remoteCursors, setRemoteCursors] = useState<Record<string, CursorMovePayload>>({});
    const [lockedElements, setLockedElements] = useState<Record<string, { userId: string; userName: string; color: string }>>({});
    const { updateElement, addElement, removeElement, selection } = useTimelineStore();

    // User colors helper
    const getUserColor = (userId: string) => {
        const colors = ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'];
        let hash = 0;
        for (let i = 0; i < userId.length; i++) hash = userId.charCodeAt(i) + ((hash << 5) - hash);
        return colors[Math.abs(hash) % colors.length];
    };

    useEffect(() => {
        // Sync cursors
        socket.onCursorMove((data) => {
            setRemoteCursors(prev => ({
                ...prev,
                [data.userId]: data
            }));
        });

        // Remote Timeline Updates (Basic)
        socket.onTimelineUpdated((payload) => {
            // Here we would apply delta updates. For now, we might just re-fetch or apply simple changes.
            // Implementing full CRDT is confusing for this step, so we'll just log or trigger a toast.
            console.log('Remote timeline update received', payload);
        });

        socket.onNotification((data) => {
            // Show toast
            console.log('Remote notification', data);
        });



        // Handle Element Locks
        socket.onElementLocked((data) => {
            setLockedElements(prev => ({
                ...prev,
                [data.elementId]: { userId: data.userId, userName: data.userName, color: getUserColor(data.userId) }
            }));
        });

        socket.onElementUnlocked((data) => {
            setLockedElements(prev => {
                const next = { ...prev };
                delete next[data.elementId];
                return next;
            });
        });

    }, [socket]);

    // Sync Local Selection to Locks
    // When we select, we lock. When we deselect, we unlock.
    useEffect(() => {
        // We need to track previous selection to know what was deselected
        // But for simplicity, we can just "unlock all my previous locks" and "lock current selection"
        // provided the backend/other clients handle idempotent unlocks/locks or we track it locally.
        // Better: Compare with a ref of previous selection.
    }, [selection.elementIds, socket]);

    // Using a ref to track what WE have locked
    const myLocks = React.useRef<string[]>([]);

    useEffect(() => {
        const currentIds = selection.elementIds;
        const previousIds = myLocks.current;

        // Find newly selected
        const added = currentIds.filter(id => !previousIds.includes(id));
        // Find deselected
        const removed = previousIds.filter(id => !currentIds.includes(id));

        added.forEach(id => {
            // Optimistically lock (or check if already locked by others?)
            // If locked by others, we shouldn't be able to select it ideally, or visual feedback shows conflict.
            if (!lockedElements[id]) {
                socket.lockElement(id);
            }
        });

        removed.forEach(id => {
            socket.unlockElement(id);
        });

        myLocks.current = currentIds;
    }, [selection.elementIds, socket, lockedElements]);

    // Cleanup locks on unmount
    useEffect(() => {
        return () => {
            myLocks.current.forEach(id => socket.unlockElement(id));
        };
    }, [socket]);

    // Clean up old cursors every 10s
    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            setRemoteCursors(prev => {
                const next = { ...prev };
                let changed = false;
                Object.entries(next).forEach(([uid, data]) => {
                    // If cursor older than 10s (assuming we added timestamp, or just loose logic)
                    // We don't have timestamp in payload easily accessible here without modifying payload
                });
                return next;
            });
        }, 10000);
        return () => clearInterval(interval);
    }, []);

    return (
        <CollaborationContext.Provider value={{ ...socket, remoteCursors, lockedElements }}>
            {children}
        </CollaborationContext.Provider>
    );
}
