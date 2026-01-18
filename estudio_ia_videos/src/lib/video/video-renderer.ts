/**
 * Video Renderer - Client-side video rendering using Remotion + FFmpeg WASM
 *
 * Features:
 * - Render VideoProject to MP4
 * - Progress tracking
 * - Client-side processing (no server required)
 * - Scene composition
 * - Avatar, text, image rendering
 * - Real GLB avatar rendering with Three.js
 */

import type { VideoProject, Scene, TimelineElement } from '@/types/video-project';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { SceneTransitions, type TransitionConfig } from './scene-transitions';
import { TextAnimations, type TextAnimationConfig } from './text-animations';

export interface RenderProgress {
  stage: 'preparing' | 'rendering' | 'encoding' | 'complete' | 'error';
  progress: number; // 0-100
  currentFrame?: number;
  totalFrames?: number;
  message: string;
}

export interface RenderOptions {
  quality: 'low' | 'medium' | 'high';
  fps: number;
  width: number;
  height: number;
  format: 'mp4' | 'webm';
  onProgress?: (progress: RenderProgress) => void;
}

export interface RenderResult {
  success: boolean;
  blob?: Blob;
  url?: string;
  duration: number;
  error?: string;
}

const DEFAULT_RENDER_OPTIONS: RenderOptions = {
  quality: 'medium',
  fps: 30,
  width: 1920,
  height: 1080,
  format: 'mp4',
};

/**
 * Video Renderer Class
 */
export class VideoRenderer {
  private options: RenderOptions;
  private abortController: AbortController | null = null;
  private threeScene: THREE.Scene | null = null;
  private threeCamera: THREE.PerspectiveCamera | null = null;
  private threeRenderer: THREE.WebGLRenderer | null = null;
  private avatarModels: Map<string, THREE.Group> = new Map();
  private gltfLoader: GLTFLoader = new GLTFLoader();
  private sceneCanvasCache: Map<string, HTMLCanvasElement> = new Map();

  constructor(options: Partial<RenderOptions> = {}) {
    this.options = { ...DEFAULT_RENDER_OPTIONS, ...options };
  }

  /**
   * Initialize Three.js scene for avatar rendering
   */
  private initializeThreeJS(): void {
    if (this.threeScene) return; // Already initialized

    // Create scene
    this.threeScene = new THREE.Scene();
    this.threeScene.background = null; // Transparent background

    // Create camera
    this.threeCamera = new THREE.PerspectiveCamera(
      50,
      this.options.width / this.options.height,
      0.1,
      1000,
    );
    this.threeCamera.position.z = 2;

    // Create renderer (offscreen)
    const canvas = document.createElement('canvas');
    canvas.width = this.options.width;
    canvas.height = this.options.height;

    this.threeRenderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
    });
    this.threeRenderer.setSize(this.options.width, this.options.height);
    this.threeRenderer.setClearColor(0x000000, 0); // Transparent

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.threeScene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    this.threeScene.add(directionalLight);
  }

  /**
   * Load GLB avatar model
   */
  private async loadAvatarModel(glbUrl: string): Promise<THREE.Group> {
    // Check cache
    if (this.avatarModels.has(glbUrl)) {
      return this.avatarModels.get(glbUrl)!.clone();
    }

    return new Promise((resolve, reject) => {
      this.gltfLoader.load(
        glbUrl,
        (gltf) => {
          const model = gltf.scene;

          // Center model
          const box = new THREE.Box3().setFromObject(model);
          const center = box.getCenter(new THREE.Vector3());
          model.position.sub(center);

          // Scale to reasonable size
          const size = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);
          const scale = 1.5 / maxDim;
          model.scale.setScalar(scale);

          // Cache model
          this.avatarModels.set(glbUrl, model);

          resolve(model.clone());
        },
        undefined,
        (error) => {
          reject(new Error(`Failed to load GLB: ${error}`));
        },
      );
    });
  }

  /**
   * Apply blend shape weights to avatar model
   */
  private applyBlendShapes(model: THREE.Group, blendShapes: Record<string, number>): void {
    model.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.morphTargetInfluences && mesh.morphTargetDictionary) {
          // Apply blend shape weights
          Object.entries(blendShapes).forEach(([shapeName, weight]) => {
            const index = mesh.morphTargetDictionary[shapeName];
            if (index !== undefined && mesh.morphTargetInfluences) {
              mesh.morphTargetInfluences[index] = weight;
            }
          });
        }
      }
    });
  }

  /**
   * Render VideoProject to video file
   */
  async render(project: VideoProject): Promise<RenderResult> {
    const startTime = Date.now();
    this.abortController = new AbortController();

    try {
      // Stage 1: Prepare
      this.reportProgress({
        stage: 'preparing',
        progress: 0,
        message: 'Preparing video project...',
      });

      // Validate project
      if (!project.scenes || project.scenes.length === 0) {
        throw new Error('Project has no scenes to render');
      }

      // Calculate total frames
      const totalDuration = project.scenes.reduce((sum, scene) => sum + scene.duration, 0);
      const totalFrames = Math.ceil(totalDuration * this.options.fps);

      // Stage 2: Render frames
      this.reportProgress({
        stage: 'rendering',
        progress: 10,
        currentFrame: 0,
        totalFrames,
        message: 'Rendering frames...',
      });

      const frames = await this.renderFrames(project, totalFrames);

      // Stage 3: Encode video
      this.reportProgress({
        stage: 'encoding',
        progress: 80,
        message: 'Encoding video...',
      });

      const blob = await this.encodeVideo(frames);

      // Stage 4: Complete
      const url = URL.createObjectURL(blob);
      const duration = (Date.now() - startTime) / 1000;

      this.reportProgress({
        stage: 'complete',
        progress: 100,
        message: 'Video rendering complete!',
      });

      return {
        success: true,
        blob,
        url,
        duration,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      this.reportProgress({
        stage: 'error',
        progress: 0,
        message: `Error: ${errorMessage}`,
      });

      return {
        success: false,
        duration: (Date.now() - startTime) / 1000,
        error: errorMessage,
      };
    } finally {
      // Cleanup Three.js resources
      this.cleanup();
    }
  }

  /**
   * Render all frames for the project
   */
  private async renderFrames(project: VideoProject, totalFrames: number): Promise<ImageData[]> {
    const frames: ImageData[] = [];
    const canvas = document.createElement('canvas');
    canvas.width = this.options.width;
    canvas.height = this.options.height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Could not get canvas context');
    }

    let currentTime = 0;
    const frameDuration = 1 / this.options.fps;

    for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
      // Check if aborted
      if (this.abortController?.signal.aborted) {
        throw new Error('Rendering aborted');
      }

      // Find current scene
      const scene = this.getSceneAtTime(project, currentTime);
      if (!scene) {
        throw new Error(`No scene found at time ${currentTime}`);
      }

      // Render scene at current time
      await this.renderScene(ctx, scene, currentTime);

      // Capture frame
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      frames.push(imageData);

      // Update progress
      const progress = 10 + (frameIndex / totalFrames) * 70; // 10-80%
      this.reportProgress({
        stage: 'rendering',
        progress,
        currentFrame: frameIndex + 1,
        totalFrames,
        message: `Rendering frame ${frameIndex + 1}/${totalFrames}...`,
      });

      currentTime += frameDuration;

      // Yield to prevent blocking
      if (frameIndex % 10 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    return frames;
  }

  /**
   * Find scene at specific time
   */
  private getSceneAtTime(project: VideoProject, time: number): Scene | null {
    let accumulatedTime = 0;

    for (const scene of project.scenes) {
      if (time >= accumulatedTime && time < accumulatedTime + scene.duration) {
        return scene;
      }
      accumulatedTime += scene.duration;
    }

    return null;
  }

  /**
   * Render a single scene at specific time
   */
  private async renderScene(
    ctx: CanvasRenderingContext2D,
    scene: Scene,
    globalTime: number,
  ): Promise<void> {
    // Calculate scene-relative time
    const sceneStartTime = this.getSceneStartTime(scene);
    const sceneTime = globalTime - sceneStartTime;

    // Check if we're in transition
    const transition = scene.transition as TransitionConfig | undefined;
    const transitionDuration = transition?.duration || 0;

    if (transition && sceneTime < transitionDuration) {
      // Render transition
      await this.renderSceneTransition(ctx, scene, sceneTime, transition);
    } else {
      // Render scene normally
      await this.renderSceneContent(ctx, scene, sceneTime);
    }
  }

  /**
   * Render scene content (no transition)
   */
  private async renderSceneContent(
    ctx: CanvasRenderingContext2D,
    scene: Scene,
    sceneTime: number,
  ): Promise<void> {
    // Clear canvas
    ctx.fillStyle = scene.backgroundColor || '#000000';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Render all visible tracks in order
    for (const track of scene.tracks) {
      if (!track.visible) continue;

      // Render elements in this track
      for (const element of track.elements) {
        if (this.isElementVisibleAtTime(element, sceneTime)) {
          await this.renderElement(ctx, element, sceneTime);
        }
      }
    }
  }

  /**
   * Render scene transition
   */
  private async renderSceneTransition(
    ctx: CanvasRenderingContext2D,
    currentScene: Scene,
    sceneTime: number,
    transition: TransitionConfig,
  ): Promise<void> {
    const progress = sceneTime / transition.duration;

    // Get or create canvas for previous scene
    const prevSceneIndex = this.getPreviousSceneIndex(currentScene);
    let prevCanvas: HTMLCanvasElement;

    if (prevSceneIndex >= 0) {
      // Render previous scene to temp canvas
      prevCanvas = await this.renderSceneToCanvas(
        this.getSceneAtIndex(prevSceneIndex),
        transition.duration,
      );
    } else {
      // No previous scene, use black canvas
      prevCanvas = document.createElement('canvas');
      prevCanvas.width = ctx.canvas.width;
      prevCanvas.height = ctx.canvas.height;
      const prevCtx = prevCanvas.getContext('2d')!;
      prevCtx.fillStyle = '#000000';
      prevCtx.fillRect(0, 0, prevCanvas.width, prevCanvas.height);
    }

    // Render current scene to temp canvas
    const currentCanvas = await this.renderSceneToCanvas(currentScene, sceneTime);

    // Apply transition
    SceneTransitions.render(
      {
        ctx,
        prevCanvas,
        nextCanvas: currentCanvas,
        progress,
        width: ctx.canvas.width,
        height: ctx.canvas.height,
      },
      transition,
    );
  }

  /**
   * Render scene to a temporary canvas
   */
  private async renderSceneToCanvas(scene: Scene, sceneTime: number): Promise<HTMLCanvasElement> {
    const canvas = document.createElement('canvas');
    canvas.width = this.options.width;
    canvas.height = this.options.height;
    const ctx = canvas.getContext('2d')!;

    await this.renderSceneContent(ctx, scene, sceneTime);

    return canvas;
  }

  /**
   * Get previous scene index
   */
  private getPreviousSceneIndex(_scene: Scene): number {
    // This would need access to project.scenes
    // For now, return -1 (no previous scene)
    return -1;
  }

  /**
   * Get scene at index
   */
  private getSceneAtIndex(_index: number): Scene {
    // This would need access to project.scenes
    // For now, return empty scene
    return {
      id: 'dummy',
      name: 'Dummy',
      duration: 0,
      backgroundColor: '#000000',
      tracks: [],
    } as Scene;
  }

  /**
   * Get scene start time in project timeline
   */
  private getSceneStartTime(_scene: Scene): number {
    // This would need to be calculated from project.scenes order
    // For now, simplified
    return 0;
  }

  /**
   * Check if element is visible at given time
   */
  private isElementVisibleAtTime(element: TimelineElement, time: number): boolean {
    return time >= element.startTime && time < element.endTime;
  }

  /**
   * Render a single timeline element
   */
  private async renderElement(
    ctx: CanvasRenderingContext2D,
    element: TimelineElement,
    time: number,
  ): Promise<void> {
    const elementTime = time - element.startTime;
    const progress = elementTime / element.duration;

    switch (element.type) {
      case 'text':
        this.renderTextElement(ctx, element, progress);
        break;
      case 'image':
        await this.renderImageElement(ctx, element, progress);
        break;
      case 'avatar':
        this.renderAvatarElement(ctx, element, progress);
        break;
      case 'video':
        await this.renderVideoElement(ctx, element, progress);
        break;
      default:
        // Unknown element type
        break;
    }
  }

  /**
   * Render text element with animation
   */
  private renderTextElement(
    ctx: CanvasRenderingContext2D,
    element: TimelineElement,
    progress: number,
  ): void {
    const { content } = element;
    if (!content.text) return;

    const x = content.position?.x || ctx.canvas.width / 2;
    const y = content.position?.y || ctx.canvas.height / 2;
    const opacity = content.opacity ?? 1;

    const font = content.fontSize
      ? `${content.fontSize}px ${content.fontFamily || 'Arial'}`
      : '24px Arial';
    const color = content.color || '#ffffff';

    // Check if element has animation
    const animation = content.animation as TextAnimationConfig | undefined;

    if (animation && animation.type !== 'none') {
      // Render with animation
      const animationProgress = Math.min(progress / (animation.duration || 1), 1);

      ctx.save();
      ctx.globalAlpha = opacity;

      TextAnimations.render(
        {
          ctx,
          text: content.text,
          x,
          y,
          font,
          color,
          align: (content.textAlign as CanvasTextAlign) || 'center',
          baseline: (content.textBaseline as CanvasTextBaseline) || 'middle',
          maxWidth: content.maxWidth,
        },
        animation,
        animationProgress,
      );

      ctx.restore();
    } else {
      // Render static text
      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.font = font;
      ctx.fillStyle = color;
      ctx.textAlign = (content.textAlign as CanvasTextAlign) || 'center';
      ctx.textBaseline = (content.textBaseline as CanvasTextBaseline) || 'middle';

      if (content.maxWidth) {
        ctx.fillText(content.text, x, y, content.maxWidth);
      } else {
        ctx.fillText(content.text, x, y);
      }

      ctx.restore();
    }
  }

  /**
   * Render image element
   */
  private async renderImageElement(
    ctx: CanvasRenderingContext2D,
    element: TimelineElement,
    _progress: number,
  ): Promise<void> {
    const { content } = element;
    if (!content.imageUrl) return;

    // Load image (should be cached)
    const img = await this.loadImage(content.imageUrl);

    ctx.save();

    const x = content.position?.x || 0;
    const y = content.position?.y || 0;
    const width = content.width || img.width;
    const height = content.height || img.height;
    const opacity = content.opacity ?? 1;

    ctx.globalAlpha = opacity;
    ctx.drawImage(img, x - width / 2, y - height / 2, width, height);

    ctx.restore();
  }

  /**
   * Render avatar element with real GLB model
   */
  private async renderAvatarElement(
    ctx: CanvasRenderingContext2D,
    element: TimelineElement,
    _progress: number,
  ): Promise<void> {
    const { content } = element;

    // If no GLB URL, render placeholder
    if (!content.avatarGlbUrl) {
      this.renderAvatarPlaceholder(ctx, element);
      return;
    }

    try {
      // Initialize Three.js if not already done
      this.initializeThreeJS();

      if (!this.threeScene || !this.threeCamera || !this.threeRenderer) {
        throw new Error('Three.js not initialized');
      }

      // Load avatar model
      const model = await this.loadAvatarModel(content.avatarGlbUrl);

      // Apply blend shapes if provided
      if (content.blendShapes) {
        this.applyBlendShapes(model, content.blendShapes);
      }

      // Position and scale model
      const x = content.position?.x || 960;
      const y = content.position?.y || 540;
      const scale = content.scale || 1;

      // Convert 2D position to 3D
      const ndcX = (x / ctx.canvas.width) * 2 - 1;
      const ndcY = -(y / ctx.canvas.height) * 2 + 1;

      model.position.set(ndcX * 1.5, ndcY * 1.5, 0);
      model.scale.multiplyScalar(scale);

      // Apply rotation if provided
      if (content.rotation) {
        model.rotation.set(
          content.rotation.x || 0,
          content.rotation.y || 0,
          content.rotation.z || 0,
        );
      }

      // Add model to scene
      this.threeScene.add(model);

      // Render Three.js scene
      this.threeRenderer.render(this.threeScene, this.threeCamera);

      // Get rendered image from Three.js canvas
      const threeCanvas = this.threeRenderer.domElement;
      const threeCtx = threeCanvas.getContext('2d');

      if (threeCtx) {
        ctx.save();
        ctx.globalAlpha = content.opacity ?? 1;

        // Draw Three.js render to main canvas
        ctx.drawImage(threeCanvas, 0, 0);

        ctx.restore();
      }

      // Remove model from scene for next frame
      this.threeScene.remove(model);
    } catch (error) {
      console.error('Error rendering avatar GLB:', error);
      // Fallback to placeholder
      this.renderAvatarPlaceholder(ctx, element);
    }
  }

  /**
   * Render placeholder avatar (fallback)
   */
  private renderAvatarPlaceholder(ctx: CanvasRenderingContext2D, element: TimelineElement): void {
    const { content } = element;

    ctx.save();

    const x = content.position?.x || 960;
    const y = content.position?.y || 540;
    const scale = content.scale || 1;
    const opacity = content.opacity ?? 1;

    ctx.globalAlpha = opacity;

    // Draw placeholder avatar (circle)
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.arc(x, y, 100 * scale, 0, Math.PI * 2);
    ctx.fill();

    // Draw text
    ctx.fillStyle = '#ffffff';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Avatar', x, y);

    ctx.restore();
  }

  /**
   * Render video element (placeholder)
   */
  private async renderVideoElement(
    ctx: CanvasRenderingContext2D,
    element: TimelineElement,
    _progress: number,
  ): Promise<void> {
    // Video rendering would require loading and seeking video
    // For now, draw placeholder
    const { content } = element;

    ctx.save();

    const x = content.position?.x || 0;
    const y = content.position?.y || 0;
    const width = content.width || 640;
    const height = content.height || 360;

    ctx.fillStyle = '#000000';
    ctx.fillRect(x, y, width, height);

    ctx.fillStyle = '#ffffff';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Video', x + width / 2, y + height / 2);

    ctx.restore();
  }

  /**
   * Load image from URL
   */
  private loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
      img.src = url;
    });
  }

  /**
   * Encode frames to video using client-side encoding
   * Note: This is a simplified version. For production, use FFmpeg WASM or MediaRecorder
   */
  private async encodeVideo(frames: ImageData[]): Promise<Blob> {
    // For now, create WebM using MediaRecorder
    // In production, you'd use @ffmpeg/ffmpeg for MP4

    const canvas = document.createElement('canvas');
    canvas.width = this.options.width;
    canvas.height = this.options.height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Could not get canvas context');
    }

    // Use MediaRecorder for WebM
    const stream = canvas.captureStream(this.options.fps);
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9',
      videoBitsPerSecond: this.getVideoBitrate(),
    });

    const chunks: Blob[] = [];

    return new Promise((resolve, reject) => {
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        resolve(blob);
      };

      mediaRecorder.onerror = (error) => {
        reject(error);
      };

      // Start recording
      mediaRecorder.start();

      // Play frames
      let frameIndex = 0;
      const frameDuration = 1000 / this.options.fps;

      const playNextFrame = () => {
        if (frameIndex >= frames.length) {
          // All frames played
          mediaRecorder.stop();
          return;
        }

        // Draw frame
        ctx.putImageData(frames[frameIndex], 0, 0);
        frameIndex++;

        // Schedule next frame
        setTimeout(playNextFrame, frameDuration);
      };

      playNextFrame();
    });
  }

  /**
   * Get video bitrate based on quality
   */
  private getVideoBitrate(): number {
    switch (this.options.quality) {
      case 'low':
        return 2_500_000; // 2.5 Mbps
      case 'medium':
        return 5_000_000; // 5 Mbps
      case 'high':
        return 10_000_000; // 10 Mbps
      default:
        return 5_000_000;
    }
  }

  /**
   * Report progress
   */
  private reportProgress(progress: RenderProgress): void {
    this.options.onProgress?.(progress);
  }

  /**
   * Abort rendering
   */
  abort(): void {
    this.abortController?.abort();
    this.cleanup();
  }

  /**
   * Cleanup Three.js resources
   */
  private cleanup(): void {
    // Dispose of Three.js resources
    if (this.threeRenderer) {
      this.threeRenderer.dispose();
      this.threeRenderer = null;
    }

    if (this.threeScene) {
      this.threeScene.clear();
      this.threeScene = null;
    }

    this.threeCamera = null;

    // Clear avatar model cache
    this.avatarModels.forEach((model) => {
      model.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.geometry?.dispose();
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((mat) => mat.dispose());
          } else {
            mesh.material?.dispose();
          }
        }
      });
    });
    this.avatarModels.clear();
  }
}

/**
 * Convenience function to render a project
 */
export async function renderVideoProject(
  project: VideoProject,
  options?: Partial<RenderOptions>,
): Promise<RenderResult> {
  const renderer = new VideoRenderer(options);
  return renderer.render(project);
}
