'use client';

import { Button } from '@components/ui/button';
import { ScrollArea } from '@components/ui/scroll-area';
import { LayoutTemplate, Plus } from 'lucide-react';
import type { VideoTemplate } from '@lib/templates/types';

const MOCK_TEMPLATES: VideoTemplate[] = [
    {
        id: 'intro-tech',
        name: 'Tech Intro',
        category: 'Intros',
        duration: 5,
        tracks: [],
        variables: []
    },
    {
        id: 'promo-social',
        name: 'Social Promo',
        category: 'Social Media',
        duration: 15,
        tracks: [],
        variables: []
    }
];

export function TemplatesPanel({ onSelectTemplate }: { onSelectTemplate: (template: VideoTemplate) => void }) {
    return (
        <div className="h-full bg-card border-l border-border flex flex-col">
            <div className="p-4 border-b border-border">
                <h2 className="font-semibold flex items-center gap-2">
                    <LayoutTemplate className="h-4 w-4 text-blue-500" />
                    Templates
                </h2>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-4 grid grid-cols-2 gap-4">
                    {MOCK_TEMPLATES.map(template => (
                        <div key={template.id} className="group relative aspect-video bg-muted rounded-md overflow-hidden border border-border hover:border-primary transition-colors">
                            <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button size="sm" onClick={() => onSelectTemplate(template)}>
                                    <Plus className="h-4 w-4 mr-1" /> Usar
                                </Button>
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent text-white text-xs font-medium">
                                {template.name}
                            </div>
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
}
