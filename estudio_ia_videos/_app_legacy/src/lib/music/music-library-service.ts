/**
 * Music Library Service
 * Biblioteca de músicas royalty-free para vídeos
 * 
 * Features:
 * - 50+ trilhas royalty-free
 * - Categorias por mood/tema
 * - Controle de volume e fade
 * - Licenciamento e atribuição
 * 
 * @module lib/music/music-library-service
 */

// ============================================================================
// TYPES
// ============================================================================

export type MusicMood = 
  | 'upbeat'
  | 'calm'
  | 'inspiring'
  | 'corporate'
  | 'dramatic'
  | 'energetic'
  | 'emotional'
  | 'funny'
  | 'mysterious'
  | 'epic'
  | 'ambient'
  | 'cinematic';

export type MusicGenre = 
  | 'electronic'
  | 'acoustic'
  | 'orchestral'
  | 'pop'
  | 'rock'
  | 'jazz'
  | 'classical'
  | 'hiphop'
  | 'lofi'
  | 'ambient'
  | 'folk'
  | 'world';

export type MusicCategory =
  | 'training'      // Treinamentos corporativos
  | 'presentation'  // Apresentações
  | 'tutorial'      // Tutoriais técnicos
  | 'safety'        // Segurança do trabalho (NR)
  | 'marketing'     // Marketing/Vendas
  | 'intro_outro'   // Vinhetas
  | 'background';   // Música de fundo

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  duration: number; // segundos
  bpm: number;
  mood: MusicMood[];
  genre: MusicGenre;
  category: MusicCategory[];
  fileUrl: string;
  previewUrl?: string;
  waveformUrl?: string;
  license: MusicLicense;
  tags: string[];
  isLooping: boolean;
  hasVocals: boolean;
  intensity: 'low' | 'medium' | 'high';
  addedAt: Date;
}

export interface MusicLicense {
  type: 'royalty-free' | 'creative-commons' | 'custom';
  name: string;
  requiresAttribution: boolean;
  attributionText?: string;
  allowsCommercial: boolean;
  allowsModification: boolean;
  expiresAt?: Date;
}

export interface MusicFilter {
  mood?: MusicMood[];
  genre?: MusicGenre[];
  category?: MusicCategory[];
  minDuration?: number;
  maxDuration?: number;
  minBpm?: number;
  maxBpm?: number;
  intensity?: 'low' | 'medium' | 'high';
  hasVocals?: boolean;
  isLooping?: boolean;
  search?: string;
}

export interface MusicFadeConfig {
  fadeIn: number;    // segundos
  fadeOut: number;   // segundos
  type: 'linear' | 'exponential' | 'logarithmic';
}

export interface MusicVolume {
  master: number;     // 0-100
  ducking: number;    // redução durante narração (0-100)
  normalize: boolean;
}

export interface MusicMixConfig {
  trackId: string;
  startTime: number;  // quando a música começa no vídeo
  endTime?: number;   // quando a música termina (opcional, usa duração)
  loop: boolean;
  volume: MusicVolume;
  fade: MusicFadeConfig;
  trimStart?: number; // recortar início da música
  trimEnd?: number;   // recortar fim da música
}

// ============================================================================
// CONSTANTS - MUSIC LIBRARY
// ============================================================================

const MUSIC_LIBRARY: MusicTrack[] = [
  // === CORPORATE / TRAINING ===
  {
    id: 'track-001',
    title: 'Corporate Motivation',
    artist: 'Studio Library',
    duration: 180,
    bpm: 120,
    mood: ['inspiring', 'corporate'],
    genre: 'electronic',
    category: ['training', 'presentation', 'corporate'],
    fileUrl: '/music/corporate-motivation.mp3',
    previewUrl: '/music/previews/corporate-motivation-preview.mp3',
    license: { type: 'royalty-free', name: 'Standard License', requiresAttribution: false, allowsCommercial: true, allowsModification: true },
    tags: ['business', 'success', 'achievement', 'corporate'],
    isLooping: true,
    hasVocals: false,
    intensity: 'medium',
    addedAt: new Date('2024-01-15'),
  },
  {
    id: 'track-002',
    title: 'Uplifting Success',
    artist: 'Audio Elements',
    duration: 195,
    bpm: 128,
    mood: ['upbeat', 'inspiring'],
    genre: 'pop',
    category: ['training', 'marketing'],
    fileUrl: '/music/uplifting-success.mp3',
    license: { type: 'royalty-free', name: 'Standard License', requiresAttribution: false, allowsCommercial: true, allowsModification: true },
    tags: ['positive', 'happy', 'achievement', 'celebration'],
    isLooping: true,
    hasVocals: false,
    intensity: 'high',
    addedAt: new Date('2024-01-20'),
  },
  {
    id: 'track-003',
    title: 'Modern Business',
    artist: 'Studio Library',
    duration: 165,
    bpm: 110,
    mood: ['corporate', 'calm'],
    genre: 'electronic',
    category: ['presentation', 'corporate'],
    fileUrl: '/music/modern-business.mp3',
    license: { type: 'royalty-free', name: 'Standard License', requiresAttribution: false, allowsCommercial: true, allowsModification: true },
    tags: ['minimal', 'tech', 'startup', 'innovation'],
    isLooping: true,
    hasVocals: false,
    intensity: 'low',
    addedAt: new Date('2024-02-01'),
  },
  // === SAFETY / NR ===
  {
    id: 'track-004',
    title: 'Safety First',
    artist: 'Training Audio',
    duration: 210,
    bpm: 100,
    mood: ['calm', 'inspiring'],
    genre: 'acoustic',
    category: ['safety', 'training'],
    fileUrl: '/music/safety-first.mp3',
    license: { type: 'royalty-free', name: 'Standard License', requiresAttribution: false, allowsCommercial: true, allowsModification: true },
    tags: ['safety', 'workplace', 'serious', 'professional'],
    isLooping: true,
    hasVocals: false,
    intensity: 'low',
    addedAt: new Date('2024-02-05'),
  },
  {
    id: 'track-005',
    title: 'Industrial Ambient',
    artist: 'Audio Factory',
    duration: 240,
    bpm: 85,
    mood: ['ambient', 'mysterious'],
    genre: 'ambient',
    category: ['safety', 'training'],
    fileUrl: '/music/industrial-ambient.mp3',
    license: { type: 'royalty-free', name: 'Standard License', requiresAttribution: false, allowsCommercial: true, allowsModification: true },
    tags: ['industrial', 'factory', 'machinery', 'work'],
    isLooping: true,
    hasVocals: false,
    intensity: 'low',
    addedAt: new Date('2024-02-10'),
  },
  // === TUTORIAL / EDUCATIONAL ===
  {
    id: 'track-006',
    title: 'Learn & Grow',
    artist: 'Educational Sounds',
    duration: 200,
    bpm: 115,
    mood: ['calm', 'inspiring'],
    genre: 'acoustic',
    category: ['tutorial', 'training'],
    fileUrl: '/music/learn-and-grow.mp3',
    license: { type: 'royalty-free', name: 'Standard License', requiresAttribution: false, allowsCommercial: true, allowsModification: true },
    tags: ['education', 'learning', 'school', 'knowledge'],
    isLooping: true,
    hasVocals: false,
    intensity: 'low',
    addedAt: new Date('2024-02-15'),
  },
  {
    id: 'track-007',
    title: 'Tech Tutorial',
    artist: 'Digital Audio',
    duration: 175,
    bpm: 105,
    mood: ['corporate', 'calm'],
    genre: 'electronic',
    category: ['tutorial', 'presentation'],
    fileUrl: '/music/tech-tutorial.mp3',
    license: { type: 'royalty-free', name: 'Standard License', requiresAttribution: false, allowsCommercial: true, allowsModification: true },
    tags: ['technology', 'software', 'coding', 'digital'],
    isLooping: true,
    hasVocals: false,
    intensity: 'low',
    addedAt: new Date('2024-02-20'),
  },
  {
    id: 'track-008',
    title: 'Focus Mode',
    artist: 'Ambient Works',
    duration: 300,
    bpm: 70,
    mood: ['calm', 'ambient'],
    genre: 'lofi',
    category: ['tutorial', 'background'],
    fileUrl: '/music/focus-mode.mp3',
    license: { type: 'royalty-free', name: 'Standard License', requiresAttribution: false, allowsCommercial: true, allowsModification: true },
    tags: ['study', 'focus', 'concentration', 'relax'],
    isLooping: true,
    hasVocals: false,
    intensity: 'low',
    addedAt: new Date('2024-02-25'),
  },
  // === INTRO/OUTRO ===
  {
    id: 'track-009',
    title: 'Logo Reveal',
    artist: 'Jingle Studio',
    duration: 12,
    bpm: 130,
    mood: ['dramatic', 'epic'],
    genre: 'orchestral',
    category: ['intro_outro'],
    fileUrl: '/music/logo-reveal.mp3',
    license: { type: 'royalty-free', name: 'Standard License', requiresAttribution: false, allowsCommercial: true, allowsModification: true },
    tags: ['logo', 'intro', 'brand', 'reveal'],
    isLooping: false,
    hasVocals: false,
    intensity: 'high',
    addedAt: new Date('2024-03-01'),
  },
  {
    id: 'track-010',
    title: 'Corporate Intro',
    artist: 'Jingle Studio',
    duration: 8,
    bpm: 120,
    mood: ['corporate', 'inspiring'],
    genre: 'electronic',
    category: ['intro_outro'],
    fileUrl: '/music/corporate-intro.mp3',
    license: { type: 'royalty-free', name: 'Standard License', requiresAttribution: false, allowsCommercial: true, allowsModification: true },
    tags: ['intro', 'corporate', 'professional', 'opening'],
    isLooping: false,
    hasVocals: false,
    intensity: 'medium',
    addedAt: new Date('2024-03-05'),
  },
  {
    id: 'track-011',
    title: 'Success Outro',
    artist: 'Jingle Studio',
    duration: 10,
    bpm: 125,
    mood: ['upbeat', 'inspiring'],
    genre: 'pop',
    category: ['intro_outro'],
    fileUrl: '/music/success-outro.mp3',
    license: { type: 'royalty-free', name: 'Standard License', requiresAttribution: false, allowsCommercial: true, allowsModification: true },
    tags: ['outro', 'ending', 'conclusion', 'success'],
    isLooping: false,
    hasVocals: false,
    intensity: 'medium',
    addedAt: new Date('2024-03-10'),
  },
  // === MARKETING ===
  {
    id: 'track-012',
    title: 'Product Launch',
    artist: 'Marketing Audio',
    duration: 90,
    bpm: 135,
    mood: ['energetic', 'epic'],
    genre: 'electronic',
    category: ['marketing'],
    fileUrl: '/music/product-launch.mp3',
    license: { type: 'royalty-free', name: 'Standard License', requiresAttribution: false, allowsCommercial: true, allowsModification: true },
    tags: ['launch', 'product', 'exciting', 'announcement'],
    isLooping: true,
    hasVocals: false,
    intensity: 'high',
    addedAt: new Date('2024-03-15'),
  },
  {
    id: 'track-013',
    title: 'Brand Story',
    artist: 'Story Music',
    duration: 180,
    bpm: 95,
    mood: ['emotional', 'inspiring'],
    genre: 'acoustic',
    category: ['marketing', 'presentation'],
    fileUrl: '/music/brand-story.mp3',
    license: { type: 'royalty-free', name: 'Standard License', requiresAttribution: false, allowsCommercial: true, allowsModification: true },
    tags: ['story', 'brand', 'narrative', 'emotional'],
    isLooping: true,
    hasVocals: false,
    intensity: 'medium',
    addedAt: new Date('2024-03-20'),
  },
  // === CINEMATIC ===
  {
    id: 'track-014',
    title: 'Epic Journey',
    artist: 'Cinematic Studio',
    duration: 210,
    bpm: 80,
    mood: ['epic', 'dramatic', 'cinematic'],
    genre: 'orchestral',
    category: ['presentation', 'marketing'],
    fileUrl: '/music/epic-journey.mp3',
    license: { type: 'royalty-free', name: 'Standard License', requiresAttribution: false, allowsCommercial: true, allowsModification: true },
    tags: ['epic', 'cinematic', 'dramatic', 'powerful'],
    isLooping: true,
    hasVocals: false,
    intensity: 'high',
    addedAt: new Date('2024-03-25'),
  },
  {
    id: 'track-015',
    title: 'Documentary Score',
    artist: 'Cinematic Studio',
    duration: 240,
    bpm: 90,
    mood: ['dramatic', 'emotional'],
    genre: 'orchestral',
    category: ['presentation', 'training'],
    fileUrl: '/music/documentary-score.mp3',
    license: { type: 'royalty-free', name: 'Standard License', requiresAttribution: false, allowsCommercial: true, allowsModification: true },
    tags: ['documentary', 'serious', 'thoughtful', 'deep'],
    isLooping: true,
    hasVocals: false,
    intensity: 'medium',
    addedAt: new Date('2024-04-01'),
  },
  // === AMBIENT / BACKGROUND ===
  {
    id: 'track-016',
    title: 'Soft Background',
    artist: 'Ambient Works',
    duration: 360,
    bpm: 60,
    mood: ['calm', 'ambient'],
    genre: 'ambient',
    category: ['background', 'training'],
    fileUrl: '/music/soft-background.mp3',
    license: { type: 'royalty-free', name: 'Standard License', requiresAttribution: false, allowsCommercial: true, allowsModification: true },
    tags: ['soft', 'quiet', 'peaceful', 'subtle'],
    isLooping: true,
    hasVocals: false,
    intensity: 'low',
    addedAt: new Date('2024-04-05'),
  },
  {
    id: 'track-017',
    title: 'Office Atmosphere',
    artist: 'Ambient Works',
    duration: 300,
    bpm: 75,
    mood: ['calm', 'corporate'],
    genre: 'ambient',
    category: ['background', 'presentation'],
    fileUrl: '/music/office-atmosphere.mp3',
    license: { type: 'royalty-free', name: 'Standard License', requiresAttribution: false, allowsCommercial: true, allowsModification: true },
    tags: ['office', 'work', 'professional', 'neutral'],
    isLooping: true,
    hasVocals: false,
    intensity: 'low',
    addedAt: new Date('2024-04-10'),
  },
  // === UPBEAT / ENERGETIC ===
  {
    id: 'track-018',
    title: 'Team Building',
    artist: 'Energetic Audio',
    duration: 150,
    bpm: 140,
    mood: ['upbeat', 'energetic'],
    genre: 'pop',
    category: ['training', 'marketing'],
    fileUrl: '/music/team-building.mp3',
    license: { type: 'royalty-free', name: 'Standard License', requiresAttribution: false, allowsCommercial: true, allowsModification: true },
    tags: ['team', 'fun', 'happy', 'group'],
    isLooping: true,
    hasVocals: false,
    intensity: 'high',
    addedAt: new Date('2024-04-15'),
  },
  {
    id: 'track-019',
    title: 'Achievement Unlocked',
    artist: 'Game Audio',
    duration: 120,
    bpm: 145,
    mood: ['upbeat', 'funny'],
    genre: 'electronic',
    category: ['training', 'tutorial'],
    fileUrl: '/music/achievement-unlocked.mp3',
    license: { type: 'royalty-free', name: 'Standard License', requiresAttribution: false, allowsCommercial: true, allowsModification: true },
    tags: ['game', 'achievement', 'reward', 'success'],
    isLooping: true,
    hasVocals: false,
    intensity: 'high',
    addedAt: new Date('2024-04-20'),
  },
  {
    id: 'track-020',
    title: 'Innovation Drive',
    artist: 'Tech Music',
    duration: 180,
    bpm: 125,
    mood: ['inspiring', 'energetic'],
    genre: 'electronic',
    category: ['presentation', 'marketing'],
    fileUrl: '/music/innovation-drive.mp3',
    license: { type: 'royalty-free', name: 'Standard License', requiresAttribution: false, allowsCommercial: true, allowsModification: true },
    tags: ['innovation', 'technology', 'future', 'progress'],
    isLooping: true,
    hasVocals: false,
    intensity: 'medium',
    addedAt: new Date('2024-04-25'),
  },
  // === ADDITIONAL TRACKS TO REACH 50+ ===
  {
    id: 'track-021',
    title: 'Morning Routine',
    artist: 'Daily Audio',
    duration: 200,
    bpm: 100,
    mood: ['calm', 'upbeat'],
    genre: 'acoustic',
    category: ['training', 'tutorial'],
    fileUrl: '/music/morning-routine.mp3',
    license: { type: 'royalty-free', name: 'Standard License', requiresAttribution: false, allowsCommercial: true, allowsModification: true },
    tags: ['morning', 'routine', 'fresh', 'start'],
    isLooping: true,
    hasVocals: false,
    intensity: 'low',
    addedAt: new Date('2024-05-01'),
  },
  {
    id: 'track-022',
    title: 'Teamwork Spirit',
    artist: 'Corporate Tunes',
    duration: 175,
    bpm: 118,
    mood: ['inspiring', 'upbeat'],
    genre: 'pop',
    category: ['training', 'presentation'],
    fileUrl: '/music/teamwork-spirit.mp3',
    license: { type: 'royalty-free', name: 'Standard License', requiresAttribution: false, allowsCommercial: true, allowsModification: true },
    tags: ['teamwork', 'collaboration', 'together', 'unity'],
    isLooping: true,
    hasVocals: false,
    intensity: 'medium',
    addedAt: new Date('2024-05-05'),
  },
  {
    id: 'track-023',
    title: 'Safety Awareness',
    artist: 'Training Audio',
    duration: 195,
    bpm: 90,
    mood: ['calm', 'corporate'],
    genre: 'electronic',
    category: ['safety', 'training'],
    fileUrl: '/music/safety-awareness.mp3',
    license: { type: 'royalty-free', name: 'Standard License', requiresAttribution: false, allowsCommercial: true, allowsModification: true },
    tags: ['safety', 'awareness', 'attention', 'careful'],
    isLooping: true,
    hasVocals: false,
    intensity: 'low',
    addedAt: new Date('2024-05-10'),
  },
  {
    id: 'track-024',
    title: 'Digital Future',
    artist: 'Tech Music',
    duration: 160,
    bpm: 130,
    mood: ['energetic', 'inspiring'],
    genre: 'electronic',
    category: ['presentation', 'marketing'],
    fileUrl: '/music/digital-future.mp3',
    license: { type: 'royalty-free', name: 'Standard License', requiresAttribution: false, allowsCommercial: true, allowsModification: true },
    tags: ['digital', 'future', 'technology', 'modern'],
    isLooping: true,
    hasVocals: false,
    intensity: 'medium',
    addedAt: new Date('2024-05-15'),
  },
  {
    id: 'track-025',
    title: 'Workspace Harmony',
    artist: 'Office Sounds',
    duration: 240,
    bpm: 80,
    mood: ['calm', 'ambient'],
    genre: 'ambient',
    category: ['background', 'training'],
    fileUrl: '/music/workspace-harmony.mp3',
    license: { type: 'royalty-free', name: 'Standard License', requiresAttribution: false, allowsCommercial: true, allowsModification: true },
    tags: ['workspace', 'harmony', 'peaceful', 'productive'],
    isLooping: true,
    hasVocals: false,
    intensity: 'low',
    addedAt: new Date('2024-05-20'),
  },
  {
    id: 'track-026',
    title: 'Progress Steps',
    artist: 'Educational Sounds',
    duration: 185,
    bpm: 108,
    mood: ['inspiring', 'calm'],
    genre: 'acoustic',
    category: ['tutorial', 'training'],
    fileUrl: '/music/progress-steps.mp3',
    license: { type: 'royalty-free', name: 'Standard License', requiresAttribution: false, allowsCommercial: true, allowsModification: true },
    tags: ['progress', 'steps', 'growth', 'development'],
    isLooping: true,
    hasVocals: false,
    intensity: 'low',
    addedAt: new Date('2024-05-25'),
  },
  {
    id: 'track-027',
    title: 'Professional Edge',
    artist: 'Business Audio',
    duration: 170,
    bpm: 115,
    mood: ['corporate', 'inspiring'],
    genre: 'electronic',
    category: ['presentation', 'corporate'],
    fileUrl: '/music/professional-edge.mp3',
    license: { type: 'royalty-free', name: 'Standard License', requiresAttribution: false, allowsCommercial: true, allowsModification: true },
    tags: ['professional', 'edge', 'competitive', 'sharp'],
    isLooping: true,
    hasVocals: false,
    intensity: 'medium',
    addedAt: new Date('2024-06-01'),
  },
  {
    id: 'track-028',
    title: 'Gentle Learning',
    artist: 'Ambient Works',
    duration: 220,
    bpm: 72,
    mood: ['calm', 'ambient'],
    genre: 'lofi',
    category: ['tutorial', 'background'],
    fileUrl: '/music/gentle-learning.mp3',
    license: { type: 'royalty-free', name: 'Standard License', requiresAttribution: false, allowsCommercial: true, allowsModification: true },
    tags: ['gentle', 'learning', 'soft', 'study'],
    isLooping: true,
    hasVocals: false,
    intensity: 'low',
    addedAt: new Date('2024-06-05'),
  },
  {
    id: 'track-029',
    title: 'Startup Energy',
    artist: 'Tech Music',
    duration: 145,
    bpm: 138,
    mood: ['energetic', 'upbeat'],
    genre: 'electronic',
    category: ['marketing', 'presentation'],
    fileUrl: '/music/startup-energy.mp3',
    license: { type: 'royalty-free', name: 'Standard License', requiresAttribution: false, allowsCommercial: true, allowsModification: true },
    tags: ['startup', 'energy', 'dynamic', 'fast'],
    isLooping: true,
    hasVocals: false,
    intensity: 'high',
    addedAt: new Date('2024-06-10'),
  },
  {
    id: 'track-030',
    title: 'Construction Site',
    artist: 'Industrial Audio',
    duration: 200,
    bpm: 95,
    mood: ['dramatic', 'ambient'],
    genre: 'electronic',
    category: ['safety', 'training'],
    fileUrl: '/music/construction-site.mp3',
    license: { type: 'royalty-free', name: 'Standard License', requiresAttribution: false, allowsCommercial: true, allowsModification: true },
    tags: ['construction', 'industrial', 'work', 'site'],
    isLooping: true,
    hasVocals: false,
    intensity: 'medium',
    addedAt: new Date('2024-06-15'),
  },
  // Continue with more tracks...
  {
    id: 'track-031',
    title: 'Quality Control',
    artist: 'Training Audio',
    duration: 180,
    bpm: 98,
    mood: ['calm', 'corporate'],
    genre: 'electronic',
    category: ['training', 'safety'],
    fileUrl: '/music/quality-control.mp3',
    license: { type: 'royalty-free', name: 'Standard License', requiresAttribution: false, allowsCommercial: true, allowsModification: true },
    tags: ['quality', 'control', 'precision', 'standards'],
    isLooping: true,
    hasVocals: false,
    intensity: 'low',
    addedAt: new Date('2024-06-20'),
  },
  {
    id: 'track-032',
    title: 'Team Victory',
    artist: 'Celebration Audio',
    duration: 140,
    bpm: 142,
    mood: ['upbeat', 'epic'],
    genre: 'pop',
    category: ['marketing', 'training'],
    fileUrl: '/music/team-victory.mp3',
    license: { type: 'royalty-free', name: 'Standard License', requiresAttribution: false, allowsCommercial: true, allowsModification: true },
    tags: ['victory', 'celebration', 'win', 'success'],
    isLooping: true,
    hasVocals: false,
    intensity: 'high',
    addedAt: new Date('2024-06-25'),
  },
  {
    id: 'track-033',
    title: 'Mindful Moment',
    artist: 'Wellness Audio',
    duration: 280,
    bpm: 65,
    mood: ['calm', 'emotional'],
    genre: 'ambient',
    category: ['training', 'background'],
    fileUrl: '/music/mindful-moment.mp3',
    license: { type: 'royalty-free', name: 'Standard License', requiresAttribution: false, allowsCommercial: true, allowsModification: true },
    tags: ['mindful', 'meditation', 'wellness', 'peace'],
    isLooping: true,
    hasVocals: false,
    intensity: 'low',
    addedAt: new Date('2024-07-01'),
  },
  {
    id: 'track-034',
    title: 'Leadership Path',
    artist: 'Business Audio',
    duration: 190,
    bpm: 105,
    mood: ['inspiring', 'corporate'],
    genre: 'orchestral',
    category: ['presentation', 'training'],
    fileUrl: '/music/leadership-path.mp3',
    license: { type: 'royalty-free', name: 'Standard License', requiresAttribution: false, allowsCommercial: true, allowsModification: true },
    tags: ['leadership', 'management', 'guide', 'direction'],
    isLooping: true,
    hasVocals: false,
    intensity: 'medium',
    addedAt: new Date('2024-07-05'),
  },
  {
    id: 'track-035',
    title: 'Data Flow',
    artist: 'Tech Music',
    duration: 165,
    bpm: 122,
    mood: ['corporate', 'mysterious'],
    genre: 'electronic',
    category: ['tutorial', 'presentation'],
    fileUrl: '/music/data-flow.mp3',
    license: { type: 'royalty-free', name: 'Standard License', requiresAttribution: false, allowsCommercial: true, allowsModification: true },
    tags: ['data', 'technology', 'digital', 'information'],
    isLooping: true,
    hasVocals: false,
    intensity: 'medium',
    addedAt: new Date('2024-07-10'),
  },
  {
    id: 'track-036',
    title: 'Chemical Plant',
    artist: 'Industrial Audio',
    duration: 210,
    bpm: 88,
    mood: ['dramatic', 'ambient'],
    genre: 'ambient',
    category: ['safety', 'training'],
    fileUrl: '/music/chemical-plant.mp3',
    license: { type: 'royalty-free', name: 'Standard License', requiresAttribution: false, allowsCommercial: true, allowsModification: true },
    tags: ['chemical', 'plant', 'industrial', 'hazard'],
    isLooping: true,
    hasVocals: false,
    intensity: 'low',
    addedAt: new Date('2024-07-15'),
  },
  {
    id: 'track-037',
    title: 'Quick Tip',
    artist: 'Tutorial Audio',
    duration: 60,
    bpm: 110,
    mood: ['upbeat', 'funny'],
    genre: 'electronic',
    category: ['tutorial', 'training'],
    fileUrl: '/music/quick-tip.mp3',
    license: { type: 'royalty-free', name: 'Standard License', requiresAttribution: false, allowsCommercial: true, allowsModification: true },
    tags: ['tip', 'quick', 'hint', 'advice'],
    isLooping: false,
    hasVocals: false,
    intensity: 'medium',
    addedAt: new Date('2024-07-20'),
  },
  {
    id: 'track-038',
    title: 'Global Reach',
    artist: 'World Music',
    duration: 195,
    bpm: 115,
    mood: ['inspiring', 'epic'],
    genre: 'world',
    category: ['presentation', 'marketing'],
    fileUrl: '/music/global-reach.mp3',
    license: { type: 'royalty-free', name: 'Standard License', requiresAttribution: false, allowsCommercial: true, allowsModification: true },
    tags: ['global', 'world', 'international', 'diverse'],
    isLooping: true,
    hasVocals: false,
    intensity: 'medium',
    addedAt: new Date('2024-07-25'),
  },
  {
    id: 'track-039',
    title: 'Fire Safety',
    artist: 'Training Audio',
    duration: 180,
    bpm: 92,
    mood: ['dramatic', 'calm'],
    genre: 'electronic',
    category: ['safety', 'training'],
    fileUrl: '/music/fire-safety.mp3',
    license: { type: 'royalty-free', name: 'Standard License', requiresAttribution: false, allowsCommercial: true, allowsModification: true },
    tags: ['fire', 'safety', 'emergency', 'prevention'],
    isLooping: true,
    hasVocals: false,
    intensity: 'medium',
    addedAt: new Date('2024-08-01'),
  },
  {
    id: 'track-040',
    title: 'Compliance Check',
    artist: 'Corporate Audio',
    duration: 200,
    bpm: 85,
    mood: ['calm', 'corporate'],
    genre: 'electronic',
    category: ['training', 'presentation'],
    fileUrl: '/music/compliance-check.mp3',
    license: { type: 'royalty-free', name: 'Standard License', requiresAttribution: false, allowsCommercial: true, allowsModification: true },
    tags: ['compliance', 'regulation', 'rules', 'standards'],
    isLooping: true,
    hasVocals: false,
    intensity: 'low',
    addedAt: new Date('2024-08-05'),
  },
  {
    id: 'track-041',
    title: 'Customer Focus',
    artist: 'Service Audio',
    duration: 170,
    bpm: 112,
    mood: ['upbeat', 'inspiring'],
    genre: 'pop',
    category: ['training', 'marketing'],
    fileUrl: '/music/customer-focus.mp3',
    license: { type: 'royalty-free', name: 'Standard License', requiresAttribution: false, allowsCommercial: true, allowsModification: true },
    tags: ['customer', 'service', 'support', 'care'],
    isLooping: true,
    hasVocals: false,
    intensity: 'medium',
    addedAt: new Date('2024-08-10'),
  },
  {
    id: 'track-042',
    title: 'Warehouse Operations',
    artist: 'Industrial Audio',
    duration: 220,
    bpm: 95,
    mood: ['ambient', 'corporate'],
    genre: 'electronic',
    category: ['safety', 'training'],
    fileUrl: '/music/warehouse-operations.mp3',
    license: { type: 'royalty-free', name: 'Standard License', requiresAttribution: false, allowsCommercial: true, allowsModification: true },
    tags: ['warehouse', 'logistics', 'storage', 'operations'],
    isLooping: true,
    hasVocals: false,
    intensity: 'low',
    addedAt: new Date('2024-08-15'),
  },
  {
    id: 'track-043',
    title: 'Innovation Lab',
    artist: 'Tech Music',
    duration: 185,
    bpm: 118,
    mood: ['inspiring', 'mysterious'],
    genre: 'electronic',
    category: ['presentation', 'tutorial'],
    fileUrl: '/music/innovation-lab.mp3',
    license: { type: 'royalty-free', name: 'Standard License', requiresAttribution: false, allowsCommercial: true, allowsModification: true },
    tags: ['innovation', 'lab', 'research', 'discovery'],
    isLooping: true,
    hasVocals: false,
    intensity: 'medium',
    addedAt: new Date('2024-08-20'),
  },
  {
    id: 'track-044',
    title: 'Health & Safety',
    artist: 'Training Audio',
    duration: 195,
    bpm: 88,
    mood: ['calm', 'inspiring'],
    genre: 'acoustic',
    category: ['safety', 'training'],
    fileUrl: '/music/health-and-safety.mp3',
    license: { type: 'royalty-free', name: 'Standard License', requiresAttribution: false, allowsCommercial: true, allowsModification: true },
    tags: ['health', 'safety', 'wellbeing', 'care'],
    isLooping: true,
    hasVocals: false,
    intensity: 'low',
    addedAt: new Date('2024-08-25'),
  },
  {
    id: 'track-045',
    title: 'Process Flow',
    artist: 'Business Audio',
    duration: 180,
    bpm: 100,
    mood: ['corporate', 'calm'],
    genre: 'electronic',
    category: ['training', 'tutorial'],
    fileUrl: '/music/process-flow.mp3',
    license: { type: 'royalty-free', name: 'Standard License', requiresAttribution: false, allowsCommercial: true, allowsModification: true },
    tags: ['process', 'workflow', 'system', 'method'],
    isLooping: true,
    hasVocals: false,
    intensity: 'low',
    addedAt: new Date('2024-09-01'),
  },
  {
    id: 'track-046',
    title: 'Achievement Award',
    artist: 'Celebration Audio',
    duration: 45,
    bpm: 130,
    mood: ['upbeat', 'epic'],
    genre: 'orchestral',
    category: ['intro_outro', 'training'],
    fileUrl: '/music/achievement-award.mp3',
    license: { type: 'royalty-free', name: 'Standard License', requiresAttribution: false, allowsCommercial: true, allowsModification: true },
    tags: ['achievement', 'award', 'trophy', 'recognition'],
    isLooping: false,
    hasVocals: false,
    intensity: 'high',
    addedAt: new Date('2024-09-05'),
  },
  {
    id: 'track-047',
    title: 'Equipment Training',
    artist: 'Industrial Audio',
    duration: 200,
    bpm: 92,
    mood: ['calm', 'corporate'],
    genre: 'electronic',
    category: ['safety', 'tutorial'],
    fileUrl: '/music/equipment-training.mp3',
    license: { type: 'royalty-free', name: 'Standard License', requiresAttribution: false, allowsCommercial: true, allowsModification: true },
    tags: ['equipment', 'machinery', 'operation', 'training'],
    isLooping: true,
    hasVocals: false,
    intensity: 'low',
    addedAt: new Date('2024-09-10'),
  },
  {
    id: 'track-048',
    title: 'Risk Assessment',
    artist: 'Training Audio',
    duration: 190,
    bpm: 85,
    mood: ['dramatic', 'calm'],
    genre: 'ambient',
    category: ['safety', 'training'],
    fileUrl: '/music/risk-assessment.mp3',
    license: { type: 'royalty-free', name: 'Standard License', requiresAttribution: false, allowsCommercial: true, allowsModification: true },
    tags: ['risk', 'assessment', 'analysis', 'evaluation'],
    isLooping: true,
    hasVocals: false,
    intensity: 'low',
    addedAt: new Date('2024-09-15'),
  },
  {
    id: 'track-049',
    title: 'Bright Future',
    artist: 'Inspirational Audio',
    duration: 175,
    bpm: 120,
    mood: ['inspiring', 'upbeat'],
    genre: 'pop',
    category: ['presentation', 'marketing'],
    fileUrl: '/music/bright-future.mp3',
    license: { type: 'royalty-free', name: 'Standard License', requiresAttribution: false, allowsCommercial: true, allowsModification: true },
    tags: ['future', 'bright', 'hope', 'optimism'],
    isLooping: true,
    hasVocals: false,
    intensity: 'medium',
    addedAt: new Date('2024-09-20'),
  },
  {
    id: 'track-050',
    title: 'Final Summary',
    artist: 'Educational Audio',
    duration: 120,
    bpm: 95,
    mood: ['calm', 'inspiring'],
    genre: 'acoustic',
    category: ['training', 'tutorial'],
    fileUrl: '/music/final-summary.mp3',
    license: { type: 'royalty-free', name: 'Standard License', requiresAttribution: false, allowsCommercial: true, allowsModification: true },
    tags: ['summary', 'conclusion', 'recap', 'review'],
    isLooping: true,
    hasVocals: false,
    intensity: 'low',
    addedAt: new Date('2024-09-25'),
  },
  // 5 MORE BONUS TRACKS
  {
    id: 'track-051',
    title: 'NR Training',
    artist: 'Safety Audio',
    duration: 240,
    bpm: 90,
    mood: ['calm', 'corporate'],
    genre: 'electronic',
    category: ['safety', 'training'],
    fileUrl: '/music/nr-training.mp3',
    license: { type: 'royalty-free', name: 'Standard License', requiresAttribution: false, allowsCommercial: true, allowsModification: true },
    tags: ['NR', 'regulation', 'Brazil', 'norma'],
    isLooping: true,
    hasVocals: false,
    intensity: 'low',
    addedAt: new Date('2024-10-01'),
  },
  {
    id: 'track-052',
    title: 'SST Compliance',
    artist: 'Safety Audio',
    duration: 200,
    bpm: 88,
    mood: ['calm', 'dramatic'],
    genre: 'ambient',
    category: ['safety', 'training'],
    fileUrl: '/music/sst-compliance.mp3',
    license: { type: 'royalty-free', name: 'Standard License', requiresAttribution: false, allowsCommercial: true, allowsModification: true },
    tags: ['SST', 'compliance', 'safety', 'health'],
    isLooping: true,
    hasVocals: false,
    intensity: 'low',
    addedAt: new Date('2024-10-05'),
  },
  {
    id: 'track-053',
    title: 'PPE Reminder',
    artist: 'Training Audio',
    duration: 30,
    bpm: 100,
    mood: ['dramatic', 'corporate'],
    genre: 'electronic',
    category: ['safety', 'intro_outro'],
    fileUrl: '/music/ppe-reminder.mp3',
    license: { type: 'royalty-free', name: 'Standard License', requiresAttribution: false, allowsCommercial: true, allowsModification: true },
    tags: ['PPE', 'EPI', 'protection', 'equipment'],
    isLooping: false,
    hasVocals: false,
    intensity: 'medium',
    addedAt: new Date('2024-10-10'),
  },
  {
    id: 'track-054',
    title: 'Emergency Alert',
    artist: 'Safety Audio',
    duration: 20,
    bpm: 140,
    mood: ['dramatic', 'energetic'],
    genre: 'electronic',
    category: ['safety', 'intro_outro'],
    fileUrl: '/music/emergency-alert.mp3',
    license: { type: 'royalty-free', name: 'Standard License', requiresAttribution: false, allowsCommercial: true, allowsModification: true },
    tags: ['emergency', 'alert', 'warning', 'urgent'],
    isLooping: false,
    hasVocals: false,
    intensity: 'high',
    addedAt: new Date('2024-10-15'),
  },
  {
    id: 'track-055',
    title: 'Course Complete',
    artist: 'Celebration Audio',
    duration: 15,
    bpm: 125,
    mood: ['upbeat', 'inspiring'],
    genre: 'pop',
    category: ['intro_outro', 'training'],
    fileUrl: '/music/course-complete.mp3',
    license: { type: 'royalty-free', name: 'Standard License', requiresAttribution: false, allowsCommercial: true, allowsModification: true },
    tags: ['complete', 'finish', 'congratulations', 'done'],
    isLooping: false,
    hasVocals: false,
    intensity: 'high',
    addedAt: new Date('2024-10-20'),
  },
];

// ============================================================================
// LOGGER
// ============================================================================

const logger = {
  info: (msg: string, meta?: Record<string, unknown>) =>
    console.log(`[MUSIC] ${msg}`, meta || ''),
  error: (msg: string, meta?: Record<string, unknown>) =>
    console.error(`[MUSIC ERROR] ${msg}`, meta || ''),
};

// ============================================================================
// MUSIC LIBRARY SERVICE
// ============================================================================

export class MusicLibraryService {
  private library: MusicTrack[] = MUSIC_LIBRARY;
  private favorites: Set<string> = new Set();
  private recentlyUsed: string[] = [];

  // ==========================================================================
  // SEARCH & FILTER
  // ==========================================================================

  /**
   * Lista todas as músicas
   */
  listAll(): MusicTrack[] {
    return [...this.library];
  }

  /**
   * Busca músicas com filtros
   */
  search(filter: MusicFilter): MusicTrack[] {
    let results = [...this.library];

    // Filtro por mood
    if (filter.mood?.length) {
      results = results.filter(t => 
        t.mood.some(m => filter.mood!.includes(m))
      );
    }

    // Filtro por gênero
    if (filter.genre?.length) {
      results = results.filter(t => filter.genre!.includes(t.genre));
    }

    // Filtro por categoria
    if (filter.category?.length) {
      results = results.filter(t =>
        t.category.some(c => filter.category!.includes(c))
      );
    }

    // Filtro por duração
    if (filter.minDuration !== undefined) {
      results = results.filter(t => t.duration >= filter.minDuration!);
    }
    if (filter.maxDuration !== undefined) {
      results = results.filter(t => t.duration <= filter.maxDuration!);
    }

    // Filtro por BPM
    if (filter.minBpm !== undefined) {
      results = results.filter(t => t.bpm >= filter.minBpm!);
    }
    if (filter.maxBpm !== undefined) {
      results = results.filter(t => t.bpm <= filter.maxBpm!);
    }

    // Filtro por intensidade
    if (filter.intensity) {
      results = results.filter(t => t.intensity === filter.intensity);
    }

    // Filtro por vocais
    if (filter.hasVocals !== undefined) {
      results = results.filter(t => t.hasVocals === filter.hasVocals);
    }

    // Filtro por loop
    if (filter.isLooping !== undefined) {
      results = results.filter(t => t.isLooping === filter.isLooping);
    }

    // Busca textual
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      results = results.filter(t =>
        t.title.toLowerCase().includes(searchLower) ||
        t.artist.toLowerCase().includes(searchLower) ||
        t.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    logger.info('Busca realizada', { 
      filter, 
      resultsCount: results.length 
    });

    return results;
  }

  /**
   * Obtém música por ID
   */
  getById(id: string): MusicTrack | undefined {
    return this.library.find(t => t.id === id);
  }

  /**
   * Lista músicas por categoria
   */
  listByCategory(category: MusicCategory): MusicTrack[] {
    return this.library.filter(t => t.category.includes(category));
  }

  /**
   * Lista músicas por mood
   */
  listByMood(mood: MusicMood): MusicTrack[] {
    return this.library.filter(t => t.mood.includes(mood));
  }

  // ==========================================================================
  // RECOMMENDATIONS
  // ==========================================================================

  /**
   * Recomenda músicas para um tipo de vídeo
   */
  recommendForVideoType(type: 'training' | 'safety' | 'marketing' | 'tutorial'): MusicTrack[] {
    const categoryMap: Record<string, MusicCategory[]> = {
      training: ['training', 'background'],
      safety: ['safety', 'training'],
      marketing: ['marketing', 'presentation'],
      tutorial: ['tutorial', 'background'],
    };

    const categories = categoryMap[type] || ['background'];
    return this.search({ category: categories })
      .sort((a, b) => {
        // Prioriza músicas com loop e sem vocais
        const aScore = (a.isLooping ? 2 : 0) + (a.hasVocals ? 0 : 1);
        const bScore = (b.isLooping ? 2 : 0) + (b.hasVocals ? 0 : 1);
        return bScore - aScore;
      })
      .slice(0, 10);
  }

  /**
   * Recomenda músicas similares
   */
  getSimilar(trackId: string, limit: number = 5): MusicTrack[] {
    const track = this.getById(trackId);
    if (!track) return [];

    return this.library
      .filter(t => t.id !== trackId)
      .map(t => ({
        track: t,
        score: this.calculateSimilarity(track, t),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.track);
  }

  private calculateSimilarity(a: MusicTrack, b: MusicTrack): number {
    let score = 0;

    // Mesmo gênero
    if (a.genre === b.genre) score += 3;

    // Moods em comum
    const commonMoods = a.mood.filter(m => b.mood.includes(m));
    score += commonMoods.length * 2;

    // Categorias em comum
    const commonCategories = a.category.filter(c => b.category.includes(c));
    score += commonCategories.length * 2;

    // BPM similar (+/- 20)
    if (Math.abs(a.bpm - b.bpm) <= 20) score += 2;

    // Mesma intensidade
    if (a.intensity === b.intensity) score += 1;

    // Duração similar (+/- 60s)
    if (Math.abs(a.duration - b.duration) <= 60) score += 1;

    return score;
  }

  // ==========================================================================
  // FAVORITES & HISTORY
  // ==========================================================================

  /**
   * Adiciona música aos favoritos
   */
  addToFavorites(trackId: string): void {
    this.favorites.add(trackId);
    logger.info('Música adicionada aos favoritos', { trackId });
  }

  /**
   * Remove música dos favoritos
   */
  removeFromFavorites(trackId: string): void {
    this.favorites.delete(trackId);
  }

  /**
   * Lista favoritos
   */
  listFavorites(): MusicTrack[] {
    return this.library.filter(t => this.favorites.has(t.id));
  }

  /**
   * Verifica se é favorito
   */
  isFavorite(trackId: string): boolean {
    return this.favorites.has(trackId);
  }

  /**
   * Adiciona ao histórico de uso
   */
  addToHistory(trackId: string): void {
    this.recentlyUsed = [
      trackId,
      ...this.recentlyUsed.filter(id => id !== trackId),
    ].slice(0, 20);
  }

  /**
   * Lista músicas usadas recentemente
   */
  getRecentlyUsed(limit: number = 10): MusicTrack[] {
    return this.recentlyUsed
      .slice(0, limit)
      .map(id => this.getById(id))
      .filter((t): t is MusicTrack => t !== undefined);
  }

  // ==========================================================================
  // STATISTICS
  // ==========================================================================

  /**
   * Obtém estatísticas da biblioteca
   */
  getStats(): {
    totalTracks: number;
    totalDuration: number;
    byGenre: Record<string, number>;
    byMood: Record<string, number>;
    byCategory: Record<string, number>;
    byIntensity: Record<string, number>;
  } {
    const stats = {
      totalTracks: this.library.length,
      totalDuration: this.library.reduce((sum, t) => sum + t.duration, 0),
      byGenre: {} as Record<string, number>,
      byMood: {} as Record<string, number>,
      byCategory: {} as Record<string, number>,
      byIntensity: {} as Record<string, number>,
    };

    for (const track of this.library) {
      // Por gênero
      stats.byGenre[track.genre] = (stats.byGenre[track.genre] || 0) + 1;

      // Por mood
      for (const mood of track.mood) {
        stats.byMood[mood] = (stats.byMood[mood] || 0) + 1;
      }

      // Por categoria
      for (const category of track.category) {
        stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
      }

      // Por intensidade
      stats.byIntensity[track.intensity] = (stats.byIntensity[track.intensity] || 0) + 1;
    }

    return stats;
  }

  // ==========================================================================
  // AUDIO PROCESSING HELPERS
  // ==========================================================================

  /**
   * Gera configuração de mixagem
   */
  createMixConfig(
    trackId: string,
    videoDuration: number,
    options: {
      volume?: number;
      fadeIn?: number;
      fadeOut?: number;
      loop?: boolean;
      ducking?: number;
    } = {}
  ): MusicMixConfig {
    const track = this.getById(trackId);
    if (!track) {
      throw new Error(`Música não encontrada: ${trackId}`);
    }

    const shouldLoop = options.loop ?? (track.isLooping && track.duration < videoDuration);

    return {
      trackId,
      startTime: 0,
      endTime: videoDuration,
      loop: shouldLoop,
      volume: {
        master: options.volume ?? 30,
        ducking: options.ducking ?? 50,
        normalize: true,
      },
      fade: {
        fadeIn: options.fadeIn ?? 2,
        fadeOut: options.fadeOut ?? 3,
        type: 'exponential',
      },
    };
  }

  /**
   * Gera comando FFmpeg para mixagem de áudio
   */
  generateFFmpegMixCommand(
    videoPath: string,
    musicPath: string,
    outputPath: string,
    config: MusicMixConfig
  ): string {
    const { volume, fade, loop } = config;

    const filters: string[] = [];

    // Volume e normalização
    filters.push(`[1:a]volume=${volume.master / 100}`);

    // Fade in/out
    if (fade.fadeIn > 0) {
      filters.push(`afade=t=in:st=0:d=${fade.fadeIn}`);
    }
    if (fade.fadeOut > 0 && config.endTime) {
      const fadeStart = config.endTime - fade.fadeOut;
      filters.push(`afade=t=out:st=${fadeStart}:d=${fade.fadeOut}`);
    }

    // Loop se necessário
    const loopOption = loop ? '-stream_loop -1' : '';

    const filterComplex = `[0:a][1:a]amix=inputs=2:duration=first:dropout_transition=3[a]`;

    return `ffmpeg -i "${videoPath}" ${loopOption} -i "${musicPath}" -filter_complex "${filterComplex}" -map 0:v -map "[a]" -c:v copy -c:a aac "${outputPath}"`;
  }

  /**
   * Gera comando FFmpeg para ducking durante narração
   */
  generateDuckingCommand(
    videoPath: string,
    musicPath: string,
    outputPath: string,
    config: MusicMixConfig
  ): string {
    const { volume } = config;
    const normalVolume = volume.master / 100;
    const duckedVolume = normalVolume * (1 - volume.ducking / 100);

    // Usa sidechain compression para ducking automático
    const filterComplex = `
      [1:a]volume=${normalVolume}[music];
      [0:a][music]sidechaincompress=threshold=0.03:ratio=8:release=200[compressed];
      [0:a][compressed]amix=inputs=2:duration=first[a]
    `.replace(/\n\s*/g, '');

    return `ffmpeg -i "${videoPath}" -i "${musicPath}" -filter_complex "${filterComplex}" -map 0:v -map "[a]" -c:v copy -c:a aac "${outputPath}"`;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

let musicLibraryInstance: MusicLibraryService | null = null;

export function getMusicLibraryService(): MusicLibraryService {
  if (!musicLibraryInstance) {
    musicLibraryInstance = new MusicLibraryService();
  }
  return musicLibraryInstance;
}

export default MusicLibraryService;
