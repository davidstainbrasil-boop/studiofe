/**
 * Unit Tests: FacialAnimationEngine
 * Tests for complete facial animation pipeline
 */

import { FacialAnimationEngine } from '@/lib/avatar/facial-animation-engine';
import { ARKitBlendShape } from '@/lib/sync/types/viseme.types';
import type { LipSyncResult } from '@/lib/sync/types/phoneme.types';

describe('FacialAnimationEngine', () => {
  let engine: FacialAnimationEngine;

  beforeEach(() => {
    engine = new FacialAnimationEngine();
  });

  const createMockLipSyncResult = (duration: number = 2): LipSyncResult => ({
    phonemes: [
      { phoneme: 'A', startTime: 0, endTime: 0.5, duration: 0.5 },
      { phoneme: 'B', startTime: 0.5, endTime: 1.0, duration: 0.5 },
      { phoneme: 'C', startTime: 1.0, endTime: 1.5, duration: 0.5 },
      { phoneme: 'D', startTime: 1.5, endTime: 2.0, duration: 0.5 }
    ],
    duration,
    source: 'mock'
  });

  describe('createAnimation', () => {
    it('should create animation with correct frame count', async () => {
      const lipSyncResult = createMockLipSyncResult(2);

      const animation = await engine.createAnimation(lipSyncResult, { fps: 30 });

      expect(animation.fps).toBe(30);
      expect(animation.duration).toBe(2);
      expect(animation.frames.length).toBeGreaterThanOrEqual(60);
      expect(animation.frames.length).toBeLessThanOrEqual(61);
    });

    it('should set correct metadata', async () => {
      const lipSyncResult = createMockLipSyncResult(2);

      const animation = await engine.createAnimation(lipSyncResult, {
        enableBlinks: true,
        enableBreathing: true,
        enableHeadMovement: true,
        emotion: 'happy'
      });

      expect(animation.metadata.lipSyncSource).toBe('mock');
      expect(animation.metadata.hasBlinks).toBe(true);
      expect(animation.metadata.hasBreathing).toBe(true);
      expect(animation.metadata.hasHeadMovement).toBe(true);
      expect(animation.metadata.hasEmotion).toBe(true);
    });

    it('should create frames with blend shape weights', async () => {
      const lipSyncResult = createMockLipSyncResult(1);

      const animation = await engine.createAnimation(lipSyncResult, { fps: 10 });

      expect(animation.frames[0].weights).toBeDefined();
      expect(Object.keys(animation.frames[0].weights).length).toBeGreaterThan(0);
    });

    it('should add head rotation when enabled', async () => {
      const lipSyncResult = createMockLipSyncResult(1);

      const animation = await engine.createAnimation(lipSyncResult, {
        enableHeadMovement: true
      });

      const framesWithRotation = animation.frames.filter(f => f.headRotation);

      expect(framesWithRotation.length).toBeGreaterThan(0);
      expect(framesWithRotation[0].headRotation).toHaveProperty('x');
      expect(framesWithRotation[0].headRotation).toHaveProperty('y');
      expect(framesWithRotation[0].headRotation).toHaveProperty('z');
    });

    it('should not add head rotation when disabled', async () => {
      const lipSyncResult = createMockLipSyncResult(1);

      const animation = await engine.createAnimation(lipSyncResult, {
        enableHeadMovement: false
      });

      const framesWithRotation = animation.frames.filter(f => f.headRotation);

      expect(framesWithRotation.length).toBe(0);
    });

    it('should add eye gaze to all frames', async () => {
      const lipSyncResult = createMockLipSyncResult(1);

      const animation = await engine.createAnimation(lipSyncResult);

      const framesWithGaze = animation.frames.filter(f => f.eyeGaze);

      expect(framesWithGaze.length).toBe(animation.frames.length);
      expect(framesWithGaze[0].eyeGaze).toHaveProperty('x');
      expect(framesWithGaze[0].eyeGaze).toHaveProperty('y');
    });

    it('should add emotion overlay when specified', async () => {
      const lipSyncResult = createMockLipSyncResult(1);

      const neutral = await engine.createAnimation(lipSyncResult, {
        emotion: 'neutral'
      });

      const happy = await engine.createAnimation(lipSyncResult, {
        emotion: 'happy',
        emotionIntensity: 0.8
      });

      // Happy should have more smile
      const neutralSmile = neutral.frames[5].weights[ARKitBlendShape.MouthSmileLeft] || 0;
      const happySmile = happy.frames[5].weights[ARKitBlendShape.MouthSmileLeft] || 0;

      expect(happySmile).toBeGreaterThan(neutralSmile);
    });

    it('should add blinks when enabled', async () => {
      const lipSyncResult = createMockLipSyncResult(4); // Longer duration for blinks

      const animation = await engine.createAnimation(lipSyncResult, {
        enableBlinks: true,
        blinkFrequency: 30, // High frequency for testing
        fps: 30
      });

      const framesWithBlink = animation.frames.filter(
        f => (f.weights[ARKitBlendShape.EyeBlinkLeft] || 0) > 0.5
      );

      expect(framesWithBlink.length).toBeGreaterThan(0);
    });

    it('should add breathing when enabled', async () => {
      const lipSyncResult = createMockLipSyncResult(5); // Longer for breathing

      const animation = await engine.createAnimation(lipSyncResult, {
        enableBreathing: true,
        breathingRate: 60, // High rate for testing
        fps: 30
      });

      // Check that jaw open varies (breathing effect)
      const jawOpenValues = animation.frames
        .map(f => f.weights[ARKitBlendShape.JawOpen] || 0)
        .filter(v => v > 0);

      const minJaw = Math.min(...jawOpenValues);
      const maxJaw = Math.max(...jawOpenValues);

      // Should have variation due to breathing
      expect(maxJaw).toBeGreaterThan(minJaw);
    });
  });

  describe('exportToJSON', () => {
    it('should export animation as valid JSON', async () => {
      const lipSyncResult = createMockLipSyncResult(1);
      const animation = await engine.createAnimation(lipSyncResult);

      const json = engine.exportToJSON(animation);
      const parsed = JSON.parse(json);

      expect(parsed.frames).toBeDefined();
      expect(parsed.duration).toBe(1);
      expect(parsed.fps).toBeDefined();
      expect(parsed.metadata).toBeDefined();
    });

    it('should be parseable back to animation', async () => {
      const lipSyncResult = createMockLipSyncResult(1);
      const animation = await engine.createAnimation(lipSyncResult);

      const json = engine.exportToJSON(animation);
      const parsed = JSON.parse(json);

      expect(parsed.frames.length).toBe(animation.frames.length);
      expect(parsed.duration).toBe(animation.duration);
    });
  });

  describe('exportToUSD', () => {
    it('should export animation as USD format', async () => {
      const lipSyncResult = createMockLipSyncResult(1);
      const animation = await engine.createAnimation(lipSyncResult);

      const usd = engine.exportToUSD(animation);

      expect(usd).toContain('#usda 1.0');
      expect(usd).toContain('FacialAnimation');
      expect(usd).toContain('framesPerSecond');
      expect(usd).toContain('BlendShape');
    });

    it('should include blend shape curves', async () => {
      const lipSyncResult = createMockLipSyncResult(1);
      const animation = await engine.createAnimation(lipSyncResult);

      const usd = engine.exportToUSD(animation);

      expect(usd).toContain('jawOpen');
      expect(usd).toContain('weight.timeSamples');
    });
  });

  describe('exportToFBXData', () => {
    it('should export animation as FBX-compatible data', async () => {
      const lipSyncResult = createMockLipSyncResult(1);
      const animation = await engine.createAnimation(lipSyncResult);

      const fbxData = engine.exportToFBXData(animation);

      expect(fbxData).toHaveProperty('version');
      expect(fbxData).toHaveProperty('fps');
      expect(fbxData).toHaveProperty('duration');
      expect(fbxData).toHaveProperty('frameCount');
      expect(fbxData).toHaveProperty('blendShapes');
    });

    it('should include all frame data', async () => {
      const lipSyncResult = createMockLipSyncResult(1);
      const animation = await engine.createAnimation(lipSyncResult, {
        enableHeadMovement: true
      });

      const fbxData = engine.exportToFBXData(animation) as any;

      expect(fbxData.blendShapes.length).toBe(animation.frames.length);
      expect(fbxData.blendShapes[0]).toHaveProperty('time');
      expect(fbxData.blendShapes[0]).toHaveProperty('weights');
      expect(fbxData.blendShapes[0]).toHaveProperty('headRotation');
    });
  });

  describe('optimizeAnimation', () => {
    it('should reduce frame count', async () => {
      const lipSyncResult = createMockLipSyncResult(2);
      const animation = await engine.createAnimation(lipSyncResult, { fps: 60 });

      const originalFrameCount = animation.frames.length;
      const optimized = engine.optimizeAnimation(animation, 0.01);

      expect(optimized.frames.length).toBeLessThan(originalFrameCount);
    });

    it('should keep first and last frames', async () => {
      const lipSyncResult = createMockLipSyncResult(2);
      const animation = await engine.createAnimation(lipSyncResult);

      const optimized = engine.optimizeAnimation(animation);

      expect(optimized.frames[0].time).toBe(animation.frames[0].time);
      expect(optimized.frames[optimized.frames.length - 1].time).toBe(
        animation.frames[animation.frames.length - 1].time
      );
    });

    it('should preserve animation quality', async () => {
      const lipSyncResult = createMockLipSyncResult(2);
      const animation = await engine.createAnimation(lipSyncResult);

      const optimized = engine.optimizeAnimation(animation, 0.001); // Tight threshold

      expect(optimized.duration).toBe(animation.duration);
      expect(optimized.fps).toBe(animation.fps);
      expect(optimized.metadata).toEqual(animation.metadata);
    });

    it('should not remove frames with high threshold', async () => {
      const lipSyncResult = createMockLipSyncResult(1);
      const animation = await engine.createAnimation(lipSyncResult);

      const optimized = engine.optimizeAnimation(animation, 1.0); // Very high threshold

      // Should keep almost all frames
      expect(optimized.frames.length).toBeGreaterThan(animation.frames.length * 0.8);
    });
  });
});
