/**
 * Text Animations for Timeline Elements
 * Implements entrance, exit, and emphasis animations for text
 */

export type AnimationType =
  | 'none'
  | 'fade-in'
  | 'fade-out'
  | 'slide-in'
  | 'slide-out'
  | 'zoom-in'
  | 'zoom-out'
  | 'bounce-in'
  | 'bounce-out'
  | 'typewriter'
  | 'flip-in'
  | 'flip-out';

export type AnimationDirection = 'left' | 'right' | 'up' | 'down';

export interface TextAnimationConfig {
  type: AnimationType;
  duration: number; // in seconds
  direction?: AnimationDirection;
  easing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
  delay?: number; // in seconds
}

export interface TextRenderContext {
  ctx: CanvasRenderingContext2D;
  text: string;
  x: number;
  y: number;
  font: string;
  color: string;
  align: CanvasTextAlign;
  baseline: CanvasTextBaseline;
  maxWidth?: number;
}

/**
 * Easing functions for animations
 */
class Easing {
  static linear(t: number): number {
    return t;
  }

  static easeIn(t: number): number {
    return t * t * t;
  }

  static easeOut(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  static easeInOut(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  static bounce(t: number): number {
    const n1 = 7.5625;
    const d1 = 2.75;

    if (t < 1 / d1) {
      return n1 * t * t;
    } else if (t < 2 / d1) {
      return n1 * (t -= 1.5 / d1) * t + 0.75;
    } else if (t < 2.5 / d1) {
      return n1 * (t -= 2.25 / d1) * t + 0.9375;
    } else {
      return n1 * (t -= 2.625 / d1) * t + 0.984375;
    }
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
 * Text Animation Renderer
 */
export class TextAnimations {
  /**
   * Render animated text
   */
  static render(context: TextRenderContext, config: TextAnimationConfig, progress: number): void {
    // Apply easing
    const easing = Easing.get(config.easing || 'ease-in-out');
    let easedProgress = easing(progress);

    // Apply delay
    if (config.delay) {
      const delayRatio = config.delay / config.duration;
      if (progress < delayRatio) {
        return; // Don't render yet
      }
      easedProgress = easing((progress - delayRatio) / (1 - delayRatio));
    }

    // Apply animation
    switch (config.type) {
      case 'fade-in':
        this.renderFadeIn(context, easedProgress);
        break;
      case 'fade-out':
        this.renderFadeOut(context, easedProgress);
        break;
      case 'slide-in':
        this.renderSlideIn(context, easedProgress, config.direction || 'left');
        break;
      case 'slide-out':
        this.renderSlideOut(context, easedProgress, config.direction || 'left');
        break;
      case 'zoom-in':
        this.renderZoomIn(context, easedProgress);
        break;
      case 'zoom-out':
        this.renderZoomOut(context, easedProgress);
        break;
      case 'bounce-in':
        this.renderBounceIn(context, progress); // Use raw progress for bounce
        break;
      case 'bounce-out':
        this.renderBounceOut(context, progress); // Use raw progress for bounce
        break;
      case 'typewriter':
        this.renderTypewriter(context, easedProgress);
        break;
      case 'flip-in':
        this.renderFlipIn(context, easedProgress);
        break;
      case 'flip-out':
        this.renderFlipOut(context, easedProgress);
        break;
      default:
        // No animation, just render text
        this.renderStatic(context);
        break;
    }
  }

  /**
   * Render static text (no animation)
   */
  private static renderStatic(context: TextRenderContext): void {
    const { ctx, text, x, y, font, color, align, baseline, maxWidth } = context;

    ctx.save();
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = baseline;

    if (maxWidth) {
      ctx.fillText(text, x, y, maxWidth);
    } else {
      ctx.fillText(text, x, y);
    }

    ctx.restore();
  }

  /**
   * Fade in animation
   */
  private static renderFadeIn(context: TextRenderContext, progress: number): void {
    const { ctx } = context;

    ctx.save();
    ctx.globalAlpha = progress;
    this.renderStatic(context);
    ctx.restore();
  }

  /**
   * Fade out animation
   */
  private static renderFadeOut(context: TextRenderContext, progress: number): void {
    const { ctx } = context;

    ctx.save();
    ctx.globalAlpha = 1 - progress;
    this.renderStatic(context);
    ctx.restore();
  }

  /**
   * Slide in animation
   */
  private static renderSlideIn(
    context: TextRenderContext,
    progress: number,
    direction: AnimationDirection,
  ): void {
    const { ctx, x, y } = context;
    const distance = 100; // pixels

    let offsetX = 0;
    let offsetY = 0;

    switch (direction) {
      case 'left':
        offsetX = -distance * (1 - progress);
        break;
      case 'right':
        offsetX = distance * (1 - progress);
        break;
      case 'up':
        offsetY = -distance * (1 - progress);
        break;
      case 'down':
        offsetY = distance * (1 - progress);
        break;
    }

    ctx.save();
    ctx.globalAlpha = progress;
    this.renderStatic({
      ...context,
      x: x + offsetX,
      y: y + offsetY,
    });
    ctx.restore();
  }

  /**
   * Slide out animation
   */
  private static renderSlideOut(
    context: TextRenderContext,
    progress: number,
    direction: AnimationDirection,
  ): void {
    const { ctx, x, y } = context;
    const distance = 100; // pixels

    let offsetX = 0;
    let offsetY = 0;

    switch (direction) {
      case 'left':
        offsetX = -distance * progress;
        break;
      case 'right':
        offsetX = distance * progress;
        break;
      case 'up':
        offsetY = -distance * progress;
        break;
      case 'down':
        offsetY = distance * progress;
        break;
    }

    ctx.save();
    ctx.globalAlpha = 1 - progress;
    this.renderStatic({
      ...context,
      x: x + offsetX,
      y: y + offsetY,
    });
    ctx.restore();
  }

  /**
   * Zoom in animation
   */
  private static renderZoomIn(context: TextRenderContext, progress: number): void {
    const { ctx, x, y } = context;
    const scale = 0.3 + progress * 0.7; // Scale from 0.3 to 1.0

    ctx.save();
    ctx.globalAlpha = progress;
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.translate(-x, -y);
    this.renderStatic(context);
    ctx.restore();
  }

  /**
   * Zoom out animation
   */
  private static renderZoomOut(context: TextRenderContext, progress: number): void {
    const { ctx, x, y } = context;
    const scale = 1 + progress * 0.7; // Scale from 1.0 to 1.7

    ctx.save();
    ctx.globalAlpha = 1 - progress;
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.translate(-x, -y);
    this.renderStatic(context);
    ctx.restore();
  }

  /**
   * Bounce in animation
   */
  private static renderBounceIn(context: TextRenderContext, progress: number): void {
    const { ctx, x, y } = context;
    const bounceProgress = Easing.bounce(progress);
    const scale = 0.3 + bounceProgress * 0.7; // Scale from 0.3 to 1.0

    ctx.save();
    ctx.globalAlpha = progress;
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.translate(-x, -y);
    this.renderStatic(context);
    ctx.restore();
  }

  /**
   * Bounce out animation
   */
  private static renderBounceOut(context: TextRenderContext, progress: number): void {
    const { ctx, x, y } = context;
    const bounceProgress = Easing.bounce(1 - progress);
    const scale = 0.3 + bounceProgress * 0.7; // Scale from 1.0 to 0.3

    ctx.save();
    ctx.globalAlpha = 1 - progress;
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.translate(-x, -y);
    this.renderStatic(context);
    ctx.restore();
  }

  /**
   * Typewriter animation
   */
  private static renderTypewriter(context: TextRenderContext, progress: number): void {
    const { text } = context;
    const charCount = Math.floor(text.length * progress);
    const visibleText = text.substring(0, charCount);

    this.renderStatic({
      ...context,
      text: visibleText,
    });
  }

  /**
   * Flip in animation
   */
  private static renderFlipIn(context: TextRenderContext, progress: number): void {
    const { ctx, x, y } = context;
    const rotation = Math.PI * (1 - progress); // Rotate from 180° to 0°

    ctx.save();
    ctx.globalAlpha = progress;
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.translate(-x, -y);
    this.renderStatic(context);
    ctx.restore();
  }

  /**
   * Flip out animation
   */
  private static renderFlipOut(context: TextRenderContext, progress: number): void {
    const { ctx, x, y } = context;
    const rotation = Math.PI * progress; // Rotate from 0° to 180°

    ctx.save();
    ctx.globalAlpha = 1 - progress;
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.translate(-x, -y);
    this.renderStatic(context);
    ctx.restore();
  }

  /**
   * Get animation list for UI
   */
  static getAvailableAnimations(): Array<{
    type: AnimationType;
    name: string;
    category: string;
  }> {
    return [
      { type: 'none', name: 'None', category: 'Basic' },
      { type: 'fade-in', name: 'Fade In', category: 'Basic' },
      { type: 'fade-out', name: 'Fade Out', category: 'Basic' },
      { type: 'slide-in', name: 'Slide In', category: 'Entrance' },
      { type: 'slide-out', name: 'Slide Out', category: 'Exit' },
      { type: 'zoom-in', name: 'Zoom In', category: 'Entrance' },
      { type: 'zoom-out', name: 'Zoom Out', category: 'Exit' },
      { type: 'bounce-in', name: 'Bounce In', category: 'Entrance' },
      { type: 'bounce-out', name: 'Bounce Out', category: 'Exit' },
      { type: 'typewriter', name: 'Typewriter', category: 'Special' },
      { type: 'flip-in', name: 'Flip In', category: 'Entrance' },
      { type: 'flip-out', name: 'Flip Out', category: 'Exit' },
    ];
  }
}
