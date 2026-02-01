'use client';

/**
 * Collaborator Cursors Component
 * 
 * Displays real-time cursors of other collaborators on the canvas.
 */

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCollaboration, Collaborator } from '@/lib/collaboration/collaboration-provider';
import { cn } from '@/lib/utils';

interface CursorPosition {
  userId: string;
  slideId: string;
  x: number;
  y: number;
}

interface CollaboratorCursorsProps {
  currentSlideId: string;
  className?: string;
}

export function CollaboratorCursors({ currentSlideId, className }: CollaboratorCursorsProps) {
  const { collaborators, currentUser, onEvent } = useCollaboration();
  const [cursorPositions, setCursorPositions] = useState<Map<string, CursorPosition>>(new Map());

  // Listen for cursor updates
  useEffect(() => {
    const unsubscribe = onEvent((event) => {
      if (event.type === 'cursor_move') {
        const payload = event.payload as { slideId: string; x: number; y: number };
        setCursorPositions((prev) => {
          const next = new Map(prev);
          next.set(event.userId, {
            userId: event.userId,
            ...payload,
          });
          return next;
        });
      }
    });

    return unsubscribe;
  }, [onEvent]);

  // Remove cursor after inactivity
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setCursorPositions((prev) => {
        const next = new Map(prev);
        for (const [userId, position] of next) {
          // This would need timestamp tracking for proper cleanup
          // For now, just keep all cursors
        }
        return next;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Get cursors for current slide (excluding current user)
  const visibleCursors = useMemo(() => {
    const cursors: Array<CursorPosition & { user: Collaborator }> = [];
    
    for (const [userId, position] of cursorPositions) {
      if (position.slideId !== currentSlideId) continue;
      if (currentUser && userId === currentUser.id) continue;
      
      const user = collaborators.find(c => c.id === userId);
      if (user) {
        cursors.push({ ...position, user });
      }
    }
    
    return cursors;
  }, [cursorPositions, currentSlideId, collaborators, currentUser]);

  return (
    <div className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}>
      <AnimatePresence>
        {visibleCursors.map(({ userId, x, y, user }) => (
          <motion.div
            key={userId}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 500 }}
            style={{
              position: 'absolute',
              left: `${x}%`,
              top: `${y}%`,
              transform: 'translate(-2px, -2px)',
            }}
          >
            {/* Cursor Arrow */}
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}
            >
              <path
                d="M5.65376 3.24512L18.5637 11.1196C19.2837 11.5506 19.2437 12.5596 18.4937 12.9356L12.1537 16.1856L8.79376 21.6256C8.35376 22.3456 7.28376 22.1756 7.08376 21.3456L4.01376 4.28512C3.81376 3.39512 4.84376 2.74512 5.65376 3.24512Z"
                fill={user.color}
                stroke="white"
                strokeWidth="1.5"
              />
            </svg>
            
            {/* Name Label */}
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="ml-5 mt-1 px-2 py-0.5 rounded text-xs font-medium text-white whitespace-nowrap"
              style={{ backgroundColor: user.color }}
            >
              {user.name}
            </motion.div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export default CollaboratorCursors;
