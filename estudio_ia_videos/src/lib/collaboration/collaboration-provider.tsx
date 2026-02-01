'use client';

/**
 * Real-time Collaboration System
 * 
 * Enables multiple users to collaborate on video projects in real-time.
 * Uses Supabase Realtime for presence and broadcasting.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { createClient } from '@supabase/supabase-js';
import { toast } from 'sonner';

// Types
export interface Collaborator {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  color: string;
  cursor?: { slideId: string; x: number; y: number };
  selection?: { slideId: string; elementId?: string };
  isOnline: boolean;
  lastSeen: Date;
}

export interface CollaborationEvent {
  type: 'slide_update' | 'slide_add' | 'slide_delete' | 'cursor_move' | 'selection_change' | 'user_joined' | 'user_left';
  userId: string;
  payload: unknown;
  timestamp: Date;
}

interface CollaborationContextType {
  collaborators: Collaborator[];
  isConnected: boolean;
  currentUser: Collaborator | null;
  
  // Actions
  joinProject: (projectId: string, user: Omit<Collaborator, 'id' | 'isOnline' | 'lastSeen' | 'color'>) => Promise<void>;
  leaveProject: () => void;
  updateCursor: (slideId: string, x: number, y: number) => void;
  updateSelection: (slideId: string, elementId?: string) => void;
  broadcastEvent: (event: Omit<CollaborationEvent, 'userId' | 'timestamp'>) => void;
  
  // Event subscriptions
  onEvent: (callback: (event: CollaborationEvent) => void) => () => void;
}

const CollaborationContext = createContext<CollaborationContextType | null>(null);

// Color palette for collaborators
const COLLABORATOR_COLORS = [
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#3B82F6', // blue
  '#10B981', // emerald
  '#F59E0B', // amber
  '#EF4444', // red
  '#06B6D4', // cyan
  '#84CC16', // lime
];

export function CollaborationProvider({
  children,
  supabaseUrl,
  supabaseKey,
}: {
  children: ReactNode;
  supabaseUrl: string;
  supabaseKey: string;
}) {
  const [supabase] = useState(() => createClient(supabaseUrl, supabaseKey));
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [currentUser, setCurrentUser] = useState<Collaborator | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [channel, setChannel] = useState<ReturnType<typeof supabase.channel> | null>(null);
  const [eventListeners] = useState<Set<(event: CollaborationEvent) => void>>(new Set());

  // Assign color to new user
  const assignColor = useCallback(() => {
    const usedColors = collaborators.map(c => c.color);
    const availableColor = COLLABORATOR_COLORS.find(c => !usedColors.includes(c));
    return availableColor || COLLABORATOR_COLORS[Math.floor(Math.random() * COLLABORATOR_COLORS.length)];
  }, [collaborators]);

  // Join a project
  const joinProject = useCallback(async (
    projectId: string,
    user: Omit<Collaborator, 'id' | 'isOnline' | 'lastSeen' | 'color'>
  ) => {
    if (channel) {
      await channel.unsubscribe();
    }

    const userId = crypto.randomUUID();
    const color = assignColor();
    const newUser: Collaborator = {
      ...user,
      id: userId,
      color,
      isOnline: true,
      lastSeen: new Date(),
    };

    setCurrentUser(newUser);

    // Create channel for this project
    const projectChannel = supabase.channel(`project:${projectId}`, {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    // Track presence
    projectChannel
      .on('presence', { event: 'sync' }, () => {
        const state = projectChannel.presenceState();
        const onlineUsers: Collaborator[] = [];
        
        for (const [key, value] of Object.entries(state)) {
          const presences = value as Array<Record<string, unknown>>;
          if (presences.length > 0 && presences[0].user) {
            const userObj = presences[0].user as Collaborator;
            onlineUsers.push({
              ...userObj,
              id: key,
              isOnline: true,
            });
          }
        }
        
        setCollaborators(onlineUsers);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        const presence = newPresences[0] as unknown as Record<string, unknown>;
        if (presence?.user) {
          const user = presence.user as Collaborator;
          toast.success(`${user.name} entrou no projeto`);
          emitEvent({
            type: 'user_joined',
            userId: key,
            payload: user,
            timestamp: new Date(),
          });
        }
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        const presence = leftPresences[0] as unknown as Record<string, unknown>;
        if (presence?.user) {
          const user = presence.user as Collaborator;
          toast.info(`${user.name} saiu do projeto`);
          emitEvent({
            type: 'user_left',
            userId: key,
            payload: user,
            timestamp: new Date(),
          });
        }
      })
      .on('broadcast', { event: 'collaboration' }, (payload) => {
        const event = payload.payload as CollaborationEvent;
        emitEvent(event);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await projectChannel.track({ user: newUser });
          setIsConnected(true);
        }
      });

    setChannel(projectChannel);
  }, [channel, supabase, assignColor]);

  // Leave project
  const leaveProject = useCallback(() => {
    if (channel) {
      channel.unsubscribe();
      setChannel(null);
      setIsConnected(false);
      setCurrentUser(null);
      setCollaborators([]);
    }
  }, [channel]);

  // Emit event to listeners
  const emitEvent = useCallback((event: CollaborationEvent) => {
    eventListeners.forEach(listener => listener(event));
  }, [eventListeners]);

  // Update cursor position
  const updateCursor = useCallback((slideId: string, x: number, y: number) => {
    if (channel && currentUser) {
      channel.send({
        type: 'broadcast',
        event: 'collaboration',
        payload: {
          type: 'cursor_move',
          userId: currentUser.id,
          payload: { slideId, x, y },
          timestamp: new Date(),
        },
      });
    }
  }, [channel, currentUser]);

  // Update selection
  const updateSelection = useCallback((slideId: string, elementId?: string) => {
    if (channel && currentUser) {
      channel.send({
        type: 'broadcast',
        event: 'collaboration',
        payload: {
          type: 'selection_change',
          userId: currentUser.id,
          payload: { slideId, elementId },
          timestamp: new Date(),
        },
      });
    }
  }, [channel, currentUser]);

  // Broadcast custom event
  const broadcastEvent = useCallback((event: Omit<CollaborationEvent, 'userId' | 'timestamp'>) => {
    if (channel && currentUser) {
      channel.send({
        type: 'broadcast',
        event: 'collaboration',
        payload: {
          ...event,
          userId: currentUser.id,
          timestamp: new Date(),
        },
      });
    }
  }, [channel, currentUser]);

  // Subscribe to events
  const onEvent = useCallback((callback: (event: CollaborationEvent) => void) => {
    eventListeners.add(callback);
    return () => {
      eventListeners.delete(callback);
    };
  }, [eventListeners]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [channel]);

  return (
    <CollaborationContext.Provider
      value={{
        collaborators,
        isConnected,
        currentUser,
        joinProject,
        leaveProject,
        updateCursor,
        updateSelection,
        broadcastEvent,
        onEvent,
      }}
    >
      {children}
    </CollaborationContext.Provider>
  );
}

export function useCollaboration() {
  const context = useContext(CollaborationContext);
  if (!context) {
    throw new Error('useCollaboration must be used within CollaborationProvider');
  }
  return context;
}

export default CollaborationProvider;
