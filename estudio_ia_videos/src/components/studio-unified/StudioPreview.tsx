import React from 'react';
import { Button } from '@components/ui/button';
import { Play, SkipBack, SkipForward, ZoomIn, ZoomOut } from 'lucide-react';
import { UnifiedCanvas } from './UnifiedCanvas';

export function StudioPreview() {
    return (
        <div className="h-full flex flex-col bg-background relative group">
            {/* Canvas Area - Real Integration */}
            <div className="flex-1 bg-muted/50 flex items-center justify-center overflow-hidden relative">
                <div className="aspect-video w-full max-h-full shadow-2xl flex items-center justify-center">
                    <UnifiedCanvas />
                </div>
            </div>

            {/* Player Controls Overlay (Visual Only for now) */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-background/80 backdrop-blur rounded-full px-4 py-2 border shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                    <SkipBack className="w-4 h-4" />
                </Button>
                <Button size="icon" className="h-10 w-10 rounded-full">
                    <Play className="w-4 h-4 ml-0.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                    <SkipForward className="w-4 h-4" />
                </Button>
            </div>

            {/* Zoom Controls Overlay */}
            <div className="absolute top-4 right-4 flex items-center gap-1 bg-background/80 backdrop-blur rounded-md px-2 py-1 border shadow-sm text-xs z-10">
                <Button variant="ghost" size="icon" className="h-6 w-6">
                    <ZoomOut className="w-3 h-3" />
                </Button>
                <span className="w-12 text-center">100%</span>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                    <ZoomIn className="w-3 h-3" />
                </Button>
            </div>
        </div>
    );
}
