/**
 * 🎬 Studio Hooks
 * Hooks de conveniência para o Unified Video Studio
 */

import { useCallback, useMemo } from 'react';
import { useUnifiedStudioStore } from '@/lib/stores/unified-studio-store';
import type { TimelineClip, TimelineTrack, CanvasElement, RenderJob } from '@/lib/stores/unified-studio-store';

// ============================================================================
// Selection Hooks
// ============================================================================

/**
 * Hook para gerenciar seleção de clips na timeline
 */
export function useStudioSelection() {
  const selectedClipIds = useUnifiedStudioStore((state) => state.selectedClipIds);
  const selectedTrackId = useUnifiedStudioStore((state) => state.selectedTrackId);
  const selectedElementIds = useUnifiedStudioStore((state) => state.selectedElementIds);
  const clips = useUnifiedStudioStore((state) => state.clips);
  const tracks = useUnifiedStudioStore((state) => state.tracks);
  const canvasElements = useUnifiedStudioStore((state) => state.canvasElements);

  const selectClips = useUnifiedStudioStore((state) => state.selectClips);
  const addToClipSelection = useUnifiedStudioStore((state) => state.addToClipSelection);
  const removeFromClipSelection = useUnifiedStudioStore((state) => state.removeFromClipSelection);
  const clearClipSelection = useUnifiedStudioStore((state) => state.clearClipSelection);
  const selectTrack = useUnifiedStudioStore((state) => state.selectTrack);
  const selectElements = useUnifiedStudioStore((state) => state.selectElements);
  const clearElementSelection = useUnifiedStudioStore((state) => state.clearElementSelection);

  const selectedClips = useMemo(
    () => clips.filter((clip) => selectedClipIds.includes(clip.id)),
    [clips, selectedClipIds]
  );

  const selectedTrack = useMemo(
    () => tracks.find((track) => track.id === selectedTrackId) || null,
    [tracks, selectedTrackId]
  );

  const selectedElements = useMemo(
    () => canvasElements.filter((el) => selectedElementIds.includes(el.id)),
    [canvasElements, selectedElementIds]
  );

  const hasSelection = selectedClipIds.length > 0 || selectedElementIds.length > 0;
  const isMultiSelect = selectedClipIds.length > 1 || selectedElementIds.length > 1;

  return {
    // State
    selectedClipIds,
    selectedTrackId,
    selectedElementIds,
    selectedClips,
    selectedTrack,
    selectedElements,
    hasSelection,
    isMultiSelect,
    // Actions
    selectClips,
    addToClipSelection,
    removeFromClipSelection,
    clearClipSelection,
    selectTrack,
    selectElements,
    clearElementSelection,
  };
}

// ============================================================================
// Timeline Hooks
// ============================================================================

/**
 * Hook para gerenciar a timeline
 */
export function useStudioTimeline() {
  const tracks = useUnifiedStudioStore((state) => state.tracks);
  const clips = useUnifiedStudioStore((state) => state.clips);
  const currentTime = useUnifiedStudioStore((state) => state.currentTime);
  const duration = useUnifiedStudioStore((state) => state.duration);
  const zoom = useUnifiedStudioStore((state) => state.zoom);
  const isPlaying = useUnifiedStudioStore((state) => state.isPlaying);
  const volume = useUnifiedStudioStore((state) => state.volume);
  const scrollX = useUnifiedStudioStore((state) => state.scrollX);
  const pixelsPerSecond = useUnifiedStudioStore((state) => state.pixelsPerSecond);

  const addTrack = useUnifiedStudioStore((state) => state.addTrack);
  const removeTrack = useUnifiedStudioStore((state) => state.removeTrack);
  const updateTrack = useUnifiedStudioStore((state) => state.updateTrack);
  const reorderTracks = useUnifiedStudioStore((state) => state.reorderTracks);
  const addClip = useUnifiedStudioStore((state) => state.addClip);
  const removeClip = useUnifiedStudioStore((state) => state.removeClip);
  const updateClip = useUnifiedStudioStore((state) => state.updateClip);
  const moveClip = useUnifiedStudioStore((state) => state.moveClip);
  const splitClip = useUnifiedStudioStore((state) => state.splitClip);
  const trimClip = useUnifiedStudioStore((state) => state.trimClip);
  const setCurrentTime = useUnifiedStudioStore((state) => state.setCurrentTime);
  const setDuration = useUnifiedStudioStore((state) => state.setDuration);
  const setZoom = useUnifiedStudioStore((state) => state.setZoom);
  const setIsPlaying = useUnifiedStudioStore((state) => state.setIsPlaying);
  const togglePlayback = useUnifiedStudioStore((state) => state.togglePlayback);
  const setVolume = useUnifiedStudioStore((state) => state.setVolume);
  const setScrollX = useUnifiedStudioStore((state) => state.setScrollX);

  const getClipsAtTime = useCallback(
    (time: number) => clips.filter(
      (clip) => time >= clip.startTime && time < clip.startTime + clip.duration
    ),
    [clips]
  );

  const getClipsInTrack = useCallback(
    (trackId: string) => clips.filter((clip) => clip.trackId === trackId),
    [clips]
  );

  const totalDuration = useMemo(() => {
    if (clips.length === 0) return 0;
    return Math.max(...clips.map((clip) => clip.startTime + clip.duration));
  }, [clips]);

  return {
    // State
    tracks,
    clips,
    currentTime,
    duration,
    zoom,
    isPlaying,
    volume,
    scrollX,
    pixelsPerSecond,
    totalDuration,
    // Actions
    addTrack,
    removeTrack,
    updateTrack,
    reorderTracks,
    addClip,
    removeClip,
    updateClip,
    moveClip,
    splitClip,
    trimClip,
    setCurrentTime,
    setDuration,
    setZoom,
    setIsPlaying,
    togglePlayback,
    setVolume,
    setScrollX,
    // Helpers
    getClipsAtTime,
    getClipsInTrack,
  };
}

// ============================================================================
// Canvas Hooks
// ============================================================================

/**
 * Hook para gerenciar o canvas
 */
export function useStudioCanvas() {
  const canvasElements = useUnifiedStudioStore((state) => state.canvasElements);
  const canvasZoom = useUnifiedStudioStore((state) => state.canvasZoom);
  const canvasPan = useUnifiedStudioStore((state) => state.canvasPan);

  const addCanvasElement = useUnifiedStudioStore((state) => state.addCanvasElement);
  const removeCanvasElement = useUnifiedStudioStore((state) => state.removeCanvasElement);
  const updateCanvasElement = useUnifiedStudioStore((state) => state.updateCanvasElement);
  const setCanvasZoom = useUnifiedStudioStore((state) => state.setCanvasZoom);
  const setCanvasPan = useUnifiedStudioStore((state) => state.setCanvasPan);

  const getElementsByType = useCallback(
    (type: CanvasElement['type']) => canvasElements.filter((el) => el.type === type),
    [canvasElements]
  );

  const getVisibleElements = useCallback(
    () => canvasElements.filter((el) => el.visible),
    [canvasElements]
  );

  return {
    // State
    canvasElements,
    canvasZoom,
    canvasPan,
    // Actions
    addCanvasElement,
    removeCanvasElement,
    updateCanvasElement,
    setCanvasZoom,
    setCanvasPan,
    // Helpers
    getElementsByType,
    getVisibleElements,
  };
}

// ============================================================================
// AI Assistant Hooks
// ============================================================================

/**
 * Hook para gerenciar o assistente de IA
 */
export function useStudioAI() {
  const aiSuggestions = useUnifiedStudioStore((state) => state.aiSuggestions);
  const aiChatHistory = useUnifiedStudioStore((state) => state.aiChatHistory);
  const isAIProcessing = useUnifiedStudioStore((state) => state.isAIProcessing);

  const addAISuggestion = useUnifiedStudioStore((state) => state.addAISuggestion);
  const applySuggestion = useUnifiedStudioStore((state) => state.applySuggestion);
  const dismissSuggestion = useUnifiedStudioStore((state) => state.dismissSuggestion);
  const addChatMessage = useUnifiedStudioStore((state) => state.addChatMessage);
  const clearChatHistory = useUnifiedStudioStore((state) => state.clearChatHistory);
  const setAIProcessing = useUnifiedStudioStore((state) => state.setAIProcessing);

  const pendingSuggestions = useMemo(
    () => aiSuggestions.filter((s) => !s.applied),
    [aiSuggestions]
  );

  const sendMessage = useCallback(
    async (content: string) => {
      addChatMessage({ role: 'user', content });
      setAIProcessing(true);

      try {
        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: content }),
        });

        if (!response.ok) throw new Error('AI request failed');

        const data = await response.json();
        addChatMessage({ role: 'assistant', content: data.message });

        if (data.suggestions) {
          data.suggestions.forEach((s: any) => addAISuggestion(s));
        }
      } catch (error) {
        addChatMessage({
          role: 'assistant',
          content: 'Desculpe, ocorreu um erro. Por favor, tente novamente.',
        });
      } finally {
        setAIProcessing(false);
      }
    },
    [addChatMessage, setAIProcessing, addAISuggestion]
  );

  return {
    // State
    aiSuggestions,
    aiChatHistory,
    isAIProcessing,
    pendingSuggestions,
    // Actions
    addAISuggestion,
    applySuggestion,
    dismissSuggestion,
    addChatMessage,
    clearChatHistory,
    setAIProcessing,
    sendMessage,
  };
}

// ============================================================================
// Collaboration Hooks
// ============================================================================

/**
 * Hook para gerenciar colaboração em tempo real
 */
export function useStudioCollaboration() {
  const collaborators = useUnifiedStudioStore((state) => state.collaborators);
  const cursorPositions = useUnifiedStudioStore((state) => state.cursorPositions);
  const isCollaborationEnabled = useUnifiedStudioStore((state) => state.isCollaborationEnabled);

  const setCollaborators = useUnifiedStudioStore((state) => state.setCollaborators);
  const addCollaborator = useUnifiedStudioStore((state) => state.addCollaborator);
  const removeCollaborator = useUnifiedStudioStore((state) => state.removeCollaborator);
  const updateCursorPosition = useUnifiedStudioStore((state) => state.updateCursorPosition);
  const toggleCollaboration = useUnifiedStudioStore((state) => state.toggleCollaboration);

  const onlineCollaborators = useMemo(
    () => collaborators.filter((c) => c.isOnline),
    [collaborators]
  );

  return {
    // State
    collaborators,
    cursorPositions,
    isCollaborationEnabled,
    onlineCollaborators,
    // Actions
    setCollaborators,
    addCollaborator,
    removeCollaborator,
    updateCursorPosition,
    toggleCollaboration,
  };
}

// ============================================================================
// Render Queue Hooks
// ============================================================================

/**
 * Hook para gerenciar fila de renderização
 */
export function useStudioRenderQueue() {
  const renderJobs = useUnifiedStudioStore((state) => state.renderJobs);
  const activeRender = useUnifiedStudioStore((state) => state.activeRender);

  const addRenderJob = useUnifiedStudioStore((state) => state.addRenderJob);
  const updateRenderJob = useUnifiedStudioStore((state) => state.updateRenderJob);
  const cancelRenderJob = useUnifiedStudioStore((state) => state.cancelRenderJob);
  const removeRenderJob = useUnifiedStudioStore((state) => state.removeRenderJob);
  const setActiveRender = useUnifiedStudioStore((state) => state.setActiveRender);

  const queuedJobs = useMemo(
    () => renderJobs.filter((j) => j.status === 'queued' || j.status === 'pending'),
    [renderJobs]
  );

  const completedJobs = useMemo(
    () => renderJobs.filter((j) => j.status === 'completed'),
    [renderJobs]
  );

  const failedJobs = useMemo(
    () => renderJobs.filter((j) => j.status === 'failed'),
    [renderJobs]
  );

  const startRender = useCallback(
    async (projectId: string, settings: RenderJob['settings']) => {
      const jobId = addRenderJob({
        projectId,
        name: `Render ${new Date().toLocaleString()}`,
        status: 'pending',
        progress: 0,
        settings,
      });

      try {
        const response = await fetch('/api/render/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId, ...settings }),
        });

        if (!response.ok) throw new Error('Render start failed');

        const data = await response.json();
        updateRenderJob(jobId, { status: 'queued' });
        return data.jobId;
      } catch (error) {
        updateRenderJob(jobId, { status: 'failed', error: 'Failed to start render' });
        throw error;
      }
    },
    [addRenderJob, updateRenderJob]
  );

  return {
    // State
    renderJobs,
    activeRender,
    queuedJobs,
    completedJobs,
    failedJobs,
    // Actions
    addRenderJob,
    updateRenderJob,
    cancelRenderJob,
    removeRenderJob,
    setActiveRender,
    startRender,
  };
}

// ============================================================================
// Project Hooks
// ============================================================================

/**
 * Hook para gerenciar projeto
 */
export function useStudioProject() {
  const projectId = useUnifiedStudioStore((state) => state.projectId);
  const projectName = useUnifiedStudioStore((state) => state.projectName);
  const projectMetadata = useUnifiedStudioStore((state) => state.projectMetadata);
  const isDirty = useUnifiedStudioStore((state) => state.isDirty);
  const isLoading = useUnifiedStudioStore((state) => state.isLoading);
  const lastSavedAt = useUnifiedStudioStore((state) => state.lastSavedAt);

  const setProject = useUnifiedStudioStore((state) => state.setProject);
  const clearProject = useUnifiedStudioStore((state) => state.clearProject);
  const markDirty = useUnifiedStudioStore((state) => state.markDirty);
  const markSaved = useUnifiedStudioStore((state) => state.markSaved);
  const setLoading = useUnifiedStudioStore((state) => state.setLoading);

  const saveProject = useCallback(async () => {
    if (!projectId) return;

    setLoading(true);
    try {
      const state = useUnifiedStudioStore.getState();
      const response = await fetch(`/api/studio/state/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tracks: state.tracks,
          clips: state.clips,
          canvasElements: state.canvasElements,
          duration: state.duration,
        }),
      });

      if (!response.ok) throw new Error('Save failed');
      markSaved();
    } finally {
      setLoading(false);
    }
  }, [projectId, setLoading, markSaved]);

  const loadProject = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/studio/state/${id}`);
      if (!response.ok) throw new Error('Load failed');

      const data = await response.json();
      setProject(id, data.name, data.metadata);
      // Hydrate other state from response
    } finally {
      setLoading(false);
    }
  }, [setLoading, setProject]);

  return {
    // State
    projectId,
    projectName,
    projectMetadata,
    isDirty,
    isLoading,
    lastSavedAt,
    // Actions
    setProject,
    clearProject,
    markDirty,
    markSaved,
    setLoading,
    saveProject,
    loadProject,
  };
}

// ============================================================================
// History Hooks
// ============================================================================

/**
 * Hook para gerenciar histórico (undo/redo)
 */
export function useStudioHistory() {
  const canUndo = useUnifiedStudioStore((state) => state.canUndo);
  const canRedo = useUnifiedStudioStore((state) => state.canRedo);
  const undo = useUnifiedStudioStore((state) => state.undo);
  const redo = useUnifiedStudioStore((state) => state.redo);

  return {
    canUndo,
    canRedo,
    undo,
    redo,
  };
}

// ============================================================================
// Workspace Hooks
// ============================================================================

/**
 * Hook para gerenciar workspace/layout
 */
export function useStudioWorkspace() {
  const activePanel = useUnifiedStudioStore((state) => state.activePanel);
  const inspectorTab = useUnifiedStudioStore((state) => state.inspectorTab);
  const leftPanelWidth = useUnifiedStudioStore((state) => state.leftPanelWidth);
  const rightPanelWidth = useUnifiedStudioStore((state) => state.rightPanelWidth);
  const timelineHeight = useUnifiedStudioStore((state) => state.timelineHeight);
  const isLeftPanelCollapsed = useUnifiedStudioStore((state) => state.isLeftPanelCollapsed);
  const isRightPanelCollapsed = useUnifiedStudioStore((state) => state.isRightPanelCollapsed);
  const isTimelineCollapsed = useUnifiedStudioStore((state) => state.isTimelineCollapsed);

  const setActivePanel = useUnifiedStudioStore((state) => state.setActivePanel);
  const setInspectorTab = useUnifiedStudioStore((state) => state.setInspectorTab);
  const setLeftPanelWidth = useUnifiedStudioStore((state) => state.setLeftPanelWidth);
  const setRightPanelWidth = useUnifiedStudioStore((state) => state.setRightPanelWidth);
  const setTimelineHeight = useUnifiedStudioStore((state) => state.setTimelineHeight);
  const toggleLeftPanel = useUnifiedStudioStore((state) => state.toggleLeftPanel);
  const toggleRightPanel = useUnifiedStudioStore((state) => state.toggleRightPanel);
  const toggleTimeline = useUnifiedStudioStore((state) => state.toggleTimeline);

  return {
    // State
    activePanel,
    inspectorTab,
    leftPanelWidth,
    rightPanelWidth,
    timelineHeight,
    isLeftPanelCollapsed,
    isRightPanelCollapsed,
    isTimelineCollapsed,
    // Actions
    setActivePanel,
    setInspectorTab,
    setLeftPanelWidth,
    setRightPanelWidth,
    setTimelineHeight,
    toggleLeftPanel,
    toggleRightPanel,
    toggleTimeline,
  };
}
