# Tasks: PPTX Fidelity & Animations

## Phase 1: Visual Fidelity <!-- id: phase-1 -->
- [x] Refactor `PPTXLayoutParser` to extract full style and geometry <!-- id: 1 -->
- [x] Create `UniversalSlideElement` interface definition <!-- id: 2 -->
- [x] Update `pptx-processor-real.ts` to populate `elements` array <!-- id: 3 -->
- [x] Create `UniversalSlide` Remotion component <!-- id: 4 -->
- [x] Verify basic slide rendering (Text + Shapes + Images) with correct positioning <!-- id: 5 -->

## Phase 2: Animations <!-- id: phase-2 -->
- [ ] Implement `PPTXAnimationParser` to read `p:timing` <!-- id: 6 -->
- [ ] Map PPTX animation types to internal `AnimationDef` <!-- id: 7 -->
- [ ] Implement `AnimatedWrapper` in Remotion <!-- id: 8 -->
- [ ] Verify animations in preview <!-- id: 9 -->

## Phase 3: Audio Sync <!-- id: phase-3 -->
- [ ] Create `TTSGenerator` service (mockable interface first) <!-- id: 10 -->
- [ ] Implement `calculateSlideDurationFromAudio` logic <!-- id: 11 -->
- [ ] Update Timeline generation to use dynamic durations <!-- id: 12 -->

## Phase 4: Integration <!-- id: phase-4 -->
- [ ] Connect `pptx-processor-real` output to `RemotionComposer` input <!-- id: 13 -->
- [ ] Validate full E2E flow: Upload -> Parse -> Render with correct styles <!-- id: 14 -->
