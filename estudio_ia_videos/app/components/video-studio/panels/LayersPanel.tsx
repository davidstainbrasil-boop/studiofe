'use client';

import {
    Layers,
    Eye,
    EyeOff,
    Lock,
    Unlock,
    ChevronUp,
    ChevronDown,
    Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface LayerItem {
    id: string; // Fabric object ID (if available) or index
    type: string;
    index: number;
    locked: boolean;
    visible: boolean;
    name?: string;
}

interface LayersPanelProps {
    layers: LayerItem[];
    onSelectLayer: (index: number) => void;
    onToggleLock: (index: number) => void;
    onToggleVisibility: (index: number) => void;
    onMoveLayer: (index: number, direction: 'up' | 'down') => void;
    onDeleteLayer: (index: number) => void;
    selectedIndex: number | null;
}

export function LayersPanel({
    layers,
    onSelectLayer,
    onToggleLock,
    onToggleVisibility,
    onMoveLayer,
    onDeleteLayer,
    selectedIndex
}: LayersPanelProps) {

    // Reverse layers for display so top-most is at the top of the list
    // But keep original index for callbacks
    const displayLayers = [...layers].reverse();

    return (
        <div className="flex flex-col h-full bg-card border-l border-border w-64">
            <div className="p-3 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2 font-medium text-sm">
                    <Layers className="w-4 h-4" />
                    Camadas
                </div>
                <span className="text-xs text-muted-foreground">{layers.length} items</span>
            </div>

            <ScrollArea className="flex-1">
                <div className="flex flex-col p-2 gap-1">
                    {displayLayers.length === 0 ? (
                        <div className="text-center py-8 text-xs text-muted-foreground">
                            Nenhuma camada
                        </div>
                    ) : (
                        displayLayers.map((layer) => (
                            <div
                                key={layer.id || layer.index} // Fallback key
                                className={`
                                    flex items-center gap-2 p-2 rounded-md text-sm cursor-pointer border
                                    ${selectedIndex === layer.index
                                        ? 'bg-accent border-primary/20'
                                        : 'hover:bg-accent/50 border-transparent'}
                                `}
                                onClick={() => onSelectLayer(layer.index)}
                            >
                                <div className="flex-1 truncate font-medium">
                                    {layer.name || layer.type} <span className="text-[10px] text-muted-foreground ml-1">#{layer.index}</span>
                                </div>

                                <div className="flex items-center gap-1 opacity-60 hover:opacity-100">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={(e) => { e.stopPropagation(); onToggleVisibility(layer.index); }}
                                        title={layer.visible ? "Ocultar" : "Mostrar"}
                                    >
                                        {layer.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3 text-muted-foreground" />}
                                    </Button>

                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={(e) => { e.stopPropagation(); onToggleLock(layer.index); }}
                                        title={layer.locked ? "Desbloquear" : "Bloquear"}
                                    >
                                        {layer.locked ? <Lock className="w-3 h-3 text-destructive" /> : <Unlock className="w-3 h-3" />}
                                    </Button>

                                    <div className="flex flex-col">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-3 w-4 p-0"
                                            onClick={(e) => { e.stopPropagation(); onMoveLayer(layer.index, 'up'); }}
                                            disabled={layer.index === layers.length - 1}
                                        >
                                            <ChevronUp className="w-2 h-2" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-3 w-4 p-0"
                                            onClick={(e) => { e.stopPropagation(); onMoveLayer(layer.index, 'down'); }}
                                            disabled={layer.index === 0}
                                        >
                                            <ChevronDown className="w-2 h-2" />
                                        </Button>
                                    </div>

                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 hover:text-destructive"
                                        onClick={(e) => { e.stopPropagation(); onDeleteLayer(layer.index); }}
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}
