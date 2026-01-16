/**
 * 👥 Collaborator Avatars Component
 * Displays active collaborators in the editor top bar
 */

'use client';

import { useMemo } from 'react';
import { Collaborator } from '@/hooks/use-collaborators';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

interface CollaboratorAvatarsProps {
    collaborators: Collaborator[];
    maxVisible?: number;
    size?: 'sm' | 'md' | 'lg';
}

export function CollaboratorAvatars({
    collaborators,
    maxVisible = 5,
    size = 'md'
}: CollaboratorAvatarsProps) {
    const sizeClasses = {
        sm: 'w-6 h-6 text-xs',
        md: 'w-8 h-8 text-sm',
        lg: 'w-10 h-10 text-base'
    };

    const visibleCollaborators = useMemo(() =>
        collaborators.slice(0, maxVisible),
        [collaborators, maxVisible]
    );

    const hiddenCount = collaborators.length - maxVisible;

    if (collaborators.length === 0) {
        return null;
    }

    return (
        <TooltipProvider>
            <div className="flex items-center -space-x-2">
                {visibleCollaborators.map((collaborator) => (
                    <Tooltip key={collaborator.id}>
                        <TooltipTrigger asChild>
                            <div
                                className={`
                  ${sizeClasses[size]}
                  rounded-full
                  border-2 border-background
                  flex items-center justify-center
                  font-medium
                  cursor-default
                  transition-transform hover:scale-110 hover:z-10
                  ${collaborator.isOnline ? 'ring-2 ring-green-500 ring-offset-1' : 'opacity-60'}
                `}
                                style={{
                                    backgroundColor: collaborator.color,
                                    color: 'white'
                                }}
                            >
                                {collaborator.avatarUrl ? (
                                    <img
                                        src={collaborator.avatarUrl}
                                        alt={collaborator.name}
                                        className="w-full h-full rounded-full object-cover"
                                    />
                                ) : (
                                    <span>{getInitials(collaborator.name)}</span>
                                )}
                            </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="flex flex-col gap-1">
                            <span className="font-medium">{collaborator.name}</span>
                            <span className="text-xs text-muted-foreground">
                                {collaborator.isOnline ? '🟢 Online' : '⚪ Offline'}
                            </span>
                        </TooltipContent>
                    </Tooltip>
                ))}

                {hiddenCount > 0 && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div
                                className={`
                  ${sizeClasses[size]}
                  rounded-full
                  border-2 border-background
                  bg-muted
                  flex items-center justify-center
                  font-medium
                  cursor-default
                `}
                            >
                                +{hiddenCount}
                            </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                            <div className="flex flex-col gap-1">
                                {collaborators.slice(maxVisible).map(c => (
                                    <span key={c.id} className="text-sm">
                                        {c.name} {c.isOnline ? '🟢' : '⚪'}
                                    </span>
                                ))}
                            </div>
                        </TooltipContent>
                    </Tooltip>
                )}
            </div>
        </TooltipProvider>
    );
}

function getInitials(name: string): string {
    return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}
