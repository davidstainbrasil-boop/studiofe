
/**
 * PPTX Components - Export all PPTX UI components
 *
 * Componente principal de upload: PPTXUploadComponent
 * Outros uploaders foram arquivados em _archive/components-pptx-legacy/
 *
 * Uso:
 * ```tsx
 * import { PPTXUploadComponent } from '@components/pptx'
 * // ou
 * import PPTXUploadComponent, { ProcessingResult } from '@components/pptx/PPTXUploadComponent'
 * ```
 */

// Componente principal de upload
export { default as PPTXUploadComponent } from './PPTXUploadComponent';
export type { ProcessingResult, PPTXUploadComponentProps } from './PPTXUploadComponent';

// Export principal do Studio
export { ProfessionalPPTXStudio as PPTXStudio } from './professional-pptx-studio';

// Scene Canvas Editor - Editable scene system
export { SceneCanvasEditor, default as SceneCanvasEditorDefault } from './scene-canvas-editor';
export type { SceneData, SceneElement } from './scene-canvas-editor';

// Media Library Panel - Draggable media assets
export { MediaLibraryPanel } from './media-library-panel';

// Slides Panel - Scene management
export { SlidesPanel } from './slides-panel';

// Componentes da Timeline
export * from './slide-timeline';
