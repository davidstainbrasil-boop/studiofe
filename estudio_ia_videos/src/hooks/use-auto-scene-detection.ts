/**
 * 🎬 Auto Scene Detection Hook
 * Detecta automaticamente cenas quando um vídeo é importado
 */

import { useState, useCallback, useRef } from 'react';
import { logger } from '@/lib/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface DetectedScene {
  id: string;
  startTime: number;
  endTime: number;
  thumbnail?: string;
  confidence: number;
  label?: string;
  type: 'cut' | 'fade' | 'dissolve' | 'motion';
}

export interface SceneDetectionConfig {
  /** Sensibilidade de detecção (0-1) */
  sensitivity: number;
  /** Duração mínima de cena em segundos */
  minSceneDuration: number;
  /** Detectar cortes secos */
  detectCuts: boolean;
  /** Detectar fades */
  detectFades: boolean;
  /** Detectar dissolves */
  detectDissolves: boolean;
  /** Usar análise de movimento */
  useMotionAnalysis: boolean;
  /** Auto-aplicar cenas detectadas à timeline */
  autoApplyToTimeline: boolean;
}

export interface SceneDetectionResult {
  scenes: DetectedScene[];
  totalScenes: number;
  processingTime: number;
  videoInfo: {
    duration: number;
    width: number;
    height: number;
    fps: number;
  };
}

export interface SceneDetectionProgress {
  stage: 'idle' | 'extracting' | 'analyzing' | 'processing' | 'complete' | 'error';
  progress: number;
  message: string;
  framesProcessed?: number;
  totalFrames?: number;
}

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

const DEFAULT_CONFIG: SceneDetectionConfig = {
  sensitivity: 0.5,
  minSceneDuration: 1.5,
  detectCuts: true,
  detectFades: true,
  detectDissolves: true,
  useMotionAnalysis: false,
  autoApplyToTimeline: true,
};

// ============================================================================
// SCENE DETECTION ALGORITHMS
// ============================================================================

/**
 * Analisa diferença de histograma entre frames
 */
function calculateHistogramDifference(
  frame1Data: Uint8ClampedArray,
  frame2Data: Uint8ClampedArray
): number {
  const histSize = 64;
  const hist1 = new Array(histSize).fill(0);
  const hist2 = new Array(histSize).fill(0);

  // Build histograms (grayscale)
  for (let i = 0; i < frame1Data.length; i += 4) {
    const gray1 = Math.floor((frame1Data[i] + frame1Data[i + 1] + frame1Data[i + 2]) / 3);
    const gray2 = Math.floor((frame2Data[i] + frame2Data[i + 1] + frame2Data[i + 2]) / 3);
    hist1[Math.floor(gray1 / 4)]++;
    hist2[Math.floor(gray2 / 4)]++;
  }

  // Normalize and calculate chi-square distance
  const totalPixels = frame1Data.length / 4;
  let chiSquare = 0;
  for (let i = 0; i < histSize; i++) {
    const h1 = hist1[i] / totalPixels;
    const h2 = hist2[i] / totalPixels;
    if (h1 + h2 > 0) {
      chiSquare += Math.pow(h1 - h2, 2) / (h1 + h2);
    }
  }

  return chiSquare;
}

/**
 * Detecta se há fade (escurecimento/clareamento gradual)
 */
function detectFade(
  frameDatas: Uint8ClampedArray[],
  threshold: number
): { isFade: boolean; type: 'in' | 'out' | null } {
  if (frameDatas.length < 3) return { isFade: false, type: null };

  const brightnesses = frameDatas.map((data) => {
    let sum = 0;
    for (let i = 0; i < data.length; i += 4) {
      sum += (data[i] + data[i + 1] + data[i + 2]) / 3;
    }
    return sum / (data.length / 4);
  });

  // Check for consistent decrease or increase
  let increasing = true;
  let decreasing = true;

  for (let i = 1; i < brightnesses.length; i++) {
    const diff = brightnesses[i] - brightnesses[i - 1];
    if (diff < -threshold) increasing = false;
    if (diff > threshold) decreasing = false;
  }

  if (decreasing && brightnesses[0] > 50 && brightnesses[brightnesses.length - 1] < 30) {
    return { isFade: true, type: 'out' };
  }
  if (increasing && brightnesses[0] < 30 && brightnesses[brightnesses.length - 1] > 50) {
    return { isFade: true, type: 'in' };
  }

  return { isFade: false, type: null };
}

// ============================================================================
// MAIN HOOK
// ============================================================================

export function useAutoSceneDetection(customConfig?: Partial<SceneDetectionConfig>) {
  const [progress, setProgress] = useState<SceneDetectionProgress>({
    stage: 'idle',
    progress: 0,
    message: '',
  });
  const [result, setResult] = useState<SceneDetectionResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const config: SceneDetectionConfig = { ...DEFAULT_CONFIG, ...customConfig };

  /**
   * Detecta cenas em um vídeo (File ou URL)
   */
  const detectScenes = useCallback(
    async (videoSource: File | string): Promise<SceneDetectionResult> => {
      if (isProcessing) {
        throw new Error('Detection already in progress');
      }

      setIsProcessing(true);
      setProgress({ stage: 'extracting', progress: 0, message: 'Preparando vídeo...' });
      abortControllerRef.current = new AbortController();

      const startTime = Date.now();

      try {
        // Create video element
        const video = document.createElement('video');
        video.crossOrigin = 'anonymous';
        video.muted = true;

        // Set video source
        if (videoSource instanceof File) {
          video.src = URL.createObjectURL(videoSource);
        } else {
          video.src = videoSource;
        }

        // Wait for metadata
        await new Promise<void>((resolve, reject) => {
          video.onloadedmetadata = () => resolve();
          video.onerror = () => reject(new Error('Failed to load video'));
        });

        const duration = video.duration;
        const fps = 30; // Assume 30 fps if not available
        const sampleInterval = 0.5; // Sample every 0.5 seconds
        const totalSamples = Math.ceil(duration / sampleInterval);

        setProgress({
          stage: 'analyzing',
          progress: 10,
          message: 'Extraindo frames...',
          totalFrames: totalSamples,
          framesProcessed: 0,
        });

        // Create canvas for frame extraction
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not get canvas context');

        canvas.width = 160; // Downscale for faster processing
        canvas.height = 90;

        const frames: { time: number; data: Uint8ClampedArray }[] = [];
        const scenes: DetectedScene[] = [];

        // Extract frames
        for (let i = 0; i < totalSamples; i++) {
          if (abortControllerRef.current?.signal.aborted) {
            throw new Error('Detection cancelled');
          }

          const time = i * sampleInterval;
          video.currentTime = time;

          await new Promise<void>((resolve) => {
            video.onseeked = () => {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              frames.push({ time, data: imageData.data });
              resolve();
            };
          });

          setProgress({
            stage: 'analyzing',
            progress: 10 + (i / totalSamples) * 60,
            message: `Analisando frame ${i + 1} de ${totalSamples}...`,
            framesProcessed: i + 1,
            totalFrames: totalSamples,
          });
        }

        // Analyze frames for scene changes
        setProgress({
          stage: 'processing',
          progress: 70,
          message: 'Detectando transições...',
        });

        const threshold = 0.3 + (1 - config.sensitivity) * 0.5; // Adjust threshold based on sensitivity
        let sceneStart = 0;

        for (let i = 1; i < frames.length; i++) {
          const diff = calculateHistogramDifference(frames[i - 1].data, frames[i].data);

          const isSceneChange = diff > threshold;

          if (isSceneChange) {
            const sceneDuration = frames[i].time - sceneStart;

            if (sceneDuration >= config.minSceneDuration) {
              // Determine scene type
              let sceneType: 'cut' | 'fade' | 'dissolve' | 'motion' = 'cut';

              if (config.detectFades && i > 2) {
                const fadeCheck = detectFade(
                  [frames[i - 3]?.data, frames[i - 2]?.data, frames[i - 1]?.data, frames[i].data].filter(Boolean) as Uint8ClampedArray[],
                  5
                );
                if (fadeCheck.isFade) {
                  sceneType = 'fade';
                }
              }

              scenes.push({
                id: `scene-${scenes.length + 1}`,
                startTime: sceneStart,
                endTime: frames[i].time,
                confidence: Math.min(diff / threshold, 1),
                label: `Cena ${scenes.length + 1}`,
                type: sceneType,
              });

              sceneStart = frames[i].time;
            }
          }
        }

        // Add final scene
        if (duration - sceneStart >= config.minSceneDuration) {
          scenes.push({
            id: `scene-${scenes.length + 1}`,
            startTime: sceneStart,
            endTime: duration,
            confidence: 1,
            label: `Cena ${scenes.length + 1}`,
            type: 'cut',
          });
        }

        // Cleanup
        if (videoSource instanceof File) {
          URL.revokeObjectURL(video.src);
        }

        const detectionResult: SceneDetectionResult = {
          scenes,
          totalScenes: scenes.length,
          processingTime: Date.now() - startTime,
          videoInfo: {
            duration,
            width: video.videoWidth,
            height: video.videoHeight,
            fps,
          },
        };

        setProgress({
          stage: 'complete',
          progress: 100,
          message: `Detectadas ${scenes.length} cenas em ${Math.round((Date.now() - startTime) / 1000)}s`,
        });

        setResult(detectionResult);
        logger.info('Scene detection complete', { totalScenes: scenes.length, duration: detectionResult.processingTime });

        return detectionResult;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Detection failed';
        setProgress({
          stage: 'error',
          progress: 0,
          message: errorMessage,
        });
        logger.error('Scene detection failed', error instanceof Error ? error : undefined, { source: typeof videoSource === 'string' ? videoSource : 'file' });
        throw error;
      } finally {
        setIsProcessing(false);
        abortControllerRef.current = null;
      }
    },
    [config, isProcessing]
  );

  /**
   * Cancela detecção em progresso
   */
  const cancelDetection = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  /**
   * Reseta estado
   */
  const reset = useCallback(() => {
    setProgress({ stage: 'idle', progress: 0, message: '' });
    setResult(null);
    setIsProcessing(false);
  }, []);

  /**
   * Detecta e auto-aplica cenas à timeline
   */
  const detectAndApply = useCallback(
    async (
      videoSource: File | string,
      onApply: (scenes: DetectedScene[]) => void
    ): Promise<SceneDetectionResult> => {
      const detection = await detectScenes(videoSource);
      if (config.autoApplyToTimeline && detection.scenes.length > 0) {
        onApply(detection.scenes);
      }
      return detection;
    },
    [detectScenes, config.autoApplyToTimeline]
  );

  return {
    // State
    progress,
    result,
    isProcessing,
    config,

    // Actions
    detectScenes,
    detectAndApply,
    cancelDetection,
    reset,
  };
}

export default useAutoSceneDetection;
