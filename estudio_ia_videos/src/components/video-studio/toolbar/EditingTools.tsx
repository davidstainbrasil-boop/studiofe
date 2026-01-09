'use client';

import { Button } from '@components/ui/button';
import { Type, Square, Circle as CircleIcon, Image as ImageIcon, MousePointer } from 'lucide-react';

interface EditingToolsProps {
    onAddText: () => void;
    onAddRectangle: () => void;
    onAddCircle: () => void;
    onAddImage?: () => void;
    disabled?: boolean;
}

export function EditingTools({
    onAddText,
    onAddRectangle,
    onAddCircle,
    onAddImage,
    disabled = false
}: EditingToolsProps) {
    return (
        <div className="w-16 bg-card border-r border-border flex flex-col items-center gap-4 p-4 z-10 h-full">
            <Button
                variant="ghost"
                size="icon"
                onClick={onAddText}
                title="Adicionar Texto"
                disabled={disabled}
            >
                <Type className="h-5 w-5" />
            </Button>
            <Button
                variant="ghost"
                size="icon"
                onClick={onAddRectangle}
                title="Adicionar Retângulo"
                disabled={disabled}
            >
                <Square className="h-5 w-5" />
            </Button>
            <Button
                variant="ghost"
                size="icon"
                onClick={onAddCircle}
                title="Adicionar Círculo"
                disabled={disabled}
            >
                <CircleIcon className="h-5 w-5" />
            </Button>
            {onAddImage && (
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onAddImage}
                    title="Adicionar Imagem"
                    disabled={disabled}
                >
                    <ImageIcon className="h-5 w-5" />
                </Button>
            )}

            <div className="flex-1" />

            <Button
                variant="ghost"
                size="icon"
                title="Ferramenta de Seleção"
                className="text-primary bg-accent"
                disabled={disabled}
            >
                <MousePointer className="h-5 w-5" />
            </Button>
        </div>
    );
}
