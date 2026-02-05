/**
 * 🔄 Real-Time Collaboration Components
 * UI components for displaying collaborative features
 */

'use client';

import React, { useCallback } from 'react';
import { User } from 'lucide-react';

// Types for collaboration
export interface UserPresence {
  userId: string;
  email: string;
  name?: string;
  avatar?: string;
  cursor?: CursorPosition;
  selection?: SelectionRange;
  isActive: boolean;
  joinedAt: Date;
  lastSeen: Date;
}

export interface CursorPosition {
  slideId: string;
  elementId?: string;
  offset: number;
  line?: number;
  column?: number;
}

interface SelectionRange {
  slideId: string;
  start: CursorPosition;
  end: CursorPosition;
}

interface CollaborationCursorsProps {
  users: UserPresence[];
  currentSlideId?: string;
}

export function CollaborationCursors({ users, currentSlideId }: CollaborationCursorsProps) {
  const activeCursors = users.filter(user => 
    !user.isActive && // Not current user
    user.cursor && 
    user.cursor.slideId === currentSlideId
  );

  return (
    <div className="collaboration-cursors">
      {activeCursors.map(user => (
        <div
          key={user.userId}
          className="collaboration-cursor"
          style={{
            position: 'absolute',
            left: `${calculateCursorPosition(user.cursor!).x}px`,
            top: `${calculateCursorPosition(user.cursor!).y}px`,
            zIndex: 1000
          }}
        >
          <div 
            className="cursor-line"
            style={{
              width: '2px',
              height: '20px',
              backgroundColor: getUserColor(user.userId),
              position: 'absolute'
            }}
          />
          <div 
            className="cursor-label"
            style={{
              position: 'absolute',
              top: '-20px',
              left: '2px',
              backgroundColor: getUserColor(user.userId),
              color: 'white',
              padding: '2px 6px',
              borderRadius: '3px',
              fontSize: '12px',
              whiteSpace: 'nowrap'
            }}
          >
            {user.name || user.email}
          </div>
        </div>
      ))}
    </div>
  );
}

interface OnlineUsersProps {
  users: UserPresence[];
  currentUserId?: string;
}

export function OnlineUsers({ users, currentUserId }: OnlineUsersProps) {
  const otherUsers = users.filter(user => user.userId !== currentUserId);

  if (otherUsers.length === 0) {
    return null;
  }

  return (
    <div className="online-users p-3 bg-white border-l border-gray-200">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Online ({otherUsers.length + 1})</h3>
      
      <div className="space-y-2">
        {/* Current user */}
        <div className="flex items-center space-x-2 text-sm">
          <div className="relative">
            <div 
              className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center"
            >
              <User className="w-3 h-3 text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
          </div>
          <span className="text-gray-700">You</span>
        </div>

        {/* Other users */}
        {otherUsers.map(user => (
          <div key={user.userId} className="flex items-center space-x-2 text-sm">
            <div className="relative">
              {user.avatar ? (
                <img 
                  src={user.avatar} 
                  alt={user.name || user.email}
                  className="w-6 h-6 rounded-full"
                />
              ) : (
                <div 
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium"
                  style={{ backgroundColor: getUserColor(user.userId) }}
                >
                  {(user.name || user.email).charAt(0).toUpperCase()}
                </div>
              )}
              <div 
                className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                  user.isActive ? 'bg-green-500' : 'bg-gray-400'
                }`}
              />
            </div>
            <div className="flex-1">
              <div className="text-gray-900 font-medium">
                {user.name || user.email}
              </div>
              {user.cursor?.slideId && (
                <div className="text-gray-500 text-xs">
                  Editing slide {user.cursor.slideId}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface LiveEditorProps {
  children: React.ReactNode;
  onOperation: (operation: any) => void;
  onCursorMove: (cursor: CursorPosition) => void;
  disabled?: boolean;
}

export function LiveEditor({ children, onOperation, onCursorMove, disabled = false }: LiveEditorProps) {
  const handleTextChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    if (disabled) return;

    const operation = {
      type: 'text-change',
      data: {
        value: event.target.value,
        cursor: event.target.selectionStart || 0
      }
    };

    onOperation(operation);
  }, [onOperation, disabled]);

  const handleSelectionChange = useCallback((event: React.SyntheticEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    if (disabled) return;

    const target = event.target as HTMLTextAreaElement | HTMLInputElement;
    const cursor: CursorPosition = {
      slideId: 'current', // This would be determined by context
      offset: target.selectionStart || 0
    };

    onCursorMove(cursor);
  }, [onCursorMove, disabled]);

  return (
    <div className="live-editor">
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, {
            onChange: handleTextChange,
            onSelect: handleSelectionChange,
            disabled
          });
        }
        return child;
      })}
    </div>
  );
}

interface ConflictBannerProps {
  conflicts: Array<{
    userId: string;
    userName: string;
    slideId: string;
    message: string;
  }>;
  onResolve?: (conflictId: string) => void;
}

export function ConflictBanner({ conflicts, onResolve }: ConflictBannerProps) {
  if (conflicts.length === 0) {
    return null;
  }

  return (
    <div className="conflict-banner bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-yellow-800">
            Edit Conflicts Detected
          </h3>
          <div className="mt-2 text-sm text-yellow-700">
            {conflicts.map((conflict, index) => (
              <div key={index} className="mb-1">
                <strong>{conflict.userName}</strong> is editing slide {conflict.slideId}: {conflict.message}
              </div>
            ))}
          </div>
          {onResolve && (
            <div className="mt-3">
              <button
                onClick={() => onResolve(conflicts[0].userId)}
                className="text-sm font-medium text-yellow-800 hover:text-yellow-900 underline"
              >
                Resolve Conflicts
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Utility functions
const userColors: Record<string, string> = {};
const colorPalette = [
  '#3B82F6', // blue
  '#10B981', // emerald  
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#14B8A6', // teal
  '#F97316', // orange
];

function getUserColor(userId: string): string {
  if (!userColors[userId]) {
    userColors[userId] = colorPalette[Object.keys(userColors).length % colorPalette.length];
  }
  return userColors[userId];
}

function calculateCursorPosition(cursor: CursorPosition): { x: number; y: number } {
  // Simple calculation - in real implementation would account for text metrics
  return {
    x: cursor.offset * 8 + (cursor.line || 0) * 50, // Approximate character width
    y: cursor.line ? cursor.line * 20 : 100
  };
}

// Components are already exported individually