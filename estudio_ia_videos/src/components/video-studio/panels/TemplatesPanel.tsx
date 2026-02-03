'use client';

import { useState, useEffect } from 'react';
import { Button } from '@components/ui/button';
import { ScrollArea } from '@components/ui/scroll-area';
import { LayoutTemplate, Plus, Loader2 } from 'lucide-react';
import type { VideoTemplate } from '@lib/templates/types';
import { logger } from '@lib/logger';

// Fallback templates caso a API não retorne dados
const DEFAULT_TEMPLATES: VideoTemplate[] = [
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

interface TemplateApiResponse {
    id: string;
    name: string;
    description?: string;
    category?: string;
    duration?: number;
    thumbnail?: string;
}

export function TemplatesPanel({ onSelectTemplate }: { onSelectTemplate: (template: VideoTemplate) => void }) {
    const [templates, setTemplates] = useState<VideoTemplate[]>(DEFAULT_TEMPLATES);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchTemplates = async () => {
            try {
                setLoading(true);
                const response = await fetch('/api/templates?type=video');
                
                if (!response.ok) {
                    throw new Error('Falha ao carregar templates');
                }
                
                const data = await response.json();
                
                if (data.templates && data.templates.length > 0) {
                    const videoTemplates: VideoTemplate[] = data.templates.map((t: TemplateApiResponse) => ({
                        id: t.id,
                        name: t.name,
                        category: t.category || 'Geral',
                        duration: t.duration || 10,
                        tracks: [],
                        variables: [],
                        thumbnail: t.thumbnail,
                    }));
                    setTemplates(videoTemplates);
                }
                setError(null);
            } catch (err) {
                logger.error('Erro ao carregar templates', err as Error, { component: 'TemplatesPanel' });
                setError('Usando templates padrão');
                // Keep default templates on error
            } finally {
                setLoading(false);
            }
        };

        fetchTemplates();
    }, []);

    return (
        <div className="h-full bg-card border-l border-border flex flex-col">
            <div className="p-4 border-b border-border">
                <h2 className="font-semibold flex items-center gap-2">
                    <LayoutTemplate className="h-4 w-4 text-blue-500" />
                    Templates
                    {loading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                </h2>
                {error && (
                    <p className="text-xs text-muted-foreground mt-1">{error}</p>
                )}
            </div>

            <ScrollArea className="flex-1">
                <div className="p-4 grid grid-cols-2 gap-4">
                    {templates.map(template => (
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
