/**
 * 🎬 Unified Studio Store
 * Estado global unificado para o Video Studio
 * Combina editor, timeline, colaboração e renderização
 */

import { create } from 'zustand';
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { logger } from '../logger';

// ========================================
// Types
// ========================================

export type AssetTab = 'media' | 'avatars' | 'templates' | 'stock' | 'ai';
export type InspectorTab = 'properties' | 'effects' | 'animations' | 'ai';
export type TrackType = 'video' | 'audio' | 'avatar' | 'subtitle' | 'effects';

export interface CanvasElement {
  id: string;
  type: 'text' | 'image' | 'shape' | 'video' | 'avatar';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  visible: boolean;
  locked: boolean;
  data: Record<string, unknown>;
}

export interface TimelineTrack {
  id: string;
  name: string;
  type: TrackType;
  muted: boolean;
  locked: boolean;
  visible: boolean;
  height: number;
  order: number;
}

export interface TimelineClip {
  id: string;
  trackId: string;
  name: string;
  type: TrackType;
  startTime: number;
  duration: number;
  inPoint: number;
  outPoint: number;
  data: Record<string, unknown>;
  keyframes?: Keyframe[];
}

export interface Keyframe {
  id: string;
  time: number;
  property: string;
  value: number | string | boolean;
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'bezier';
}

export interface AISuggestion {
  id: string;
  type: 'script' | 'edit' | 'effect' | 'music' | 'color' | 'visual' | 'optimization';
  title: string;
  description: string;
  confidence: number;
  applied: boolean;
  data: Record<string, unknown>;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface Collaborator {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatar?: string;
  color: string;
  role: 'owner' | 'editor' | 'viewer';
  isOnline: boolean;
  lastSeen: Date;
}

export interface CursorPosition {
  x: number;
  y: number;
  elementId?: string;
  panel: 'canvas' | 'timeline' | 'inspector';
  timestamp: number;
}

export interface RenderJob {
  id: string;
  projectId: string;
  name: string;
  status: 'pending' | 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  outputUrl?: string;
  error?: string;
  settings: RenderSettings;
  createdAt: Date;
  completedAt?: Date;
}

export interface RenderSettings {
  format: 'mp4' | 'webm' | 'mov';
  resolution: '720p' | '1080p' | '4k';
  fps: 24 | 30 | 60;
  quality: 'draft' | 'standard' | 'high' | 'ultra';
  codec: 'h264' | 'h265' | 'vp9' | 'av1';
  includeAudio: boolean;
  includeSubtitles: boolean;
  watermark: boolean;
}

export interface ProjectMetadata {
  id: string;
  name: string;
  description: string;
  thumbnail?: string;
  createdAt: Date;
  updatedAt: Date;
  duration: number;
  aspectRatio: '16:9' | '9:16' | '1:1' | '4:3';
  frameRate: number;
}

// ========================================
// State Interface
// ========================================

export interface UnifiedStudioState {
  // Project
  projectId: string | null;
  projectName: string;
  projectMetadata: ProjectMetadata | null;
  isDirty: boolean;
  isLoading: boolean;
  lastSavedAt: Date | null;

  // Workspace
  activePanel: AssetTab;
  inspectorTab: InspectorTab;
  leftPanelWidth: number;
  rightPanelWidth: number;
  timelineHeight: number;
  isLeftPanelCollapsed: boolean;
  isRightPanelCollapsed: boolean;
  isTimelineCollapsed: boolean;

  // Timeline
  tracks: TimelineTrack[];
  clips: TimelineClip[];
  currentTime: number;
  duration: number;
  zoom: number;
  isPlaying: boolean;
  volume: number;
  scrollX: number;
  pixelsPerSecond: number;

  // Selection
  selectedClipIds: string[];
  selectedTrackId: string | null;
  selectedElementIds: string[];

  // Canvas
  canvasElements: CanvasElement[];
  canvasZoom: number;
  canvasPan: { x: number; y: number };

  // AI Assistant
  aiSuggestions: AISuggestion[];
  aiChatHistory: ChatMessage[];
  isAIProcessing: boolean;

  // Collaboration
  collaborators: Collaborator[];
  cursorPositions: Record<string, CursorPosition>;
  isCollaborationEnabled: boolean;

  // Render Queue
  renderJobs: RenderJob[];
  activeRender: RenderJob | null;

  // History (Undo/Redo)
  canUndo: boolean;
  canRedo: boolean;
}

// ========================================
// Actions Interface
// ========================================

export interface UnifiedStudioActions {
  // Project Actions
  setProject: (id: string, name: string, metadata?: Partial<ProjectMetadata>) => void;
  clearProject: () => void;
  markDirty: () => void;
  markSaved: () => void;
  setLoading: (loading: boolean) => void;

  // Workspace Actions
  setActivePanel: (panel: AssetTab) => void;
  setInspectorTab: (tab: InspectorTab) => void;
  setLeftPanelWidth: (width: number) => void;
  setRightPanelWidth: (width: number) => void;
  setTimelineHeight: (height: number) => void;
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  toggleTimeline: () => void;

  // Timeline Actions
  addTrack: (track: Omit<TimelineTrack, 'id' | 'order'>) => string;
  removeTrack: (trackId: string) => void;
  updateTrack: (trackId: string, updates: Partial<TimelineTrack>) => void;
  reorderTracks: (fromIndex: number, toIndex: number) => void;

  addClip: (clip: Omit<TimelineClip, 'id'>) => string;
  removeClip: (clipId: string) => void;
  updateClip: (clipId: string, updates: Partial<TimelineClip>) => void;
  moveClip: (clipId: string, trackId: string, startTime: number) => void;
  splitClip: (clipId: string, time: number) => [string, string];
  trimClip: (clipId: string, inPoint: number, outPoint: number) => void;

  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setZoom: (zoom: number) => void;
  setIsPlaying: (playing: boolean) => void;
  togglePlayback: () => void;
  setVolume: (volume: number) => void;
  setScrollX: (scrollX: number) => void;

  // Selection Actions
  selectClips: (clipIds: string[]) => void;
  addToClipSelection: (clipId: string) => void;
  removeFromClipSelection: (clipId: string) => void;
  clearClipSelection: () => void;
  selectTrack: (trackId: string | null) => void;
  selectElements: (elementIds: string[]) => void;
  clearElementSelection: () => void;

  // Canvas Actions
  addCanvasElement: (element: Omit<CanvasElement, 'id'>) => string;
  removeCanvasElement: (elementId: string) => void;
  updateCanvasElement: (elementId: string, updates: Partial<CanvasElement>) => void;
  setCanvasZoom: (zoom: number) => void;
  setCanvasPan: (pan: { x: number; y: number }) => void;

  // AI Actions
  addAISuggestion: (suggestion: Omit<AISuggestion, 'id'>) => void;
  applySuggestion: (suggestionId: string) => void;
  dismissSuggestion: (suggestionId: string) => void;
  addChatMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  clearChatHistory: () => void;
  setAIProcessing: (processing: boolean) => void;

  // Collaboration Actions
  setCollaborators: (collaborators: Collaborator[]) => void;
  addCollaborator: (collaborator: Collaborator) => void;
  removeCollaborator: (collaboratorId: string) => void;
  updateCursorPosition: (userId: string, position: CursorPosition) => void;
  toggleCollaboration: () => void;

  // Render Actions
  addRenderJob: (job: Omit<RenderJob, 'id' | 'createdAt'>) => string;
  updateRenderJob: (jobId: string, updates: Partial<RenderJob>) => void;
  cancelRenderJob: (jobId: string) => void;
  removeRenderJob: (jobId: string) => void;
  setActiveRender: (job: RenderJob | null) => void;

  // History Actions
  undo: () => void;
  redo: () => void;

  // Utility Actions
  reset: () => void;
}

// ========================================
// Initial State
// ========================================

const initialState: UnifiedStudioState = {
  // Project
  projectId: null,
  projectName: 'Untitled Project',
  projectMetadata: null,
  isDirty: false,
  isLoading: false,
  lastSavedAt: null,

  // Workspace
  activePanel: 'media',
  inspectorTab: 'properties',
  leftPanelWidth: 280,
  rightPanelWidth: 300,
  timelineHeight: 250,
  isLeftPanelCollapsed: false,
  isRightPanelCollapsed: false,
  isTimelineCollapsed: false,

  // Timeline
  tracks: [],
  clips: [],
  currentTime: 0,
  duration: 0,
  zoom: 1,
  isPlaying: false,
  volume: 1,
  scrollX: 0,
  pixelsPerSecond: 100,

  // Selection
  selectedClipIds: [],
  selectedTrackId: null,
  selectedElementIds: [],

  // Canvas
  canvasElements: [],
  canvasZoom: 1,
  canvasPan: { x: 0, y: 0 },

  // AI Assistant
  aiSuggestions: [],
  aiChatHistory: [],
  isAIProcessing: false,

  // Collaboration
  collaborators: [],
  cursorPositions: {},
  isCollaborationEnabled: false,

  // Render Queue
  renderJobs: [],
  activeRender: null,

  // History
  canUndo: false,
  canRedo: false,
};

// ========================================
// Store Creation
// ========================================

export const useUnifiedStudioStore = create<UnifiedStudioState & UnifiedStudioActions>()(
  devtools(
    subscribeWithSelector(
      persist(
        immer((set, get) => ({
          ...initialState,

          // ================================
          // Project Actions
          // ================================
          setProject: (id, name, metadata) =>
            set((state) => {
              state.projectId = id;
              state.projectName = name;
              if (metadata) {
                state.projectMetadata = {
                  id,
                  name,
                  description: metadata.description || '',
                  createdAt: metadata.createdAt || new Date(),
                  updatedAt: metadata.updatedAt || new Date(),
                  duration: metadata.duration || 0,
                  aspectRatio: metadata.aspectRatio || '16:9',
                  frameRate: metadata.frameRate || 30,
                };
              }
              state.isDirty = false;
              logger.info('Project set', { id, name });
            }),

          clearProject: () =>
            set((state) => {
              Object.assign(state, initialState);
              logger.info('Project cleared');
            }),

          markDirty: () =>
            set((state) => {
              state.isDirty = true;
            }),

          markSaved: () =>
            set((state) => {
              state.isDirty = false;
              state.lastSavedAt = new Date();
              if (state.projectMetadata) {
                state.projectMetadata.updatedAt = new Date();
              }
            }),

          setLoading: (loading) =>
            set((state) => {
              state.isLoading = loading;
            }),

          // ================================
          // Workspace Actions
          // ================================
          setActivePanel: (panel) =>
            set((state) => {
              state.activePanel = panel;
            }),

          setInspectorTab: (tab) =>
            set((state) => {
              state.inspectorTab = tab;
            }),

          setLeftPanelWidth: (width) =>
            set((state) => {
              state.leftPanelWidth = Math.max(200, Math.min(500, width));
            }),

          setRightPanelWidth: (width) =>
            set((state) => {
              state.rightPanelWidth = Math.max(200, Math.min(500, width));
            }),

          setTimelineHeight: (height) =>
            set((state) => {
              state.timelineHeight = Math.max(150, Math.min(500, height));
            }),

          toggleLeftPanel: () =>
            set((state) => {
              state.isLeftPanelCollapsed = !state.isLeftPanelCollapsed;
            }),

          toggleRightPanel: () =>
            set((state) => {
              state.isRightPanelCollapsed = !state.isRightPanelCollapsed;
            }),

          toggleTimeline: () =>
            set((state) => {
              state.isTimelineCollapsed = !state.isTimelineCollapsed;
            }),

          // ================================
          // Timeline Actions
          // ================================
          addTrack: (trackData) => {
            const id = `track-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            set((state) => {
              const order = state.tracks.length;
              state.tracks.push({ ...trackData, id, order });
              state.isDirty = true;
            });
            return id;
          },

          removeTrack: (trackId) =>
            set((state) => {
              state.tracks = state.tracks.filter((t) => t.id !== trackId);
              state.clips = state.clips.filter((c) => c.trackId !== trackId);
              if (state.selectedTrackId === trackId) {
                state.selectedTrackId = null;
              }
              state.isDirty = true;
            }),

          updateTrack: (trackId, updates) =>
            set((state) => {
              const track = state.tracks.find((t) => t.id === trackId);
              if (track) {
                Object.assign(track, updates);
                state.isDirty = true;
              }
            }),

          reorderTracks: (fromIndex, toIndex) =>
            set((state) => {
              const [track] = state.tracks.splice(fromIndex, 1);
              state.tracks.splice(toIndex, 0, track);
              state.tracks.forEach((t, i) => (t.order = i));
              state.isDirty = true;
            }),

          addClip: (clipData) => {
            const id = `clip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            set((state) => {
              state.clips.push({ ...clipData, id });
              // Update duration if needed
              const endTime = clipData.startTime + clipData.duration;
              if (endTime > state.duration) {
                state.duration = endTime;
              }
              state.isDirty = true;
            });
            return id;
          },

          removeClip: (clipId) =>
            set((state) => {
              state.clips = state.clips.filter((c) => c.id !== clipId);
              state.selectedClipIds = state.selectedClipIds.filter((id) => id !== clipId);
              state.isDirty = true;
            }),

          updateClip: (clipId, updates) =>
            set((state) => {
              const clip = state.clips.find((c) => c.id === clipId);
              if (clip) {
                Object.assign(clip, updates);
                state.isDirty = true;
              }
            }),

          moveClip: (clipId, trackId, startTime) =>
            set((state) => {
              const clip = state.clips.find((c) => c.id === clipId);
              if (clip) {
                clip.trackId = trackId;
                clip.startTime = Math.max(0, startTime);
                state.isDirty = true;
              }
            }),

          splitClip: (clipId, time) => {
            const id1 = `clip-${Date.now()}-a`;
            const id2 = `clip-${Date.now()}-b`;
            
            set((state) => {
              const clipIndex = state.clips.findIndex((c) => c.id === clipId);
              if (clipIndex === -1) return;
              
              const clip = state.clips[clipIndex];
              const splitPoint = time - clip.startTime;
              
              if (splitPoint <= 0 || splitPoint >= clip.duration) return;
              
              const clip1: TimelineClip = {
                ...clip,
                id: id1,
                duration: splitPoint,
                outPoint: clip.inPoint + splitPoint,
              };
              
              const clip2: TimelineClip = {
                ...clip,
                id: id2,
                startTime: time,
                duration: clip.duration - splitPoint,
                inPoint: clip.inPoint + splitPoint,
              };
              
              state.clips.splice(clipIndex, 1, clip1, clip2);
              state.isDirty = true;
            });
            
            return [id1, id2] as [string, string];
          },

          trimClip: (clipId, inPoint, outPoint) =>
            set((state) => {
              const clip = state.clips.find((c) => c.id === clipId);
              if (clip) {
                clip.inPoint = inPoint;
                clip.outPoint = outPoint;
                clip.duration = outPoint - inPoint;
                state.isDirty = true;
              }
            }),

          setCurrentTime: (time) =>
            set((state) => {
              state.currentTime = Math.max(0, Math.min(time, state.duration));
            }),

          setDuration: (duration) =>
            set((state) => {
              state.duration = Math.max(0, duration);
            }),

          setZoom: (zoom) =>
            set((state) => {
              state.zoom = Math.max(0.1, Math.min(10, zoom));
              state.pixelsPerSecond = 100 * state.zoom;
            }),

          setIsPlaying: (playing) =>
            set((state) => {
              state.isPlaying = playing;
            }),

          togglePlayback: () =>
            set((state) => {
              state.isPlaying = !state.isPlaying;
            }),

          setVolume: (volume) =>
            set((state) => {
              state.volume = Math.max(0, Math.min(1, volume));
            }),

          setScrollX: (scrollX) =>
            set((state) => {
              state.scrollX = Math.max(0, scrollX);
            }),

          // ================================
          // Selection Actions
          // ================================
          selectClips: (clipIds) =>
            set((state) => {
              state.selectedClipIds = clipIds;
            }),

          addToClipSelection: (clipId) =>
            set((state) => {
              if (!state.selectedClipIds.includes(clipId)) {
                state.selectedClipIds.push(clipId);
              }
            }),

          removeFromClipSelection: (clipId) =>
            set((state) => {
              state.selectedClipIds = state.selectedClipIds.filter((id) => id !== clipId);
            }),

          clearClipSelection: () =>
            set((state) => {
              state.selectedClipIds = [];
            }),

          selectTrack: (trackId) =>
            set((state) => {
              state.selectedTrackId = trackId;
            }),

          selectElements: (elementIds) =>
            set((state) => {
              state.selectedElementIds = elementIds;
            }),

          clearElementSelection: () =>
            set((state) => {
              state.selectedElementIds = [];
            }),

          // ================================
          // Canvas Actions
          // ================================
          addCanvasElement: (elementData) => {
            const id = `element-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            set((state) => {
              state.canvasElements.push({ ...elementData, id });
              state.isDirty = true;
            });
            return id;
          },

          removeCanvasElement: (elementId) =>
            set((state) => {
              state.canvasElements = state.canvasElements.filter((e) => e.id !== elementId);
              state.selectedElementIds = state.selectedElementIds.filter((id) => id !== elementId);
              state.isDirty = true;
            }),

          updateCanvasElement: (elementId, updates) =>
            set((state) => {
              const element = state.canvasElements.find((e) => e.id === elementId);
              if (element) {
                Object.assign(element, updates);
                state.isDirty = true;
              }
            }),

          setCanvasZoom: (zoom) =>
            set((state) => {
              state.canvasZoom = Math.max(0.1, Math.min(5, zoom));
            }),

          setCanvasPan: (pan) =>
            set((state) => {
              state.canvasPan = pan;
            }),

          // ================================
          // AI Actions
          // ================================
          addAISuggestion: (suggestion) =>
            set((state) => {
              const id = `suggestion-${Date.now()}`;
              state.aiSuggestions.push({ ...suggestion, id, applied: false });
            }),

          applySuggestion: (suggestionId) =>
            set((state) => {
              const suggestion = state.aiSuggestions.find((s) => s.id === suggestionId);
              if (suggestion) {
                suggestion.applied = true;
                state.isDirty = true;
                logger.info('AI suggestion applied', { suggestionId });
              }
            }),

          dismissSuggestion: (suggestionId) =>
            set((state) => {
              state.aiSuggestions = state.aiSuggestions.filter((s) => s.id !== suggestionId);
            }),

          addChatMessage: (message) =>
            set((state) => {
              const id = `msg-${Date.now()}`;
              state.aiChatHistory.push({
                ...message,
                id,
                timestamp: new Date(),
              });
            }),

          clearChatHistory: () =>
            set((state) => {
              state.aiChatHistory = [];
            }),

          setAIProcessing: (processing) =>
            set((state) => {
              state.isAIProcessing = processing;
            }),

          // ================================
          // Collaboration Actions
          // ================================
          setCollaborators: (collaborators) =>
            set((state) => {
              state.collaborators = collaborators;
            }),

          addCollaborator: (collaborator) =>
            set((state) => {
              if (!state.collaborators.find((c) => c.id === collaborator.id)) {
                state.collaborators.push(collaborator);
              }
            }),

          removeCollaborator: (collaboratorId) =>
            set((state) => {
              state.collaborators = state.collaborators.filter((c) => c.id !== collaboratorId);
              delete state.cursorPositions[collaboratorId];
            }),

          updateCursorPosition: (userId, position) =>
            set((state) => {
              state.cursorPositions[userId] = position;
            }),

          toggleCollaboration: () =>
            set((state) => {
              state.isCollaborationEnabled = !state.isCollaborationEnabled;
            }),

          // ================================
          // Render Actions
          // ================================
          addRenderJob: (jobData) => {
            const id = `render-${Date.now()}`;
            set((state) => {
              const job: RenderJob = {
                ...jobData,
                id,
                createdAt: new Date(),
              };
              state.renderJobs.unshift(job);
              if (jobData.status === 'processing') {
                state.activeRender = job;
              }
            });
            return id;
          },

          updateRenderJob: (jobId, updates) =>
            set((state) => {
              const job = state.renderJobs.find((j) => j.id === jobId);
              if (job) {
                Object.assign(job, updates);
                if (updates.status === 'completed' || updates.status === 'failed' || updates.status === 'cancelled') {
                  job.completedAt = new Date();
                  if (state.activeRender?.id === jobId) {
                    state.activeRender = null;
                  }
                }
              }
            }),

          cancelRenderJob: (jobId) =>
            set((state) => {
              const job = state.renderJobs.find((j) => j.id === jobId);
              if (job && (job.status === 'pending' || job.status === 'processing' || job.status === 'queued')) {
                job.status = 'cancelled';
                job.completedAt = new Date();
                if (state.activeRender?.id === jobId) {
                  state.activeRender = null;
                }
              }
            }),

          removeRenderJob: (jobId) =>
            set((state) => {
              state.renderJobs = state.renderJobs.filter((j) => j.id !== jobId);
              if (state.activeRender?.id === jobId) {
                state.activeRender = null;
              }
            }),

          setActiveRender: (job) =>
            set((state) => {
              state.activeRender = job;
            }),

          // ================================
          // History Actions
          // ================================
          undo: () => {
            // TODO: Implement with proper history management
            logger.info('Undo action triggered');
          },

          redo: () => {
            // TODO: Implement with proper history management
            logger.info('Redo action triggered');
          },

          // ================================
          // Utility Actions
          // ================================
          reset: () =>
            set(() => ({
              ...initialState,
            })),
        })),
        {
          name: 'unified-studio-storage',
          partialize: (state) => ({
            // Only persist workspace preferences
            activePanel: state.activePanel,
            inspectorTab: state.inspectorTab,
            leftPanelWidth: state.leftPanelWidth,
            rightPanelWidth: state.rightPanelWidth,
            timelineHeight: state.timelineHeight,
            isLeftPanelCollapsed: state.isLeftPanelCollapsed,
            isRightPanelCollapsed: state.isRightPanelCollapsed,
            isTimelineCollapsed: state.isTimelineCollapsed,
            volume: state.volume,
          }),
        }
      )
    ),
    { name: 'UnifiedStudioStore' }
  )
);

// ========================================
// Selector Hooks
// ========================================

export const useStudioProject = () =>
  useUnifiedStudioStore((state) => ({
    projectId: state.projectId,
    projectName: state.projectName,
    projectMetadata: state.projectMetadata,
    isDirty: state.isDirty,
    isLoading: state.isLoading,
    lastSavedAt: state.lastSavedAt,
  }));

export const useStudioWorkspace = () =>
  useUnifiedStudioStore((state) => ({
    activePanel: state.activePanel,
    inspectorTab: state.inspectorTab,
    leftPanelWidth: state.leftPanelWidth,
    rightPanelWidth: state.rightPanelWidth,
    timelineHeight: state.timelineHeight,
    isLeftPanelCollapsed: state.isLeftPanelCollapsed,
    isRightPanelCollapsed: state.isRightPanelCollapsed,
    isTimelineCollapsed: state.isTimelineCollapsed,
  }));

export const useStudioTimeline = () =>
  useUnifiedStudioStore((state) => ({
    tracks: state.tracks,
    clips: state.clips,
    currentTime: state.currentTime,
    duration: state.duration,
    zoom: state.zoom,
    isPlaying: state.isPlaying,
    volume: state.volume,
    scrollX: state.scrollX,
    pixelsPerSecond: state.pixelsPerSecond,
  }));

export const useStudioSelection = () =>
  useUnifiedStudioStore((state) => ({
    selectedClipIds: state.selectedClipIds,
    selectedTrackId: state.selectedTrackId,
    selectedElementIds: state.selectedElementIds,
    selectedClips: state.clips.filter((c) => state.selectedClipIds.includes(c.id)),
    selectedElements: state.canvasElements.filter((e) => state.selectedElementIds.includes(e.id)),
  }));

export const useStudioCanvas = () =>
  useUnifiedStudioStore((state) => ({
    elements: state.canvasElements,
    zoom: state.canvasZoom,
    pan: state.canvasPan,
  }));

export const useStudioAI = () =>
  useUnifiedStudioStore((state) => ({
    suggestions: state.aiSuggestions,
    chatHistory: state.aiChatHistory,
    isProcessing: state.isAIProcessing,
  }));

export const useStudioCollaboration = () =>
  useUnifiedStudioStore((state) => ({
    collaborators: state.collaborators,
    cursorPositions: state.cursorPositions,
    isEnabled: state.isCollaborationEnabled,
  }));

export const useStudioRender = () =>
  useUnifiedStudioStore((state) => ({
    jobs: state.renderJobs,
    activeRender: state.activeRender,
    pendingCount: state.renderJobs.filter((j) => j.status === 'pending' || j.status === 'queued').length,
    processingCount: state.renderJobs.filter((j) => j.status === 'processing').length,
  }));

// ========================================
// Action Hooks
// ========================================

export const useStudioActions = () =>
  useUnifiedStudioStore((state) => ({
    // Project
    setProject: state.setProject,
    clearProject: state.clearProject,
    markDirty: state.markDirty,
    markSaved: state.markSaved,
    setLoading: state.setLoading,

    // Workspace
    setActivePanel: state.setActivePanel,
    setInspectorTab: state.setInspectorTab,
    toggleLeftPanel: state.toggleLeftPanel,
    toggleRightPanel: state.toggleRightPanel,
    toggleTimeline: state.toggleTimeline,

    // Timeline
    addTrack: state.addTrack,
    removeTrack: state.removeTrack,
    updateTrack: state.updateTrack,
    addClip: state.addClip,
    removeClip: state.removeClip,
    updateClip: state.updateClip,
    moveClip: state.moveClip,
    splitClip: state.splitClip,
    trimClip: state.trimClip,
    setCurrentTime: state.setCurrentTime,
    setZoom: state.setZoom,
    togglePlayback: state.togglePlayback,
    setVolume: state.setVolume,

    // Selection
    selectClips: state.selectClips,
    selectTrack: state.selectTrack,
    selectElements: state.selectElements,
    clearClipSelection: state.clearClipSelection,
    clearElementSelection: state.clearElementSelection,

    // Canvas
    addCanvasElement: state.addCanvasElement,
    removeCanvasElement: state.removeCanvasElement,
    updateCanvasElement: state.updateCanvasElement,
    setCanvasZoom: state.setCanvasZoom,
    setCanvasPan: state.setCanvasPan,

    // AI
    addAISuggestion: state.addAISuggestion,
    applySuggestion: state.applySuggestion,
    dismissSuggestion: state.dismissSuggestion,
    addChatMessage: state.addChatMessage,
    setAIProcessing: state.setAIProcessing,

    // Collaboration
    addCollaborator: state.addCollaborator,
    removeCollaborator: state.removeCollaborator,
    updateCursorPosition: state.updateCursorPosition,
    toggleCollaboration: state.toggleCollaboration,

    // Render
    addRenderJob: state.addRenderJob,
    updateRenderJob: state.updateRenderJob,
    cancelRenderJob: state.cancelRenderJob,

    // History
    undo: state.undo,
    redo: state.redo,

    // Utility
    reset: state.reset,
  }));

export default useUnifiedStudioStore;
