/**
 * 🎬 Editor Components
 * 
 * All video editor related components including:
 * - Canvas editors (animaker, wysiwyg)
 * - Timeline editors (pro, advanced, real)
 * - Panels (properties, layers, elements)
 * - Responsive layouts
 * - Avatar and voice integrations
 */

// Core Editors
export { CanvasEditor } from './canvas-editor'
export { CanvasEditorV2 } from './canvas-editor-v2'
export { WYSIWYGEditor } from './wysiwyg-editor'

// Animaker Editors
export { AnimakerCanvasEditor } from './animaker-canvas-editor'
export { AnimakerEditorV2 } from './animaker-editor-v2'
export { AnimakerTimelineMulticam } from './animaker-timeline-multicam'

// Timeline Editors
export { TimelineEditor } from './timeline-editor'
export { TimelineEditorV2 } from './timeline-editor-v2'
export { default as TimelineEditorPro } from './timeline-editor-pro'
export { default as TimelineEditorReal } from './timeline-editor-real'
export { TimelineAdvanced } from './timeline-advanced'
export { TimelinePanel } from './timeline-panel'

// Panels
export { PropertiesPanel } from './properties-panel'
export { LayersPanel } from './layers-panel'
export { ElementPanel } from './element-panel'
export { SceneManager } from './scene-manager'

// Avatar & Voice
export { AvatarPreview } from './avatar-preview'
export { AIVoiceAvatarPanel } from './ai-voice-avatar-panel'
export { default as AvatarTimelineIntegration } from './AvatarTimelineIntegration'
export { HeyGenVoiceSelector } from './heygen-voice-selector'
export { HeyGenCreditsWidget } from './heygen-credits-widget'

// Export & Render
export { ExportDialog } from './export-dialog'
export { ExportHistoryDialog } from './export-history-dialog'
export { RenderProgressDialog } from './render-progress-dialog'

// Transitions
export * from './slide-transitions'

// Preview
export { UnifiedPreviewPlayer } from './unified-preview-player'

// Responsive Layout
export { ResponsiveEditorLayout } from './responsive-editor-layout'
export type { 
  ResponsiveEditorLayoutProps, 
  EditorPanel, 
  PanelConfig 
} from './responsive-editor-layout'
