'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Users,
  Eye,
  Edit3,
  Play,
  MousePointer,
  Clock,
  Layers,
  Volume2,
  Type,
  Image,
  Video,
  Sparkles,
  Settings,
  MoreHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

type UserStatus = 'online' | 'away' | 'offline';
type UserActivity = 
  | 'idle'
  | 'viewing'
  | 'editing'
  | 'selecting'
  | 'playing'
  | 'recording'
  | 'typing';

interface CollaboratorCursor {
  x: number;
  y: number;
  timestamp: number;
}

interface CollaboratorFocus {
  type: 'slide' | 'track' | 'element' | 'timeline' | 'canvas' | 'inspector';
  id?: string;
  name?: string;
  timestamp: number;
}

interface Collaborator {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'owner' | 'editor' | 'viewer';
  status: UserStatus;
  color: string;
  activity: UserActivity;
  lastSeen: Date;
  cursor?: CollaboratorCursor;
  focus?: CollaboratorFocus;
  currentSlideIndex?: number;
}

interface PresenceIndicatorProps {
  collaborators: Collaborator[];
  currentUserId: string;
  maxVisible?: number;
  showActivity?: boolean;
  showCursors?: boolean;
  variant?: 'compact' | 'detailed' | 'minimal';
  className?: string;
  onUserClick?: (userId: string) => void;
  onFollowUser?: (userId: string) => void;
}

// ============================================================================
// MOCK DATA
// ============================================================================

const MOCK_COLLABORATORS: Collaborator[] = [
  {
    id: 'user-1',
    name: 'João Silva',
    email: 'joao@example.com',
    avatar: '/avatars/joao.jpg',
    role: 'owner',
    status: 'online',
    color: '#3b82f6',
    activity: 'editing',
    lastSeen: new Date(),
    cursor: { x: 450, y: 320, timestamp: Date.now() },
    focus: { type: 'element', id: 'text-1', name: 'Título Principal', timestamp: Date.now() },
    currentSlideIndex: 0,
  },
  {
    id: 'user-2',
    name: 'Maria Santos',
    email: 'maria@example.com',
    avatar: '/avatars/maria.jpg',
    role: 'editor',
    status: 'online',
    color: '#10b981',
    activity: 'viewing',
    lastSeen: new Date(),
    cursor: { x: 200, y: 150, timestamp: Date.now() },
    focus: { type: 'slide', id: 'slide-3', name: 'Slide 3', timestamp: Date.now() },
    currentSlideIndex: 2,
  },
  {
    id: 'user-3',
    name: 'Pedro Costa',
    email: 'pedro@example.com',
    role: 'editor',
    status: 'online',
    color: '#f59e0b',
    activity: 'selecting',
    lastSeen: new Date(Date.now() - 30000),
    focus: { type: 'track', id: 'audio-1', name: 'Track de Áudio', timestamp: Date.now() },
    currentSlideIndex: 0,
  },
  {
    id: 'user-4',
    name: 'Ana Oliveira',
    email: 'ana@example.com',
    role: 'viewer',
    status: 'away',
    color: '#8b5cf6',
    activity: 'idle',
    lastSeen: new Date(Date.now() - 300000),
    currentSlideIndex: 1,
  },
  {
    id: 'user-5',
    name: 'Carlos Mendes',
    email: 'carlos@example.com',
    role: 'editor',
    status: 'offline',
    color: '#ec4899',
    activity: 'idle',
    lastSeen: new Date(Date.now() - 3600000),
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getUserInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function formatLastSeen(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'agora';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m atrás`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h atrás`;
  return `${Math.floor(seconds / 86400)}d atrás`;
}

function getActivityIcon(activity: UserActivity) {
  const icons = {
    idle: Clock,
    viewing: Eye,
    editing: Edit3,
    selecting: MousePointer,
    playing: Play,
    recording: Video,
    typing: Type,
  };
  return icons[activity] || Clock;
}

function getActivityLabel(activity: UserActivity): string {
  const labels = {
    idle: 'Inativo',
    viewing: 'Visualizando',
    editing: 'Editando',
    selecting: 'Selecionando',
    playing: 'Reproduzindo',
    recording: 'Gravando',
    typing: 'Digitando',
  };
  return labels[activity] || 'Desconhecido';
}

function getFocusIcon(type: CollaboratorFocus['type']) {
  const icons = {
    slide: Layers,
    track: Volume2,
    element: Sparkles,
    timeline: Play,
    canvas: Image,
    inspector: Settings,
  };
  return icons[type] || Layers;
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function UserStatusDot({ status }: { status: UserStatus }) {
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

interface UserAvatarProps {
  user: Collaborator;
  size?: 'sm' | 'md' | 'lg';
  showStatus?: boolean;
  showActivity?: boolean;
}

function UserAvatar({ user, size = 'md', showStatus = true, showActivity = false }: UserAvatarProps) {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10',
  };

  const ActivityIcon = getActivityIcon(user.activity);

  return (
    <div className="relative">
      <Avatar 
        className={cn(sizeClasses[size], 'ring-2')}
        style={{ '--tw-ring-color': user.color } as React.CSSProperties}
      >
        <AvatarImage src={user.avatar} alt={user.name} />
        <AvatarFallback 
          style={{ backgroundColor: user.color }}
          className="text-white text-xs font-medium"
        >
          {getUserInitials(user.name)}
        </AvatarFallback>
      </Avatar>
      
      {showStatus && <UserStatusDot status={user.status} />}
      
      {showActivity && user.activity !== 'idle' && (
        <span 
          className="absolute -top-1 -right-1 h-4 w-4 rounded-full flex items-center justify-center"
          style={{ backgroundColor: user.color }}
        >
          <ActivityIcon className="h-2.5 w-2.5 text-white" />
        </span>
      )}
    </div>
  );
}

interface CollaboratorDetailProps {
  user: Collaborator;
  currentUserId: string;
  onFollow?: () => void;
}

function CollaboratorDetail({ user, currentUserId, onFollow }: CollaboratorDetailProps) {
  const isCurrentUser = user.id === currentUserId;
  const FocusIcon = user.focus ? getFocusIcon(user.focus.type) : null;

  return (
    <div className="flex items-start gap-3 p-2">
      <UserAvatar user={user} size="lg" showActivity />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-white">
            {user.name}
            {isCurrentUser && <span className="text-slate-400 ml-1">(você)</span>}
          </span>
          {user.role === 'owner' && (
            <Badge variant="outline" className="h-4 text-[10px] px-1">Owner</Badge>
          )}
        </div>
        
        <div className="text-xs text-slate-400">{user.email}</div>
        
        {/* Activity */}
        <div className="flex items-center gap-1 mt-1 text-xs">
          <span 
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded"
            style={{ backgroundColor: `${user.color}20`, color: user.color }}
          >
            {React.createElement(getActivityIcon(user.activity), { className: 'h-3 w-3' })}
            {getActivityLabel(user.activity)}
          </span>
          
          {user.status !== 'online' && (
            <span className="text-slate-500">
              • {formatLastSeen(user.lastSeen)}
            </span>
          )}
        </div>
        
        {/* Focus */}
        {user.focus && FocusIcon && (
          <div className="flex items-center gap-1 mt-1.5 text-xs text-slate-400">
            <FocusIcon className="h-3 w-3" />
            <span>
              {user.focus.name || `${user.focus.type} ${user.focus.id}`}
            </span>
          </div>
        )}
        
        {/* Current Slide */}
        {user.currentSlideIndex !== undefined && (
          <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
            <Layers className="h-3 w-3" />
            <span>Slide {user.currentSlideIndex + 1}</span>
          </div>
        )}
      </div>
      
      {/* Follow Button */}
      {!isCurrentUser && user.status === 'online' && onFollow && (
        <Button
          size="sm"
          variant="ghost"
          onClick={onFollow}
          className="h-7 text-xs"
        >
          <Eye className="h-3 w-3 mr-1" />
          Seguir
        </Button>
      )}
    </div>
  );
}

// ============================================================================
// AVATAR STACK COMPONENT
// ============================================================================

interface AvatarStackProps {
  users: Collaborator[];
  maxVisible: number;
  size?: 'sm' | 'md';
}

function AvatarStack({ users, maxVisible, size = 'md' }: AvatarStackProps) {
  const visibleUsers = users.slice(0, maxVisible);
  const overflowCount = users.length - maxVisible;

  const sizeClasses = {
    sm: 'h-6 w-6 text-[10px] -ml-2 first:ml-0',
    md: 'h-8 w-8 text-xs -ml-3 first:ml-0',
  };

  return (
    <div className="flex items-center">
      {visibleUsers.map((user) => (
        <TooltipProvider key={user.id}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={cn('relative', sizeClasses[size].split(' ').slice(2).join(' '))}>
                <Avatar 
                  className={cn(
                    sizeClasses[size].split(' ').slice(0, 2).join(' '),
                    'ring-2 ring-slate-900 cursor-pointer hover:z-10 transition-transform hover:scale-110'
                  )}
                  style={{ '--tw-ring-color': user.color } as React.CSSProperties}
                >
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback 
                    style={{ backgroundColor: user.color }}
                    className={cn('text-white font-medium', sizeClasses[size].split(' ')[2])}
                  >
                    {getUserInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <UserStatusDot status={user.status} />
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <div className="text-xs">
                <div className="font-medium">{user.name}</div>
                <div className="text-slate-400">{getActivityLabel(user.activity)}</div>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}
      
      {overflowCount > 0 && (
        <div 
          className={cn(
            'flex items-center justify-center rounded-full bg-slate-700 ring-2 ring-slate-900 text-white font-medium',
            sizeClasses[size]
          )}
        >
          +{overflowCount}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// CURSOR OVERLAY COMPONENT
// ============================================================================

interface CursorOverlayProps {
  collaborators: Collaborator[];
  currentUserId: string;
  containerRef?: React.RefObject<HTMLElement>;
}

export function CursorOverlay({ 
  collaborators, 
  currentUserId,
}: CursorOverlayProps) {
  const cursorsToShow = collaborators.filter(
    c => c.id !== currentUserId && c.cursor && c.status === 'online'
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {cursorsToShow.map((user) => (
        <div
          key={user.id}
          className="absolute transition-all duration-100"
          style={{
            left: user.cursor!.x,
            top: user.cursor!.y,
            transform: 'translate(-2px, -2px)',
          }}
        >
          {/* Cursor */}
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            style={{ color: user.color }}
          >
            <path
              d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87a.5.5 0 0 0 .35-.85L6.35 3.21a.5.5 0 0 0-.85.35Z"
              fill="currentColor"
            />
            <path
              d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87a.5.5 0 0 0 .35-.85L6.35 3.21a.5.5 0 0 0-.85.35Z"
              stroke="white"
              strokeWidth="1.5"
            />
          </svg>
          
          {/* Name Tag */}
          <div
            className="absolute left-4 top-4 px-2 py-0.5 rounded text-xs text-white whitespace-nowrap"
            style={{ backgroundColor: user.color }}
          >
            {user.name.split(' ')[0]}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function PresenceIndicator({
  collaborators = MOCK_COLLABORATORS,
  currentUserId,
  maxVisible = 4,
  showActivity = true,
  variant = 'compact',
  className,
  onUserClick,
  onFollowUser,
}: PresenceIndicatorProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Sort by status: online first, then away, then offline
  const sortedCollaborators = useMemo(() => {
    const statusOrder = { online: 0, away: 1, offline: 2 };
    return [...collaborators].sort((a, b) => {
      // Current user always first
      if (a.id === currentUserId) return -1;
      if (b.id === currentUserId) return 1;
      return statusOrder[a.status] - statusOrder[b.status];
    });
  }, [collaborators, currentUserId]);

  const onlineCount = collaborators.filter(c => c.status === 'online').length;
  const activeCount = collaborators.filter(c => c.activity !== 'idle' && c.status === 'online').length;

  // Minimal variant - just shows count
  if (variant === 'minimal') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className={cn('gap-1.5 h-8', className)}
            >
              <Users className="h-4 w-4" />
              <span className="text-xs">{onlineCount}</span>
              {activeCount > 0 && (
                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {onlineCount} online{activeCount > 0 && `, ${activeCount} ativo${activeCount > 1 ? 's' : ''}`}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Compact variant - avatar stack with popover
  if (variant === 'compact') {
    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button className={cn('flex items-center gap-2', className)}>
            <AvatarStack 
              users={sortedCollaborators} 
              maxVisible={maxVisible} 
              size="sm"
            />
            {showActivity && activeCount > 0 && (
              <Badge variant="secondary" className="h-5 text-[10px] gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                {activeCount} ativo{activeCount > 1 ? 's' : ''}
              </Badge>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="end">
          <div className="p-2 border-b border-slate-700/50">
            <h4 className="font-medium text-white text-sm">Colaboradores</h4>
            <p className="text-xs text-slate-400">
              {onlineCount} online • {collaborators.length} total
            </p>
          </div>
          <ScrollArea className="max-h-[300px]">
            <div className="divide-y divide-slate-700/50">
              {sortedCollaborators.map((user) => (
                <div 
                  key={user.id}
                  onClick={() => onUserClick?.(user.id)}
                  className="cursor-pointer hover:bg-slate-800/50"
                >
                  <CollaboratorDetail 
                    user={user}
                    currentUserId={currentUserId}
                    onFollow={() => onFollowUser?.(user.id)}
                  />
                </div>
              ))}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
    );
  }

  // Detailed variant - expanded list
  return (
    <div className={cn('bg-slate-800/50 rounded-lg border border-slate-700/50', className)}>
      <div className="p-3 border-b border-slate-700/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-slate-400" />
          <span className="font-medium text-white text-sm">Colaboradores</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="h-5 text-[10px]">
            {onlineCount} online
          </Badge>
          {activeCount > 0 && (
            <Badge className="h-5 text-[10px] bg-green-500/20 text-green-400">
              {activeCount} ativo{activeCount > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </div>
      
      <ScrollArea className="max-h-[400px]">
        <div className="divide-y divide-slate-700/50">
          {sortedCollaborators.map((user) => (
            <div 
              key={user.id}
              onClick={() => onUserClick?.(user.id)}
              className="cursor-pointer hover:bg-slate-800/50"
            >
              <CollaboratorDetail 
                user={user}
                currentUserId={currentUserId}
                onFollow={() => onFollowUser?.(user.id)}
              />
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

export default PresenceIndicator;
