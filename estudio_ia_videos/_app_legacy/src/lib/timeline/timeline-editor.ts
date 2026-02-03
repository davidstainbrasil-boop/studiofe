/**
 * Timeline Editor - Sistema avançado de edição de timeline
 * 
 * Features:
 * - Snap to grid
 * - Resize de clips
 * - Zoom na timeline
 * - Undo/Redo
 * - Keyboard shortcuts
 * - Multi-track editing
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { devtools } from 'zustand/middleware';

// ============= TIPOS =============

export interface TimelineClip {
  id: string;
  trackId: string;
  startTime: number;  // segundos
  duration: number;   // segundos
  type: 'video' | 'audio' | 'text' | 'image' | 'transition';
  content: {
    title: string;
    sourceUrl?: string;
    text?: string;
    thumbnail?: string;
  };
  style?: {
    backgroundColor?: string;
    color?: string;
    opacity?: number;
  };
  locked: boolean;
  muted?: boolean;
  volume?: number;
}

export interface TimelineTrack {
  id: string;
  name: string;
  type: 'video' | 'audio' | 'overlay' | 'subtitle';
  clips: TimelineClip[];
  height: number;  // pixels
  visible: boolean;
  locked: boolean;
  muted: boolean;
  solo: boolean;
}

export interface TimelineSelection {
  clipIds: string[];
  trackId?: string;
  timeRange?: { start: number; end: number };
}

export interface TimelineHistory {
  past: TimelineState[];
  future: TimelineState[];
}

export interface TimelineSettings {
  snapEnabled: boolean;
  snapThreshold: number;  // segundos
  gridSize: number;       // segundos por divisão
  zoomLevel: number;      // 1 = 100%
  playheadPosition: number;
  autoScroll: boolean;
  showWaveforms: boolean;
  showThumbnails: boolean;
  magneticSnap: boolean;
}

export interface TimelineState {
  tracks: TimelineTrack[];
  selection: TimelineSelection;
  settings: TimelineSettings;
  duration: number;  // duração total em segundos
  isPlaying: boolean;
  currentTime: number;
}

// ============= KEYBOARD SHORTCUTS =============

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  action: string;
  description: string;
}

export const KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
  // Playback
  { key: ' ', action: 'playPause', description: 'Play/Pause' },
  { key: 'k', action: 'playPause', description: 'Play/Pause (alternate)' },
  { key: 'j', action: 'rewind', description: 'Rewind 5 seconds' },
  { key: 'l', action: 'forward', description: 'Forward 5 seconds' },
  { key: 'Home', action: 'goToStart', description: 'Go to start' },
  { key: 'End', action: 'goToEnd', description: 'Go to end' },
  { key: 'ArrowLeft', action: 'previousFrame', description: 'Previous frame' },
  { key: 'ArrowRight', action: 'nextFrame', description: 'Next frame' },
  { key: 'ArrowLeft', shift: true, action: 'previous1Second', description: 'Back 1 second' },
  { key: 'ArrowRight', shift: true, action: 'forward1Second', description: 'Forward 1 second' },
  
  // Selection
  { key: 'a', ctrl: true, action: 'selectAll', description: 'Select all clips' },
  { key: 'Escape', action: 'deselectAll', description: 'Deselect all' },
  { key: 'Delete', action: 'deleteSelected', description: 'Delete selected clips' },
  { key: 'Backspace', action: 'deleteSelected', description: 'Delete selected clips' },
  
  // Editing
  { key: 'z', ctrl: true, action: 'undo', description: 'Undo' },
  { key: 'y', ctrl: true, action: 'redo', description: 'Redo' },
  { key: 'z', ctrl: true, shift: true, action: 'redo', description: 'Redo (alternate)' },
  { key: 'c', ctrl: true, action: 'copy', description: 'Copy selected clips' },
  { key: 'v', ctrl: true, action: 'paste', description: 'Paste clips' },
  { key: 'x', ctrl: true, action: 'cut', description: 'Cut selected clips' },
  { key: 'd', ctrl: true, action: 'duplicate', description: 'Duplicate selected clips' },
  
  // Clip manipulation
  { key: 's', action: 'split', description: 'Split clip at playhead' },
  { key: 'm', action: 'toggleMute', description: 'Toggle mute on selected' },
  { key: 'l', ctrl: true, action: 'toggleLock', description: 'Toggle lock on selected' },
  
  // Zoom
  { key: '=', ctrl: true, action: 'zoomIn', description: 'Zoom in' },
  { key: '-', ctrl: true, action: 'zoomOut', description: 'Zoom out' },
  { key: '0', ctrl: true, action: 'zoomFit', description: 'Zoom to fit' },
  { key: '1', ctrl: true, action: 'zoom100', description: 'Zoom to 100%' },
  
  // View
  { key: 'g', action: 'toggleSnap', description: 'Toggle snap to grid' },
  { key: 'w', action: 'toggleWaveforms', description: 'Toggle waveforms' },
  { key: 't', action: 'toggleThumbnails', description: 'Toggle thumbnails' },
  
  // Markers
  { key: 'm', ctrl: true, action: 'addMarker', description: 'Add marker at playhead' },
  { key: 'i', action: 'setInPoint', description: 'Set in point' },
  { key: 'o', action: 'setOutPoint', description: 'Set out point' },
];

// ============= HELPERS =============

function generateClipId(): string {
  return `clip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function snapToGrid(time: number, gridSize: number, threshold: number): number {
  const nearestGrid = Math.round(time / gridSize) * gridSize;
  if (Math.abs(time - nearestGrid) <= threshold) {
    return nearestGrid;
  }
  return time;
}

function findClipAtTime(tracks: TimelineTrack[], time: number): TimelineClip | null {
  for (const track of tracks) {
    for (const clip of track.clips) {
      if (time >= clip.startTime && time <= clip.startTime + clip.duration) {
        return clip;
      }
    }
  }
  return null;
}

function cloneState(state: TimelineState): TimelineState {
  return JSON.parse(JSON.stringify({
    tracks: state.tracks,
    selection: state.selection,
    settings: state.settings,
    duration: state.duration,
    isPlaying: state.isPlaying,
    currentTime: state.currentTime,
  }));
}

// ============= DEFAULT STATE =============

const DEFAULT_SETTINGS: TimelineSettings = {
  snapEnabled: true,
  snapThreshold: 0.1,  // 100ms
  gridSize: 1,         // 1 segundo
  zoomLevel: 1,
  playheadPosition: 0,
  autoScroll: true,
  showWaveforms: true,
  showThumbnails: true,
  magneticSnap: true,
};

const DEFAULT_STATE: TimelineState = {
  tracks: [
    { id: 'video-main', name: 'Video Principal', type: 'video', clips: [], height: 80, visible: true, locked: false, muted: false, solo: false },
    { id: 'audio-main', name: 'Áudio Principal', type: 'audio', clips: [], height: 50, visible: true, locked: false, muted: false, solo: false },
    { id: 'overlay-1', name: 'Overlay', type: 'overlay', clips: [], height: 60, visible: true, locked: false, muted: false, solo: false },
    { id: 'subtitle-1', name: 'Legendas', type: 'subtitle', clips: [], height: 40, visible: true, locked: false, muted: false, solo: false },
  ],
  selection: { clipIds: [] },
  settings: DEFAULT_SETTINGS,
  duration: 300,  // 5 minutos
  isPlaying: false,
  currentTime: 0,
};

// ============= STORE =============

interface TimelineStore extends TimelineState {
  // History
  history: TimelineHistory;
  
  // Actions - Playback
  play: () => void;
  pause: () => void;
  togglePlayPause: () => void;
  seek: (time: number) => void;
  rewind: (seconds?: number) => void;
  forward: (seconds?: number) => void;
  goToStart: () => void;
  goToEnd: () => void;
  
  // Actions - Clips
  addClip: (trackId: string, clip: Omit<TimelineClip, 'id' | 'trackId'>) => string;
  updateClip: (clipId: string, updates: Partial<TimelineClip>) => void;
  removeClip: (clipId: string) => void;
  moveClip: (clipId: string, newTrackId: string, newStartTime: number) => void;
  resizeClip: (clipId: string, newDuration: number, fromStart?: boolean) => void;
  splitClipAtPlayhead: (clipId: string) => void;
  duplicateClip: (clipId: string) => string | null;
  
  // Actions - Selection
  selectClip: (clipId: string, addToSelection?: boolean) => void;
  selectClips: (clipIds: string[]) => void;
  deselectAll: () => void;
  selectAll: () => void;
  selectTimeRange: (start: number, end: number) => void;
  deleteSelected: () => void;
  
  // Actions - Tracks
  addTrack: (track: Omit<TimelineTrack, 'clips'>) => void;
  removeTrack: (trackId: string) => void;
  updateTrack: (trackId: string, updates: Partial<TimelineTrack>) => void;
  reorderTracks: (fromIndex: number, toIndex: number) => void;
  toggleTrackVisibility: (trackId: string) => void;
  toggleTrackLock: (trackId: string) => void;
  toggleTrackMute: (trackId: string) => void;
  toggleTrackSolo: (trackId: string) => void;
  
  // Actions - Settings
  setZoom: (level: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomToFit: () => void;
  toggleSnap: () => void;
  setGridSize: (size: number) => void;
  updateSettings: (settings: Partial<TimelineSettings>) => void;
  
  // Actions - History
  undo: () => void;
  redo: () => void;
  saveToHistory: () => void;
  clearHistory: () => void;
  
  // Actions - Clipboard
  clipboard: TimelineClip[];
  copy: () => void;
  cut: () => void;
  paste: () => void;
  
  // Actions - Markers
  markers: Array<{ id: string; time: number; label: string; color: string }>;
  addMarker: (time: number, label?: string) => void;
  removeMarker: (id: string) => void;
  
  // Computed
  getClipById: (clipId: string) => TimelineClip | null;
  getTrackById: (trackId: string) => TimelineTrack | null;
  getSelectedClips: () => TimelineClip[];
  getTotalDuration: () => number;
  
  // Reset
  reset: () => void;
}

export const useTimelineStore = create<TimelineStore>()(
  devtools(
    immer((set, get) => ({
      // Initial state
      ...DEFAULT_STATE,
      history: { past: [], future: [] },
      clipboard: [],
      markers: [],

      // Playback
      play: () => set(state => { state.isPlaying = true; }),
      pause: () => set(state => { state.isPlaying = false; }),
      togglePlayPause: () => set(state => { state.isPlaying = !state.isPlaying; }),
      
      seek: (time) => set(state => {
        state.currentTime = Math.max(0, Math.min(time, state.duration));
        state.settings.playheadPosition = state.currentTime;
      }),
      
      rewind: (seconds = 5) => set(state => {
        state.currentTime = Math.max(0, state.currentTime - seconds);
        state.settings.playheadPosition = state.currentTime;
      }),
      
      forward: (seconds = 5) => set(state => {
        state.currentTime = Math.min(state.duration, state.currentTime + seconds);
        state.settings.playheadPosition = state.currentTime;
      }),
      
      goToStart: () => set(state => {
        state.currentTime = 0;
        state.settings.playheadPosition = 0;
      }),
      
      goToEnd: () => set(state => {
        state.currentTime = state.duration;
        state.settings.playheadPosition = state.duration;
      }),

      // Clips
      addClip: (trackId, clipData) => {
        const clipId = generateClipId();
        set(state => {
          const track = state.tracks.find(t => t.id === trackId);
          if (track && !track.locked) {
            const { settings } = state;
            let finalStartTime = clipData.startTime;
            
            if (settings.snapEnabled) {
              finalStartTime = snapToGrid(finalStartTime, settings.gridSize, settings.snapThreshold);
            }
            
            const newClip: TimelineClip = {
              id: clipId,
              trackId: trackId,
              startTime: finalStartTime,
              duration: clipData.duration,
              type: clipData.type,
              content: clipData.content,
              style: clipData.style,
              locked: clipData.locked,
              muted: clipData.muted,
              volume: clipData.volume,
            };
            track.clips.push(newClip);
            track.clips.sort((a, b) => a.startTime - b.startTime);
          }
        });
        get().saveToHistory();
        return clipId;
      },

      updateClip: (clipId, updates) => set(state => {
        for (const track of state.tracks) {
          const clipIndex = track.clips.findIndex(c => c.id === clipId);
          if (clipIndex !== -1 && !track.locked && !track.clips[clipIndex].locked) {
            Object.assign(track.clips[clipIndex], updates);
            break;
          }
        }
      }),

      removeClip: (clipId) => {
        set(state => {
          for (const track of state.tracks) {
            const clipIndex = track.clips.findIndex(c => c.id === clipId);
            if (clipIndex !== -1 && !track.locked && !track.clips[clipIndex].locked) {
              track.clips.splice(clipIndex, 1);
              state.selection.clipIds = state.selection.clipIds.filter(id => id !== clipId);
              break;
            }
          }
        });
        get().saveToHistory();
      },

      moveClip: (clipId, newTrackId, newStartTime) => {
        set(state => {
          const { settings } = state;
          
          // Encontrar clip original
          let sourceClip: TimelineClip | null = null;
          let sourceTrack: TimelineTrack | null = null;
          
          for (const track of state.tracks) {
            const clip = track.clips.find(c => c.id === clipId);
            if (clip) {
              sourceClip = clip;
              sourceTrack = track;
              break;
            }
          }
          
          if (!sourceClip || !sourceTrack || sourceTrack.locked || sourceClip.locked) return;
          
          const targetTrack = state.tracks.find(t => t.id === newTrackId);
          if (!targetTrack || targetTrack.locked) return;
          
          // Aplicar snap
          let finalStartTime = newStartTime;
          if (settings.snapEnabled) {
            finalStartTime = snapToGrid(newStartTime, settings.gridSize, settings.snapThreshold);
            
            // Magnetic snap para outros clips
            if (settings.magneticSnap) {
              for (const clip of targetTrack.clips) {
                if (clip.id === clipId) continue;
                
                const clipEnd = clip.startTime + clip.duration;
                
                // Snap ao início de outro clip
                if (Math.abs(finalStartTime + sourceClip.duration - clip.startTime) < settings.snapThreshold) {
                  finalStartTime = clip.startTime - sourceClip.duration;
                }
                // Snap ao fim de outro clip
                if (Math.abs(finalStartTime - clipEnd) < settings.snapThreshold) {
                  finalStartTime = clipEnd;
                }
              }
            }
          }
          
          // Mover clip
          if (sourceTrack.id === newTrackId) {
            // Mesmo track - apenas atualizar posição
            sourceClip.startTime = Math.max(0, finalStartTime);
          } else {
            // Track diferente - remover do original e adicionar no novo
            sourceTrack.clips = sourceTrack.clips.filter(c => c.id !== clipId);
            sourceClip.trackId = newTrackId;
            sourceClip.startTime = Math.max(0, finalStartTime);
            targetTrack.clips.push(sourceClip);
          }
          
          // Reordenar clips
          targetTrack.clips.sort((a, b) => a.startTime - b.startTime);
        });
        get().saveToHistory();
      },

      resizeClip: (clipId, newDuration, fromStart = false) => {
        set(state => {
          for (const track of state.tracks) {
            const clip = track.clips.find(c => c.id === clipId);
            if (clip && !track.locked && !clip.locked) {
              const minDuration = 0.1;  // 100ms mínimo
              const clampedDuration = Math.max(minDuration, newDuration);
              
              if (fromStart) {
                const diff = clip.duration - clampedDuration;
                clip.startTime = Math.max(0, clip.startTime + diff);
              }
              
              clip.duration = clampedDuration;
              break;
            }
          }
        });
        get().saveToHistory();
      },

      splitClipAtPlayhead: (clipId) => {
        set(state => {
          const playhead = state.currentTime;
          
          for (const track of state.tracks) {
            const clipIndex = track.clips.findIndex(c => c.id === clipId);
            if (clipIndex === -1) continue;
            
            const clip = track.clips[clipIndex];
            if (track.locked || clip.locked) continue;
            
            const clipEnd = clip.startTime + clip.duration;
            
            // Verificar se playhead está dentro do clip
            if (playhead > clip.startTime && playhead < clipEnd) {
              const firstDuration = playhead - clip.startTime;
              const secondDuration = clipEnd - playhead;
              
              // Ajustar clip original
              clip.duration = firstDuration;
              
              // Criar segundo clip
              const newClip: TimelineClip = {
                ...JSON.parse(JSON.stringify(clip)),
                id: generateClipId(),
                startTime: playhead,
                duration: secondDuration,
              };
              
              track.clips.splice(clipIndex + 1, 0, newClip);
              break;
            }
          }
        });
        get().saveToHistory();
      },

      duplicateClip: (clipId) => {
        const newClipId = generateClipId();
        set(state => {
          for (const track of state.tracks) {
            const clip = track.clips.find(c => c.id === clipId);
            if (clip && !track.locked) {
              const duplicated: TimelineClip = {
                ...JSON.parse(JSON.stringify(clip)),
                id: newClipId,
                startTime: clip.startTime + clip.duration + 0.1,
                locked: false,
              };
              track.clips.push(duplicated);
              track.clips.sort((a, b) => a.startTime - b.startTime);
              return;
            }
          }
        });
        get().saveToHistory();
        return newClipId;
      },

      // Selection
      selectClip: (clipId, addToSelection = false) => set(state => {
        if (addToSelection) {
          if (!state.selection.clipIds.includes(clipId)) {
            state.selection.clipIds.push(clipId);
          }
        } else {
          state.selection.clipIds = [clipId];
        }
      }),

      selectClips: (clipIds) => set(state => {
        state.selection.clipIds = [...clipIds];
      }),

      deselectAll: () => set(state => {
        state.selection.clipIds = [];
        state.selection.timeRange = undefined;
      }),

      selectAll: () => set(state => {
        const allClipIds: string[] = [];
        for (const track of state.tracks) {
          for (const clip of track.clips) {
            allClipIds.push(clip.id);
          }
        }
        state.selection.clipIds = allClipIds;
      }),

      selectTimeRange: (start, end) => set(state => {
        state.selection.timeRange = { start, end };
        
        // Selecionar clips no range
        const selectedIds: string[] = [];
        for (const track of state.tracks) {
          for (const clip of track.clips) {
            const clipEnd = clip.startTime + clip.duration;
            if (clip.startTime < end && clipEnd > start) {
              selectedIds.push(clip.id);
            }
          }
        }
        state.selection.clipIds = selectedIds;
      }),

      deleteSelected: () => {
        set(state => {
          const selectedIds = new Set(state.selection.clipIds);
          
          for (const track of state.tracks) {
            if (!track.locked) {
              track.clips = track.clips.filter(clip => 
                !selectedIds.has(clip.id) || clip.locked
              );
            }
          }
          
          state.selection.clipIds = [];
        });
        get().saveToHistory();
      },

      // Tracks
      addTrack: (trackData) => set(state => {
        const newTrack: TimelineTrack = {
          ...trackData,
          clips: [],
        };
        state.tracks.push(newTrack);
      }),

      removeTrack: (trackId) => set(state => {
        state.tracks = state.tracks.filter(t => t.id !== trackId);
      }),

      updateTrack: (trackId, updates) => set(state => {
        const track = state.tracks.find(t => t.id === trackId);
        if (track) {
          Object.assign(track, updates);
        }
      }),

      reorderTracks: (fromIndex, toIndex) => set(state => {
        const [removed] = state.tracks.splice(fromIndex, 1);
        state.tracks.splice(toIndex, 0, removed);
      }),

      toggleTrackVisibility: (trackId) => set(state => {
        const track = state.tracks.find(t => t.id === trackId);
        if (track) track.visible = !track.visible;
      }),

      toggleTrackLock: (trackId) => set(state => {
        const track = state.tracks.find(t => t.id === trackId);
        if (track) track.locked = !track.locked;
      }),

      toggleTrackMute: (trackId) => set(state => {
        const track = state.tracks.find(t => t.id === trackId);
        if (track) track.muted = !track.muted;
      }),

      toggleTrackSolo: (trackId) => set(state => {
        const track = state.tracks.find(t => t.id === trackId);
        if (track) track.solo = !track.solo;
      }),

      // Settings
      setZoom: (level) => set(state => {
        state.settings.zoomLevel = Math.max(0.1, Math.min(10, level));
      }),

      zoomIn: () => set(state => {
        state.settings.zoomLevel = Math.min(10, state.settings.zoomLevel * 1.25);
      }),

      zoomOut: () => set(state => {
        state.settings.zoomLevel = Math.max(0.1, state.settings.zoomLevel * 0.8);
      }),

      zoomToFit: () => set(state => {
        // Calcular zoom para caber toda a timeline
        state.settings.zoomLevel = 1;
      }),

      toggleSnap: () => set(state => {
        state.settings.snapEnabled = !state.settings.snapEnabled;
      }),

      setGridSize: (size) => set(state => {
        state.settings.gridSize = Math.max(0.1, size);
      }),

      updateSettings: (settings) => set(state => {
        Object.assign(state.settings, settings);
      }),

      // History (Undo/Redo)
      saveToHistory: () => set(state => {
        const currentState = cloneState(state);
        state.history.past.push(currentState);
        state.history.future = [];
        
        // Limitar histórico
        if (state.history.past.length > 50) {
          state.history.past.shift();
        }
      }),

      undo: () => set(state => {
        if (state.history.past.length === 0) return;
        
        const currentState = cloneState(state);
        const previousState = state.history.past.pop()!;
        
        state.history.future.push(currentState);
        
        // Restaurar estado anterior
        state.tracks = previousState.tracks;
        state.selection = previousState.selection;
        state.duration = previousState.duration;
      }),

      redo: () => set(state => {
        if (state.history.future.length === 0) return;
        
        const currentState = cloneState(state);
        const nextState = state.history.future.pop()!;
        
        state.history.past.push(currentState);
        
        // Restaurar estado seguinte
        state.tracks = nextState.tracks;
        state.selection = nextState.selection;
        state.duration = nextState.duration;
      }),

      clearHistory: () => set(state => {
        state.history = { past: [], future: [] };
      }),

      // Clipboard
      copy: () => set(state => {
        const selectedClips: TimelineClip[] = [];
        
        for (const track of state.tracks) {
          for (const clip of track.clips) {
            if (state.selection.clipIds.includes(clip.id)) {
              selectedClips.push(JSON.parse(JSON.stringify(clip)));
            }
          }
        }
        
        state.clipboard = selectedClips;
      }),

      cut: () => {
        get().copy();
        get().deleteSelected();
      },

      paste: () => {
        set(state => {
          const { clipboard, currentTime } = state;
          if (clipboard.length === 0) return;
          
          // Encontrar tempo mínimo dos clips copiados
          const minTime = Math.min(...clipboard.map(c => c.startTime));
          const offset = currentTime - minTime;
          
          for (const clipData of clipboard) {
            const track = state.tracks.find(t => t.id === clipData.trackId);
            if (track && !track.locked) {
              const newClip: TimelineClip = {
                ...clipData,
                id: generateClipId(),
                startTime: clipData.startTime + offset,
                locked: false,
              };
              track.clips.push(newClip);
              track.clips.sort((a, b) => a.startTime - b.startTime);
            }
          }
        });
        get().saveToHistory();
      },

      // Markers
      addMarker: (time, label = 'Marker') => set(state => {
        state.markers.push({
          id: `marker-${Date.now()}`,
          time,
          label,
          color: '#FFD700',
        });
        state.markers.sort((a, b) => a.time - b.time);
      }),

      removeMarker: (id) => set(state => {
        state.markers = state.markers.filter(m => m.id !== id);
      }),

      // Computed
      getClipById: (clipId) => {
        const state = get();
        for (const track of state.tracks) {
          const clip = track.clips.find(c => c.id === clipId);
          if (clip) return clip;
        }
        return null;
      },

      getTrackById: (trackId) => {
        return get().tracks.find(t => t.id === trackId) || null;
      },

      getSelectedClips: () => {
        const state = get();
        const clips: TimelineClip[] = [];
        
        for (const track of state.tracks) {
          for (const clip of track.clips) {
            if (state.selection.clipIds.includes(clip.id)) {
              clips.push(clip);
            }
          }
        }
        
        return clips;
      },

      getTotalDuration: () => {
        const state = get();
        let maxEnd = 0;
        
        for (const track of state.tracks) {
          for (const clip of track.clips) {
            const clipEnd = clip.startTime + clip.duration;
            if (clipEnd > maxEnd) {
              maxEnd = clipEnd;
            }
          }
        }
        
        return Math.max(maxEnd, state.duration);
      },

      // Reset
      reset: () => set(() => ({
        ...DEFAULT_STATE,
        history: { past: [], future: [] },
        clipboard: [],
        markers: [],
      })),
    })),
    { name: 'timeline-store' }
  )
);

// ============= KEYBOARD HANDLER HOOK =============

export function createKeyboardHandler(store: typeof useTimelineStore) {
  return function handleKeyDown(event: KeyboardEvent): boolean {
    const { key, ctrlKey, shiftKey, altKey, metaKey } = event;
    
    // Ignorar se estiver em um input/textarea
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      return false;
    }
    
    const state = store.getState();
    
    for (const shortcut of KEYBOARD_SHORTCUTS) {
      const keyMatch = shortcut.key.toLowerCase() === key.toLowerCase();
      const ctrlMatch = (shortcut.ctrl ?? false) === ctrlKey;
      const shiftMatch = (shortcut.shift ?? false) === shiftKey;
      const altMatch = (shortcut.alt ?? false) === altKey;
      const metaMatch = (shortcut.meta ?? false) === metaKey;
      
      if (keyMatch && ctrlMatch && shiftMatch && altMatch && metaMatch) {
        event.preventDefault();
        
        switch (shortcut.action) {
          case 'playPause':
            state.togglePlayPause();
            break;
          case 'rewind':
            state.rewind();
            break;
          case 'forward':
            state.forward();
            break;
          case 'goToStart':
            state.goToStart();
            break;
          case 'goToEnd':
            state.goToEnd();
            break;
          case 'previousFrame':
            state.seek(state.currentTime - (1/30));
            break;
          case 'nextFrame':
            state.seek(state.currentTime + (1/30));
            break;
          case 'previous1Second':
            state.rewind(1);
            break;
          case 'forward1Second':
            state.forward(1);
            break;
          case 'selectAll':
            state.selectAll();
            break;
          case 'deselectAll':
            state.deselectAll();
            break;
          case 'deleteSelected':
            state.deleteSelected();
            break;
          case 'undo':
            state.undo();
            break;
          case 'redo':
            state.redo();
            break;
          case 'copy':
            state.copy();
            break;
          case 'paste':
            state.paste();
            break;
          case 'cut':
            state.cut();
            break;
          case 'duplicate':
            state.getSelectedClips().forEach(clip => state.duplicateClip(clip.id));
            break;
          case 'split':
            state.getSelectedClips().forEach(clip => state.splitClipAtPlayhead(clip.id));
            break;
          case 'toggleMute':
            // Toggle mute on selected clips
            break;
          case 'toggleLock':
            // Toggle lock on selected clips
            break;
          case 'zoomIn':
            state.zoomIn();
            break;
          case 'zoomOut':
            state.zoomOut();
            break;
          case 'zoomFit':
            state.zoomToFit();
            break;
          case 'zoom100':
            state.setZoom(1);
            break;
          case 'toggleSnap':
            state.toggleSnap();
            break;
          case 'toggleWaveforms':
            state.updateSettings({ showWaveforms: !state.settings.showWaveforms });
            break;
          case 'toggleThumbnails':
            state.updateSettings({ showThumbnails: !state.settings.showThumbnails });
            break;
          case 'addMarker':
            state.addMarker(state.currentTime);
            break;
        }
        
        return true;
      }
    }
    
    return false;
  };
}
