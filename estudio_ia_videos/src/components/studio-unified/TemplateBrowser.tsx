'use client';

import React, { useState } from 'react';
import { ScrollArea } from '@components/ui/scroll-area';
import { Button } from '@components/ui/button';
import { Badge } from '@components/ui/badge';
import { Card, CardContent } from '@components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@components/ui/tabs';
import { Sparkles, Play } from 'lucide-react';
import { ALL_TEMPLATES, Template } from '../../lib/templates/template-definitions';
import { useTimelineStore } from '../../lib/stores/timeline-store';
import { logger } from '../../lib/logger';

export function TemplateBrowser() {
    const [selectedType, setSelectedType] = useState<'all' | 'intro' | 'outro' | 'lower-third'>('all');
    const applyTemplate = useTimelineStore(state => state.applyTemplate);

    const filteredTemplates = selectedType === 'all'
        ? ALL_TEMPLATES
        : ALL_TEMPLATES.filter(t => t.type === selectedType);

    const handleApplyTemplate = (template: Template) => {
        logger.info('Applying template from UI', { templateId: template.id });
        applyTemplate(template);
    };

    const getTypeColor = (type: Template['type']) => {
        switch (type) {
            case 'intro':
                return 'bg-green-500/20 text-green-300';
            case 'outro':
                return 'bg-blue-500/20 text-blue-300';
            case 'lower-third':
                return 'bg-purple-500/20 text-purple-300';
        }
    };

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="p-4 border-b">
                <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-5 h-5 text-primary" />
                    <h2 className="text-lg font-semibold">Templates</h2>
                </div>

                {/* Filter Tabs */}
                <Tabs value={selectedType} onValueChange={(v) => setSelectedType(v as any)} className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="all">Todos</TabsTrigger>
                        <TabsTrigger value="intro">Intro</TabsTrigger>
                        <TabsTrigger value="outro">Outro</TabsTrigger>
                        <TabsTrigger value="lower-third">Lower</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            {/* Template Grid */}
            <ScrollArea className="flex-1">
                <div className="p-4 space-y-3">
                    {filteredTemplates.map((template) => (
                        <Card key={template.id} className="overflow-hidden hover:border-primary/50 transition-colors">
                            <CardContent className="p-0">
                                {/* Preview Image */}
                                <div className="relative aspect-video bg-muted/30">
                                    <img
                                        src={template.preview}
                                        alt={template.name}
                                        className="w-full h-full object-cover"
                                    />
                                    <Badge
                                        className={`absolute top-2 right-2 ${getTypeColor(template.type)}`}
                                        variant="secondary"
                                    >
                                        {template.type}
                                    </Badge>
                                </div>

                                {/* Info */}
                                <div className="p-3">
                                    <h3 className="font-semibold text-sm mb-1">{template.name}</h3>
                                    <p className="text-xs text-muted-foreground mb-2">{template.description}</p>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-muted-foreground">{template.duration}s</span>
                                        <Button
                                            size="sm"
                                            onClick={() => handleApplyTemplate(template)}
                                            className="gap-1"
                                        >
                                            <Play className="w-3 h-3" />
                                            Aplicar
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}

                    {filteredTemplates.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                            <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">Nenhum template encontrado</p>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}
