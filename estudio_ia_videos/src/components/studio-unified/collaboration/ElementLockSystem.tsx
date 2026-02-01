'use client';

import React, { useState, useCallback, useMemo, createContext, useContext } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Lock,
  Unlock,
  AlertTriangle,
  User,
  Clock,
  Layers,
  Type,
  Image,
  Video,
  Music,
  Play,
  Sparkles,
  X,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

type LockableElementType = 
  | 'slide'
  | 'track'
  | 'element'
  | 'text'
  | 'image'
  | 'video'
  | 'audio'
  | 'shape'
  | 'effect';

interface LockOwner {
  id: string;
  name: string;
  avatar?: string;
  color: string;
}

interface ElementLock {
  id: string;
  elementId: string;
  elementType: LockableElementType;
  elementName: string;
  ownerId: string;
  owner: LockOwner;
  lockedAt: Date;
  expiresAt?: Date;
  reason?: string;
  isExclusive: boolean;
}

interface LockRequest {
  elementId: string;
  elementType: LockableElementType;
  elementName: string;
  requesterId: string;
  requester: LockOwner;
  currentOwnerId: string;
  currentOwner: LockOwner;
  requestedAt: Date;
  message?: string;
}

interface ElementLockContextValue {
  locks: ElementLock[];
  requests: LockRequest[];
  currentUserId: string;
  acquireLock: (elementId: string, elementType: LockableElementType, elementName: string) => Promise<boolean>;
  releaseLock: (elementId: string) => void;
  requestLock: (elementId: string, message?: string) => void;
  isLocked: (elementId: string) => boolean;
  isLockedByMe: (elementId: string) => boolean;
  getLock: (elementId: string) => ElementLock | undefined;
  canEdit: (elementId: string) => boolean;
}

interface ElementLockProviderProps {
  children: React.ReactNode;
  currentUserId: string;
  currentUser: LockOwner;
}

// ============================================================================
// MOCK DATA
// ============================================================================

const MOCK_USERS: Record<string, LockOwner> = {
  'user-1': { id: 'user-1', name: 'João Silva', avatar: '/avatars/joao.jpg', color: '#3b82f6' },
  'user-2': { id: 'user-2', name: 'Maria Santos', avatar: '/avatars/maria.jpg', color: '#10b981' },
  'user-3': { id: 'user-3', name: 'Pedro Costa', color: '#f59e0b' },
};

const MOCK_LOCKS: ElementLock[] = [
  {
    id: 'lock-1',
    elementId: 'text-title-1',
    elementType: 'text',
    elementName: 'Título Principal',
    ownerId: 'user-2',
    owner: MOCK_USERS['user-2'],
    lockedAt: new Date(Date.now() - 300000),
    isExclusive: true,
    reason: 'Editando texto',
  },
  {
    id: 'lock-2',
    elementId: 'track-audio-1',
    elementType: 'audio',
    elementName: 'Track de Narração',
    ownerId: 'user-3',
    owner: MOCK_USERS['user-3'],
    lockedAt: new Date(Date.now() - 120000),
    isExclusive: true,
  },
];

// ============================================================================
// CONTEXT
// ============================================================================

const ElementLockContext = createContext<ElementLockContextValue | null>(null);

export function useElementLock() {
  const context = useContext(ElementLockContext);
  if (!context) {
    throw new Error('useElementLock must be used within ElementLockProvider');
  }
  return context;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getUserInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function formatLockDuration(lockedAt: Date): string {
  const seconds = Math.floor((Date.now() - lockedAt.getTime()) / 1000);
  if (seconds < 60) return 'agora';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h`;
}

function getElementIcon(type: LockableElementType) {
  const icons = {
    slide: Layers,
    track: Play,
    element: Sparkles,
    text: Type,
    image: Image,
    video: Video,
    audio: Music,
    shape: Layers,
    effect: Sparkles,
  };
  return icons[type] || Layers;
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface LockBadgeProps {
  lock: ElementLock;
  size?: 'sm' | 'md';
  showName?: boolean;
  onRelease?: () => void;
  canRelease?: boolean;
  className?: string;
}

export function LockBadge({ 
  lock, 
  size = 'sm', 
  showName = true,
  onRelease,
  canRelease = false,
  className,
}: LockBadgeProps) {
  const sizeClasses = {
    sm: 'h-5 text-[10px] px-1.5',
    md: 'h-6 text-xs px-2',
  };

  return (
    <Badge 
      variant="outline" 
      className={cn(
        'gap-1 border-orange-500/50 bg-orange-500/10 text-orange-400',
        sizeClasses[size],
        className
      )}
    >
      <Lock className={size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
      {showName && (
        <span className="max-w-[80px] truncate">{lock.owner.name.split(' ')[0]}</span>
      )}
      {canRelease && onRelease && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRelease();
          }}
          className="ml-0.5 hover:text-white"
        >
          <X className={size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
        </button>
      )}
    </Badge>
  );
}

interface LockIndicatorProps {
  elementId: string;
  className?: string;
  variant?: 'badge' | 'icon' | 'overlay';
}

export function LockIndicator({ 
  elementId, 
  className,
  variant = 'badge',
}: LockIndicatorProps) {
  const { getLock, isLockedByMe, releaseLock, currentUserId } = useElementLock();
  const lock = getLock(elementId);

  if (!lock) return null;

  const isOwn = isLockedByMe(elementId);

  if (variant === 'icon') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div 
              className={cn(
                'flex items-center justify-center h-5 w-5 rounded',
                isOwn ? 'bg-blue-500/20 text-blue-400' : 'bg-orange-500/20 text-orange-400',
                className
              )}
            >
              <Lock className="h-3 w-3" />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-xs">
              {isOwn ? 'Bloqueado por você' : `Bloqueado por ${lock.owner.name}`}
              <div className="text-slate-400">há {formatLockDuration(lock.lockedAt)}</div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (variant === 'overlay') {
    return (
      <div 
        className={cn(
          'absolute inset-0 bg-orange-500/5 border-2 border-orange-500/30 rounded pointer-events-none',
          'flex items-start justify-end p-1',
          className
        )}
      >
        <LockBadge 
          lock={lock} 
          size="sm"
          canRelease={isOwn}
          onRelease={() => releaseLock(elementId)}
        />
      </div>
    );
  }

  // Default badge variant
  return (
    <LockBadge 
      lock={lock}
      className={className}
      canRelease={isOwn}
      onRelease={() => releaseLock(elementId)}
    />
  );
}

interface LockableElementProps {
  elementId: string;
  elementType: LockableElementType;
  elementName: string;
  children: React.ReactNode;
  className?: string;
  showOverlay?: boolean;
  onLockAcquired?: () => void;
  onLockDenied?: () => void;
}

export function LockableElement({
  elementId,
  elementType,
  elementName,
  children,
  className,
  showOverlay = true,
  onLockAcquired,
  onLockDenied,
}: LockableElementProps) {
  const { getLock, isLockedByMe, canEdit, acquireLock } = useElementLock();
  const lock = getLock(elementId);
  const isLocked = !!lock;
  const isOwnLock = isLockedByMe(elementId);
  const editable = canEdit(elementId);

  const [showRequestDialog, setShowRequestDialog] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    if (!isLocked) {
      // Try to acquire lock
      const acquired = await acquireLock(elementId, elementType, elementName);
      if (acquired) {
        onLockAcquired?.();
      }
    } else if (!isOwnLock) {
      // Show request dialog
      e.preventDefault();
      e.stopPropagation();
      setShowRequestDialog(true);
      onLockDenied?.();
    }
  };

  return (
    <>
      <div 
        className={cn(
          'relative',
          !editable && 'cursor-not-allowed',
          className
        )}
        onClick={handleClick}
      >
        {children}
        
        {showOverlay && isLocked && !isOwnLock && (
          <LockIndicator elementId={elementId} variant="overlay" />
        )}
        
        {isOwnLock && (
          <div className="absolute top-1 right-1">
            <LockIndicator elementId={elementId} variant="icon" />
          </div>
        )}
      </div>

      {/* Lock Request Dialog */}
      <AlertDialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-orange-400" />
              Elemento Bloqueado
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Este elemento está sendo editado por <strong>{lock?.owner.name}</strong>.
                </p>
                
                <div className="flex items-center gap-3 p-3 bg-slate-800 rounded-lg">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={lock?.owner.avatar} />
                    <AvatarFallback style={{ backgroundColor: lock?.owner.color }}>
                      {lock?.owner.name ? getUserInitials(lock.owner.name) : '??'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium text-white">{lock?.owner.name}</div>
                    <div className="text-xs text-slate-400">
                      Editando há {lock ? formatLockDuration(lock.lockedAt) : '?'}
                    </div>
                  </div>
                </div>
                
                <p className="text-sm">
                  Você pode solicitar acesso ou aguardar até que o bloqueio seja liberado.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction>Solicitar Acesso</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

interface LocksListProps {
  className?: string;
  showMyLocks?: boolean;
  showOtherLocks?: boolean;
}

export function LocksList({ 
  className,
  showMyLocks = true,
  showOtherLocks = true,
}: LocksListProps) {
  const { locks, currentUserId, releaseLock } = useElementLock();

  const myLocks = locks.filter(l => l.ownerId === currentUserId);
  const otherLocks = locks.filter(l => l.ownerId !== currentUserId);

  if (locks.length === 0) {
    return (
      <div className={cn('text-center py-4 text-sm text-slate-500', className)}>
        <Unlock className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>Nenhum elemento bloqueado</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* My Locks */}
      {showMyLocks && myLocks.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-slate-400 mb-2 flex items-center gap-1">
            <Shield className="h-3 w-3" />
            Seus bloqueios ({myLocks.length})
          </h4>
          <div className="space-y-1">
            {myLocks.map((lock) => {
              const Icon = getElementIcon(lock.elementType);
              return (
                <div 
                  key={lock.id}
                  className="flex items-center gap-2 p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg"
                >
                  <Icon className="h-4 w-4 text-blue-400" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">{lock.elementName}</div>
                    <div className="text-xs text-slate-400">
                      {lock.elementType} • há {formatLockDuration(lock.lockedAt)}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => releaseLock(lock.elementId)}
                    className="h-7 text-xs"
                  >
                    <Unlock className="h-3 w-3 mr-1" />
                    Liberar
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Other Users' Locks */}
      {showOtherLocks && otherLocks.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-slate-400 mb-2 flex items-center gap-1">
            <Lock className="h-3 w-3" />
            Bloqueados por outros ({otherLocks.length})
          </h4>
          <div className="space-y-1">
            {otherLocks.map((lock) => {
              const Icon = getElementIcon(lock.elementType);
              return (
                <div 
                  key={lock.id}
                  className="flex items-center gap-2 p-2 bg-orange-500/10 border border-orange-500/20 rounded-lg"
                >
                  <div className="relative">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={lock.owner.avatar} />
                      <AvatarFallback 
                        style={{ backgroundColor: lock.owner.color }}
                        className="text-xs"
                      >
                        {getUserInitials(lock.owner.name)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <Icon className="h-4 w-4 text-orange-400" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">{lock.elementName}</div>
                    <div className="text-xs text-slate-400">
                      {lock.owner.name} • há {formatLockDuration(lock.lockedAt)}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                  >
                    Solicitar
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// PROVIDER COMPONENT
// ============================================================================

export function ElementLockProvider({
  children,
  currentUserId,
  currentUser,
}: ElementLockProviderProps) {
  const [locks, setLocks] = useState<ElementLock[]>(MOCK_LOCKS);
  const [requests, setRequests] = useState<LockRequest[]>([]);

  const acquireLock = useCallback(async (
    elementId: string,
    elementType: LockableElementType,
    elementName: string
  ): Promise<boolean> => {
    // Check if already locked
    const existingLock = locks.find(l => l.elementId === elementId);
    if (existingLock) {
      if (existingLock.ownerId === currentUserId) {
        // Already own the lock
        return true;
      }
      // Locked by someone else
      return false;
    }

    // Create new lock
    const newLock: ElementLock = {
      id: `lock-${Date.now()}`,
      elementId,
      elementType,
      elementName,
      ownerId: currentUserId,
      owner: currentUser,
      lockedAt: new Date(),
      isExclusive: true,
    };

    setLocks(prev => [...prev, newLock]);
    return true;
  }, [currentUserId, currentUser, locks]);

  const releaseLock = useCallback((elementId: string) => {
    setLocks(prev => prev.filter(l => 
      !(l.elementId === elementId && l.ownerId === currentUserId)
    ));
  }, [currentUserId]);

  const requestLock = useCallback((elementId: string, message?: string) => {
    const lock = locks.find(l => l.elementId === elementId);
    if (!lock || lock.ownerId === currentUserId) return;

    const request: LockRequest = {
      elementId,
      elementType: lock.elementType,
      elementName: lock.elementName,
      requesterId: currentUserId,
      requester: currentUser,
      currentOwnerId: lock.ownerId,
      currentOwner: lock.owner,
      requestedAt: new Date(),
      message,
    };

    setRequests(prev => [...prev, request]);
  }, [currentUserId, currentUser, locks]);

  const isLocked = useCallback((elementId: string): boolean => {
    return locks.some(l => l.elementId === elementId);
  }, [locks]);

  const isLockedByMe = useCallback((elementId: string): boolean => {
    return locks.some(l => l.elementId === elementId && l.ownerId === currentUserId);
  }, [locks, currentUserId]);

  const getLock = useCallback((elementId: string): ElementLock | undefined => {
    return locks.find(l => l.elementId === elementId);
  }, [locks]);

  const canEdit = useCallback((elementId: string): boolean => {
    const lock = locks.find(l => l.elementId === elementId);
    if (!lock) return true; // Not locked
    return lock.ownerId === currentUserId; // Can edit if own lock
  }, [locks, currentUserId]);

  const contextValue = useMemo<ElementLockContextValue>(() => ({
    locks,
    requests,
    currentUserId,
    acquireLock,
    releaseLock,
    requestLock,
    isLocked,
    isLockedByMe,
    getLock,
    canEdit,
  }), [
    locks,
    requests,
    currentUserId,
    acquireLock,
    releaseLock,
    requestLock,
    isLocked,
    isLockedByMe,
    getLock,
    canEdit,
  ]);

  return (
    <ElementLockContext.Provider value={contextValue}>
      {children}
    </ElementLockContext.Provider>
  );
}

export default ElementLockProvider;
