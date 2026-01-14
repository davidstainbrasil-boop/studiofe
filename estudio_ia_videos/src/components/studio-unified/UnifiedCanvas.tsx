
'use client';

import React, { useEffect, useCallback, useRef } from 'react';
import CanvasEngine from '@components/canvas-editor-pro/core/canvas-engine';
import { useTimelineStore } from '@lib/stores/timeline-store';
import { logger } from '@lib/logger';
import type * as Fabric from 'fabric';

interface FabricObjectWithId extends Fabric.Object {
    id?: string;
}

export function UnifiedCanvas() {
    const canvasRef = useRef<Fabric.Canvas | null>(null);

    // Use selectors to avoid unnecessary re-renders
    const project = useTimelineStore(state => state.project);
    const currentTime = useTimelineStore(state => state.currentTime);
    const updateElement = useTimelineStore(state => state.updateElement);
    const selectElement = useTimelineStore(state => state.selectElement);
    const clearSelection = useTimelineStore(state => state.clearSelection);

    // Handle Canvas Ready
    const handleCanvasReady = useCallback((fabricCanvas: Fabric.Canvas) => {
        canvasRef.current = fabricCanvas;
        logger.info('UnifiedCanvas ready', { component: 'UnifiedCanvas' });

        // Setup event listeners for interaction -> store sync
        fabricCanvas.on('selection:created', (e) => {
            const selected = e.selected || [];
            if (selected.length === 1) {
                const id = (selected[0] as FabricObjectWithId).id;
                if (id) selectElement(id);
            } else if (selected.length > 1) {
                // Multi-selection logic map
                selected.forEach(obj => {
                    const id = (obj as FabricObjectWithId).id;
                    if (id) selectElement(id, true);
                });
            }
        });

        fabricCanvas.on('selection:cleared', () => {
            clearSelection();
        });

        fabricCanvas.on('object:modified', (e) => {
            const target = e.target as FabricObjectWithId;
            if (!target || !target.id) return;

            // Sync visual changes back to store (position, scale, rotation)
            updateElement(target.id, {
                properties: {
                    left: target.left,
                    top: target.top,
                    scaleX: target.scaleX,
                    scaleY: target.scaleY,
                    angle: target.angle,
                    width: target.width,
                    height: target.height,
                    fill: target.fill // e.g. color
                }
            });
            logger.debug('Canvas object modified', { id: target.id });
        });

    }, [selectElement, clearSelection, updateElement]);

    // Sync Store -> Canvas (Render elements based on current time)
    // NOTE: In a real implementation we would diff changes to avoid re-rendering everything
    // For MVP/PR3, we will ensure objects exist and are visible if within time range
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !project) return;

        // This is a naive sync for demonstration of "Source of Truth"
        // In production this should be optimized

        // 1. Get all visible elements at currentTime
        const visibleElements = project.layers.flatMap(layer =>
            layer.items.filter(item =>
                currentTime >= item.start && currentTime < (item.start + item.duration)
            )
        );

        // 2. Add missing objects or update existing
        visibleElements.forEach(element => {
            let obj = canvas.getObjects().find((o: any) => o.id === element.id) as FabricObjectWithId;

            if (!obj) {
                // Create new object based on type
                // Assumption: fabric is loaded globally or available via CanvasEngine context
                // But here we rely on what CanvasEngine provides. 
                // Since we don't have direct access to 'fabric' constructor here easily without import
                // We will assume for this PR that we can invoke basic creation or ignore if complex types

                // FOR PR 3: We will just log that we WOULD render here.
                // To actually render we need the 'fabric' instance or factory.
                // Let's look at how ProfessionalCanvasEditorV3 did it -> it imported fabric or used window.fabric

                const fabricLib = (window as any).fabric;
                if (fabricLib) {
                    if (element.type === 'image') {
                        // Placeholder for image
                        obj = new fabricLib.Rect({
                            left: 100, top: 100, width: 200, height: 100, fill: 'red'
                        });
                    } else if (element.type === 'text') {
                        obj = new fabricLib.Textbox(element.name, {
                            left: 200, top: 200, fontSize: 24, fill: 'white'
                        });
                    } else {
                        obj = new fabricLib.Rect({
                            left: 300, top: 300, width: 100, height: 100, fill: 'blue'
                        });
                    }

                    if (obj) {
                        obj.id = element.id;
                        // Apply saved properties
                        if (element.properties) {
                            obj.set(element.properties);
                        }
                        canvas.add(obj);
                    }
                }
            } else {
                // Update visibility or properties if changed
                if (element.properties) {
                    // Optimize: only set if different
                    obj.set(element.properties);
                    obj.setCoords(); // Refresh coords
                }
            }
        });

        // 3. Remove objects not visible or deleted
        canvas.getObjects().forEach((obj: any) => {
            const exists = visibleElements.find(e => e.id === obj.id);
            if (!exists) {
                canvas.remove(obj);
            }
        });

        canvas.requestRenderAll();

    }, [project, currentTime]);


    return (
        <div className="w-full h-full bg-black relative">
            <CanvasEngine
                width={1920}
                height={1080}
                backgroundColor="#000000"
                onCanvasReady={handleCanvasReady}
                enableGPUAcceleration={true}
            />

            <div className="absolute top-2 left-2 text-xs text-white/50 pointer-events-none">
                Unified Canvas Active
            </div>
        </div>
    );
}
