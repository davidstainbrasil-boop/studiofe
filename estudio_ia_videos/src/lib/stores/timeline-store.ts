
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { logger } from '../logger';
import { DragData, TimelineSelection, TimelineProject, TimelineElement, TimelineLayer, TimelineKeyframe } from '../types/timeline-types';
import type { Template } from '../templates/template-definitions';

// ========================================
// Snapshot Type for Persistence
// ========================================
export interface TimelineSnapshot {
  currentTime: number;
  duration: number;
  zoom: number;
  volume: number;
  project: TimelineProject | null;
  pixelsPerSecond: number;
  beatMarkers: number[];
  continuousFlowEnabled: boolean;
  version?: string;
  exportedAt?: string;
}

// ========================================
// Collaborator Types
// ========================================
export interface Collaborator {
  id: string;
  userId: string;
  name: string;
  avatar?: string;
  color?: string;
  role: 'owner' | 'editor' | 'viewer';
  cursor?: CursorPosition;
  lastActive: Date;
}

export interface CursorPosition {
  x: number;
  y: number;
  elementId?: string;
  timestamp: number;
}

// ========================================
// Render Job Types
// ========================================
export interface RenderJob {
  id: string;
  projectId: string;
  status: 'pending' | 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress?: number;
  outputUrl?: string;
  error?: string;
  createdAt: Date;
  settings?: Record<string, unknown>;
}

// ========================================
// Element Update Types
// ========================================
export interface ElementUpdate {
  name?: string;
  start?: number;
  duration?: number;
  properties?: Record<string, unknown>;
  data?: Record<string, unknown>;
  visible?: boolean;
  locked?: boolean;
  muted?: boolean;
}

export interface TimelineState {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  isDirty: boolean;
  zoom: number;
  volume: number;
  canUndo: boolean;
  canRedo: boolean;
  project: TimelineProject | null;
  selection: TimelineSelection;
  dragData: DragData | null;
  scrollX: number;
  pixelsPerSecond: number;
  collaborators: Collaborator[];
  isDragging: boolean;
  beatMarkers: number[];
  continuousFlowEnabled: boolean;
  projectId: string | null;
  lastSavedAt: Date | null;
  history: {
    past: TimelineProject[];
    future: TimelineProject[];
  };
}

export interface TimelineStore extends TimelineState {
  // Playback
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  play: () => void;
  pause: () => void;
  setZoom: (zoom: number) => void;
  setVolume: (volume: number) => void;
  seekTo: (time: number) => void;
  stop: () => void;
  
  // History NOT IMPLEMENTED in this PR
  undo: () => void;
  redo: () => void;

  // View
  zoomToFit: () => void;
  setScrollX: (scroll: number) => void;
  setPixelsPerSecond: (pps: number) => void;
  
  // Project & Data
  loadProject: (project: TimelineProject) => void;
  saveProject: () => void;
  setIsDirty: (isDirty: boolean) => void; // Added setIsDirty
  
  // Selection
  selectElement: (id: string, multi?: boolean) => void;
  selectLayer: (id: string, multi?: boolean) => void;
  clearSelection: () => void;
  
  // Drag & Drop
  startDrag: (data: DragData) => void;
  endDrag: () => void;
  
  // Element Management (CRUD)
  addElement: (element: TimelineElement) => void;
  moveElement: (elementId: string, newLayerId: string, newTime: number) => void;
  updateElement: (elementId: string, updates: ElementUpdate) => void;
  removeElement: (elementId: string) => void;
  duplicateElement: (elementId: string) => void;
  splitElement: (elementId: string, time: number) => void;
  toggleLayerLock: (layerId: string) => void;
  
  // Bulk Actions
  moveSelection: (delta: number) => void;
  removeSelected: () => void;
  removeElementRipple: (elementId: string) => void;
  selectAll: () => void;
  
  // Keyframes
  addKeyframe: (elementId: string, keyframe: TimelineKeyframe) => void;
  updateKeyframe: (elementId: string, keyframeId: string, updates: Partial<TimelineKeyframe>) => void;
  removeKeyframe: (elementId: string, keyframeId: string) => void;
  
  // Features
  setBeatMarkers: (markers: number[]) => void;
  enableContinuousFlow: (enabled: boolean) => void;
  addCollaborator: (collaborator: Collaborator) => void;
  removeCollaborator: (id: string) => void;
  addRenderJob: (job: RenderJob) => void;
  
  // Persistence
  exportSnapshot: () => TimelineSnapshot;
  hydrateFromSnapshot: (snapshot: TimelineSnapshot) => void;
  setProjectId: (id: string | null) => void;
  
  // Templates & Themes
  applyTemplate: (template: Template) => void;
  setTheme: (themeId: string) => void;
}

export const useTimelineStore = create<TimelineStore>()(
  immer((set, get) => ({
    // History State
    history: {
        past: [],
        future: []
    },
    
    // Initial State
    currentTime: 0,
    duration: 300, // 5 min default
    isPlaying: false,
    zoom: 1,
    isDirty: false, // Added isDirty to initial state
    volume: 1,
    canUndo: false,
    canRedo: false,
    project: null,
    selection: { elementIds: [], layerIds: [], startTime: 0, endTime: 0 },
    dragData: null,
    scrollX: 0,
    pixelsPerSecond: 50,
    collaborators: [],
    isDragging: false,
    beatMarkers: [],
    continuousFlowEnabled: false,
    projectId: null,
    lastSavedAt: null,

    // Playback Actions
    setCurrentTime: (time) => set((state) => { state.currentTime = time; state.isDirty = true; }),
    setDuration: (duration) => set((state) => { state.duration = duration; state.isDirty = true; }),
    play: () => set((state) => { state.isPlaying = true; state.isDirty = true; }),
    pause: () => set((state) => { state.isPlaying = false; state.isDirty = true; }),
    setZoom: (zoom) => set((state) => { state.zoom = zoom; state.isDirty = true; }),
    setVolume: (volume) => set((state) => { state.volume = volume; state.isDirty = true; }),
    seekTo: (time) => set((state) => { state.currentTime = time; state.isDirty = true; }),
    stop: () => set((state) => { state.isPlaying = false; state.currentTime = 0; state.isDirty = true; }),

    // History Actions
    undo: () => set((state) => {
        if (state.history.past.length === 0) return;
        
        const previous = state.history.past[state.history.past.length - 1];
        const newPast = state.history.past.slice(0, -1);
        
        if (state.project) {
            state.history.future.push(JSON.parse(JSON.stringify(state.project)));
        }
        
        state.project = previous;
        state.history.past = newPast;
        
        state.canUndo = state.history.past.length > 0;
        state.canRedo = true;
        state.isDirty = true;
    }),

    redo: () => set((state) => {
        if (state.history.future.length === 0) return;

        const next = state.history.future[state.history.future.length - 1];
        const newFuture = state.history.future.slice(0, -1);

        if (state.project) {
            state.history.past.push(JSON.parse(JSON.stringify(state.project)));
        }

        state.project = next;
        state.history.future = newFuture;

        state.canUndo = true;
        state.canRedo = state.history.future.length > 0;
        state.isDirty = true;
    }),

    // View Actions
    zoomToFit: () => set((state) => { state.zoom = 1; state.isDirty = true; }), // Simplified impl
    setScrollX: (scroll) => set((state) => { state.scrollX = scroll; state.isDirty = true; }),
    setPixelsPerSecond: (pps) => set((state) => { state.pixelsPerSecond = pps; state.isDirty = true; }),

    // Project Actions
    loadProject: (project) => set((state) => { state.project = project; state.isDirty = false; }), // Loading a project makes it clean
    saveProject: () => logger.warn('Save project not implemented', { component: 'TimelineStore' }),
    setIsDirty: (isDirty) => set((state) => { state.isDirty = isDirty; }), // Added setIsDirty action

    // Selection Actions
    selectElement: (id, multi) => set((state) => {
      let changed = false;
      if (multi) {
        if (state.selection.elementIds.includes(id)) {
          state.selection.elementIds = state.selection.elementIds.filter(eid => eid !== id);
          changed = true;
        } else {
          state.selection.elementIds.push(id);
          changed = true;
        }
      } else {
        if (state.selection.elementIds.length !== 1 || state.selection.elementIds[0] !== id) {
          state.selection.elementIds = [id];
          changed = true;
        }
      }
      if (changed) state.isDirty = true;
    }),
    
    selectLayer: (id, multi) => set((state) => {
       let changed = false;
       if (multi) {
         if (state.selection.layerIds.includes(id)) {
            state.selection.layerIds = state.selection.layerIds.filter(lid => lid !== id);
            changed = true;
         } else {
            state.selection.layerIds.push(id);
            changed = true;
         }
       } else {
         if (state.selection.layerIds.length !== 1 || state.selection.layerIds[0] !== id) {
           state.selection.layerIds = [id];
           changed = true;
         }
       }
       if (changed) state.isDirty = true;
    }),
    
    clearSelection: () => set((state) => {
      if (state.selection.elementIds.length > 0 || state.selection.layerIds.length > 0) {
        state.selection = { elementIds: [], layerIds: [], startTime: 0, endTime: 0 };
        state.isDirty = true;
      }
    }),

    // Drag Actions
    startDrag: (data) => set((state) => { state.dragData = data; state.isDragging = true; state.isDirty = true; }),
    endDrag: () => set((state) => { state.dragData = null; state.isDragging = false; state.isDirty = true; }),

    // Element CRUD
    addElement: (element) => set((state) => {
      saveHistory(state); // Save before change

      // Ensure project exists
      if (!state.project) {
          state.project = {
             id: 'new-project',
             name: 'New Project',
             createdAt: new Date(),
             updatedAt: new Date(),
             duration: 300,
             fps: 30,
             currentTime: 0,
             zoomLevel: 1,
             resolution: {
                 width: 1920,
                 height: 1080
             },
             layers: []
          };
      }
            let layer = state.project.layers.find(l => l.id === element.layerId);
       if (!layer) {
          // Auto-create layer if missing (simplified for PR4)
          const newLayer: TimelineLayer = {
             id: element.layerId || crypto.randomUUID(),
             name: `Layer ${state.project.layers.length + 1}`,
             visible: true,
             locked: false,
             items: [],
             elements: [],
             type: element.type === 'audio' ? 'audio' : 'video' // Simple inference
          };
          state.project.layers.push(newLayer);
          layer = state.project.layers[state.project.layers.length - 1];
       }
      
      layer.items.push(element);
      state.isDirty = true;
    }),

    moveElement: (elementId, newLayerId, newTime) => set((state) => {
        if (!state.project) return;
        
        saveHistory(state); // Save before change

        // Find source and target layers
        const sourceLayer = state.project.layers.find(l => l.items.some(e => e.id === elementId));
        const targetLayer = state.project.layers.find(l => l.id === newLayerId);
        
        if (!sourceLayer || !targetLayer) return;

        // Check locks
        if (sourceLayer.isLocked || targetLayer.isLocked) {
            logger.warn('Cannot move element in locked layer', { elementId, sourceLayerId: sourceLayer.id, targetLayerId: targetLayer.id });
            return;
        }

        let element: TimelineElement | undefined;
        
        // Find and remove from old layer
        const index = sourceLayer.items.findIndex(e => e.id === elementId);
        if (index !== -1) {
            element = sourceLayer.items[index];
            sourceLayer.items.splice(index, 1);
        }

        if (element) {
            // Update element
            element.start = newTime;
            element.layerId = newLayerId;

            // Add to new layer
            targetLayer.items.push(element);
            state.isDirty = true;
        } else {
            logger.error('Element not found in source layer during move', undefined, { 
                elementId, 
                sourceLayerId: sourceLayer.id 
            });
        }
    }),

    updateElement: (elementId, updates) => set((state) => {
        if (!state.project) return;
        
        // Find element first to save history only if found
        let found = false;
        state.project.layers.forEach(l => {
             if (l.items.some(e => e.id === elementId)) found = true;
        });
        if (found) saveHistory(state); // Save before change

        for (const layer of state.project.layers) {
            const element = layer.items.find(e => e.id === elementId);
            if (element) {
                if (layer.isLocked) {
                    logger.warn('Cannot update element in a locked layer', { 
                        elementId, 
                        layerId: layer.id 
                    });
                    return; // Block update
                }
                Object.assign(element, updates);
                
                // Update specific properties if provided
                if (updates.properties) {
                    element.properties = { ...element.properties, ...updates.properties };
                }
                state.isDirty = true;
                break;
            }
        }
    }),

    removeElement: (elementId) => set((state) => {
       if (!state.project) return;
       
       saveHistory(state); // Save before change (optimistic, simplified)

       for (const layer of state.project.layers) {
          if (layer.isLocked) {
              logger.warn('Cannot remove element from a locked layer', { elementId, layerId: layer.id });
              continue; // Skip this layer if locked
          }
          const initialLength = layer.items.length;
          layer.items = layer.items.filter(e => e.id !== elementId);
          if (layer.items.length !== initialLength) {
             state.isDirty = true;
          }
       }
    }),

    duplicateElement: (elementId) => set((state) => {
        if (!state.project) return;

        saveHistory(state); // Save before change

        let elementToDuplicate: TimelineElement | null = null;
        let sourceLayer: TimelineLayer | undefined;

        for (const l of state.project.layers) {
            const foundElement = l.items.find(e => e.id === elementId);
            if (foundElement) {
                elementToDuplicate = foundElement;
                sourceLayer = l;
                break;
            }
        }

        if (elementToDuplicate && sourceLayer) {
            if (sourceLayer.isLocked) {
                logger.warn('Cannot duplicate element from a locked layer', { elementId, layerId: sourceLayer.id });
                return;
            }

            const newElement: TimelineElement = {
                ...JSON.parse(JSON.stringify(elementToDuplicate)), // Deep clone properties
                id: crypto.randomUUID(),
                start: elementToDuplicate.start + 1, // Offset slightly
                name: `${elementToDuplicate.name} (Copy)`
            };
            sourceLayer.items.push(newElement);
            state.isDirty = true;
        }
    }),

    splitElement: (elementId, time) => set((state) => {
        if (!state.project) return;
        
        saveHistory(state); // Save before change

        // Find element
        let element: TimelineElement | undefined;
        let layer: TimelineLayer | undefined;

        for (const l of state.project.layers) {
            element = l.items.find(e => e.id === elementId);
            if (element) {
                layer = l;
                break;
            }
        }

        if (element && layer) {
            // Validation: time must be within element
            if (time <= element.start || time >= (element.start + element.duration)) return;

            const originalDuration = element.duration;
            const firstPartDuration = time - element.start;
            const secondPartDuration = originalDuration - firstPartDuration;

            // Update first part
            element.duration = firstPartDuration;

            // Create second part
            // Deep clone to avoid mutations issues
            // Use spread for shallow props, handle nested props carefuly
            const newElement: TimelineElement = {
                ...JSON.parse(JSON.stringify(element)), // dirty deep clone for props
                id: crypto.randomUUID(),
                start: time,
                duration: secondPartDuration,
                name: `${element.name} (Split)`
            };
            
            layer.items.push(newElement);
        }
    }),

    // Other Features
    setBeatMarkers: (markers) => set((state) => { state.beatMarkers = markers; }),
    enableContinuousFlow: (enabled) => set((state) => { state.continuousFlowEnabled = enabled; }),
    
    addCollaborator: (collaborator) => set((state) => { 
        state.collaborators.push(collaborator); 
    }),
    removeCollaborator: (id) => set((state) => {
        state.collaborators = state.collaborators.filter(c => c.id !== id);
    }),
    addRenderJob: (job) => logger.info('Add render job', { component: 'TimelineStore', job }),
    
    // Persistence Methods
    exportSnapshot: () => {
      const state = get();
      return {
        currentTime: state.currentTime,
        duration: state.duration,
        zoom: state.zoom,
        volume: state.volume,
        project: state.project,
        pixelsPerSecond: state.pixelsPerSecond,
        beatMarkers: state.beatMarkers,
        continuousFlowEnabled: state.continuousFlowEnabled,
        version: '1.0.0', // Snapshot version for future migrations
        exportedAt: new Date().toISOString()
      };
    },
    
    hydrateFromSnapshot: (snapshot) => set((state) => {
      if (!snapshot) {
        logger.warn('Cannot hydrate from null snapshot', { component: 'TimelineStore' });
        return;
      }
      
      // Validate snapshot version (for future migrations)
      const version = snapshot.version || '1.0.0';
      logger.info('Hydrating from snapshot', { component: 'TimelineStore', version });
      
      // Restore state
      state.currentTime = snapshot.currentTime || 0;
      state.duration = snapshot.duration || 300;
      state.zoom = snapshot.zoom || 1;
      state.volume = snapshot.volume || 1;
      state.project = snapshot.project || null;
      state.pixelsPerSecond = snapshot.pixelsPerSecond || 50;
      state.beatMarkers = snapshot.beatMarkers || [];
      state.continuousFlowEnabled = snapshot.continuousFlowEnabled || false;
      
      // Reset playback state
      state.isPlaying = false;
      state.selection = { elementIds: [], layerIds: [], startTime: 0, endTime: 0 };
      state.dragData = null;
      state.isDragging = false;
      
      logger.info('Snapshot hydrated successfully', { component: 'TimelineStore' });
    }),
    
    setProjectId: (id) => set((state) => { 
      state.projectId = id; 
      if (id) {
        state.lastSavedAt = new Date();
      }
    }),

    // Template Actions
    applyTemplate: (template) => set((state) => {
      const { applyTemplateToProject } = require('@lib/templates/template-utils');
      
      logger.info('Applying template to project', { 
        templateId: template.id, 
        currentTime: state.currentTime 
      });

      // Apply template with current playhead time
      const updatedProject = applyTemplateToProject(
        template,
        state.project,
        state.currentTime
      );

      state.project = updatedProject;
      
      logger.info('Template applied successfully', { 
        templateId: template.id,
        newDuration: updatedProject.duration
      });
    }),

    setTheme: (themeId) => set((state) => {
        if (!state.project) return;
        saveHistory(state);

        state.project.themeId = themeId;
        state.isDirty = true;

        logger.info('Project theme updated', { themeId });
    }),

    toggleLayerLock: (layerId) => set((state) => {
        if (!state.project) return;
        const layer = state.project.layers.find(l => l.id === layerId);
        if (layer) {
            layer.isLocked = !layer.isLocked;
            // Also update legacy locked prop
            layer.locked = layer.isLocked;
            // Locking changes state but maybe not content dirty? Let's mark dirty to save lock state
            state.isDirty = true;
        }
    }),

    // Bulk Actions Implementation
    moveSelection: (delta) => set((state) => {
        if (!state.project || state.selection.elementIds.length === 0) return;
        
        saveHistory(state);

        // Map updates first to validate locks
        const updates: { element: TimelineElement, newStart: number }[] = [];
        let blocked = false;

        state.project.layers.forEach(layer => {
            layer.items.forEach(element => {
                if (state.selection.elementIds.includes(element.id)) {
                    if (layer.isLocked) {
                        blocked = true;
                    } else {
                        updates.push({ 
                            element, 
                            newStart: Math.max(0, element.start + delta)
                        });
                    }
                }
            });
        });

        if (blocked) {
            logger.warn('Cannot move selection because one or more layers are locked', { component: 'TimelineStore' });
            return;
        }

        // Apply updates
        updates.forEach(u => {
            u.element.start = u.newStart;
        });
        
        state.isDirty = true;
    }),

    removeSelected: () => set((state) => {
        if (!state.project || state.selection.elementIds.length === 0) return;

        saveHistory(state);
        
        let removedCount = 0;
        state.project.layers.forEach(layer => {
            if (layer.isLocked) return;
            
            const initialLen = layer.items.length;
            layer.items = layer.items.filter(e => !state.selection.elementIds.includes(e.id));
            if (layer.items.length !== initialLen) removedCount++;
        });

        if (removedCount > 0) {
            state.selection.elementIds = []; // Clear selection
            state.isDirty = true;
        }
    }),

    removeElementRipple: (elementId) => set((state) => {
        if (!state.project) return;
        
        saveHistory(state);

        let targetLayerIndex = -1;
        let targetElement: TimelineElement | null = null;
        let p = state.project;

        // Find element and layer
        for (let i = 0; i < p.layers.length; i++) {
            const el = p.layers[i].items.find(e => e.id === elementId);
            if (el) {
                targetLayerIndex = i;
                targetElement = el;
                break;
            }
        }

        if (targetElement && targetLayerIndex !== -1 && !p.layers[targetLayerIndex].isLocked) {
            const layer = p.layers[targetLayerIndex];
            const gapSize = targetElement.duration;
            const threshold = targetElement.start;

            // Remove element
            layer.items = layer.items.filter(e => e.id !== elementId);
            state.selection.elementIds = state.selection.elementIds.filter(id => id !== elementId);

            // Ripple Shift: Move all subsequent elements left
            layer.items.forEach(el => {
                if (el.start > threshold) {
                    el.start = Math.max(0, el.start - gapSize);
                }
            });

            state.isDirty = true;
        }
    }),

    selectAll: () => set((state) => {
        if (!state.project) return;
        
        const allIds: string[] = [];
        state.project.layers.forEach(layer => {
            // Option: Don't select locked items? Or select but prevent edit?
            // User usually expects to select all.
            layer.items.forEach(e => allIds.push(e.id));
        });
        
        state.selection.elementIds = allIds;
    }),

    // Keyframes Implementation
    addKeyframe: (elementId, keyframe) => set((state) => {
        if (!state.project) return;
        saveHistory(state);

        state.project.layers.forEach(layer => {
            const element = layer.items.find(e => e.id === elementId);
            if (element) {
                if (!element.keyframes) element.keyframes = [];
                element.keyframes.push(keyframe);
                // Sort by time
                element.keyframes.sort((a, b) => a.timestamp - b.timestamp);
                state.isDirty = true;
            }
        });
    }),

    updateKeyframe: (elementId, keyframeId, updates) => set((state) => {
        if (!state.project) return;
        saveHistory(state);

        state.project.layers.forEach(layer => {
            const element = layer.items.find(e => e.id === elementId);
            if (element && element.keyframes) {
                const kf = element.keyframes.find(k => k.id === keyframeId);
                if (kf) {
                    Object.assign(kf, updates);
                    // Re-sort if time changed
                    if (updates.timestamp !== undefined) {
                        element.keyframes.sort((a, b) => a.timestamp - b.timestamp);
                    }
                    state.isDirty = true;
                }
            }
        });
    }),

    removeKeyframe: (elementId, keyframeId) => set((state) => {
        if (!state.project) return;
        saveHistory(state);

        state.project.layers.forEach(layer => {
            const element = layer.items.find(e => e.id === elementId);
            if (element && element.keyframes) {
                element.keyframes = element.keyframes.filter(k => k.id !== keyframeId);
                state.isDirty = true;
            }
        });
    }),
  }))
);

// Helper to push state to history
const saveHistory = (state: TimelineState) => {
    if (state.project) {
        // Deep copy project
        const snapshot = JSON.parse(JSON.stringify(state.project));
        state.history.past.push(snapshot);
        state.history.future = []; // Clear future on new action
        
        // Limit history size to 50
        if (state.history.past.length > 50) {
            state.history.past.shift();
        }
        
        state.canUndo = true;
        state.canRedo = false;
    }
};
