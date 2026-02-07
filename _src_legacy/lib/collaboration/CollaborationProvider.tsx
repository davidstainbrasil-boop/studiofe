'use client';

import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useSession } from 'next-auth/react';

interface User {
  userId: string;
  name: string;
  email: string;
  avatar?: string;
  joinedAt: number;
  cursor?: { x: number; y: number };
}

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  message: string;
  timestamp: number;
}

interface CollaborationProvider {
  children: React.ReactNode;
  projectId: string;
}

export function CollaborationProvider({ children, projectId }: CollaborationProvider) {
  const { data: session } = useSession();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connectedUsers, setConnectedUsers] = useState<User[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!session?.user || !projectId) return;

    // Initialize socket connection
    const newSocket = io('/api/socket/io', {
      path: '/api/socket/io',
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      console.log('Connected to collaboration server');
      setIsConnected(true);
      newSocket.emit('join_project', projectId);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from collaboration server');
      setIsConnected(false);
    });

    newSocket.on('users_list', (users: User[]) => {
      setConnectedUsers(users);
    });

    newSocket.on('user_joined', (user: User) => {
      setConnectedUsers((prev) => [...prev.filter((u) => u.userId !== user.userId), user]);
    });

    newSocket.on('user_left', (data: { userId: string; userName: string }) => {
      setConnectedUsers((prev) => prev.filter((u) => u.userId !== data.userId));
      setTypingUsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(data.userId);
        return newSet;
      });
    });

    newSocket.on('cursor_update', (data: { userId: string; cursor: { x: number; y: number } }) => {
      setConnectedUsers((prev) =>
        prev.map((user) => (user.userId === data.userId ? { ...user, cursor: data.cursor } : user)),
      );
    });

    newSocket.on('chat_message', (message: ChatMessage) => {
      setChatMessages((prev) => [...prev, message]);
    });

    newSocket.on('user_typing', (data: { userId: string; userName: string; typing: boolean }) => {
      setTypingUsers((prev) => {
        const newSet = new Set(prev);
        if (data.typing) {
          newSet.add(data.userId);
        } else {
          newSet.delete(data.userId);
        }
        return newSet;
      });
    });

    newSocket.on('slide_edited', (event: any) => {
      // Handle slide edits from other users
      console.log('Slide edited by another user:', event);
    });

    newSocket.on('slide_added', (event: any) => {
      // Handle slide additions from other users
      console.log('Slide added by another user:', event);
    });

    newSocket.on('slide_deleted', (event: any) => {
      // Handle slide deletions from other users
      console.log('Slide deleted by another user:', event);
    });

    setSocket(newSocket);

    return () => {
      newSocket.emit('leave_project', projectId);
      newSocket.disconnect();
    };
  }, [session?.user, projectId]);

  const sendCursorMove = (x: number, y: number) => {
    if (socket && isConnected) {
      socket.emit('cursor_move', { x, y });
    }
  };

  const sendSlideEdit = (slideId: string, changes: any) => {
    if (socket && isConnected) {
      socket.emit('slide_edit', { slideId, changes });
    }
  };

  const sendSlideAdd = (position: number, slideData: any) => {
    if (socket && isConnected) {
      socket.emit('slide_add', { position, slideData });
    }
  };

  const sendSlideDelete = (slideId: string) => {
    if (socket && isConnected) {
      socket.emit('slide_delete', { slideId });
    }
  };

  const sendChatMessage = (message: string) => {
    if (socket && isConnected) {
      socket.emit('chat_message', { message });
    }
  };

  const startTyping = () => {
    if (socket && isConnected && !isTyping) {
      setIsTyping(true);
      socket.emit('typing_start');

      // Auto-stop typing after 3 seconds
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        stopTyping();
      }, 3000);
    }
  };

  const stopTyping = () => {
    if (socket && isConnected && isTyping) {
      setIsTyping(false);
      socket.emit('typing_stop');

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  };

  const collaborationContext = {
    socket,
    isConnected,
    connectedUsers,
    chatMessages,
    typingUsers,
    sendCursorMove,
    sendSlideEdit,
    sendSlideAdd,
    sendSlideDelete,
    sendChatMessage,
    startTyping,
    stopTyping,
  };

  return (
    <CollaborationContext.Provider value={collaborationContext}>
      {children}
    </CollaborationContext.Provider>
  );
}

export function useCollaboration() {
  const context = React.useContext(CollaborationContext);
  if (!context) {
    throw new Error('useCollaboration must be used within a CollaborationProvider');
  }
  return context;
}

import React from 'react';
const CollaborationContext = React.createContext<any>(null);
