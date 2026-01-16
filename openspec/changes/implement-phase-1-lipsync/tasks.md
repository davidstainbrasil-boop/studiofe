# Tasks: Phase 1 Lip-Sync

## Week 1: Setup e Integração Rhubarb <!-- id: week-1 -->
- [x] Install dependencies (`fluent-ffmpeg`, `rhubarb-binary`) <!-- id: 1 -->
- [x] Create `Phoneme` and `Viseme` types <!-- id: 2 -->
- [x] Implement `RhubarbLipSyncEngine` <!-- id: 3 -->
- [x] Create `audio-preprocessor.ts` <!-- id: 4 -->

## Week 2: Azure Integration & Caching <!-- id: week-2 -->
- [x] Implement `AzureVisemeEngine` <!-- id: 5 -->
- [x] Implement `VisemeCache` (Redis) <!-- id: 6 -->
- [x] Implement `LipSyncOrchestrator` <!-- id: 7 -->
- [x] Create API Route `/api/lip-sync/generate` <!-- id: 8 -->

### Visual & Animation <!-- id: week-2-visual -->
- [x] Implement `BlendShapeController` (ARKit 52 shapes) <!-- id: 9 -->
- [x] Implement `LipSyncAvatar` Remotion component <!-- id: 10 -->
- [-] Implement `FacialAnimationRenderer` (Integrated into LipSyncAvatar) <!-- id: 11 -->
- [x] Verify animation smoothness (interpolation) <!-- id: 12 -->

### Testing & Validation <!-- id: week-3-testing -->
- [x] Implement `rhubarb-lip-sync-engine.test.ts` <!-- id: 13 -->
- [x] Implement `azure-viseme-engine.test.ts` <!-- id: 14 -->
- [x] Implement `blend-shape-controller.test.ts` <!-- id: 15 -->
- [x] Implement `api/lip-sync/generate.test.ts` <!-- id: 16 -->
