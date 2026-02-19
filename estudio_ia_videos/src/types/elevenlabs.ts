/**
 * ElevenLabs public types — re-exported for use across the app.
 *
 * Import from '@/types/elevenlabs' for lightweight type-only usage.
 * Import from '@/services/elevenlabs-service' for runtime code.
 */

export type {
  ElevenLabsConfig,
  ElevenLabsTTSRequest,
  ElevenLabsTTSResult,
  ElevenLabsLongTTSResult,
  ElevenLabsSubscriptionInfo,
  VoiceSettings,
} from '@/services/elevenlabs-service';

/** Voice option shaped for UI dropdowns / selectors. */
export interface ElevenLabsVoiceOption {
  id: string;
  name: string;
  category: string;
  language: string;
  gender: 'male' | 'female' | 'neutral';
  previewUrl: string | null;
  description: string;
  labels: Record<string, string>;
}

/** Subscription status for dashboard display. */
export interface ElevenLabsSubscriptionStatus {
  tier: string;
  used: number;
  limit: number;
  remaining: number;
  resetsAt: Date;
  canExtend: boolean;
}

/** Model option for model selector. */
export interface ElevenLabsModelOption {
  id: string;
  name: string;
  description: string;
  canDoTTS: boolean;
  canDoVoiceConversion: boolean;
  languages: string[];
  costFactor: number;
}
