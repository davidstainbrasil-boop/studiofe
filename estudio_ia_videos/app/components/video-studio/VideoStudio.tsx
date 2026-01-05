'use client';

import { TimelineEditor } from './timeline/TimelineEditor';
import { useState, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';

const AnimatedCanvas = dynamic(() => import('./canvas/AnimatedCanvas').then(mod => mod.AnimatedCanvas), {
    ssr: false,
    loading: () => <div className="w-full h-full flex items-center justify-center text-white">Carregando Editor...</div>
});
import { AnimatedCanvasRef } from './canvas/AnimatedCanvas';

import { RemotionPreview } from './preview/RemotionPreview';
import { EffectsPanel } from './panels/EffectsPanel';
import { TemplatesPanel } from './panels/TemplatesPanel';
import { PropertiesPanel } from './panels/PropertiesPanel';
import { LayersPanel, LayerItem } from './panels/LayersPanel';
import { EditingTools } from './toolbar/EditingTools';
import { useKeyboardShortcuts } from '@/lib/hooks/use-keyboard-shortcuts';

export function VideoStudio({ projectId }: { projectId: string }) {
    const [viewMode, setViewMode] = useState<'editor' | 'preview'>('editor');
    const [activePanel, setActivePanel] = useState<'none' | 'effects' | 'templates' | 'properties'>('none');

    // Ref to control the canvas from the toolbar
    const canvasRef = useRef<AnimatedCanvasRef>(null);
    const [selectedObject, setSelectedObject] = useState<any>(null);
    const [layers, setLayers] = useState<LayerItem[]>([]);

    useKeyboardShortcuts({
        'Space': () => console.log('Toggle Playback'), // Connect to actual store
        'Ctrl+S': () => console.log('Save Project'),
        'Delete': () => canvasRef.current?.deleteSelected(), // Modified
        'Escape': () => {
            setActivePanel('none');
            // Deselect?
        } // Modified
    });

    // Added functions
    const handleCanvasSelection = useCallback((object: any) => {
        setSelectedObject(object);
        if (object) {
            setActivePanel('properties'); // Auto-switch to properties on selection
        } else {
            // Unselect: Close properties panel if it was open
            setActivePanel(prev => prev === 'properties' ? 'none' : prev);
        }
    }, []);

    const handlePropertyChange = useCallback((prop: string, value: any) => {
        // Optimistic update
        setSelectedObject((prev: any) => ({ ...prev, [prop]: value }));
        // Apply to canvas
        canvasRef.current?.updateSelectedObject({ [prop]: value });
    }, []);

    // Stable ref for setLayers
    const handleLayersChange = useCallback((newLayers: LayerItem[]) => {
        setLayers(newLayers);
    }, []);

    // Image upload handler
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const result = e.target?.result as string;
                if (result) {
                    canvasRef.current?.addImage?.(result);
                }
            };
            reader.readAsDataURL(file);
        }
        // Reset input
        if (event.target) event.target.value = '';
    };

    return (
        <div className="flex flex-col h-screen w-screen bg-background text-foreground overflow-hidden">
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleImageUpload}
            />

            {/* Top Bar / Header */}
            <header className="h-14 border-b border-border flex items-center px-4 justify-between bg-card z-20">
                <div className="font-bold text-lg">Video Studio Pro</div>

                <div className="flex bg-muted rounded-md p-1">
                    <button
                        onClick={() => setViewMode('editor')}
                        className={`px-3 py-1 text-sm rounded-sm ${viewMode === 'editor' ? 'bg-background shadow-sm' : ''}`}
                    >
                        Editor
                    </button>
                    <button
                        onClick={() => setViewMode('preview')}
                        className={`px-3 py-1 text-sm rounded-sm ${viewMode === 'preview' ? 'bg-background shadow-sm' : ''}`}
                    >
                        Preview
                    </button>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setActivePanel(activePanel === 'effects' ? 'none' : 'effects')}
                        className={`text-sm font-medium ${activePanel === 'effects' ? 'text-primary' : 'text-muted-foreground'}`}
                    >
                        Effects
                    </button>
                    <button
                        onClick={() => setActivePanel(activePanel === 'templates' ? 'none' : 'templates')}
                        className={`text-sm font-medium ${activePanel === 'templates' ? 'text-primary' : 'text-muted-foreground'}`}
                    >
                        Templates
                    </button>
                    {/* Added Properties button */}
                    <button
                        onClick={() => setActivePanel(activePanel === 'properties' ? 'none' : 'properties')}
                        className={`text-sm font-medium ${activePanel === 'properties' ? 'text-primary' : 'text-muted-foreground'} ${selectedObject ? 'opacity-100' : 'opacity-50'}`}
                        disabled={!selectedObject} // Disable if no object is selected
                    >
                        Properties
                    </button>
                    {/* Controls like Export, Save */}
                    <button className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 text-sm font-medium">Export Video</button>
                </div>
            </header>

            {/* Main Content Area */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Panel: Tools */}
                <div className="border-r border-border bg-card z-10 flex flex-col">
                    <EditingTools
                        disabled={viewMode !== 'editor'}
                        onAddText={() => canvasRef.current?.addText()}
                        onAddRectangle={() => canvasRef.current?.addRectangle()}
                        onAddCircle={() => canvasRef.current?.addCircle()}
                        onAddImage={() => fileInputRef.current?.click()}
                    />
                </div>

                {/* Center Stage: Canvas or Preview */}
                <div className="flex-1 bg-gray-950 relative flex items-center justify-center">
                    {viewMode === 'editor' ? (
                        <AnimatedCanvas
                            ref={canvasRef}
                            onSelectionChange={handleCanvasSelection}
                            onLayersChange={handleLayersChange}
                        />
                    ) : (
                        <RemotionPreview currentTime={0} />
                    )}
                </div>

                {/* Right Panel: Properties / Layers / Effects */}
                {activePanel === 'effects' && (
                    <div className="w-80 border-l border-border bg-card">
                        <EffectsPanel onSelectEffect={(id, type) => console.log('Selected:', id, type)} />
                    </div>
                )}
                {activePanel === 'templates' && (
                    <div className="w-80 border-l border-border bg-card">
                        <TemplatesPanel onSelectTemplate={(template) => console.log('Selected Template:', template.id)} />
                    </div>
                )}

                {/* Properties Panel (always available if object selected, or explicitly toggled?) */}
                {/* For now, let's stack Properties and Layers or tab them */}

                {(activePanel === 'properties' || (selectedObject && activePanel !== 'none')) ? (
                    <div className="w-80 border-l border-border bg-card flex flex-col">
                        <PropertiesPanel
                            element={selectedObject}
                            onChange={handlePropertyChange}
                        />
                        <div className="border-t border-border flex-1 min-h-0">
                            <LayersPanel
                                layers={layers}
                                onSelectLayer={(index) => {
                                    canvasRef.current?.selectObject(index);
                                }}
                                onToggleLock={(index) => canvasRef.current?.toggleLock(index)}
                                onToggleVisibility={(index) => canvasRef.current?.toggleVisibility(index)}
                                onMoveLayer={(index, dir) => canvasRef.current?.moveLayer(index, dir)}
                                onDeleteLayer={(index) => canvasRef.current?.deleteLayer(index)}
                                selectedIndex={selectedObject?.index ?? null}
                            />
                        </div>
                    </div>
                ) : null}
            </div>

            {/* Bottom Panel: Timeline */}
            <div className="h-96 border-t border-border bg-background z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                <TimelineEditor projectId={projectId} />
            </div>
        </div>
    );
}
