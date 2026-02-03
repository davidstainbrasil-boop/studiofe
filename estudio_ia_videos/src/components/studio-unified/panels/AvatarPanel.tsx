'use client';

import React from 'react';
import { User, Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Avatar } from '@/types/video-project';

interface AvatarPanelProps {
    avatars: Avatar[];
    selectedAvatarId: string | null;
    onSelectAvatar: (id: string) => void;
}

export function AvatarPanel({ avatars, selectedAvatarId, onSelectAvatar }: AvatarPanelProps) {
    return (
        <div className="h-full flex flex-col bg-card">
            <div className="p-4 border-b space-y-4">
                <div>
                    <h2 className="text-lg font-semibold">Avatares AI</h2>
                    <p className="text-xs text-muted-foreground">Escolha o apresentador perfeito para seu vídeo</p>
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Buscar avatar..." className="pl-9" />
                </div>

                <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1 text-xs h-8">
                        <Filter size={12} className="mr-2" />
                        Filtrar
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 text-xs h-8">
                        Todos
                    </Button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
                <div className="grid grid-cols-2 gap-4">
                    {avatars.map((avatar) => (
                        <button
                            key={avatar.id}
                            onClick={() => onSelectAvatar(avatar.id)}
                            className={cn(
                                "group relative aspect-[3/4] rounded-xl overflow-hidden border transition-all hover:scale-105 hover:shadow-xl",
                                selectedAvatarId === avatar.id
                                    ? "ring-2 ring-primary border-primary"
                                    : "border-border hover:border-primary/50"
                            )}
                        >
                            {/* Thumbnail Placeholder */}
                            <div className="absolute inset-0 bg-gradient-to-br from-neutral-800 to-neutral-700 flex flex-col items-center justify-center text-muted-foreground group-hover:text-white transition-colors">
                                <User size={32} />
                            </div>

                            {/* Info Overlay */}
                            <div className="absolute bottom-0 left-0 right-0 p-3 bg-black/60 backdrop-blur-sm">
                                <p className="text-white text-xs font-medium truncate">{avatar.name}</p>
                                <p className="text-white/60 text-[10px] truncate capitalize">{avatar.category || avatar.gender}</p>
                            </div>

                            {/* Selection Indicator */}
                            {selectedAvatarId === avatar.id && (
                                <div className="absolute top-2 right-2 h-3 w-3 bg-primary rounded-full shadow-lg ring-2 ring-white" />
                            )}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
