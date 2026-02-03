/**
 * 🤝 Collaboration Types
 * Tipos para sistema de colaboração em tempo real na timeline
 */

// ============================================================================
// Presence Types
// ============================================================================

export interface CollaboratorPresence {
  id: string;
  odiserId: string;
  name: string;
  email?: string;
  avatar?: string;
  color: string;
  cursor: CursorState | null;
  selection: SelectionState | null;
  activeTrackId: string | null;
  lastSeenAt: Date;
  status: 'active' | 'idle' | 'away';
}

export interface CursorState {
  x: number;
  y: number;
  timestamp: number;
  trackId?: string;
  elementId?: string;
}

export interface SelectionState {
  elementIds: string[];
  trackIds: string[];
  timeRange: { start: number; end: number } | null;
}

// ============================================================================
// Lock Types
// ============================================================================

export interface TrackLock {
  id: string;
  projectId: string;
  trackId: string;
  userId: string;
  userName: string;
  userColor: string;
  createdAt: Date;
  expiresAt: Date;
}

export interface LockRequest {
  projectId: string;
  trackId: string;
  userId: string;
  userName: string;
  userColor: string;
}

export interface LockResult {
  success: boolean;
  lock?: TrackLock;
  error?: string;
  existingLock?: TrackLock;
}

// ============================================================================
// Timeline Change Types
// ============================================================================

export type ChangeType = 
  | 'element:add'
  | 'element:update'
  | 'element:delete'
  | 'element:move'
  | 'track:add'
  | 'track:update'
  | 'track:delete'
  | 'track:reorder'
  | 'keyframe:add'
  | 'keyframe:update'
  | 'keyframe:delete'
  | 'project:settings';

export interface TimelineChange {
  id: string;
  type: ChangeType;
  projectId: string;
  trackId?: string;
  elementId?: string;
  userId: string;
  timestamp: number;
  data: Record<string, unknown>;
  previousData?: Record<string, unknown>;
}

export interface ChangeAck {
  changeId: string;
  accepted: boolean;
  conflictWith?: string;
  resolvedData?: Record<string, unknown>;
}

// ============================================================================
// WebSocket Events
// ============================================================================

export enum CollabEvent {
  // Connection
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  ERROR = 'error',
  
  // Room Management
  JOIN_PROJECT = 'collab:join',
  LEAVE_PROJECT = 'collab:leave',
  PROJECT_STATE = 'collab:state',
  
  // Presence
  PRESENCE_UPDATE = 'presence:update',
  PRESENCE_SYNC = 'presence:sync',
  CURSOR_MOVE = 'cursor:move',
  SELECTION_CHANGE = 'selection:change',
  
  // Locks
  LOCK_REQUEST = 'lock:request',
  LOCK_ACQUIRED = 'lock:acquired',
  LOCK_DENIED = 'lock:denied',
  LOCK_RELEASE = 'lock:release',
  LOCK_RELEASED = 'lock:released',
  LOCK_EXPIRED = 'lock:expired',
  LOCKS_SYNC = 'locks:sync',
  
  // Timeline Changes
  CHANGE_BROADCAST = 'change:broadcast',
  CHANGE_ACK = 'change:ack',
  CHANGE_CONFLICT = 'change:conflict',
  CHANGES_SYNC = 'changes:sync',
  
  // Notifications
  USER_JOINED = 'user:joined',
  USER_LEFT = 'user:left',
  NOTIFICATION = 'notification'
}

// ============================================================================
// WebSocket Payloads
// ============================================================================

export interface JoinProjectPayload {
  projectId: string;
  user: {
    id: string;
    name: string;
    email?: string;
    avatar?: string;
  };
}

export interface ProjectStatePayload {
  projectId: string;
  collaborators: CollaboratorPresence[];
  locks: TrackLock[];
  pendingChanges: TimelineChange[];
}

export interface CursorMovePayload {
  projectId: string;
  cursor: CursorState;
}

export interface SelectionChangePayload {
  projectId: string;
  selection: SelectionState;
}

export interface LockRequestPayload {
  projectId: string;
  trackId: string;
}

export interface LockResponsePayload {
  projectId: string;
  trackId: string;
  lock?: TrackLock;
  error?: string;
}

export interface ChangeBroadcastPayload {
  projectId: string;
  change: TimelineChange;
}

export interface ChangeAckPayload {
  projectId: string;
  ack: ChangeAck;
}

// ============================================================================
// Collaboration State
// ============================================================================

export interface CollaborationState {
  isConnected: boolean;
  projectId: string | null;
  currentUser: CollaboratorPresence | null;
  collaborators: Map<string, CollaboratorPresence>;
  locks: Map<string, TrackLock>;
  pendingChanges: Map<string, TimelineChange>;
  lastSyncAt: Date | null;
  latency: number;
}

// ============================================================================
// Color Palette for Collaborators
// ============================================================================

export const COLLABORATOR_COLORS = [
  '#EF4444', // red
  '#F97316', // orange
  '#EAB308', // yellow
  '#22C55E', // green
  '#14B8A6', // teal
  '#3B82F6', // blue
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#6366F1', // indigo
] as const;

export function getCollaboratorColor(index: number): string {
  return COLLABORATOR_COLORS[index % COLLABORATOR_COLORS.length];
}
