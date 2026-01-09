'use client';

import { Button } from '@components/ui/button';
import { ScrollArea } from '@components/ui/scroll-area';
import { Wand2, Layers, MoveRight, Star } from 'lucide-react';

interface EffectCategory {
    id: string;
    name: string;
    icon: React.ElementType;
    items: EffectItem[];
}

interface EffectItem {
    id: string;
    name: string;
    previewClass?: string;
}

const EFFECT_CATEGORIES: EffectCategory[] = [
    {
        id: 'transitions',
        name: 'Transições',
        icon: MoveRight,
        items: [
            { id: 'fade', name: 'Fade' },
            { id: 'slide-left', name: 'Slide Left' },
            { id: 'slide-right', name: 'Slide Right' },
            { id: 'wipe', name: 'Wipe' },
            { id: 'zoom', name: 'Zoom' }
        ]
    },
    {
        id: 'filters',
        name: 'Filtros',
        icon: Wand2,
        items: [
            { id: 'grayscale', name: 'Preto & Branco' },
            { id: 'sepia', name: 'Sepia' },
            { id: 'blur', name: 'Blur' },
            { id: 'brightness', name: 'Brilho +' }
        ]
    }
];

export function EffectsPanel({ onSelectEffect }: { onSelectEffect: (effectId: string, type: string) => void }) {
    return (
        <div className="h-full bg-card border-l border-border flex flex-col">
            <div className="p-4 border-b border-border">
                <h2 className="font-semibold flex items-center gap-2">
                    <Star className="h-4 w-4 text-yellow-500" />
                    Efeitos
                </h2>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-4 space-y-6">
                    {EFFECT_CATEGORIES.map(category => (
                        <div key={category.id}>
                            <div className="flex items-center gap-2 mb-3 text-sm font-medium text-muted-foreground">
                                <category.icon className="h-4 w-4" />
                                {category.name}
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                {category.items.map(item => (
                                    <Button
                                        key={item.id}
                                        variant="outline"
                                        className="h-20 flex flex-col gap-2 hover:bg-accent/50 hover:border-primary"
                                        onClick={() => onSelectEffect(item.id, category.id)}
                                    >
                                        <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                                            {/* Preview placeholder */}
                                            <div className="w-4 h-4 rounded-full bg-primary/20" />
                                        </div>
                                        <span className="text-xs">{item.name}</span>
                                    </Button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
}
