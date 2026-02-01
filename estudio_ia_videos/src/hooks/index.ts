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
