'use client';

import { Canvas, Rect, IText, Circle, FabricImage } from 'fabric';
import { useEffect, useRef, useState, forwardRef, useImperativeHandle, memo } from 'react';
import { KeyframeEngine } from '@lib/animation/keyframe-engine';

export interface AnimatedCanvasRef {
    // ... interface remains same (omitted for brevity in replace, but must be careful)
    addText: () => void;
    addRectangle: () => void;
    addCircle: () => void;
    addImage?: (url: string) => void;
    updateSelectedObject: (props: any) => void;
    deleteSelected: () => void;
    moveLayer: (index: number, direction: 'up' | 'down') => void;
    toggleLock: (index: number) => void;
    toggleVisibility: (index: number) => void;
    deleteLayer: (index: number) => void;
    selectObject: (index: number) => void;
}

interface AnimatedCanvasProps {
    onSelectionChange?: (object: any | null) => void;
    onLayersChange?: (layers: any[]) => void;
}

// Wrap in memo to prevent re-renders destroying the Fabric DOM structure
export const AnimatedCanvas = memo(forwardRef<AnimatedCanvasRef, AnimatedCanvasProps>(({ onSelectionChange, onLayersChange }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    // ... rest of implementation (using memo will just wrap the component)
    const fabricCanvasRef = useRef<Canvas | null>(null);
    // ...

    // Helper to receive selection with index
    const emitSelection = (activeObject: any | null) => {
        if (!activeObject || !fabricCanvasRef.current) {
            onSelectionChange?.(null);
            return;
        }
        const objects = fabricCanvasRef.current.getObjects();
        const index = objects.indexOf(activeObject);

        onSelectionChange?.({
            index: index,
            type: activeObject.type,
            left: activeObject.left,
            top: activeObject.top,
            width: activeObject.width! * (activeObject.scaleX || 1),
            height: activeObject.height! * (activeObject.scaleY || 1),
            fill: activeObject.fill,
            opacity: activeObject.opacity,
            angle: activeObject.angle
        });
    };

    // Event Listeners
    const handleSelection = () => {
        if (!fabricCanvasRef.current) return;
        // Delay slightly to ensure getObjects order is stable if needed, but usually sync
        const activeObject = fabricCanvasRef.current.getActiveObject();
        emitSelection(activeObject);
    };
    // ...
    const engine = useRef<KeyframeEngine | null>(null);
    const [isReady, setIsReady] = useState(false);

    // Helper to emit layer updates
    const emitLayers = () => {
        if (!fabricCanvasRef.current) return;
        const objects = fabricCanvasRef.current.getObjects().map((obj, index) => ({
            id: (obj as any).id || index.toString(),
            type: obj.type,
            index: index,
            locked: !obj.selectable, // In Fabric, selectable=false effectively locks interaction
            visible: obj.visible,
            name: (obj as any).name || obj.type
        }));
        onLayersChange?.(objects);
    };

    useImperativeHandle(ref, () => ({
        addText: () => {
            if (!fabricCanvasRef.current) return;
            const id = crypto.randomUUID();
            const text = new IText('Novo Texto', {
                left: 960,
                top: 540,
                fontFamily: 'Inter',
                fontSize: 60,
                fill: '#ffffff',
                originX: 'center',
                originY: 'center',
                selectable: true,
                // @ts-ignore - Custom properties
                id: id,
                name: 'Texto'
            });
            fabricCanvasRef.current.add(text);
            fabricCanvasRef.current.setActiveObject(text);
            fabricCanvasRef.current.renderAll();
            onSelectionChange?.(text.toObject());
            emitLayers();
        },
        addRectangle: () => {
            if (!fabricCanvasRef.current) return;
            const id = crypto.randomUUID();
            const rect = new Rect({
                left: 960,
                top: 540,
                width: 200,
                height: 150,
                fill: '#3b82f6',
                originX: 'center',
                originY: 'center',
                // @ts-ignore
                id: id,
                name: 'Retângulo'
            });
            fabricCanvasRef.current.add(rect);
            fabricCanvasRef.current.setActiveObject(rect);
            fabricCanvasRef.current.renderAll();
            onSelectionChange?.(rect.toObject());
            emitLayers();
        },
        addCircle: () => {
            if (!fabricCanvasRef.current) return;
            const id = crypto.randomUUID();
            const circle = new Circle({
                radius: 100,
                fill: '#ef4444',
                left: 960,
                top: 540,
                originX: 'center',
                originY: 'center',
                // @ts-ignore
                id: id,
                name: 'Círculo'
            });
            fabricCanvasRef.current.add(circle);
            fabricCanvasRef.current.setActiveObject(circle);
            fabricCanvasRef.current.renderAll();
            onSelectionChange?.(circle.toObject());
            emitLayers();
        },
        addImage: (url: string) => {
            if (!fabricCanvasRef.current) return;
            FabricImage.fromURL(url).then(img => {
                const id = crypto.randomUUID();
                img.set({
                    left: 960,
                    top: 540,
                    originX: 'center',
                    originY: 'center',
                    // @ts-ignore
                    id: id,
                    name: 'Imagem'
                });
                img.scaleToWidth(400); // Default width
                fabricCanvasRef.current?.add(img);
                fabricCanvasRef.current?.setActiveObject(img);
                fabricCanvasRef.current?.renderAll();
                onSelectionChange?.(img.toObject());
                emitLayers();
            });
        },
        updateSelectedObject: (props: any) => {
            if (!fabricCanvasRef.current) return;
            const activeObject = fabricCanvasRef.current.getActiveObject();
            if (activeObject) {
                activeObject.set(props);
                fabricCanvasRef.current.renderAll();
                // Ensure parent state is updated? Maybe loop avoided by passing data down
            }
        },
        deleteSelected: () => {
            if (!fabricCanvasRef.current) return;
            const activeObject = fabricCanvasRef.current.getActiveObject();
            if (activeObject) {
                fabricCanvasRef.current.remove(activeObject);
                fabricCanvasRef.current.discardActiveObject();
                fabricCanvasRef.current.renderAll();
                onSelectionChange?.(null);
                emitLayers();
            }
        },
        moveLayer: (index: number, direction: 'up' | 'down') => {
            if (!fabricCanvasRef.current) return;
            const objects = fabricCanvasRef.current.getObjects();
            if (index < 0 || index >= objects.length) return;

            const obj = objects[index] as { bringForward?: () => void; sendBackwards?: () => void };
            if (direction === 'up' && index < objects.length - 1) {
                obj.bringForward?.();
            } else if (direction === 'down' && index > 0) {
                obj.sendBackwards?.();
            }
            fabricCanvasRef.current.renderAll();
            emitLayers();
        },
        toggleLock: (index: number) => {
            if (!fabricCanvasRef.current) return;
            const objects = fabricCanvasRef.current.getObjects();
            const obj = objects[index];
            if (obj) {
                // Toggle intersection/selection
                const isLocked = !obj.selectable;
                obj.set({
                    selectable: isLocked, // Unlock if locked
                    evented: isLocked // Enable events if locked
                });
                // If locking, discard active object if it's the one we are locking
                if (!isLocked) {
                    fabricCanvasRef.current.discardActiveObject();
                }
                fabricCanvasRef.current.renderAll();
                emitLayers();
            }
        },
        toggleVisibility: (index: number) => {
            if (!fabricCanvasRef.current) return;
            const objects = fabricCanvasRef.current.getObjects();
            const obj = objects[index];
            if (obj) {
                obj.visible = !obj.visible;
                if (!obj.visible) fabricCanvasRef.current.discardActiveObject();
                fabricCanvasRef.current.renderAll();
                emitLayers();
            }
        },
        deleteLayer: (index: number) => {
            if (!fabricCanvasRef.current) return;
            const objects = fabricCanvasRef.current.getObjects();
            const obj = objects[index];
            if (obj) {
                fabricCanvasRef.current.remove(obj);
                fabricCanvasRef.current.renderAll();
                emitLayers();
            }
        },
        selectObject: (index: number) => {
            if (!fabricCanvasRef.current) return;
            const objects = fabricCanvasRef.current.getObjects();
            const obj = objects[index];
            if (obj && obj.selectable) {
                fabricCanvasRef.current.setActiveObject(obj);
                fabricCanvasRef.current.renderAll();
                // Manually emit since programmatic set doesn't always trigger events dependably
                emitSelection(obj);
            }
        }
    }));

    useEffect(() => {
        if (!canvasRef.current) return;

        // Initialize Keyframe Engine first
        engine.current = new KeyframeEngine('VideoProject');

        const canvas = new Canvas(canvasRef.current, {
            width: 1920,
            height: 1080,
            backgroundColor: '#000000',
            preserveObjectStacking: true,
            selection: true
        });

        // Event Listeners for Selection
        const handleSelection = () => {
            const activeObject = canvas.getActiveObject();
            if (activeObject) {
                const objects = canvas.getObjects();
                const index = objects.indexOf(activeObject);
                onSelectionChange?.({
                    index: index,
                    type: activeObject.type,
                    left: activeObject.left,
                    top: activeObject.top,
                    width: activeObject.width! * (activeObject.scaleX || 1),
                    height: activeObject.height! * (activeObject.scaleY || 1),
                    fill: activeObject.fill,
                    opacity: activeObject.opacity,
                    angle: activeObject.angle
                });
            } else {
                onSelectionChange?.(null);
            }
        };

        canvas.on('selection:created', handleSelection);
        canvas.on('selection:updated', handleSelection);
        canvas.on('selection:cleared', handleSelection);
        // Also listen to object modifications (drag, resize)
        canvas.on('object:modified', handleSelection);

        // Add a demo object
        const rect = new Rect({
            left: 100,
            top: 100,
            width: 200,
            height: 150,
            fill: '#3b82f6',
            originX: 'center',
            originY: 'center'
        });

        canvas.add(rect);
        fabricCanvasRef.current = canvas;

        // Register with Theatre.js
        if (engine.current) {
            // Register element
            engine.current.registerElement('Rectangle 1', {
                position: { x: 100, y: 100 },
                scale: { x: 1, y: 1 },
                rotation: 0,
                opacity: 1
            });

            // Bind animation
            engine.current.animate('Rectangle 1', (values: any) => {
                if (!values) return;

                rect.set({
                    left: values.position.x,
                    top: values.position.y,
                    scaleX: values.scale.x,
                    scaleY: values.scale.y,
                    angle: values.rotation,
                    opacity: values.opacity
                });
                canvas.renderAll();
            });
        }

        setIsReady(true);

        return () => {
            canvas.dispose();
        };
    }, []);

    return (
        <div className="flex flex-col h-full w-full">
            <div className="flex-1 flex items-center justify-center bg-gray-950 p-8 overflow-auto">
                <div className="relative shadow-2xl">
                    <div style={{ width: 1920, height: 1080, transform: 'scale(0.5)', transformOrigin: 'top left' }}>
                        <canvas ref={canvasRef} />
                    </div>
                </div>
            </div>

            {/* Animation Controls Demo (Temporary) */}
            <div className="h-12 bg-gray-800 flex items-center justify-center gap-4">
                <button onClick={() => engine.current?.play()} className="px-4 py-1 bg-green-600 rounded text-white text-sm">Play Animation</button>
                <button onClick={() => engine.current?.pause()} className="px-4 py-1 bg-yellow-600 rounded text-white text-sm">Pause</button>
            </div>
        </div>
    );
})); // Close memo and forwardRef

AnimatedCanvas.displayName = 'AnimatedCanvas';
