# Undo/Redo System Implementation

## Overview

A complete undo/redo system has been implemented for the Studio Pro canvas editor, allowing users to revert and restore changes made to canvas elements.

## Features

### Core Functionality
- **Undo (Ctrl+Z)**: Revert to previous canvas state
- **Redo (Ctrl+Y or Ctrl+Shift+Z)**: Restore undone changes
- **History Limit**: Maximum 50 states stored (configurable)
- **Smart Future Clearing**: Making a new change clears all redo history
- **Visual Feedback**: Status bar shows undo/redo availability

### Supported Operations

All canvas operations are now tracked in history:

1. **Add Element**: Adding avatars, text, images, shapes
2. **Delete Element**: Removing elements (Delete/Backspace key)
3. **Move Element**: Arrow keys (1px) or Shift+Arrow (10px)
4. **Transform Element**: Drag, resize, rotate via Konva transformer
5. **Duplicate Element**: Ctrl+D creates copy
6. **Modify Properties**: Any property change via Properties Panel

## Implementation Details

### useHistory Hook

**Location**: `src/hooks/useHistory.ts`

Generic React hook for managing state history with undo/redo capability.

```typescript
const {
  state,          // Current state
  setState,       // Set new state (records in history)
  undo,          // Undo to previous state
  redo,          // Redo to next state
  canUndo,       // Boolean: can undo?
  canRedo,       // Boolean: can redo?
  clear,         // Clear all history
  historySize    // Total history entries
} = useHistory<T>({
  initialState: {...},
  maxHistorySize: 50  // Optional, default 50
})
```

### Architecture

```
┌─────────────────────────────────────────────────┐
│           useHistory Hook                       │
├─────────────────────────────────────────────────┤
│                                                 │
│  past: T[]    ─────▶  [state1, state2, state3] │
│  present: T   ─────▶  state4                    │
│  future: T[]  ─────▶  []                        │
│                                                 │
└─────────────────────────────────────────────────┘
                       │
                       │ setState()
                       ▼
┌─────────────────────────────────────────────────┐
│  1. Push present to past                        │
│  2. Set new value as present                    │
│  3. Clear future array                          │
│  4. Limit past to maxHistorySize                │
└─────────────────────────────────────────────────┘
                       │
                       │ undo()
                       ▼
┌─────────────────────────────────────────────────┐
│  1. Move present to future (front)              │
│  2. Pop last from past                          │
│  3. Set popped value as present                 │
└─────────────────────────────────────────────────┘
                       │
                       │ redo()
                       ▼
┌─────────────────────────────────────────────────┐
│  1. Push present to past                        │
│  2. Shift first from future                     │
│  3. Set shifted value as present                │
└─────────────────────────────────────────────────┘
```

### Integration with Studio Pro

**Location**: `src/app/studio-pro/page.tsx`

Canvas scene state is now managed by `useHistory`:

```typescript
// Before (no history)
const [canvasScene, setCanvasScene] = useState<CanvasScene>({
  id: 'default',
  elements: [],
  // ...
})

// After (with history)
const {
  state: canvasScene,
  setState: setCanvasScene,
  undo,
  redo,
  canUndo,
  canRedo
} = useHistory<CanvasScene>({
  initialState: {
    id: 'default',
    elements: [],
    // ...
  },
  maxHistorySize: 50
})
```

All existing `setCanvasScene()` calls automatically record history.

### Keyboard Shortcuts

**Undo**:
- **Ctrl+Z** (Windows/Linux)
- **Cmd+Z** (macOS)

**Redo**:
- **Ctrl+Y** (Windows/Linux)
- **Ctrl+Shift+Z** (Windows/Linux/macOS)
- **Cmd+Y** (macOS)

Implementation in `useKeyboardShortcuts`:

```typescript
{
  ...COMMON_SHORTCUTS.UNDO,
  callback: () => {
    if (canUndo) {
      undo()
      toast.success('Undo')
    }
  }
}
```

### Visual Feedback

**Status Bar** (bottom of screen):

```
┌─────────────────────────────────────────────────┐
│ Ready • 1920x1080 @ 30fps • Avatar 1 selected  │
│                                                 │
│ Undo: Ctrl+Z • Redo: Ctrl+Y • 100% zoom        │
└─────────────────────────────────────────────────┘
```

- Shows "Undo: Ctrl+Z" when undo available (normal opacity)
- Shows "Undo: N/A" when no history (50% opacity)
- Shows "Redo: Ctrl+Y" when redo available (normal opacity)
- Shows "Redo: N/A" when no future (50% opacity)

**Toast Notifications**:
- "Undo" - When user presses Ctrl+Z
- "Redo" - When user presses Ctrl+Y

## Usage Examples

### Example 1: Add and Undo

```typescript
// User adds an avatar
handleSelectAvatar(avatar)
// → Canvas has 1 element
// → Can Undo: true
// → Can Redo: false

// User presses Ctrl+Z
undo()
// → Canvas has 0 elements
// → Can Undo: false
// → Can Redo: true
```

### Example 2: Move and Undo Multiple Times

```typescript
// Initial position: (100, 100)

// Press Arrow Right 5 times
handleUpdateCanvasElement(id, { x: 101 })
handleUpdateCanvasElement(id, { x: 102 })
handleUpdateCanvasElement(id, { x: 103 })
handleUpdateCanvasElement(id, { x: 104 })
handleUpdateCanvasElement(id, { x: 105 })
// → Position: (105, 100)
// → 5 history entries

// Press Ctrl+Z three times
undo() // → (104, 100)
undo() // → (103, 100)
undo() // → (102, 100)
// → Can Redo: true
```

### Example 3: Branch History

```typescript
// State A → State B → State C
//                      ↑ present

// Undo twice
undo() // → State B
undo() // → State A
// future = [State B, State C]

// Make new change → State D
setCanvasScene(newState)
// → State A → State D
// → future cleared
// → Can Redo: false (States B and C are lost)
```

## Performance Considerations

### Memory Usage

- **Per State**: ~10-50 KB depending on element count
- **Max History**: 50 states × 50 KB = ~2.5 MB maximum
- **Automatic Cleanup**: Oldest states removed when limit reached

### Optimization Strategies

1. **Debouncing**: Arrow key movements could be debounced to reduce history entries
2. **State Serialization**: Could serialize to IndexedDB for persistence
3. **Structural Sharing**: Deep equality checks could avoid duplicate states

## Testing

### Automated Test

**Location**: `test-undo-redo.mjs`

Run with:
```bash
node test-undo-redo.mjs
```

Tests:
- ✅ Initial state (no undo/redo)
- ✅ Add elements → undo available
- ✅ Multiple undos
- ✅ Multiple redos
- ✅ New change clears future
- ✅ History size limits

### Manual Testing Checklist

- [ ] Add avatar → Ctrl+Z → Avatar removed
- [ ] Delete element → Ctrl+Z → Element restored
- [ ] Move element → Ctrl+Z → Position restored
- [ ] Ctrl+D duplicate → Ctrl+Z → Duplicate removed
- [ ] Undo multiple times → Redo all → Back to latest state
- [ ] Undo → Make new change → Redo unavailable
- [ ] Status bar shows correct undo/redo status
- [ ] Toast notifications appear
- [ ] Keyboard shortcuts ignore when typing in input fields

## Future Enhancements

### Planned Features

1. **History Panel**: Visual list of all changes with thumbnails
2. **Named Checkpoints**: User can name important states
3. **Persistent History**: Save to localStorage/IndexedDB
4. **History Branching UI**: Visualize and navigate history tree
5. **Selective Undo**: Undo specific operations without affecting others
6. **History Metadata**: Track timestamps, user actions, affected elements

### Advanced Features

1. **Collaborative Undo**: Undo in multi-user environment
2. **History Compression**: Merge consecutive similar operations
3. **History Export**: Export/import history for debugging
4. **Undo Animations**: Smooth transitions when undoing/redoing

## Technical Specifications

### TypeScript Types

```typescript
interface UseHistoryOptions<T> {
  maxHistorySize?: number    // Default: 50
  initialState: T
}

interface UseHistoryReturn<T> {
  state: T                   // Current state
  setState: (newState: T | ((prev: T) => T)) => void
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
  clear: () => void
  historySize: number
}
```

### State Structure

```typescript
interface CanvasScene {
  id: string
  name: string
  elements: CanvasElement[]
  backgroundColor: string
  backgroundImage?: string
  width: number
  height: number
}

interface CanvasElement {
  id: string
  type: 'image' | 'video' | 'text' | 'avatar' | 'shape'
  name: string
  x: number
  y: number
  width: number
  height: number
  rotation: number
  scaleX: number
  scaleY: number
  opacity: number
  // ... more properties
}
```

## Troubleshooting

### Issue: Undo not working

**Possible causes**:
1. History not enabled → Check `useHistory` is imported
2. Using old `useState` instead of `useHistory`
3. Typing in input field → Shortcuts disabled

### Issue: Too many history entries

**Solution**: Reduce `maxHistorySize`:
```typescript
useHistory({ initialState, maxHistorySize: 20 })
```

### Issue: Memory issues with large scenes

**Solution**: Implement structural sharing or state compression

## References

- **useHistory Hook**: [src/hooks/useHistory.ts](estudio_ia_videos/src/hooks/useHistory.ts)
- **Studio Pro Integration**: [src/app/studio-pro/page.tsx](estudio_ia_videos/src/app/studio-pro/page.tsx:66-84)
- **Keyboard Shortcuts**: [src/hooks/useKeyboardShortcuts.ts](estudio_ia_videos/src/hooks/useKeyboardShortcuts.ts)
- **Test Script**: [test-undo-redo.mjs](test-undo-redo.mjs)

## Changelog

### v1.0 (2026-01-18)
- ✅ Initial implementation
- ✅ Undo/Redo with Ctrl+Z/Ctrl+Y
- ✅ Status bar integration
- ✅ Toast notifications
- ✅ Test script
- ✅ Documentation
