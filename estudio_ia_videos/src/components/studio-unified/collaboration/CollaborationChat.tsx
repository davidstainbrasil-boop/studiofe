'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  MessageCircle,
  Send,
  X,
  Smile,
  Paperclip,
  MoreVertical,
  Reply,
  Edit2,
  Trash2,
  Pin,
  Copy,
  AtSign,
  Hash,
  Image,
  File,
  Clock,
  CheckCheck,
  Users,
  Bell,
  BellOff,
  Minimize2,
  Maximize2,
  Settings,
  Search,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'owner' | 'editor' | 'viewer';
  status: 'online' | 'away' | 'offline';
  color: string;
}

interface MessageAttachment {
  id: string;
  type: 'image' | 'file' | 'video' | 'audio';
  name: string;
  url: string;
  size: number;
  thumbnail?: string;
}

interface ChatMessage {
  id: string;
  userId: string;
  content: string;
  timestamp: Date;
  edited: boolean;
  editedAt?: Date;
  replyTo?: string;
  mentions: string[];
  attachments: MessageAttachment[];
  reactions: { emoji: string; userIds: string[] }[];
  pinned: boolean;
  read: boolean;
}

interface ChatThread {
  id: string;
  name: string;
  type: 'general' | 'element' | 'timecode';
  elementId?: string;
  timecode?: number;
  messages: ChatMessage[];
  participants: string[];
  createdAt: Date;
  lastActivity: Date;
}

interface CollaborationChatProps {
  projectId: string;
  currentUserId: string;
  users: User[];
  isOpen?: boolean;
  onClose?: () => void;
  className?: string;
}

// ============================================================================
// MOCK DATA
// ============================================================================

const MOCK_USERS: User[] = [
  {
    id: 'user-1',
    name: 'João Silva',
    email: 'joao@example.com',
    avatar: '/avatars/joao.jpg',
    role: 'owner',
    status: 'online',
    color: '#3b82f6',
  },
  {
    id: 'user-2',
    name: 'Maria Santos',
    email: 'maria@example.com',
    avatar: '/avatars/maria.jpg',
    role: 'editor',
    status: 'online',
    color: '#10b981',
  },
  {
    id: 'user-3',
    name: 'Pedro Costa',
    email: 'pedro@example.com',
    role: 'editor',
    status: 'away',
    color: '#f59e0b',
  },
  {
    id: 'user-4',
    name: 'Ana Oliveira',
    email: 'ana@example.com',
    role: 'viewer',
    status: 'offline',
    color: '#8b5cf6',
  },
];

const MOCK_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-1',
    userId: 'user-1',
    content: 'Pessoal, precisamos revisar o slide 5. A animação está muito lenta.',
    timestamp: new Date(Date.now() - 3600000),
    edited: false,
    mentions: [],
    attachments: [],
    reactions: [{ emoji: '👍', userIds: ['user-2', 'user-3'] }],
    pinned: false,
    read: true,
  },
  {
    id: 'msg-2',
    userId: 'user-2',
    content: 'Concordo, @João Silva. Vou ajustar a duração para 0.5s.',
    timestamp: new Date(Date.now() - 3500000),
    edited: false,
    mentions: ['user-1'],
    attachments: [],
    reactions: [],
    pinned: false,
    read: true,
  },
  {
    id: 'msg-3',
    userId: 'user-3',
    content: 'Também notei que o áudio do avatar está um pouco baixo nos slides 3 e 4.',
    timestamp: new Date(Date.now() - 3000000),
    edited: true,
    editedAt: new Date(Date.now() - 2900000),
    mentions: [],
    attachments: [],
    reactions: [],
    pinned: true,
    read: true,
  },
  {
    id: 'msg-4',
    userId: 'user-1',
    content: 'Boa observação! Vou normalizar o áudio de todo o projeto.',
    timestamp: new Date(Date.now() - 2000000),
    edited: false,
    mentions: [],
    attachments: [],
    reactions: [{ emoji: '🎉', userIds: ['user-2'] }],
    pinned: false,
    read: true,
  },
  {
    id: 'msg-5',
    userId: 'user-2',
    content: 'Segue a referência visual que mencionei:',
    timestamp: new Date(Date.now() - 1000000),
    edited: false,
    mentions: [],
    attachments: [
      {
        id: 'att-1',
        type: 'image',
        name: 'referencia-visual.png',
        url: '/attachments/referencia.png',
        size: 245000,
        thumbnail: '/attachments/referencia-thumb.png',
      },
    ],
    reactions: [{ emoji: '❤️', userIds: ['user-1', 'user-3'] }],
    pinned: false,
    read: true,
  },
  {
    id: 'msg-6',
    userId: 'user-3',
    content: 'Ficou muito bom! Só falta ajustar a cor do texto no final.',
    timestamp: new Date(Date.now() - 300000),
    edited: false,
    mentions: [],
    attachments: [],
    reactions: [],
    pinned: false,
    read: false,
  },
];

const EMOJI_LIST = ['👍', '❤️', '🎉', '😊', '🔥', '👏', '💯', '✅', '🚀', '💡'];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatMessageTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  if (diff < 60000) return 'agora';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function getUserInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function UserStatus({ status }: { status: User['status'] }) {
  const colors = {
    online: 'bg-green-500',
    away: 'bg-yellow-500',
    offline: 'bg-slate-500',
  };

  return (
    <span className={cn(
      'absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-slate-900',
      colors[status]
    )} />
  );
}

interface MessageBubbleProps {
  message: ChatMessage;
  user: User;
  currentUserId: string;
  users: User[];
  onReply: (messageId: string) => void;
  onEdit: (messageId: string) => void;
  onDelete: (messageId: string) => void;
  onPin: (messageId: string) => void;
  onReact: (messageId: string, emoji: string) => void;
  replyToMessage?: ChatMessage;
}

function MessageBubble({
  message,
  user,
  currentUserId,
  users,
  onReply,
  onEdit,
  onDelete,
  onPin,
  onReact,
  replyToMessage,
}: MessageBubbleProps) {
  const isOwn = message.userId === currentUserId;
  const [showActions, setShowActions] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const replyUser = replyToMessage ? users.find(u => u.id === replyToMessage.userId) : null;

  // Parse mentions in content
  const renderContent = (content: string) => {
    const mentionRegex = /@(\w+\s\w+)/g;
    const parts = content.split(mentionRegex);
    
    return parts.map((part, index) => {
      const mentionedUser = users.find(u => u.name === part);
      if (mentionedUser) {
        return (
          <span 
            key={index}
            className="text-blue-400 font-medium hover:underline cursor-pointer"
          >
            @{part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div 
      className={cn(
        'group flex gap-2 px-3 py-1.5 hover:bg-slate-800/50 rounded-lg transition-colors',
        message.pinned && 'bg-yellow-500/5 border-l-2 border-yellow-500/50'
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => {
        setShowActions(false);
        setShowEmojiPicker(false);
      }}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <Avatar className="h-8 w-8">
          <AvatarImage src={user.avatar} />
          <AvatarFallback style={{ backgroundColor: user.color }}>
            {getUserInitials(user.name)}
          </AvatarFallback>
        </Avatar>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-2">
          <span className="font-medium text-white text-sm">{user.name}</span>
          {user.role === 'owner' && (
            <Badge variant="outline" className="h-4 text-[10px] px-1">Owner</Badge>
          )}
          <span className="text-xs text-slate-500">
            {formatMessageTime(message.timestamp)}
          </span>
          {message.edited && (
            <span className="text-xs text-slate-500">(editado)</span>
          )}
          {message.pinned && (
            <Pin className="h-3 w-3 text-yellow-500" />
          )}
        </div>

        {/* Reply Reference */}
        {replyToMessage && replyUser && (
          <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5 mb-1">
            <Reply className="h-3 w-3" />
            <span>Respondendo a</span>
            <span className="text-slate-400">{replyUser.name}</span>
            <span className="truncate max-w-[150px]">{replyToMessage.content}</span>
          </div>
        )}

        {/* Message Text */}
        <p className="text-sm text-slate-300 break-words">
          {renderContent(message.content)}
        </p>

        {/* Attachments */}
        {message.attachments.length > 0 && (
          <div className="mt-2 space-y-1">
            {message.attachments.map(att => (
              <div key={att.id} className="flex items-center gap-2">
                {att.type === 'image' ? (
                  <div className="relative rounded-lg overflow-hidden max-w-[200px]">
                    <img 
                      src={att.thumbnail || att.url} 
                      alt={att.name}
                      className="w-full h-auto"
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-2 rounded bg-slate-800 border border-slate-700">
                    <File className="h-4 w-4 text-slate-400" />
                    <div className="min-w-0">
                      <p className="text-xs text-white truncate">{att.name}</p>
                      <p className="text-xs text-slate-500">{formatFileSize(att.size)}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Reactions */}
        {message.reactions.length > 0 && (
          <div className="flex items-center gap-1 mt-1.5">
            {message.reactions.map((reaction, idx) => (
              <button
                key={idx}
                onClick={() => onReact(message.id, reaction.emoji)}
                className={cn(
                  'flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs',
                  'bg-slate-800 hover:bg-slate-700 transition-colors',
                  reaction.userIds.includes(currentUserId) && 'bg-blue-500/20 ring-1 ring-blue-500/50'
                )}
              >
                <span>{reaction.emoji}</span>
                <span className="text-slate-400">{reaction.userIds.length}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      {showActions && (
        <div className="flex items-start gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Emoji React */}
          <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
            <PopoverTrigger asChild>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                <Smile className="h-3.5 w-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" align="end">
              <div className="flex gap-1">
                {EMOJI_LIST.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => {
                      onReact(message.id, emoji);
                      setShowEmojiPicker(false);
                    }}
                    className="h-7 w-7 flex items-center justify-center hover:bg-slate-800 rounded transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Reply */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-6 w-6 p-0"
                  onClick={() => onReply(message.id)}
                >
                  <Reply className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Responder</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* More Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => onPin(message.id)}>
                <Pin className="h-4 w-4 mr-2" />
                {message.pinned ? 'Desafixar' : 'Fixar'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigator.clipboard.writeText(message.content)}>
                <Copy className="h-4 w-4 mr-2" />
                Copiar texto
              </DropdownMenuItem>
              {isOwn && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onEdit(message.id)}>
                    <Edit2 className="h-4 w-4 mr-2" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onDelete(message.id)}
                    className="text-red-400"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}

function ParticipantsList({ users }: { users: User[] }) {
  const onlineUsers = users.filter(u => u.status === 'online');
  const awayUsers = users.filter(u => u.status === 'away');
  const offlineUsers = users.filter(u => u.status === 'offline');

  return (
    <div className="p-3 space-y-3">
      {onlineUsers.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-slate-400 mb-2">
            Online — {onlineUsers.length}
          </h4>
          <div className="space-y-1">
            {onlineUsers.map(user => (
              <div key={user.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-800">
                <div className="relative">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback style={{ backgroundColor: user.color }} className="text-xs">
                      {getUserInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <UserStatus status={user.status} />
                </div>
                <span className="text-sm text-white">{user.name}</span>
                {user.role === 'owner' && (
                  <Badge variant="outline" className="h-4 text-[10px] px-1 ml-auto">Owner</Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {awayUsers.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-slate-400 mb-2">
            Ausente — {awayUsers.length}
          </h4>
          <div className="space-y-1">
            {awayUsers.map(user => (
              <div key={user.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-800">
                <div className="relative">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback style={{ backgroundColor: user.color }} className="text-xs">
                      {getUserInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <UserStatus status={user.status} />
                </div>
                <span className="text-sm text-slate-400">{user.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {offlineUsers.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-slate-400 mb-2">
            Offline — {offlineUsers.length}
          </h4>
          <div className="space-y-1">
            {offlineUsers.map(user => (
              <div key={user.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-800 opacity-60">
                <div className="relative">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback style={{ backgroundColor: user.color }} className="text-xs">
                      {getUserInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <UserStatus status={user.status} />
                </div>
                <span className="text-sm text-slate-500">{user.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CollaborationChat({
  projectId,
  currentUserId,
  users = MOCK_USERS,
  isOpen = true,
  onClose,
  className,
}: CollaborationChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(MOCK_MESSAGES);
  const [inputValue, setInputValue] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentUser = users.find(u => u.id === currentUserId) || MOCK_USERS[0];
  const onlineCount = users.filter(u => u.status === 'online').length;
  const unreadCount = messages.filter(m => !m.read && m.userId !== currentUserId).length;

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when replying
  useEffect(() => {
    if (replyingTo) {
      inputRef.current?.focus();
    }
  }, [replyingTo]);

  const handleSend = useCallback(() => {
    if (!inputValue.trim()) return;

    // Extract mentions
    const mentionRegex = /@(\w+\s\w+)/g;
    const mentions: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = mentionRegex.exec(inputValue)) !== null) {
      const matchedName = match[1];
      const user = users.find(u => u.name === matchedName);
      if (user) mentions.push(user.id);
    }

    if (editingId) {
      // Edit existing message
      setMessages(prev => prev.map(msg =>
        msg.id === editingId
          ? { ...msg, content: inputValue, edited: true, editedAt: new Date() }
          : msg
      ));
      setEditingId(null);
    } else {
      // New message
      const newMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        userId: currentUserId,
        content: inputValue,
        timestamp: new Date(),
        edited: false,
        replyTo: replyingTo || undefined,
        mentions,
        attachments: [],
        reactions: [],
        pinned: false,
        read: true,
      };
      setMessages(prev => [...prev, newMessage]);
      setReplyingTo(null);
    }

    setInputValue('');
  }, [inputValue, currentUserId, replyingTo, editingId, users]);

  const handleReply = useCallback((messageId: string) => {
    setReplyingTo(messageId);
    setEditingId(null);
  }, []);

  const handleEdit = useCallback((messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (message) {
      setEditingId(messageId);
      setInputValue(message.content);
      setReplyingTo(null);
    }
  }, [messages]);

  const handleDelete = useCallback((messageId: string) => {
    setMessages(prev => prev.filter(m => m.id !== messageId));
  }, []);

  const handlePin = useCallback((messageId: string) => {
    setMessages(prev => prev.map(msg =>
      msg.id === messageId ? { ...msg, pinned: !msg.pinned } : msg
    ));
  }, []);

  const handleReact = useCallback((messageId: string, emoji: string) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id !== messageId) return msg;

      const existingReaction = msg.reactions.find(r => r.emoji === emoji);
      if (existingReaction) {
        if (existingReaction.userIds.includes(currentUserId)) {
          // Remove reaction
          const newUserIds = existingReaction.userIds.filter(id => id !== currentUserId);
          if (newUserIds.length === 0) {
            return { ...msg, reactions: msg.reactions.filter(r => r.emoji !== emoji) };
          }
          return {
            ...msg,
            reactions: msg.reactions.map(r =>
              r.emoji === emoji ? { ...r, userIds: newUserIds } : r
            ),
          };
        } else {
          // Add to existing
          return {
            ...msg,
            reactions: msg.reactions.map(r =>
              r.emoji === emoji ? { ...r, userIds: [...r.userIds, currentUserId] } : r
            ),
          };
        }
      } else {
        // New reaction
        return {
          ...msg,
          reactions: [...msg.reactions, { emoji, userIds: [currentUserId] }],
        };
      }
    }));
  }, [currentUserId]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === 'Escape') {
      setReplyingTo(null);
      setEditingId(null);
      setInputValue('');
    }
    if (e.key === '@') {
      setShowMentions(true);
      setMentionFilter('');
    }
  }, [handleSend]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    // Check for mention trigger
    const lastAtIndex = value.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const afterAt = value.slice(lastAtIndex + 1);
      if (!afterAt.includes(' ')) {
        setShowMentions(true);
        setMentionFilter(afterAt.toLowerCase());
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }
  }, []);

  const insertMention = useCallback((user: User) => {
    const lastAtIndex = inputValue.lastIndexOf('@');
    const newValue = inputValue.slice(0, lastAtIndex) + `@${user.name} `;
    setInputValue(newValue);
    setShowMentions(false);
    inputRef.current?.focus();
  }, [inputValue]);

  const replyToMessage = replyingTo ? messages.find(m => m.id === replyingTo) : null;
  const filteredMentionUsers = users.filter(u => 
    u.name.toLowerCase().includes(mentionFilter) && u.id !== currentUserId
  );

  if (!isOpen) return null;

  return (
    <Card className={cn(
      'bg-slate-900 border-slate-700 flex flex-col',
      isMinimized ? 'h-auto' : 'h-[500px] w-80',
      className
    )}>
      {/* Header */}
      <CardHeader className="py-2 px-3 border-b border-slate-700/50 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-slate-400" />
            <CardTitle className="text-sm text-white">Chat</CardTitle>
            {unreadCount > 0 && (
              <Badge className="h-5 w-5 p-0 flex items-center justify-center bg-blue-500">
                {unreadCount}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-0.5">
            {/* Online Count */}
            <Popover open={showParticipants} onOpenChange={setShowParticipants}>
              <PopoverTrigger asChild>
                <Button size="sm" variant="ghost" className="h-7 px-2 gap-1">
                  <Users className="h-3.5 w-3.5" />
                  <span className="text-xs">{onlineCount}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-0" align="end">
                <ParticipantsList users={users} />
              </PopoverContent>
            </Popover>

            {/* Notifications */}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setNotificationsEnabled(!notificationsEnabled)}
              className="h-7 w-7 p-0"
            >
              {notificationsEnabled ? (
                <Bell className="h-3.5 w-3.5" />
              ) : (
                <BellOff className="h-3.5 w-3.5 text-slate-500" />
              )}
            </Button>

            {/* Minimize */}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsMinimized(!isMinimized)}
              className="h-7 w-7 p-0"
            >
              {isMinimized ? (
                <Maximize2 className="h-3.5 w-3.5" />
              ) : (
                <Minimize2 className="h-3.5 w-3.5" />
              )}
            </Button>

            {/* Close */}
            {onClose && (
              <Button size="sm" variant="ghost" onClick={onClose} className="h-7 w-7 p-0">
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      {!isMinimized && (
        <>
          {/* Messages */}
          <CardContent className="flex-1 p-0 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="py-2">
                {messages.map(message => {
                  const user = users.find(u => u.id === message.userId);
                  if (!user) return null;

                  const replyMsg = message.replyTo 
                    ? messages.find(m => m.id === message.replyTo)
                    : undefined;

                  return (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      user={user}
                      currentUserId={currentUserId}
                      users={users}
                      onReply={handleReply}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onPin={handlePin}
                      onReact={handleReact}
                      replyToMessage={replyMsg}
                    />
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
          </CardContent>

          {/* Reply/Edit Indicator */}
          {(replyingTo || editingId) && (
            <div className="px-3 py-2 bg-slate-800/50 border-t border-slate-700/50 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                {replyingTo && (
                  <>
                    <Reply className="h-3 w-3" />
                    <span>Respondendo a {users.find(u => u.id === replyToMessage?.userId)?.name}</span>
                  </>
                )}
                {editingId && (
                  <>
                    <Edit2 className="h-3 w-3" />
                    <span>Editando mensagem</span>
                  </>
                )}
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setReplyingTo(null);
                  setEditingId(null);
                  setInputValue('');
                }}
                className="h-5 w-5 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}

          {/* Input */}
          <div className="p-2 border-t border-slate-700/50 flex-shrink-0">
            <div className="relative">
              {/* Mention Suggestions */}
              {showMentions && filteredMentionUsers.length > 0 && (
                <div className="absolute bottom-full left-0 right-0 mb-1 bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
                  {filteredMentionUsers.slice(0, 5).map(user => (
                    <button
                      key={user.id}
                      onClick={() => insertMention(user)}
                      className="w-full flex items-center gap-2 p-2 hover:bg-slate-700 text-left"
                    >
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={user.avatar} />
                        <AvatarFallback style={{ backgroundColor: user.color }} className="text-xs">
                          {getUserInitials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-white">{user.name}</span>
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                  <Paperclip className="h-4 w-4" />
                </Button>
                
                <Input
                  ref={inputRef}
                  value={inputValue}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Digite uma mensagem..."
                  className="h-8 text-sm bg-slate-800 border-slate-700"
                />
                
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                  <Smile className="h-4 w-4" />
                </Button>
                
                <Button 
                  size="sm" 
                  onClick={handleSend}
                  disabled={!inputValue.trim()}
                  className="h-8 w-8 p-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}

export default CollaborationChat;
