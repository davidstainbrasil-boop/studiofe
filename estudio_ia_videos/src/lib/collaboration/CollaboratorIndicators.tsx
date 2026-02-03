/**
 * 👥 CollaboratorIndicators Component
 * Mostra avatares dos colaboradores ativos e cursores em tempo real
 */

'use client';

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CollaboratorPresence, TrackLock } from './types';

// ============================================================================
// Types
// ============================================================================

interface CollaboratorIndicatorsProps {
  collaborators: CollaboratorPresence[];
  currentUserId: string;
  className?: string;
}

interface CollaboratorAvatarProps {
  collaborator: CollaboratorPresence;
  size?: 'sm' | 'md' | 'lg';
}

interface CollaboratorCursorProps {
  collaborator: CollaboratorPresence;
  containerRef?: React.RefObject<HTMLElement>;
}

interface TrackLockIndicatorProps {
  lock: TrackLock;
  collaborators: CollaboratorPresence[];
}

// ============================================================================
// Avatar Component
// ============================================================================

export function CollaboratorAvatar({ collaborator, size = 'md' }: CollaboratorAvatarProps) {
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base'
  };
  
  const statusColors = {
    active: 'bg-green-500',
    idle: 'bg-yellow-500',
    away: 'bg-gray-400'
  };
  
  const initials = collaborator.name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  
  return (
    <div className="relative" title={`${collaborator.name} (${collaborator.status})`}>
      {collaborator.avatar ? (
        <img
          src={collaborator.avatar}
          alt={collaborator.name}
          className={`${sizeClasses[size]} rounded-full object-cover`}
          style={{ outline: `2px solid ${collaborator.color}`, outlineOffset: '1px' }}
        />
      ) : (
        <div
          className={`${sizeClasses[size]} rounded-full flex items-center justify-center text-white font-medium`}
          style={{ backgroundColor: collaborator.color, outline: `2px solid ${collaborator.color}`, outlineOffset: '1px' }}
        >
          {initials}
        </div>
      )}
      
      {/* Status indicator */}
      <span
        className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${statusColors[collaborator.status]}`}
      />
    </div>
  );
}

// ============================================================================
// Cursor Component
// ============================================================================

export function CollaboratorCursor({ collaborator, containerRef }: CollaboratorCursorProps) {
  if (!collaborator.cursor) return null;
  
  return (
    <motion.div
      className="pointer-events-none absolute z-50"
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{
        opacity: 1,
        scale: 1,
        x: collaborator.cursor.x,
        y: collaborator.cursor.y
      }}
      exit={{ opacity: 0, scale: 0.5 }}
      transition={{ type: 'spring', damping: 30, stiffness: 500 }}
    >
      {/* Cursor SVG */}
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        style={{ transform: 'rotate(-15deg)' }}
      >
        <path
          d="M5.5 3L19 12L12 13L9 20L5.5 3Z"
          fill={collaborator.color}
          stroke="white"
          strokeWidth="1.5"
        />
      </svg>
      
      {/* Name tag */}
      <div
        className="absolute left-4 top-4 px-2 py-0.5 rounded text-xs text-white whitespace-nowrap"
        style={{ backgroundColor: collaborator.color }}
      >
        {collaborator.name}
      </div>
    </motion.div>
  );
}

// ============================================================================
// Collaborators Bar Component
// ============================================================================

export function CollaboratorIndicators({ collaborators, currentUserId, className = '' }: CollaboratorIndicatorsProps) {
  const otherCollaborators = useMemo(
    () => collaborators.filter(c => c.odiserId !== currentUserId),
    [collaborators, currentUserId]
  );
  
  if (otherCollaborators.length === 0) return null;
  
  const displayedCollaborators = otherCollaborators.slice(0, 5);
  const hiddenCount = Math.max(0, otherCollaborators.length - 5);
  
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <span className="text-xs text-gray-500 mr-1">Editando:</span>
      
      <div className="flex -space-x-2">
        <AnimatePresence mode="popLayout">
          {displayedCollaborators.map((collaborator) => (
            <motion.div
              key={collaborator.id}
              initial={{ opacity: 0, scale: 0.5, x: -10 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.5, x: 10 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            >
              <CollaboratorAvatar collaborator={collaborator} size="sm" />
            </motion.div>
          ))}
        </AnimatePresence>
        
        {hiddenCount > 0 && (
          <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-600 ring-2 ring-white">
            +{hiddenCount}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Track Lock Indicator Component
// ============================================================================

export function TrackLockIndicator({ lock, collaborators }: TrackLockIndicatorProps) {
  const owner = collaborators.find(c => c.odiserId === lock.userId);
  
  return (
    <div
      className="absolute inset-0 pointer-events-none border-2 rounded opacity-50"
      style={{ borderColor: lock.userColor }}
    >
      <div
        className="absolute -top-6 left-2 px-2 py-0.5 rounded text-xs text-white flex items-center gap-1"
        style={{ backgroundColor: lock.userColor }}
      >
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
            clipRule="evenodd"
          />
        </svg>
        <span>{owner?.name || lock.userName}</span>
      </div>
    </div>
  );
}

// ============================================================================
// Selection Highlight Component
// ============================================================================

interface SelectionHighlightProps {
  collaborator: CollaboratorPresence;
  elementBounds: Map<string, DOMRect>;
}

export function SelectionHighlight({ collaborator, elementBounds }: SelectionHighlightProps) {
  if (!collaborator.selection?.elementIds.length) return null;
  
  return (
    <>
      {collaborator.selection.elementIds.map(elementId => {
        const bounds = elementBounds.get(elementId);
        if (!bounds) return null;
        
        return (
          <motion.div
            key={`${collaborator.id}-${elementId}`}
            className="absolute pointer-events-none border-2 rounded"
            style={{
              borderColor: collaborator.color,
              left: bounds.left,
              top: bounds.top,
              width: bounds.width,
              height: bounds.height,
              boxShadow: `0 0 0 1px ${collaborator.color}40`
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        );
      })}
    </>
  );
}

// ============================================================================
// Connection Status Component
// ============================================================================

interface ConnectionStatusProps {
  isConnected: boolean;
  latency: number;
  collaboratorCount: number;
}

export function ConnectionStatus({ isConnected, latency, collaboratorCount }: ConnectionStatusProps) {
  return (
    <div className="flex items-center gap-2 text-xs">
      {/* Connection indicator */}
      <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
      
      {isConnected ? (
        <>
          <span className="text-gray-500">
            {collaboratorCount} online
          </span>
          {latency > 0 && (
            <span className={`${latency > 100 ? 'text-yellow-500' : 'text-gray-400'}`}>
              {latency}ms
            </span>
          )}
        </>
      ) : (
        <span className="text-red-500">Desconectado</span>
      )}
    </div>
  );
}
