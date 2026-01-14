# Implementation Tasks

## Phase 1: Persistence & Cleanup
1.  [ ] **DB Migration**: Verify/Create schema for `render_jobs` if missing (or use existing tracked jobs table).
2.  [ ] **Remove Mocks**: Delete `src/lib/render-jobs/mock-store.ts` and `src/lib/slides/mockStore.ts`.
3.  [ ] **Refactor Stores**: Update `render-service` and `timeline-store` to use Prisma/Redis exclusively.

## Phase 2: Image Processing
4.  [ ] **Install Sharp**: `npm install sharp` (if not present).
5.  [ ] **Impl ImageProcessor**: Rewrite `src/lib/image-processor-real.ts` using `sharp`.
6.  [ ] **Test Images**: Verify image upload -> process -> storage flow.

## Phase 3: PPTX Generation
7.  [ ] **Impl PPTXGenerator**: Rewrite `src/lib/pptx-real-generator.ts` with comprehensive `pptxgenjs` mapping.
8.  [ ] **Hydrate Data**: Ensure `generateRealPptxFromProject` fetches real data from Prisma.
9.  [ ] **Test PPTX**: Generate PPTX from a seeded project and verify file validity.

## Phase 4: Auto-Narration
10. [ ] **Impl AutoNarration**: Connect `src/lib/pptx/auto-narration-service.ts` to real TTS providers.
11. [ ] **Audio Storage**: Implement upload to S3/Supabase for generated audio.
12. [ ] **Test Narration**: Run auto-narration on a test project and verify audio playback.

## Phase 5: Verification
13. [ ] **E2E Tests**: Run full E2E suite with `USE_MOCK_RENDER_JOBS=false`.
14. [ ] **Manual Check**: Verify "fake" files are gone or fully refactored.
