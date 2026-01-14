# Proposal: Replace Mocks with Real Implementations

## Goal
Eliminate all mock, stub, and "fake" implementations identified in the codebase, replacing them with production-ready, persistent, and "real" versions. This includes Image Processing, PPTX Generation, Auto-Narration, and Job/Slide Stores.

## Context
The current codebase contains several modules that were implemented as placeholders or fast-faked versions (`image-processor-real.ts`, `pptx-real-generator.ts`, etc.) to facilitate rapid development. As we move to production, these must be replaced with robust, scalable, and persistent implementations to ensure data integrity and real feature functionality.

## Scope
1.  **Image Processor**: Replace fake resizing/cropping/optimization with `sharp` or a real image processing library.
2.  **PPTX Generator**: Replace empty shell with `pptxgenjs` implementation that actually renders slides from data.
3.  **Auto-Narration**: Connect to real Text-to-Speech services (ElevenLabs/Azure) via the existing adapters, ensuring audio files are generated, saved to storage, and linked in the database.
4.  **Persistence**: Replace in-memory `Map` stores (`mock-store.ts`, `mockStore.ts`) with database queries (Prisma/PostgreSQL) and Redis for job queues.

## Risks
*   **Performance**: Real processing (especially image/video/PPTX) is slower than mocks. We need to ensure async job handling is robust.
*   **Cost**: Real API calls (ElevenLabs) incur costs.
*   **Regression**: Removing mocks might break frontend components that relied on instant/fake responses.

## Success Metrics
*   All identified "fake" files are refactored to use real logic.
*   No more `Map<string, ...>` in-memory storage for critical business data.
*   E2E tests pass with real backend logic enabled.
