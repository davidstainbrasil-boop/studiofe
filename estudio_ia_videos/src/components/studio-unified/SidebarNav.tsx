'use client';

import React from 'react';
import {
    Box,
    Type,
    Image as ImageIcon,
    Music,
    Users,
    LayoutTemplate,
    Wand2,
    Settings,
    Grid
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';

export type EditorTool = 'story' | 'avatars' | 'visuals' | 'audio' | 'text' | 'elements' | 'templates' | 'settings';

interface SidebarNavProps {
    activeTool: EditorTool;
    onToolSelect: (tool: EditorTool) => void;
}

const TOOLS = [
    { id: 'story', label: 'Roteiro', icon: <Wand2 size={20} /> },
    { id: 'avatars', label: 'Avatares', icon: <Users size={20} /> },
    { id: 'visuals', label: 'Visual', icon: <ImageIcon size={20} /> },
    { id: 'audio', label: 'Áudio', icon: <Music size={20} /> },
    { id: 'text', label: 'Texto', icon: <Type size={20} /> },
    { id: 'elements', label: 'Elementos', icon: <Box size={20} /> },
    { id: 'templates', label: 'Templates', icon: <LayoutTemplate size={20} /> },
];

export function SidebarNav({ activeTool, onToolSelect }: SidebarNavProps) {
    return (
        <div className="w-[72px] bg-background border-r flex flex-col items-center py-4 gap-2 z-20">
            <div className="mb-4">
                <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
                    <span className="text-primary-foreground font-bold text-xl">V</span>
                </div>
            </div>

            <TooltipProvider delayDuration={0}>
                {TOOLS.map((tool) => (
                    <Tooltip key={tool.id}>
                        <TooltipTrigger asChild>
                            <button
                                onClick={() => onToolSelect(tool.id as EditorTool)}
                                className={cn(
                                    "w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-1 transition-all",
                                    activeTool === tool.id
                                        ? "bg-primary/10 text-primary"
                                        : "text-muted-foreground hover:bg-neutral-800 hover:text-foreground"
                                )}
                            >
                                {tool.icon}
                                <span className="text-[9px] font-medium">{tool.label}</span>
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                            <p>{tool.label}</p>
                        </TooltipContent>
                    </Tooltip>
                ))}
            </TooltipProvider>

            <div className="flex-1" />

            <Button variant="ghost" size="icon" className="mb-2">
                <Settings size={20} className="text-muted-foreground" />
            </Button>
        </div>
    );
}
