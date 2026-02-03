/**
 * Video Preview Service
 * Player de preview em tempo real antes de renderização completa
 * 
 * Features:
 * - Preview de 30 segundos
 * - Preview por slide individual
 * - Composição visual rápida sem encoding completo
 * - Audio preview com TTS
 * - Avatar overlay preview
 * 
 * @module lib/preview/video-preview-service
 */

// ============================================================================
// TYPES
// ============================================================================

export interface SlideData {
  id: string;
  order: number;
  imageUrl: string;
  text: string;
  notes: string;
  duration: number; // em segundos
  transitions?: TransitionConfig;
}

export interface TransitionConfig {
  type: 'none' | 'fade' | 'slide' | 'zoom' | 'dissolve';
  duration: number; // em ms
}

export interface AvatarConfig {
  enabled: boolean;
  avatarId: string;
  position: 'bottom-right' | 'bottom-left' | 'full-screen' | 'picture-in-picture';
  size: 'small' | 'medium' | 'large';
}

export interface VoiceConfig {
  voiceId: string;
  speed: number;
  pitch?: number;
}

export interface PreviewConfig {
  slides: SlideData[];
  avatar: AvatarConfig;
  voice: VoiceConfig;
  backgroundMusic?: BackgroundMusicConfig;
  resolution: PreviewResolution;
}

export interface BackgroundMusicConfig {
  trackId: string;
  volume: number; // 0-1
  fadeIn: boolean;
  fadeOut: boolean;
}

export type PreviewResolution = '480p' | '720p' | '1080p';

export interface PreviewFrame {
  timestamp: number;
  slideId: string;
  imageData: string; // base64 or URL
  audioChunk?: ArrayBuffer;
  avatarOverlay?: string;
}

export interface PreviewState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  currentSlideIndex: number;
  isBuffering: boolean;
  error?: string;
}

export interface PreviewCallbacks {
  onTimeUpdate?: (time: number) => void;
  onSlideChange?: (slideIndex: number) => void;
  onEnded?: () => void;
  onError?: (error: Error) => void;
  onBuffering?: (isBuffering: boolean) => void;
}

// ============================================================================
// PREVIEW SERVICE
// ============================================================================

const logger = {
  info: (msg: string, meta?: Record<string, unknown>) => 
    console.log(`[PREVIEW] ${msg}`, meta || ''),
  error: (msg: string, meta?: Record<string, unknown>) => 
    console.error(`[PREVIEW ERROR] ${msg}`, meta || ''),
};

export class VideoPreviewService {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private audioContext: AudioContext | null = null;
  private animationFrame: number | null = null;
  private audioSource: AudioBufferSourceNode | null = null;
  
  private state: PreviewState = {
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    currentSlideIndex: 0,
    isBuffering: false,
  };

  private config: PreviewConfig | null = null;
  private callbacks: PreviewCallbacks = {};
  private imageCache: Map<string, HTMLImageElement> = new Map();
  private audioCache: Map<string, AudioBuffer> = new Map();
  
  private startTime: number = 0;
  private pausedAt: number = 0;

  constructor() {
    // Audio context will be created on first play
  }

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  /**
   * Inicializa o preview com um canvas target
   */
  initialize(canvasElement: HTMLCanvasElement, callbacks?: PreviewCallbacks): void {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.callbacks = callbacks || {};

    if (!this.ctx) {
      throw new Error('Não foi possível obter contexto 2D do canvas');
    }

    logger.info('Preview inicializado', {
      width: canvasElement.width,
      height: canvasElement.height,
    });
  }

  /**
   * Configura o preview com os dados do projeto
   */
  async configure(config: PreviewConfig): Promise<void> {
    this.config = config;
    
    // Calcula duração total
    this.state.duration = config.slides.reduce((acc, slide) => acc + slide.duration, 0);
    
    // Pré-carrega imagens
    await this.preloadImages(config.slides);
    
    logger.info('Preview configurado', {
      slideCount: config.slides.length,
      duration: this.state.duration,
    });
  }

  // ==========================================================================
  // PRELOADING
  // ==========================================================================

  private async preloadImages(slides: SlideData[]): Promise<void> {
    const loadPromises = slides.map(async (slide) => {
      if (this.imageCache.has(slide.id)) return;

      return new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          this.imageCache.set(slide.id, img);
          resolve();
        };
        img.onerror = () => {
          logger.error('Erro ao carregar imagem', { slideId: slide.id });
          reject(new Error(`Failed to load image for slide ${slide.id}`));
        };
        img.src = slide.imageUrl;
      });
    });

    try {
      await Promise.all(loadPromises);
      logger.info('Todas as imagens pré-carregadas');
    } catch (error) {
      logger.error('Erro no preload de imagens', { error });
    }
  }

  private async preloadAudio(voiceId: string, text: string): Promise<AudioBuffer | null> {
    const cacheKey = `${voiceId}:${text.substring(0, 50)}`;
    
    if (this.audioCache.has(cacheKey)) {
      return this.audioCache.get(cacheKey)!;
    }

    try {
      // Request TTS preview
      const response = await fetch('/api/tts/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voiceId,
          text: text.substring(0, 500), // Limit for preview
          speed: this.config?.voice.speed || 1.0,
        }),
      });

      if (!response.ok) {
        throw new Error('TTS preview failed');
      }

      const arrayBuffer = await response.arrayBuffer();
      
      if (!this.audioContext) {
        this.audioContext = new AudioContext();
      }

      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      this.audioCache.set(cacheKey, audioBuffer);
      
      return audioBuffer;
    } catch (error) {
      logger.error('Erro ao carregar áudio', { error });
      return null;
    }
  }

  // ==========================================================================
  // PLAYBACK CONTROL
  // ==========================================================================

  /**
   * Inicia ou resume o preview
   */
  play(): void {
    if (!this.config || !this.ctx || !this.canvas) {
      logger.error('Preview não configurado');
      return;
    }

    if (this.state.isPlaying) return;

    // Create audio context if needed (must be after user interaction)
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }

    this.state.isPlaying = true;
    this.startTime = performance.now() - (this.pausedAt * 1000);
    
    this.renderLoop();
    logger.info('Preview iniciado');
  }

  /**
   * Pausa o preview
   */
  pause(): void {
    if (!this.state.isPlaying) return;

    this.state.isPlaying = false;
    this.pausedAt = this.state.currentTime;

    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }

    if (this.audioSource) {
      this.audioSource.stop();
      this.audioSource = null;
    }

    logger.info('Preview pausado', { currentTime: this.state.currentTime });
  }

  /**
   * Para o preview e reseta
   */
  stop(): void {
    this.pause();
    this.state.currentTime = 0;
    this.state.currentSlideIndex = 0;
    this.pausedAt = 0;
    
    // Render first slide
    if (this.config && this.config.slides.length > 0) {
      this.renderSlide(this.config.slides[0]);
    }

    logger.info('Preview parado');
  }

  /**
   * Seek para um tempo específico
   */
  seek(time: number): void {
    const wasPlaying = this.state.isPlaying;
    
    if (wasPlaying) {
      this.pause();
    }

    this.state.currentTime = Math.max(0, Math.min(time, this.state.duration));
    this.pausedAt = this.state.currentTime;
    
    // Find and render current slide
    const slideIndex = this.getSlideAtTime(this.state.currentTime);
    this.state.currentSlideIndex = slideIndex;
    
    if (this.config && this.config.slides[slideIndex]) {
      this.renderSlide(this.config.slides[slideIndex]);
    }

    if (wasPlaying) {
      this.play();
    }

    this.callbacks.onTimeUpdate?.(this.state.currentTime);
  }

  /**
   * Pula para um slide específico
   */
  goToSlide(slideIndex: number): void {
    if (!this.config || slideIndex < 0 || slideIndex >= this.config.slides.length) {
      return;
    }

    // Calculate time at slide start
    let time = 0;
    for (let i = 0; i < slideIndex; i++) {
      time += this.config.slides[i].duration;
    }

    this.seek(time);
  }

  // ==========================================================================
  // RENDERING
  // ==========================================================================

  private renderLoop(): void {
    if (!this.state.isPlaying || !this.config || !this.ctx) return;

    const elapsed = (performance.now() - this.startTime) / 1000;
    this.state.currentTime = Math.min(elapsed, this.state.duration);

    // Check if ended
    if (this.state.currentTime >= this.state.duration) {
      this.state.isPlaying = false;
      this.callbacks.onEnded?.();
      return;
    }

    // Get current slide
    const slideIndex = this.getSlideAtTime(this.state.currentTime);
    
    if (slideIndex !== this.state.currentSlideIndex) {
      this.state.currentSlideIndex = slideIndex;
      this.callbacks.onSlideChange?.(slideIndex);
    }

    // Render current slide
    const slide = this.config.slides[slideIndex];
    this.renderSlide(slide);

    // Render avatar overlay if enabled
    if (this.config.avatar.enabled) {
      this.renderAvatarOverlay();
    }

    // Render progress bar
    this.renderProgressBar();

    // Update callback
    this.callbacks.onTimeUpdate?.(this.state.currentTime);

    // Continue loop
    this.animationFrame = requestAnimationFrame(() => this.renderLoop());
  }

  private renderSlide(slide: SlideData): void {
    if (!this.ctx || !this.canvas) return;

    const img = this.imageCache.get(slide.id);
    
    if (img) {
      // Draw slide image scaled to fit
      const scale = Math.min(
        this.canvas.width / img.width,
        this.canvas.height / img.height
      );
      const x = (this.canvas.width - img.width * scale) / 2;
      const y = (this.canvas.height - img.height * scale) / 2;

      this.ctx.fillStyle = '#000';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
    } else {
      // Fallback: render placeholder
      this.ctx.fillStyle = '#1a1a2e';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.fillStyle = '#fff';
      this.ctx.font = '24px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('Carregando slide...', this.canvas.width / 2, this.canvas.height / 2);
    }
  }

  private renderAvatarOverlay(): void {
    if (!this.ctx || !this.canvas || !this.config) return;

    const { position, size } = this.config.avatar;
    
    // Calculate avatar dimensions
    const sizes = { small: 0.15, medium: 0.25, large: 0.35 };
    const sizeRatio = sizes[size];
    const avatarWidth = this.canvas.width * sizeRatio;
    const avatarHeight = avatarWidth * 1.2;

    // Calculate position
    let x = 0, y = 0;
    const padding = 20;

    switch (position) {
      case 'bottom-right':
        x = this.canvas.width - avatarWidth - padding;
        y = this.canvas.height - avatarHeight - padding - 30; // Account for progress bar
        break;
      case 'bottom-left':
        x = padding;
        y = this.canvas.height - avatarHeight - padding - 30;
        break;
      case 'full-screen':
        // Avatar would be composited differently for full-screen
        return;
      case 'picture-in-picture':
        x = this.canvas.width - avatarWidth - padding;
        y = padding;
        break;
    }

    // Draw avatar placeholder
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.roundRect(x, y, avatarWidth, avatarHeight, 12);
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.fill();
    
    // Avatar icon placeholder
    this.ctx.fillStyle = '#fff';
    this.ctx.font = `${avatarWidth * 0.3}px sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('👤', x + avatarWidth / 2, y + avatarHeight / 2);
    
    this.ctx.restore();
  }

  private renderProgressBar(): void {
    if (!this.ctx || !this.canvas) return;

    const barHeight = 4;
    const y = this.canvas.height - barHeight - 10;
    const progress = this.state.currentTime / this.state.duration;

    // Background
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    this.ctx.fillRect(10, y, this.canvas.width - 20, barHeight);

    // Progress
    this.ctx.fillStyle = '#3b82f6';
    this.ctx.fillRect(10, y, (this.canvas.width - 20) * progress, barHeight);

    // Time display
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '12px sans-serif';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(
      `${this.formatTime(this.state.currentTime)} / ${this.formatTime(this.state.duration)}`,
      10,
      y - 5
    );
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private getSlideAtTime(time: number): number {
    if (!this.config) return 0;

    let accumulated = 0;
    for (let i = 0; i < this.config.slides.length; i++) {
      accumulated += this.config.slides[i].duration;
      if (time < accumulated) {
        return i;
      }
    }
    return this.config.slides.length - 1;
  }

  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  // ==========================================================================
  // STATE
  // ==========================================================================

  getState(): PreviewState {
    return { ...this.state };
  }

  isPlaying(): boolean {
    return this.state.isPlaying;
  }

  getCurrentTime(): number {
    return this.state.currentTime;
  }

  getDuration(): number {
    return this.state.duration;
  }

  getCurrentSlideIndex(): number {
    return this.state.currentSlideIndex;
  }

  // ==========================================================================
  // CLEANUP
  // ==========================================================================

  dispose(): void {
    this.stop();
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.imageCache.clear();
    this.audioCache.clear();
    this.canvas = null;
    this.ctx = null;
    this.config = null;

    logger.info('Preview disposed');
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

let previewServiceInstance: VideoPreviewService | null = null;

export function getPreviewService(): VideoPreviewService {
  if (!previewServiceInstance) {
    previewServiceInstance = new VideoPreviewService();
  }
  return previewServiceInstance;
}

export default VideoPreviewService;
