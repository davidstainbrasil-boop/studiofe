/**
 * 📦 Studio Unified - Barrel Export
 * Exports all unified studio components
 */

// Main Components
export { UnifiedVideoStudio } from './UnifiedVideoStudio';
export { UnifiedAssetBrowser } from './UnifiedAssetBrowser';
export { AIAssistantSidebar } from './AIAssistantSidebar';

// Asset Browser Tabs
export { MediaTab } from './asset-browser/MediaTab';
export { AvatarsTab } from './asset-browser/AvatarsTab';
export { TemplatesTab } from './asset-browser/TemplatesTab';
export { StockTab } from './asset-browser/StockTab';
export { AIGeneratorTab } from './asset-browser/AIGeneratorTab';
export { EffectsTab } from './asset-browser/EffectsTab';

// Inspector Components
export { UnifiedInspector } from './inspector/UnifiedInspector';
export { AvatarInspector } from './inspector/AvatarInspector';

// Canvas Components
export { UnifiedCanvas } from './canvas/UnifiedCanvas';

// Timeline Components
export { AudioMixer } from './timeline/AudioMixer';
export { KeyframeEditor } from './timeline/KeyframeEditor';

// Modals
export { EnhancementToolsModal } from './modals/EnhancementToolsModal';
export { SceneDetectionModal } from './modals/SceneDetectionModal';

// Export Components
export { ExportModal } from './export/ExportModal';
export { RenderQueuePanel } from './export/RenderQueuePanel';

// Collaboration Components
export { CollaborationChat } from './collaboration/CollaborationChat';
export { PresenceIndicator, CursorOverlay } from './collaboration/PresenceIndicator';
export { 
  ElementLockProvider,
  useElementLock,
  LockableElement,
  LockIndicator,
  LockBadge,
  LocksList,
} from './collaboration/ElementLockSystem';

// Types
export type { AssetItem } from './UnifiedAssetBrowser';
