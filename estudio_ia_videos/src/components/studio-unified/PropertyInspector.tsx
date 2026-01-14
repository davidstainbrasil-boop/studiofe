
import React, { useEffect, useState } from 'react';
import { ScrollArea } from '@components/ui/scroll-area';
import { Button } from '@components/ui/button';
import { Label } from '@components/ui/label';
import { Input } from '@components/ui/input';
import { Slider } from '@components/ui/slider';
import { useTimelineStore } from '@lib/stores/timeline-store';
import { TimelineElement } from '@lib/types/timeline-types';
import { Trash2, Copy, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';

export function PropertyInspector() {
    const selection = useTimelineStore(state => state.selection);
    const project = useTimelineStore(state => state.project);
    const updateElement = useTimelineStore(state => state.updateElement);
    const removeElement = useTimelineStore(state => state.removeElement);
    const duplicateElement = useTimelineStore(state => state.duplicateElement);

    // Local state for immediate feedback while typing, synced with store
    const [selectedElement, setSelectedElement] = useState<TimelineElement | null>(null);

    // Find selected element from store
    useEffect(() => {
        if (!project || selection.elementIds.length === 0) {
            setSelectedElement(null);
            return;
        }

        const id = selection.elementIds[0];
        // Search in all layers
        for (const layer of project.layers) {
            const found = layer.items.find(e => e.id === id);
            if (found) {
                setSelectedElement(found);
                return;
            }
        }
        setSelectedElement(null);
    }, [project, selection]);

    if (!selectedElement) {
        return (
            <div className="h-full flex flex-col items-center justify-center bg-background border-l text-muted-foreground p-4 text-center">
                <p className="text-sm">Selecione um elemento na timeline ou canvas para editar.</p>
            </div>
        );
    }

    // Helper to update specific property
    const handleUpdate = (field: keyof TimelineElement, value: any) => {
        if (!selectedElement) return;
        updateElement(selectedElement.id, { [field]: value });
    };

    const handlePropUpdate = (prop: string, value: any) => {
        if (!selectedElement) return;
        const currentProps = selectedElement.properties || {};
        updateElement(selectedElement.id, {
            properties: { ...currentProps, [prop]: value }
        });
    };

    // Derived values for Inputs (defaults if undefined)
    const props = selectedElement.properties || {};
    const x = Math.round(Number(props.left ?? 0));
    const y = Math.round(Number(props.top ?? 0));
    const scale = Math.round(Number(props.scaleX ?? 1) * 100);
    const rotation = Math.round(Number(props.angle ?? 0));
    const opacity = Number(props.opacity ?? 1) * 100;
    const textContent = (props.text as string) || selectedElement.name || '';
    const color = (props.fill as string) || '#ffffff';

    return (
        <div className="h-full flex flex-col bg-background border-l">
            <div className="px-4 py-3 border-b flex justify-between items-center bg-muted/20">
                <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-sm">Propriedades</h2>
                </div>
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:bg-muted"
                        onClick={() => duplicateElement(selectedElement.id)}
                        title="Duplicar (Ctrl+D)"
                    >
                        <Copy className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive hover:bg-destructive/10"
                        onClick={() => removeElement(selectedElement.id)}
                        title="Excluir"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                </div>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-4 space-y-6">

                    {/* Basic Info */}
                    <div className="space-y-3">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Geral</Label>

                        <div className="space-y-1">
                            <Label className="text-xs">Nome</Label>
                            <Input
                                className="h-8 text-xs"
                                value={selectedElement.name || ''}
                                onChange={(e) => handleUpdate('name', e.target.value)}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                                <Label className="text-xs">Início (s)</Label>
                                <Input
                                    type="number"
                                    step="0.1"
                                    className="h-8 text-xs"
                                    value={selectedElement.start.toFixed(2)}
                                    onChange={(e) => handleUpdate('start', parseFloat(e.target.value))}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Duração (s)</Label>
                                <Input
                                    type="number"
                                    step="0.1"
                                    className="h-8 text-xs"
                                    value={selectedElement.duration.toFixed(2)}
                                    onChange={(e) => handleUpdate('duration', parseFloat(e.target.value))}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="h-[1px] bg-border" />

                    {/* Transform */}
                    <div className="space-y-3">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Transform</Label>

                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                                <Label className="text-xs">X (px)</Label>
                                <Input
                                    type="number"
                                    className="h-8 text-xs"
                                    value={x}
                                    onChange={(e) => handlePropUpdate('left', parseFloat(e.target.value))}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Y (px)</Label>
                                <Input
                                    type="number"
                                    className="h-8 text-xs"
                                    value={y}
                                    onChange={(e) => handlePropUpdate('top', parseFloat(e.target.value))}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Scale (%)</Label>
                                <Input
                                    type="number"
                                    className="h-8 text-xs"
                                    value={scale}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value) / 100;
                                        // Update both scaleX and scaleY to maintain aspect ratio logic for simple input
                                        const currentProps = selectedElement.properties || {};
                                        updateElement(selectedElement.id, {
                                            properties: { ...currentProps, scaleX: val, scaleY: val }
                                        });
                                    }}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Rotation (°)</Label>
                                <Input
                                    type="number"
                                    className="h-8 text-xs"
                                    value={rotation}
                                    onChange={(e) => handlePropUpdate('angle', parseFloat(e.target.value))}
                                />
                            </div>
                        </div>

                        <div className="space-y-2 pt-2">
                            <div className="flex justify-between">
                                <Label className="text-xs">Opacidade {opacity.toFixed(0)}%</Label>
                            </div>
                            <Slider
                                value={[opacity]}
                                max={100}
                                step={1}
                                onValueChange={(vals) => handlePropUpdate('opacity', vals[0] / 100)}
                            />
                        </div>
                    </div>

                    {/* Text Specific */}
                    {selectedElement.type === 'text' && (
                        <>
                            <div className="h-[1px] bg-border" />
                            <div className="space-y-3">
                                <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Texto</Label>

                                <div className="space-y-1">
                                    <Label className="text-xs">Conteúdo</Label>
                                    <Input
                                        className="h-8 text-xs"
                                        value={textContent}
                                        onChange={(e) => {
                                            // Update both name (for timeline) and text property (for canvas)
                                            handleUpdate('name', e.target.value);
                                            handlePropUpdate('text', e.target.value);
                                        }}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                        <Label className="text-xs">Cor</Label>
                                        <div className="flex gap-2">
                                            <div className="w-8 h-8 rounded border" style={{ backgroundColor: color }} />
                                            <Input
                                                className="h-8 text-xs flex-1"
                                                value={color}
                                                onChange={(e) => handlePropUpdate('fill', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Tamanho</Label>
                                        <Input
                                            type="number"
                                            className="h-8 text-xs"
                                            value={props.fontSize as number || 24}
                                            onChange={(e) => handlePropUpdate('fontSize', parseFloat(e.target.value))}
                                        />
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Image Specific */}
                    {selectedElement.type === 'image' && (
                        <>
                            <div className="h-[1px] bg-border" />
                            <div className="space-y-3">
                                <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Imagem</Label>
                                <div className="bg-muted p-2 rounded text-xs text-center text-muted-foreground">
                                    {selectedElement.source || 'No source'}
                                </div>
                            </div>
                        </>
                    )}

                    {/* Audio Specific */}
                    {selectedElement.type === 'audio' && (
                        <>
                            <div className="h-[1px] bg-border" />
                            <div className="space-y-3">
                                <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Configurações de Áudio</Label>

                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <Label className="text-xs">Volume {((selectedElement.volume ?? 1) * 100).toFixed(0)}%</Label>
                                    </div>
                                    <Slider
                                        value={[(selectedElement.volume ?? 1) * 100]}
                                        max={100}
                                        step={1}
                                        onValueChange={(vals) => handleUpdate('volume', vals[0] / 100)}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs">Fade In (ms)</Label>
                                    <Input
                                        type="number"
                                        className="h-8 text-xs"
                                        value={selectedElement.fadeIn ?? 0}
                                        onChange={(e) => handleUpdate('fadeIn', parseInt(e.target.value))}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs">Fade Out (ms)</Label>
                                    <Input
                                        type="number"
                                        className="h-8 text-xs"
                                        value={selectedElement.fadeOut ?? 0}
                                        onChange={(e) => handleUpdate('fadeOut', parseInt(e.target.value))}
                                    />
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}
