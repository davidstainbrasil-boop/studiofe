/**
 * Scene Transitions for Video Rendering
 * Implements fade, wipe, slide, and other transition effects
 */

export type TransitionType = 'none' | 'fade' | 'wipe' | 'slide' | 'zoom' | 'dissolve';
export type TransitionDirection = 'left' | 'right' | 'up' | 'down';

export interface TransitionConfig {
  type: TransitionType;
  duration: number; // in seconds
  direction?: TransitionDirection;
  easing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
}

export interface TransitionContext {
  ctx: CanvasRenderingContext2D;
  prevCanvas: HTMLCanvasElement;
  nextCanvas: HTMLCanvasElement;
  progress: number; // 0-1
  width: number;
  height: number;
}

/**
 * Easing functions
 */
export class EasingFunctions {
  static linear(t: number): number {
    return t;
  }

  static easeIn(t: number): number {
    return t * t;
  }

  static easeOut(t: number): number {
    return t * (2 - t);
  }

  static easeInOut(t: number): number {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }

  static get(type: string): (t: number) => number {
    switch (type) {
      case 'ease-in':
        return this.easeIn;
      case 'ease-out':
        return this.easeOut;
      case 'ease-in-out':
        return this.easeInOut;
      default:
        return this.linear;
    }
  }
}

/**
 * Scene Transition Renderer
 */
export class SceneTransitions {
  /**
   * Render transition between two scenes
   */
  static render(context: TransitionContext, config: TransitionConfig): void {
    const easing = EasingFunctions.get(config.easing || 'ease-in-out');
    const easedProgress = easing(context.progress);

    switch (config.type) {
      case 'fade':
        this.renderFade(context, easedProgress);
        break;
      case 'wipe':
        this.renderWipe(context, easedProgress, config.direction || 'left');
        break;
      case 'slide':
        this.renderSlide(context, easedProgress, config.direction || 'left');
        break;
      case 'zoom':
        this.renderZoom(context, easedProgress);
        break;
      case 'dissolve':
        this.renderDissolve(context, easedProgress);
        break;
      default:
        // No transition, just show next scene
        context.ctx.drawImage(context.nextCanvas, 0, 0);
        break;
    }
  }

  /**
   * Fade transition
   */
  private static renderFade(context: TransitionContext, progress: number): void {
    const { ctx, prevCanvas, nextCanvas } = context;

    // Clear canvas
    ctx.clearRect(0, 0, context.width, context.height);

    // Draw previous scene fading out
    ctx.globalAlpha = 1 - progress;
    ctx.drawImage(prevCanvas, 0, 0);

    // Draw next scene fading in
    ctx.globalAlpha = progress;
    ctx.drawImage(nextCanvas, 0, 0);

    // Reset alpha
    ctx.globalAlpha = 1;
  }

  /**
   * Wipe transition
   */
  private static renderWipe(
    context: TransitionContext,
    progress: number,
    direction: TransitionDirection,
  ): void {
    const { ctx, prevCanvas, nextCanvas, width, height } = context;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw previous scene
    ctx.drawImage(prevCanvas, 0, 0);

    // Calculate wipe position
    let x = 0;
    let y = 0;
    let w = width;
    let h = height;

    switch (direction) {
      case 'left':
        w = width * progress;
        break;
      case 'right':
        x = width * (1 - progress);
        w = width * progress;
        break;
      case 'up':
        h = height * progress;
        break;
      case 'down':
        y = height * (1 - progress);
        h = height * progress;
        break;
    }

    // Draw next scene in wipe area
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.drawImage(nextCanvas, 0, 0);
    ctx.restore();
  }

  /**
   * Slide transition
   */
  private static renderSlide(
    context: TransitionContext,
    progress: number,
    direction: TransitionDirection,
  ): void {
    const { ctx, prevCanvas, nextCanvas, width, height } = context;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    let prevX = 0;
    let prevY = 0;
    let nextX = 0;
    let nextY = 0;

    switch (direction) {
      case 'left':
        prevX = -width * progress;
        nextX = width * (1 - progress);
        break;
      case 'right':
        prevX = width * progress;
        nextX = -width * (1 - progress);
        break;
      case 'up':
        prevY = -height * progress;
        nextY = height * (1 - progress);
        break;
      case 'down':
        prevY = height * progress;
        nextY = -height * (1 - progress);
        break;
    }

    // Draw previous scene sliding out
    ctx.drawImage(prevCanvas, prevX, prevY);

    // Draw next scene sliding in
    ctx.drawImage(nextCanvas, nextX, nextY);
  }

  /**
   * Zoom transition
   */
  private static renderZoom(context: TransitionContext, progress: number): void {
    const { ctx, prevCanvas, nextCanvas, width, height } = context;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Zoom out previous scene
    const prevScale = 1 + progress * 0.5; // Scale from 1.0 to 1.5
    const prevX = (width - width * prevScale) / 2;
    const prevY = (height - height * prevScale) / 2;

    ctx.globalAlpha = 1 - progress;
    ctx.drawImage(prevCanvas, prevX, prevY, width * prevScale, height * prevScale);

    // Zoom in next scene
    const nextScale = 0.5 + progress * 0.5; // Scale from 0.5 to 1.0
    const nextX = (width - width * nextScale) / 2;
    const nextY = (height - height * nextScale) / 2;

    ctx.globalAlpha = progress;
    ctx.drawImage(nextCanvas, nextX, nextY, width * nextScale, height * nextScale);

    // Reset alpha
    ctx.globalAlpha = 1;
  }

  /**
   * Dissolve transition (pixelated fade)
   */
  private static renderDissolve(context: TransitionContext, progress: number): void {
    const { ctx, prevCanvas, nextCanvas, width, height } = context;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw previous scene
    ctx.drawImage(prevCanvas, 0, 0);

    // Get image data for dissolve effect
    const imageData = ctx.getImageData(0, 0, width, height);

    // Draw next scene to temporary canvas
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d');

    if (!tempCtx) return;

    tempCtx.drawImage(nextCanvas, 0, 0);
    const nextData = tempCtx.getImageData(0, 0, width, height);

    // Dissolve effect with random pixels
    const threshold = progress;
    const blockSize = 4; // Size of dissolve blocks

    for (let y = 0; y < height; y += blockSize) {
      for (let x = 0; x < width; x += blockSize) {
        // Use deterministic random based on position
        const random = ((x * 7919 + y * 7907) % 1000) / 1000;

        if (random < threshold) {
          // Copy block from next scene
          for (let by = 0; by < blockSize && y + by < height; by++) {
            for (let bx = 0; bx < blockSize && x + bx < width; bx++) {
              const idx = ((y + by) * width + (x + bx)) * 4;
              imageData.data[idx] = nextData.data[idx];
              imageData.data[idx + 1] = nextData.data[idx + 1];
              imageData.data[idx + 2] = nextData.data[idx + 2];
              imageData.data[idx + 3] = nextData.data[idx + 3];
            }
          }
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }

  /**
   * Create transition preview
   */
  static createPreview(
    type: TransitionType,
    duration: number = 1.0,
  ): { frames: ImageData[]; fps: number } {
    const width = 320;
    const height = 180;
    const fps = 30;
    const totalFrames = Math.ceil(duration * fps);

    const prevCanvas = document.createElement('canvas');
    prevCanvas.width = width;
    prevCanvas.height = height;
    const prevCtx = prevCanvas.getContext('2d')!;
    prevCtx.fillStyle = '#3b82f6';
    prevCtx.fillRect(0, 0, width, height);

    const nextCanvas = document.createElement('canvas');
    nextCanvas.width = width;
    nextCanvas.height = height;
    const nextCtx = nextCanvas.getContext('2d')!;
    nextCtx.fillStyle = '#10b981';
    nextCtx.fillRect(0, 0, width, height);

    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = width;
    outputCanvas.height = height;
    const outputCtx = outputCanvas.getContext('2d')!;

    const frames: ImageData[] = [];

    for (let i = 0; i < totalFrames; i++) {
      const progress = i / (totalFrames - 1);

      this.render(
        {
          ctx: outputCtx,
          prevCanvas,
          nextCanvas,
          progress,
          width,
          height,
        },
        {
          type,
          duration,
          direction: 'left',
          easing: 'ease-in-out',
        },
      );

      frames.push(outputCtx.getImageData(0, 0, width, height));
    }

    return { frames, fps };
  }
}
