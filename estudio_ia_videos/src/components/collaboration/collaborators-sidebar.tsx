'use client';

/**
 * Collaborators Sidebar Component
 * 
 * Shows active collaborators and their status.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Circle,
  UserPlus,
  Link,
  Copy,
  Mail,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useCollaboration, Collaborator } from '@/lib/collaboration/collaboration-provider';
import { toast } from 'sonner';

interface CollaboratorsSidebarProps {
  projectId: string;
  projectName: string;
  className?: string;
}

export function CollaboratorsSidebar({
  projectId,
  projectName,
  className,
}: CollaboratorsSidebarProps) {
  const { collaborators, currentUser, isConnected } = useCollaboration();
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);

  const shareLink = typeof window !== 'undefined'
    ? `${window.location.origin}/editor/${projectId}?invite=true`
    : '';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink);
    toast.success('Link copiado!');
  };

  const handleSendInvite = async () => {
    if (!inviteEmail) return;
    
    // Here you would send an invitation email via your backend
    toast.success(`Convite enviado para ${inviteEmail}`);
    setInviteEmail('');
    setIsInviteDialogOpen(false);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const sortedCollaborators = [...collaborators].sort((a, b) => {
    // Current user first
    if (currentUser && a.id === currentUser.id) return -1;
    if (currentUser && b.id === currentUser.id) return 1;
    // Then online users
    if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
    // Then alphabetically
    return a.name.localeCompare(b.name);
  });

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Connection Status */}
      <Badge
        variant="outline"
        className={cn(
          'text-xs',
          isConnected
            ? 'border-green-500/50 text-green-600'
            : 'border-red-500/50 text-red-600'
        )}
      >
        <Circle
          className={cn(
            'w-2 h-2 mr-1',
            isConnected ? 'fill-green-500' : 'fill-red-500'
          )}
        />
        {isConnected ? 'Conectado' : 'Desconectado'}
      </Badge>

      {/* Collaborator Avatars */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="px-2 gap-1">
            <div className="flex -space-x-2">
              {sortedCollaborators.slice(0, 4).map((collaborator) => (
                <Avatar
                  key={collaborator.id}
                  className={cn(
                    'w-6 h-6 border-2 border-background',
                    !collaborator.isOnline && 'opacity-50'
                  )}
                >
                  <AvatarImage src={collaborator.avatar} />
                  <AvatarFallback
                    style={{ backgroundColor: collaborator.color }}
                    className="text-white text-[10px]"
                  >
                    {getInitials(collaborator.name)}
                  </AvatarFallback>
                </Avatar>
              ))}
              {sortedCollaborators.length > 4 && (
                <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-medium border-2 border-background">
                  +{sortedCollaborators.length - 4}
                </div>
              )}
            </div>
            <Users className="w-4 h-4 text-slate-500" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72" align="end">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">Colaboradores</h4>
              <Badge variant="secondary" className="text-xs">
                {collaborators.filter(c => c.isOnline).length} online
              </Badge>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {sortedCollaborators.map((collaborator) => (
                <div
                  key={collaborator.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900"
                >
                  <div className="relative">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={collaborator.avatar} />
                      <AvatarFallback
                        style={{ backgroundColor: collaborator.color }}
                        className="text-white text-xs"
                      >
                        {getInitials(collaborator.name)}
                      </AvatarFallback>
                    </Avatar>
                    <Circle
                      className={cn(
                        'absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 border-background rounded-full',
                        collaborator.isOnline
                          ? 'fill-green-500 text-green-500'
                          : 'fill-slate-400 text-slate-400'
                      )}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {collaborator.name}
                      {currentUser && collaborator.id === currentUser.id && (
                        <span className="text-xs text-slate-500 ml-1">(você)</span>
                      )}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {collaborator.email}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Invite Actions */}
            <div className="pt-2 border-t space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={handleCopyLink}
              >
                <Link className="w-4 h-4 mr-2" />
                Copiar link de compartilhamento
              </Button>
              
              <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Convidar por email
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Convidar colaborador</DialogTitle>
                    <DialogDescription>
                      Envie um convite para alguém colaborar no projeto &quot;{projectName}&quot;
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="colaborador@email.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleSendInvite} disabled={!inviteEmail}>
                      <Mail className="w-4 h-4 mr-2" />
                      Enviar convite
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default CollaboratorsSidebar;
