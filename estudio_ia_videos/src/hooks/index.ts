/**
 * 🎬 Studio Hooks - Barrel Export
 * Re-exporta todos os hooks do Studio para facilitar imports
 */

// Studio convenience hooks
export {
  useStudioSelection,
  useStudioTimeline,
  useStudioCanvas,
  useStudioAI,
  useStudioCollaboration,
  useStudioRenderQueue,
  useStudioProject,
  useStudioHistory,
  useStudioWorkspace,
} from './use-studio';

// Auto scene detection
export {
  useAutoSceneDetection,
  type DetectedScene,
  type SceneDetectionConfig,
  type SceneDetectionResult,
  type SceneDetectionProgress,
} from './use-auto-scene-detection';

// Social video publishing
export {
  useSocialPublish,
  type Platform,
  type PlatformAccount,
  type VideoMetadata,
  type PublishProgress,
  type PublishResult,
} from './use-social-publish';

// API Data hooks
export {
  useAnalyticsOverview,
  useRenderJobsAnalytics,
  useUserProfile,
  useUserPreferences,
  useAssets,
} from './use-api-data';

// Media Query hooks
export {
  useMediaQuery,
  useBreakpoint,
  useBreakpointDown,
  useIsMobile,
  useIsTablet,
  useIsDesktop,
  useCurrentBreakpoint,
  useResponsiveValue,
  usePrefersDarkMode,
  usePrefersReducedMotion,
  useIsTouchDevice,
  useWindowSize,
  useOrientation,
  BREAKPOINTS,
} from './use-media-query';

// Touch Gestures hooks
export {
  useTouchGestures,
  useTimelineScrub,
  usePinchZoom,
  useSwipeNavigation,
  type Point,
  type TouchState,
  type SwipeDirection,
  type PinchState,
  type LongPressState,
  type DragState,
  type GestureConfig,
  type GestureHandlers,
} from './use-touch-gestures';

// Offline Support hooks
export {
  useOnlineStatus,
  useServiceWorker,
  useOfflineStorage,
  useOfflineProjects,
  useBackgroundSync,
  useStorageEstimate,
  type OfflineStatus,
  type ServiceWorkerStatus,
  type StorageEstimate,
  type SyncQueueItem,
  type OfflineProject,
} from './use-offline';

// Version History hooks
export {
  useVersionHistory,
  type ProjectVersion,
  type ProjectSnapshot,
  type SlideSnapshot,
  type ElementSnapshot,
  type VersionDiff,
  type DiffItem,
  type VersionHistoryState,
  type UseVersionHistoryOptions,
} from './use-version-history';

// PPT to Video conversion hooks
export {
  usePPTToVideo,
  type PPTSlide,
  type PPTParseResult,
  type PPTRenderParams,
  type RenderJob,
} from './use-ppt-to-video';

// AI Avatars hooks
export {
  useAIAvatars,
  type Avatar,
  type AvatarGenerationParams,
  type GeneratedAvatarVideo,
} from './use-ai-avatars';

// Voice Studio hooks
export {
  useVoiceStudio,
  type Voice,
  type VoiceGenerationParams,
  type VoiceCloneParams,
} from './use-voice-studio';

// Export Pro hooks
export {
  useExportPro,
  type SCORMVersion,
  type ExportFormat,
  type ExportResolution,
  type SCORMExportParams,
  type VideoExportParams,
  type ExportJob,
} from './use-export-pro';