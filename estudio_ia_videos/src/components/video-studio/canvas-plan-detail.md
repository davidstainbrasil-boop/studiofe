# Canvas Tooling Implementation Plan

## Architecture Check
- `VideoStudio.tsx` is the layout container.
- `CanvasEditor.tsx` encapsulates Fabric.js logic.
- `toolbar/EditingTools.tsx` will contain buttons.

## Communication Pattern
We will use a **Canvas Context** (or simple Props if hierarchy allows) to pass "add element" functions from `CanvasEditor` up to `VideoStudio` and down to `EditingTools`.
Actually, considering `CanvasEditor` initializes the canvas, it's cleaner if `CanvasEditor` exposes an imperative handle (via `forwardRef` + `useImperativeHandle`) or uses a shared `useCanvas` store.

**Proposed Approach**: `VideoStudio` passes a `ref` to `CanvasEditor`. `CanvasEditor` populates this ref with API methods (`addText`, `addRect`). `VideoStudio` passes these methods to `EditingTools`.

### 1. Create `EditingTools.tsx`
- Buttons for: Text, Rectangle, Circle, Image.
- Props: `onAddText`, `onAddShape`, etc.

### 2. Update `CanvasEditor.tsx`
- Implement `addText()`, `addShape()`.
- Expose these via `useImperativeHandle` or a callback prop `onReady(api)`.

### 3. Update `VideoStudio.tsx`
- Manage state/ref to bridge Toolbar and Canvas.

## File Changes
1.  `[NEW] app/components/video-studio/toolbar/EditingTools.tsx`
2.  `[MODIFY] app/components/video-studio/canvas/CanvasEditor.tsx`
3.  `[MODIFY] app/components/video-studio/VideoStudio.tsx`
