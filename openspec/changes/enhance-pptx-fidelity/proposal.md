# Proposal: Professional PPTX-to-Video Fidelity & Pre-Render Editing

**Change ID**: `enhance-pptx-fidelity`
**Status**: DRAFT

## Summary
Elevate the PPTX-to-Video pipeline to a professional level by implementing exact visual fidelity (layout, styling), native animation support, precise audio synchronization (TTS), and pre-render timeline editing.

## Goals
1.  **Visual Fidelity**: 1:1 visual match between PPTX slide and generated video frame (within web capabilities).
2.  **Animations**: Support standard PPTX animations (fade, slide, zoom) in video.
3.  **Audio Sync**: Auto-adjust slide duration to match TTS audio length exactly.
4.  **Editing**: Enable user editing of the parsed timeline before rendering.

## Non-Goals
- Support for 100% of PPTX features (e.g., complex 3D models, obscure SmartArt, embedded macros).
- Real-time collaborative editing (initially local/single-user).

## Scope & Phasing

### Phase 1: Visual Fidelity (Priority)
- **Parser Update**: Extend `pptx-processor-real.ts` to use `layout-parser` and `text-parser` fully, extracting `x, y, width, height, rotation` and detailed styling (font, color, size).
- **Data Model**: Deprecate "content string" in favor of `elements` array in `SlideData`.
- **Render Engine**: Create `UniversalSlide` component in Remotion to render these elements with absolute positioning.

### Phase 2: Animations
- **Parser Update**: Parse `p:timing` and `p:transition` XML.
- **Mapping**: Map PPTX animation types to Remotion `useCurrentFrame` interpolations. (e.g., `fade` -> `opacity 0->1`).

### Phase 3: Audio Sync (TTS)
- **Pipeline**: Generate audio files for notes *before* final timeline assembly.
- **Sync**: Use audio duration to set `UniversalSlide` duration in the timeline.

### Phase 4: Pre-Render Editing
- **UI**: Add "Advanced Editor" mode in Studio where users can tweak the JSON structure of the timeline (drag & drop elements).

## User Impact
Users will see their uploaded PPTX files look "native" in the video, rather than converted to a generic template. They will have control over the final pacing and content.

## Risks
- **Complexity**: PPTX XML is complex; edge cases in parsing are likely.
- **Performance**: High-fidelity DOM elements in Remotion can be heavy for browser rendering (though server-side rendering is the goal, preview performance matters).
