# Proposal: Implement Phase 5 - Video Editor & Composition

**Change ID**: `implement-phase-5-video-editor`
**Status**: APPROVED
**Reference**: `PLANO_IMPLEMENTACAO_COMPLETO.md` (Inferred)

## Summary
Implement the core Video Composition engine using Remotion. This phase glues together the Avatars (Phase 2), Voice/TTS (Phase 4), and User Slides into a coherent 1080p video timeline.

## Goals
1.  **Timeline Architecture**: Standardized JSON schema for video timelines (Tracks, Clips, Transitions).
2.  **Universal Component**: `UniversalPlayer` (Remotion) that can render any timeline state.
3.  **Asset Integration**: Support for standard assets (Images, Videos) + Smart Assets (Avatars, TTS).
4.  **Preview Engine**: Real-time playback in the Studio (low res).
5.  **Render Engine**: Batch exporting of high-res video.

## Architecture
*   **Data Model**: `Timeline` -> `Track` -> `Clip`.
*   **Engine**: `Remotion` (React-based video frames).
*   **Backend**: `RenderWorker` (already exists, needs update to support new Timeline).

## Deliverables
*   `TimelineStore`: Zustand store for editing state.
*   `RemotionComposition`: The root component for the video.
*   `RenderService`: Updated service to handle timeline-based jobs.
