'use client';

import { Label } from '@components/ui/label';
import { Input } from '@components/ui/input';
import { Slider } from '@components/ui/slider';

interface PropertiesPanelProps {
    element: {
        type: string;
        left?: number;
        top?: number;
        width?: number;
        height?: number;
        fill?: string;
        opacity?: number;
        angle?: number;
    } | null;
    onChange: (property: string, value: any) => void;
}

export function PropertiesPanel({ element, onChange }: PropertiesPanelProps) {
    if (!element) {
        return (
            <div className="p-4 text-center text-muted-foreground text-sm">
                Selecione um elemento para editar suas propriedades.
            </div>
        );
    }

    return (
        <div className="w-80 border-l border-border bg-card overflow-y-auto">
            <div className="p-4 border-b border-border">
                <h3 className="font-semibold text-sm uppercase tracking-wide">Propriedades</h3>
                <div className="text-xs text-muted-foreground mt-1 capitalize">{element.type}</div>
            </div>

            <div className="p-4 space-y-6">
                {/* Position */}
                <div className="space-y-3">
                    <Label className="text-xs font-semibold text-muted-foreground">Posição</Label>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <Label className="text-[10px] mb-1 block">X</Label>
                            <Input
                                type="number"
                                value={Math.round(element.left || 0)}
                                onChange={(e) => onChange('left', Number(e.target.value))}
                                className="h-8"
                            />
                        </div>
                        <div>
                            <Label className="text-[10px] mb-1 block">Y</Label>
                            <Input
                                type="number"
                                value={Math.round(element.top || 0)}
                                onChange={(e) => onChange('top', Number(e.target.value))}
                                className="h-8"
                            />
                        </div>
                    </div>
                </div>

                {/* Dimensions */}
                <div className="space-y-3">
                    <Label className="text-xs font-semibold text-muted-foreground">Dimensões</Label>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <Label className="text-[10px] mb-1 block">Largura</Label>
                            <Input
                                type="number"
                                value={Math.round(element.width || 0)}
                                onChange={(e) => onChange('width', Number(e.target.value))}
                                className="h-8"
                            />
                        </div>
                        <div>
                            <Label className="text-[10px] mb-1 block">Altura</Label>
                            <Input
                                type="number"
                                value={Math.round(element.height || 0)}
                                onChange={(e) => onChange('height', Number(e.target.value))}
                                className="h-8"
                            />
                        </div>
                    </div>
                </div>

                {/* Appearance */}
                <div className="space-y-3">
                    <Label className="text-xs font-semibold text-muted-foreground">Aparência</Label>

                    <div>
                        <Label className="text-[10px] mb-1 block">Cor de Preenchimento</Label>
                        <div className="flex gap-2">
                            <div
                                className="w-8 h-8 rounded border border-input cursor-pointer"
                                style={{ backgroundColor: element.fill as string }}
                                onClick={() => {/* Open Color Picker */ }}
                            />
                            <Input
                                type="text"
                                value={element.fill as string || '#000000'}
                                onChange={(e) => onChange('fill', e.target.value)}
                                className="h-8 flex-1"
                            />
                        </div>
                    </div>

                    <div>
                        <Label className="text-[10px] mb-1 block">Opacidade ({Math.round((element.opacity || 1) * 100)}%)</Label>
                        <Slider
                            value={[(element.opacity || 1) * 100]}
                            max={100}
                            step={1}
                            onValueChange={(vals) => onChange('opacity', vals[0] / 100)}
                        />
                    </div>

                    <div>
                        <Label className="text-[10px] mb-1 block">Rotação ({Math.round(element.angle || 0)}°)</Label>
                        <Slider
                            value={[element.angle || 0]}
                            min={0}
                            max={360}
                            step={1}
                            onValueChange={(vals) => onChange('angle', vals[0])}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
