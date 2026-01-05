'use client';

import { Canvas, FabricObject, IText, Rect, Circle, FabricImage } from 'fabric';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Type, Square, Circle as CircleIcon, Trash2, Image as ImageIcon } from 'lucide-react';

export function CanvasEditor() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [canvas, setCanvas] = useState<Canvas | null>(null);
    const [selectedObject, setSelectedObject] = useState<FabricObject | null>(null);

    useEffect(() => {
        if (!canvasRef.current) return;

        // Initialize Fabric Canvas
        // Using a wrapper div to size it properly might be needed, 
        // but for now we hardcode FHD resolution scaled down or responsive.
        // In a real app, we'd calculate dimensions.
        const fabricCanvas = new Canvas(canvasRef.current, {
            width: 1920,
            height: 1080,
            backgroundColor: '#000000',
            selection: true
        });

        // Event listeners
        const updateSelection = (e: any) => {
            const selected = e.selected ? e.selected[0] : null;
            setSelectedObject(selected);
        };

        fabricCanvas.on('selection:created', updateSelection);
        fabricCanvas.on('selection:updated', updateSelection);
        fabricCanvas.on('selection:cleared', () => setSelectedObject(null));

        setCanvas(fabricCanvas);

        // Initial render
        fabricCanvas.renderAll();

        return () => {
            fabricCanvas.dispose();
        };
    }, []);

    const addText = () => {
        if (!canvas) return;

        const text = new IText('Texto', {
            left: 960,
            top: 540,
            fontFamily: 'Inter',
            fontSize: 60,
            fill: '#ffffff',
            originX: 'center',
            originY: 'center',
        });

        canvas.add(text);
        canvas.setActiveObject(text);
        canvas.renderAll();
    };

    const addRectangle = () => {
        if (!canvas) return;

        const rect = new Rect({
            left: 960,
            top: 540,
            width: 200,
            height: 150,
            fill: '#3b82f6',
            originX: 'center',
            originY: 'center',
        });

        canvas.add(rect);
        canvas.setActiveObject(rect);
        canvas.renderAll();
    };

    const addCircle = () => {
        if (!canvas) return;

        const circle = new Circle({
            radius: 100,
            fill: '#ef4444',
            left: 960,
            top: 540,
            originX: 'center',
            originY: 'center'
        });

        canvas.add(circle);
        canvas.setActiveObject(circle);
        canvas.renderAll();
    };

    const deleteSelected = () => {
        if (!canvas || !selectedObject) return;

        canvas.remove(selectedObject);
        canvas.discardActiveObject();
        canvas.renderAll();
        setSelectedObject(null);
    };

    // Fit canvas to container logic could go here

    return (
        <div className="flex h-full w-full bg-gray-900 overflow-hidden">
            {/* Toolbar - floating or sidebar */}
            <div className="w-16 bg-card border-r border-border flex flex-col items-center gap-4 p-4 z-10">
                <Button variant="ghost" size="icon" onClick={addText} title="Adicionar Texto">
                    <Type className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={addRectangle} title="Adicionar Retângulo">
                    <Square className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={addCircle} title="Adicionar Círculo">
                    <CircleIcon className="h-5 w-5" />
                </Button>
                <div className="flex-1" />
                <Button
                    variant="destructive"
                    size="icon"
                    onClick={deleteSelected}
                    disabled={!selectedObject}
                    title="Excluir Seleção"
                >
                    <Trash2 className="h-5 w-5" />
                </Button>
            </div>

            {/* Canvas Area */}
            <div className="flex-1 flex items-center justify-center bg-gray-950 p-8 overflow-auto">
                <div className="relative shadow-2xl">
                    {/* We use a fixed scale for now or handle resize via CSS transform */}
                    <div style={{ width: 1920, height: 1080, transform: 'scale(0.5)', transformOrigin: 'top left' }}>
                        <canvas ref={canvasRef} />
                    </div>
                </div>
            </div>

            {/* Properties Panel (Right side) */}
            {selectedObject && (
                <div className="w-64 bg-card border-l border-border p-4">
                    <h3 className="font-semibold mb-4">Propriedades</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs text-muted-foreground">Tipo</label>
                            <div className="capitalize">{selectedObject.type}</div>
                        </div>
                        {/* Additional properties inputs would go here */}
                    </div>
                </div>
            )}
        </div>
    );
}
