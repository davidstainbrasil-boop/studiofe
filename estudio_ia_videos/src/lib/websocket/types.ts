/**
 * 🔌 WebSocket Types
 * Types for Socket.IO real-time collaboration
 */

export interface SocketUser {
  id: string;
  name: string;
  avatarUrl?: string;
  color?: string;
}

export interface CursorMoveData {
  userId: string;
  x: number;
  y: number;
  elementId?: string;
}

export interface SelectionChangeData {
  userId: string;
  selectedIds: string[];
  trackId?: string;
}

/** Event name constants for Socket.IO timeline collaboration */
export const TimelineEvent = {
  JOIN_PROJECT: 'join-project',
  LEAVE_PROJECT: 'leave-project',
  USER_JOINED: 'user-joined',
  USER_LEFT: 'user-left',
  ACTIVE_USERS: 'active-users',
  CURSOR_MOVE: 'cursor-move',
  SELECTION_CHANGE: 'selection-change',
  TIMELINE_UPDATE: 'timeline-update',
  ELEMENT_ADDED: 'element-added',
  ELEMENT_REMOVED: 'element-removed',
  ELEMENT_UPDATED: 'element-updated',
  TRACK_ADDED: 'track-added',
  TRACK_REMOVED: 'track-removed',
} as const;

export type TimelineEventType = typeof TimelineEvent[keyof typeof TimelineEvent];
