/**
 * Studio Pro - Centralized State Management
 *
 * Integrates all Studio Pro features:
 * - Video Project (Timeline, Scenes)
 * - Avatars (Library, Selection, Customization)
 * - Conversations (Multi-avatar dialogue)
 * - Canvas (Elements, Selection)
 * - Playback (Timeline controls)
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type {
  VideoProject,
  Scene,
  Track,
  TimelineElement,
  TimelineState,
  Avatar,
  Conversation,
} from '@/types/video-project';
import type { CanvasElement, CanvasScene } from '@/types/canvas';
import type { ElementProperties } from '@/components/studio-unified/PropertiesPanel';

// ============================================================================
// STATE INTERFACE
// ============================================================================

interface StudioState {
  // Video Project
  videoProject: VideoProject | null;
  currentSceneId: string | null;

  // Timeline
  timelineState: TimelineState;

  // Canvas (legacy compatibility)
  canvasScene: CanvasScene | null;
  selectedCanvasElementIds: string[];

  // Avatars
  avatars: Avatar[];
  selectedAvatarId: string | null;

  // Conversations
  conversations: Conversation[];
  currentConversationId: string | null;

  // Properties Panel
  selectedElement: ElementProperties | null;
  rightPanelTab: 'layers' | 'properties';

  // UI State
  leftPanelTab: 'assets' | 'avatars' | 'text' | 'pptx';
  showConversationBuilder: boolean;
  isPlaying: boolean;
}

interface StudioActions {
  // Video Project Actions
  setVideoProject: (project: VideoProject | null) => void;
  setCurrentSceneId: (sceneId: string | null) => void;
  updateScene: (sceneId: string, updates: Partial<Scene>) => void;

  // Timeline Actions
  setTimelineState: (state: Partial<TimelineState>) => void;
  updateTrack: (sceneId: string, track: Track) => void;
  addTimelineElement: (sceneId: string, trackId: string, element: TimelineElement) => void;
  updateTimelineElement: (elementId: string, updates: Partial<TimelineElement>) => void;
  deleteTimelineElement: (elementId: string) => void;

  // Playback Actions
  play: () => void;
  pause: () => void;
  stop: () => void;
  seek: (time: number) => void;

  // Canvas Actions
  setCanvasScene: (scene: CanvasScene) => void;
  updateCanvasElement: (id: string, updates: Partial<CanvasElement>) => void;
  selectCanvasElements: (ids: string[]) => void;

  // Avatar Actions
  setAvatars: (avatars: Avatar[]) => void;
  selectAvatar: (avatarId: string | null) => void;
  updateAvatar: (avatarId: string, updates: Partial<Avatar>) => void;
  addAvatarToTimeline: (avatarId: string) => void;

  // Conversation Actions
  setConversations: (conversations: Conversation[]) => void;
  addConversation: (conversation: Conversation) => void;
  updateConversation: (conversationId: string, updates: Partial<Conversation>) => void;
  deleteConversation: (conversationId: string) => void;
  setCurrentConversation: (conversationId: string | null) => void;

  // UI Actions
  setRightPanelTab: (tab: 'layers' | 'properties') => void;
  setLeftPanelTab: (tab: 'assets' | 'avatars' | 'text' | 'pptx') => void;
  setShowConversationBuilder: (show: boolean) => void;

  // Helper Actions
  getCurrentScene: () => Scene | null;
  getSelectedAvatar: () => Avatar | null;
  getCurrentConversation: () => Conversation | null;
}

type StudioStore = StudioState & StudioActions;

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: StudioState = {
  videoProject: null,
  currentSceneId: null,
  timelineState: {
    currentTime: 0,
    zoom: 50,
    selectedElements: [],
    isPlaying: false,
    loop: false,
    snapToGrid: true,
    gridSize: 0.5,
  },
  canvasScene: null,
  selectedCanvasElementIds: [],
  avatars: [],
  selectedAvatarId: null,
  conversations: [],
  currentConversationId: null,
  selectedElement: null,
  rightPanelTab: 'layers',
  leftPanelTab: 'assets',
  showConversationBuilder: false,
  isPlaying: false,
};

// ============================================================================
// STORE CREATION
// ============================================================================

export const useStudioStore = create<StudioStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // Video Project Actions
        setVideoProject: (project) => {
          set({ videoProject: project });
          if (project && project.scenes.length > 0 && !get().currentSceneId) {
            set({ currentSceneId: project.scenes[0].id });
          }
        },

        setCurrentSceneId: (sceneId) => {
          set({
            currentSceneId: sceneId,
            timelineState: { ...get().timelineState, currentTime: 0 },
          });
        },

        updateScene: (sceneId, updates) => {
          const project = get().videoProject;
          if (!project) return;

          set({
            videoProject: {
              ...project,
              scenes: project.scenes.map((scene) =>
                scene.id === sceneId ? { ...scene, ...updates } : scene,
              ),
            },
          });
        },

        // Timeline Actions
        setTimelineState: (state) => {
          set({
            timelineState: { ...get().timelineState, ...state },
            isPlaying: state.isPlaying ?? get().isPlaying,
          });
        },

        updateTrack: (sceneId, track) => {
          const project = get().videoProject;
          if (!project) return;

          set({
            videoProject: {
              ...project,
              scenes: project.scenes.map((scene) =>
                scene.id === sceneId
                  ? {
                      ...scene,
                      tracks: scene.tracks.map((t) => (t.id === track.id ? track : t)),
                    }
                  : scene,
              ),
            },
          });
        },

        addTimelineElement: (sceneId, trackId, element) => {
          const project = get().videoProject;
          if (!project) return;

          set({
            videoProject: {
              ...project,
              scenes: project.scenes.map((scene) =>
                scene.id === sceneId
                  ? {
                      ...scene,
                      tracks: scene.tracks.map((track) =>
                        track.id === trackId
                          ? {
                              ...track,
                              elements: [...track.elements, element],
                            }
                          : track,
                      ),
                    }
                  : scene,
              ),
            },
          });
        },

        updateTimelineElement: (elementId, updates) => {
          const project = get().videoProject;
          if (!project) return;

          set({
            videoProject: {
              ...project,
              scenes: project.scenes.map((scene) => ({
                ...scene,
                tracks: scene.tracks.map((track) => ({
                  ...track,
                  elements: track.elements.map((el) =>
                    el.id === elementId ? { ...el, ...updates } : el,
                  ),
                })),
              })),
            },
          });
        },

        deleteTimelineElement: (elementId) => {
          const project = get().videoProject;
          if (!project) return;

          set({
            videoProject: {
              ...project,
              scenes: project.scenes.map((scene) => ({
                ...scene,
                tracks: scene.tracks.map((track) => ({
                  ...track,
                  elements: track.elements.filter((el) => el.id !== elementId),
                })),
              })),
            },
          });
        },

        // Playback Actions
        play: () => {
          set({
            isPlaying: true,
            timelineState: { ...get().timelineState, isPlaying: true },
          });
        },

        pause: () => {
          set({
            isPlaying: false,
            timelineState: { ...get().timelineState, isPlaying: false },
          });
        },

        stop: () => {
          set({
            isPlaying: false,
            timelineState: {
              ...get().timelineState,
              isPlaying: false,
              currentTime: 0,
            },
          });
        },

        seek: (time) => {
          set({
            timelineState: { ...get().timelineState, currentTime: time },
          });
        },

        // Canvas Actions
        setCanvasScene: (scene) => set({ canvasScene: scene }),

        updateCanvasElement: (id, updates) => {
          const scene = get().canvasScene;
          if (!scene) return;

          set({
            canvasScene: {
              ...scene,
              elements: scene.elements.map((el) => (el.id === id ? { ...el, ...updates } : el)),
            },
          });
        },

        selectCanvasElements: (ids) => set({ selectedCanvasElementIds: ids }),

        // Avatar Actions
        setAvatars: (avatars) => set({ avatars }),

        selectAvatar: (avatarId) => set({ selectedAvatarId: avatarId }),

        updateAvatar: (avatarId, updates) => {
          set({
            avatars: get().avatars.map((avatar) =>
              avatar.id === avatarId ? { ...avatar, ...updates } : avatar,
            ),
          });
        },

        addAvatarToTimeline: (avatarId) => {
          const { currentSceneId, timelineState, videoProject } = get();
          if (!currentSceneId || !videoProject) return;

          const scene = videoProject.scenes.find((s) => s.id === currentSceneId);
          if (!scene) return;

          // Find or create avatar track
          let avatarTrack = scene.tracks.find((t) => t.type === 'avatar');

          if (!avatarTrack) {
            avatarTrack = {
              id: `track-avatar-${Date.now()}`,
              type: 'avatar',
              name: 'Avatars',
              elements: [],
              locked: false,
              visible: true,
              color: '#3b82f6',
            };
          }

          const newElement: TimelineElement = {
            id: `element-${Date.now()}`,
            trackId: avatarTrack.id,
            sceneId: currentSceneId,
            startTime: timelineState.currentTime,
            duration: 5,
            endTime: timelineState.currentTime + 5,
            type: 'avatar',
            content: {
              avatarId,
              position: { x: 960, y: 540 },
              scale: 1,
              rotation: 0,
              opacity: 1,
            },
            animations: {},
          };

          get().addTimelineElement(currentSceneId, avatarTrack.id, newElement);
        },

        // Conversation Actions
        setConversations: (conversations) => set({ conversations }),

        addConversation: (conversation) => {
          set({
            conversations: [...get().conversations, conversation],
          });
        },

        updateConversation: (conversationId, updates) => {
          set({
            conversations: get().conversations.map((conv) =>
              conv.id === conversationId ? { ...conv, ...updates } : conv,
            ),
          });
        },

        deleteConversation: (conversationId) => {
          set({
            conversations: get().conversations.filter((conv) => conv.id !== conversationId),
          });
        },

        setCurrentConversation: (conversationId) => {
          set({ currentConversationId: conversationId });
        },

        // UI Actions
        setRightPanelTab: (tab) => set({ rightPanelTab: tab }),
        setLeftPanelTab: (tab) => set({ leftPanelTab: tab }),
        setShowConversationBuilder: (show) => set({ showConversationBuilder: show }),

        // Helper Actions
        getCurrentScene: () => {
          const { videoProject, currentSceneId } = get();
          if (!videoProject || !currentSceneId) return null;
          return videoProject.scenes.find((s) => s.id === currentSceneId) || null;
        },

        getSelectedAvatar: () => {
          const { avatars, selectedAvatarId } = get();
          if (!selectedAvatarId) return null;
          return avatars.find((a) => a.id === selectedAvatarId) || null;
        },

        getCurrentConversation: () => {
          const { conversations, currentConversationId } = get();
          if (!currentConversationId) return null;
          return conversations.find((c) => c.id === currentConversationId) || null;
        },
      }),
      {
        name: 'studio-pro-storage',
        partialize: (state) => ({
          // Persist only essential state
          videoProject: state.videoProject,
          avatars: state.avatars,
          conversations: state.conversations,
          leftPanelTab: state.leftPanelTab,
          rightPanelTab: state.rightPanelTab,
        }),
      },
    ),
  ),
);

// ============================================================================
// SELECTORS (for performance optimization)
// ============================================================================

export const useCurrentScene = () => useStudioStore((state) => state.getCurrentScene());
export const useSelectedAvatar = () => useStudioStore((state) => state.getSelectedAvatar());
export const useCurrentConversation = () =>
  useStudioStore((state) => state.getCurrentConversation());
export const useIsPlaying = () => useStudioStore((state) => state.isPlaying);
export const useTimelineState = () => useStudioStore((state) => state.timelineState);
