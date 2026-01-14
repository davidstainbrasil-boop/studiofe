# Design: Real Implementations Architecture

## 1. Image Processing
**Current**: `image-processor-real.ts` returns original buffer and fake metadata.
**New**:
*   Use `sharp` for server-side image manipulation (resize, crop, filter, format conversion).
*   **Flow**: Upload -> Temp Storage -> `sharp` Process -> Persistent Storage (S3/Supabase) -> DB Record.
*   **Optimization**: Use `sharp` to generate WebP/Avif versions for web optimization.

## 2. PPTX Generation
**Current**: `pptx-real-generator.ts` returns empty buffer/URL.
**New**:
*   Use `pptxgenjs` to map `Project` -> `Slides` -> `PPTX File`.
*   **Mapping**:
    *   `Project.title` -> Title Slide
    *   `Slide.content` -> Text/Image logic
    *   `Auto-Narration` -> Embed audio files (if supported) or link in notes.
*   **Storage**: Generated PPTX files must be uploaded to StorageBucket and URL saved to `Project.pptxUrl`.

## 3. Auto-Narration
**Current**: `auto-narration-service.ts` stub returns empty buffers.
**New**:
*   Integrate full `ElevenLabsService` / `AzureTTSService`.
*   **Concurrency**: Process slides in parallel (with rate limiting via `p-limit`).
*   **Persistence**: Save audio files to StorageBucket (`/audio/project-id/slide-id.mp3`).
*   **Database**: Update `Slide.voiceover` JSONB column with URL, duration, and metadata.

## 4. Job/Slide Persistence
**Current**: `mock-store.ts` uses `globalThis.__mock_render_jobs__`.
**New**:
*   **Render Jobs**: Use `bullmq` (Redis) for queue management and `prisma.render_jobs` (if table exists) or a new table for job tracking.
*   **Slides**: Ensure all slide operations read/write to `prisma.slides` or `prisma.projects` (JSONB).
*   **Removal**: Delete `mock-store.ts` and `mockStore.ts` entirely.
