import type { CanvasScene } from '@components/studio-unified/InteractiveCanvas';

/** Voice/TTS configuration per scene */
export interface SceneVoiceConfig {
  voiceId: string;
  voiceName: string;
  provider: 'edge-tts' | 'elevenlabs' | 'azure' | 'google';
  speed?: number;  // 0.5 - 2.0
  pitch?: number;  // -20 to 20
  language?: string;
}

/** Avatar configuration per scene */
export interface SceneAvatarConfig {
  avatarId: string;
  avatarName: string;
  thumbnailUrl: string;
  provider: 'did' | 'heygen' | 'rpm' | 'custom';
  emotion?: string;
  position?: 'left' | 'center' | 'right' | 'bottom-right' | 'bottom-left';
}

/** Background music configuration */
export interface SceneMusicConfig {
  trackId: string;
  trackName: string;
  url: string;
  volume: number;    // 0-100
  fadeIn?: number;    // seconds
  fadeOut?: number;   // seconds
}

/** TTS generation state */
export type TTSState = 'idle' | 'generating' | 'ready' | 'error';

export interface Scene extends CanvasScene {
  duration: number;
  transition: 'fade' | 'slide' | 'zoom' | 'none';

  /** Narration script text for this scene */
  script?: string;

  /** TTS-generated audio URL for this scene */
  audioUrl?: string;

  /** TTS generation state */
  ttsState?: TTSState;

  /** Voice configuration for TTS */
  voiceConfig?: SceneVoiceConfig;

  /** Avatar assigned to this scene */
  avatarConfig?: SceneAvatarConfig;

  /** Background music for this scene */
  musicConfig?: SceneMusicConfig;

  /** Lottie/animation effects applied to this scene */
  effects?: Array<{ type: string; name: string; lottieId: string }>;

  /** Notes (internal, not shown in video) */
  notes?: string;
}
