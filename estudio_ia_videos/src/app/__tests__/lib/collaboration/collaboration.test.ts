/**
 * Testes para o módulo de colaboração
 */

import {
  CollabEvent,
  COLLABORATOR_COLORS,
  type CollaboratorPresence,
  type TrackLock,
  type TimelineChange,
  type CursorState,
  type SelectionState,
} from '../../../../lib/collaboration/types';

describe('Collaboration Types', () => {
  describe('CollabEvent enum', () => {
    it('should have all required events', () => {
      expect(CollabEvent.JOIN_PROJECT).toBe('collab:join');
      expect(CollabEvent.LEAVE_PROJECT).toBe('collab:leave');
      expect(CollabEvent.CURSOR_MOVE).toBe('cursor:move');
      expect(CollabEvent.SELECTION_CHANGE).toBe('selection:change');
      expect(CollabEvent.LOCK_REQUEST).toBe('lock:request');
      expect(CollabEvent.LOCK_ACQUIRED).toBe('lock:acquired');
      expect(CollabEvent.LOCK_DENIED).toBe('lock:denied');
      expect(CollabEvent.LOCK_RELEASED).toBe('lock:released');
      expect(CollabEvent.CHANGE_BROADCAST).toBe('change:broadcast');
      expect(CollabEvent.CHANGE_CONFLICT).toBe('change:conflict');
      expect(CollabEvent.PRESENCE_UPDATE).toBe('presence:update');
    });
  });

  describe('COLLABORATOR_COLORS', () => {
    it('should have 10 predefined colors', () => {
      expect(COLLABORATOR_COLORS).toHaveLength(10);
    });

    it('should have valid hex colors', () => {
      COLLABORATOR_COLORS.forEach((color: string) => {
        expect(color).toMatch(/^#[0-9A-F]{6}$/i);
      });
    });
  });

  describe('CollaboratorPresence interface', () => {
    it('should accept valid collaborator presence', () => {
      const presence: CollaboratorPresence = {
        id: 'socket-123',
        odiserId: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
        color: '#FF6B6B',
        status: 'active',
        cursor: null,
        selection: null,
        activeTrackId: null,
        lastSeenAt: new Date(),
      };

      expect(presence.id).toBe('socket-123');
      expect(presence.status).toBe('active');
    });

    it('should allow cursor state', () => {
      const cursorState: CursorState = {
        x: 100,
        y: 200,
        trackId: 'track-1',
        timestamp: 1234567890,
      };

      const presence: CollaboratorPresence = {
        id: 'socket-123',
        odiserId: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
        color: '#FF6B6B',
        status: 'active',
        cursor: cursorState,
        selection: null,
        activeTrackId: 'track-1',
        lastSeenAt: new Date(),
      };

      expect(presence.cursor?.x).toBe(100);
      expect(presence.cursor?.trackId).toBe('track-1');
    });
  });

  describe('TrackLock interface', () => {
    it('should accept valid track lock', () => {
      const lock: TrackLock = {
        id: 'lock-123',
        projectId: 'project-456',
        trackId: 'track-789',
        userId: 'user-123',
        userName: 'Test User',
        userColor: '#FF6B6B',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
      };

      expect(lock.trackId).toBe('track-789');
      expect(lock.userName).toBe('Test User');
    });
  });

  describe('TimelineChange interface', () => {
    it('should accept valid timeline change', () => {
      const change: TimelineChange = {
        id: 'change-123',
        userId: 'user-456',
        trackId: 'track-789',
        type: 'update',
        data: { duration: 5000 },
        timestamp: Date.now(),
        version: 1,
      };

      expect(change.type).toBe('update');
      expect(change.version).toBe(1);
    });

    it('should support all change types', () => {
      const types: TimelineChange['type'][] = ['add', 'update', 'delete', 'move', 'resize'];
      
      types.forEach(type => {
        const change: TimelineChange = {
          id: `change-${type}`,
          userId: 'user-1',
          trackId: 'track-1',
          type,
          data: {},
          timestamp: Date.now(),
          version: 1,
        };
        expect(change.type).toBe(type);
      });
    });
  });

  describe('SelectionState interface', () => {
    it('should accept valid selection state', () => {
      const selection: SelectionState = {
        elementIds: ['item-1', 'item-2'],
        trackIds: ['track-1'],
        timeRange: { start: 0, end: 5000 },
      };

      expect(selection.timeRange?.start).toBe(0);
      expect(selection.timeRange?.end).toBe(5000);
      expect(selection.elementIds).toHaveLength(2);
    });
  });
});

describe('Collaboration Module Exports', () => {
  it('should export all required types and components', async () => {
    const module = await import('../../../../lib/collaboration');
    
    expect(module.CollabEvent).toBeDefined();
    expect(module.COLLABORATOR_COLORS).toBeDefined();
    expect(module.CollaboratorAvatar).toBeDefined();
    expect(module.CollaboratorCursor).toBeDefined();
    expect(module.TrackLockIndicator).toBeDefined();
    expect(module.SelectionHighlight).toBeDefined();
    expect(module.ConnectionStatus).toBeDefined();
  });
});
