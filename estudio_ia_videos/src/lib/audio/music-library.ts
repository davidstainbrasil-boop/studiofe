/**
 * 🎵 Background Music Library
 * 
 * Biblioteca de músicas royalty-free para background de vídeos
 * Organizada por categoria, mood e duração
 */

import { Logger } from '@lib/logger';

const logger = new Logger('music-library');

// =============================================================================
// Types
// =============================================================================

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  category: MusicCategory;
  mood: MusicMood[];
  duration: number; // seconds
  bpm: number;
  url: string; // Storage URL
  previewUrl?: string; // 30s preview
  license: 'royalty-free' | 'creative-commons' | 'licensed';
  tags: string[];
  isLoop: boolean;
  waveformData?: number[]; // For visual preview
}

export type MusicCategory = 
  | 'corporate'
  | 'training'
  | 'motivational'
  | 'ambient'
  | 'technology'
  | 'documentary'
  | 'uplifting'
  | 'calm';

export type MusicMood = 
  | 'professional'
  | 'energetic'
  | 'calm'
  | 'inspiring'
  | 'serious'
  | 'friendly'
  | 'modern'
  | 'classic'
  | 'minimal'
  | 'dramatic';

export interface MusicFilter {
  category?: MusicCategory;
  moods?: MusicMood[];
  minDuration?: number;
  maxDuration?: number;
  minBpm?: number;
  maxBpm?: number;
  isLoop?: boolean;
  search?: string;
}

export interface MusicPlaylist {
  id: string;
  name: string;
  description: string;
  trackIds: string[];
  isDefault?: boolean;
}

// =============================================================================
// Default Music Library
// =============================================================================

// Curated list of royalty-free tracks suitable for NR training videos
const DEFAULT_TRACKS: MusicTrack[] = [
  // Corporate/Training
  {
    id: 'corp-01',
    title: 'Corporate Success',
    artist: 'Studio Library',
    category: 'corporate',
    mood: ['professional', 'inspiring'],
    duration: 180,
    bpm: 110,
    url: '/audio/library/corporate-success.mp3',
    previewUrl: '/audio/library/previews/corporate-success-preview.mp3',
    license: 'royalty-free',
    tags: ['business', 'presentation', 'success', 'achievement'],
    isLoop: true,
  },
  {
    id: 'corp-02',
    title: 'Professional Edge',
    artist: 'Studio Library',
    category: 'corporate',
    mood: ['professional', 'modern'],
    duration: 150,
    bpm: 100,
    url: '/audio/library/professional-edge.mp3',
    license: 'royalty-free',
    tags: ['corporate', 'business', 'clean', 'minimal'],
    isLoop: true,
  },
  {
    id: 'train-01',
    title: 'Learning Journey',
    artist: 'Studio Library',
    category: 'training',
    mood: ['friendly', 'calm'],
    duration: 210,
    bpm: 90,
    url: '/audio/library/learning-journey.mp3',
    license: 'royalty-free',
    tags: ['education', 'learning', 'training', 'e-learning'],
    isLoop: true,
  },
  {
    id: 'train-02',
    title: 'Safety First',
    artist: 'Studio Library',
    category: 'training',
    mood: ['serious', 'professional'],
    duration: 180,
    bpm: 85,
    url: '/audio/library/safety-first.mp3',
    license: 'royalty-free',
    tags: ['safety', 'serious', 'attention', 'important'],
    isLoop: true,
  },
  // Motivational
  {
    id: 'motiv-01',
    title: 'Rise Up',
    artist: 'Studio Library',
    category: 'motivational',
    mood: ['inspiring', 'energetic'],
    duration: 200,
    bpm: 120,
    url: '/audio/library/rise-up.mp3',
    license: 'royalty-free',
    tags: ['motivation', 'inspiring', 'uplifting', 'achievement'],
    isLoop: false,
  },
  {
    id: 'motiv-02',
    title: 'New Horizons',
    artist: 'Studio Library',
    category: 'motivational',
    mood: ['inspiring', 'modern'],
    duration: 240,
    bpm: 115,
    url: '/audio/library/new-horizons.mp3',
    license: 'royalty-free',
    tags: ['future', 'innovation', 'progress', 'growth'],
    isLoop: true,
  },
  // Ambient
  {
    id: 'amb-01',
    title: 'Soft Focus',
    artist: 'Studio Library',
    category: 'ambient',
    mood: ['calm', 'minimal'],
    duration: 300,
    bpm: 70,
    url: '/audio/library/soft-focus.mp3',
    license: 'royalty-free',
    tags: ['background', 'ambient', 'subtle', 'peaceful'],
    isLoop: true,
  },
  {
    id: 'amb-02',
    title: 'Concentration',
    artist: 'Studio Library',
    category: 'ambient',
    mood: ['calm', 'professional'],
    duration: 360,
    bpm: 60,
    url: '/audio/library/concentration.mp3',
    license: 'royalty-free',
    tags: ['focus', 'study', 'concentration', 'work'],
    isLoop: true,
  },
  // Technology
  {
    id: 'tech-01',
    title: 'Digital Future',
    artist: 'Studio Library',
    category: 'technology',
    mood: ['modern', 'energetic'],
    duration: 180,
    bpm: 125,
    url: '/audio/library/digital-future.mp3',
    license: 'royalty-free',
    tags: ['technology', 'digital', 'innovation', 'tech'],
    isLoop: true,
  },
  {
    id: 'tech-02',
    title: 'Innovation Lab',
    artist: 'Studio Library',
    category: 'technology',
    mood: ['modern', 'inspiring'],
    duration: 210,
    bpm: 118,
    url: '/audio/library/innovation-lab.mp3',
    license: 'royalty-free',
    tags: ['science', 'research', 'discovery', 'progress'],
    isLoop: true,
  },
  // Documentary
  {
    id: 'doc-01',
    title: 'Story Unfolds',
    artist: 'Studio Library',
    category: 'documentary',
    mood: ['dramatic', 'serious'],
    duration: 240,
    bpm: 95,
    url: '/audio/library/story-unfolds.mp3',
    license: 'royalty-free',
    tags: ['documentary', 'storytelling', 'narrative', 'drama'],
    isLoop: false,
  },
  {
    id: 'doc-02',
    title: 'Industrial Pulse',
    artist: 'Studio Library',
    category: 'documentary',
    mood: ['serious', 'modern'],
    duration: 200,
    bpm: 105,
    url: '/audio/library/industrial-pulse.mp3',
    license: 'royalty-free',
    tags: ['industry', 'factory', 'work', 'machinery'],
    isLoop: true,
  },
  // Uplifting
  {
    id: 'uplift-01',
    title: 'Bright Day',
    artist: 'Studio Library',
    category: 'uplifting',
    mood: ['friendly', 'energetic'],
    duration: 180,
    bpm: 130,
    url: '/audio/library/bright-day.mp3',
    license: 'royalty-free',
    tags: ['happy', 'positive', 'cheerful', 'bright'],
    isLoop: true,
  },
  {
    id: 'uplift-02',
    title: 'Team Spirit',
    artist: 'Studio Library',
    category: 'uplifting',
    mood: ['inspiring', 'friendly'],
    duration: 195,
    bpm: 122,
    url: '/audio/library/team-spirit.mp3',
    license: 'royalty-free',
    tags: ['teamwork', 'collaboration', 'together', 'unity'],
    isLoop: true,
  },
  // Calm
  {
    id: 'calm-01',
    title: 'Peaceful Mind',
    artist: 'Studio Library',
    category: 'calm',
    mood: ['calm', 'minimal'],
    duration: 300,
    bpm: 65,
    url: '/audio/library/peaceful-mind.mp3',
    license: 'royalty-free',
    tags: ['relaxing', 'peaceful', 'serene', 'quiet'],
    isLoop: true,
  },
  {
    id: 'calm-02',
    title: 'Gentle Flow',
    artist: 'Studio Library',
    category: 'calm',
    mood: ['calm', 'classic'],
    duration: 270,
    bpm: 75,
    url: '/audio/library/gentle-flow.mp3',
    license: 'royalty-free',
    tags: ['soft', 'gentle', 'flowing', 'smooth'],
    isLoop: true,
  },
];

// Default playlists for common use cases
const DEFAULT_PLAYLISTS: MusicPlaylist[] = [
  {
    id: 'nr-training',
    name: 'Treinamentos NR',
    description: 'Músicas ideais para vídeos de treinamento em normas regulamentadoras',
    trackIds: ['train-01', 'train-02', 'corp-01', 'doc-02'],
    isDefault: true,
  },
  {
    id: 'corporate',
    name: 'Corporativo',
    description: 'Músicas profissionais para apresentações corporativas',
    trackIds: ['corp-01', 'corp-02', 'tech-01', 'motiv-02'],
  },
  {
    id: 'safety',
    name: 'Segurança do Trabalho',
    description: 'Trilhas com tom sério para conteúdo de segurança',
    trackIds: ['train-02', 'doc-01', 'doc-02', 'calm-01'],
  },
  {
    id: 'motivational',
    name: 'Motivacional',
    description: 'Músicas inspiradoras para engajar o público',
    trackIds: ['motiv-01', 'motiv-02', 'uplift-01', 'uplift-02'],
  },
  {
    id: 'background',
    name: 'Background Suave',
    description: 'Músicas sutis que não competem com a narração',
    trackIds: ['amb-01', 'amb-02', 'calm-01', 'calm-02'],
  },
];

// =============================================================================
// Music Library Class
// =============================================================================

export class MusicLibrary {
  private tracks: Map<string, MusicTrack>;
  private playlists: Map<string, MusicPlaylist>;

  constructor() {
    this.tracks = new Map(DEFAULT_TRACKS.map(t => [t.id, t]));
    this.playlists = new Map(DEFAULT_PLAYLISTS.map(p => [p.id, p]));
  }

  /**
   * Get all tracks
   */
  getAllTracks(): MusicTrack[] {
    return Array.from(this.tracks.values());
  }

  /**
   * Get track by ID
   */
  getTrack(id: string): MusicTrack | undefined {
    return this.tracks.get(id);
  }

  /**
   * Filter tracks
   */
  filterTracks(filter: MusicFilter): MusicTrack[] {
    let tracks = this.getAllTracks();

    if (filter.category) {
      tracks = tracks.filter(t => t.category === filter.category);
    }

    if (filter.moods && filter.moods.length > 0) {
      tracks = tracks.filter(t => 
        filter.moods!.some(mood => t.mood.includes(mood))
      );
    }

    if (filter.minDuration !== undefined) {
      tracks = tracks.filter(t => t.duration >= filter.minDuration!);
    }

    if (filter.maxDuration !== undefined) {
      tracks = tracks.filter(t => t.duration <= filter.maxDuration!);
    }

    if (filter.minBpm !== undefined) {
      tracks = tracks.filter(t => t.bpm >= filter.minBpm!);
    }

    if (filter.maxBpm !== undefined) {
      tracks = tracks.filter(t => t.bpm <= filter.maxBpm!);
    }

    if (filter.isLoop !== undefined) {
      tracks = tracks.filter(t => t.isLoop === filter.isLoop);
    }

    if (filter.search) {
      const search = filter.search.toLowerCase();
      tracks = tracks.filter(t => 
        t.title.toLowerCase().includes(search) ||
        t.artist.toLowerCase().includes(search) ||
        t.tags.some(tag => tag.toLowerCase().includes(search))
      );
    }

    return tracks;
  }

  /**
   * Get all playlists
   */
  getAllPlaylists(): MusicPlaylist[] {
    return Array.from(this.playlists.values());
  }

  /**
   * Get playlist by ID
   */
  getPlaylist(id: string): MusicPlaylist | undefined {
    return this.playlists.get(id);
  }

  /**
   * Get tracks in playlist
   */
  getPlaylistTracks(playlistId: string): MusicTrack[] {
    const playlist = this.playlists.get(playlistId);
    if (!playlist) return [];

    return playlist.trackIds
      .map(id => this.tracks.get(id))
      .filter((t): t is MusicTrack => t !== undefined);
  }

  /**
   * Get recommended tracks for NR type
   */
  getRecommendedForNR(nrNumber: string): MusicTrack[] {
    // Specific recommendations based on NR type
    const nrRecommendations: Record<string, MusicMood[]> = {
      'NR-10': ['serious', 'professional'], // Eletricidade
      'NR-11': ['professional', 'calm'], // Empilhadeiras
      'NR-12': ['serious', 'modern'], // Máquinas
      'NR-13': ['serious', 'professional'], // Caldeiras
      'NR-18': ['professional', 'inspiring'], // Construção
      'NR-20': ['serious', 'dramatic'], // Inflamáveis
      'NR-33': ['serious', 'calm'], // Espaços confinados
      'NR-35': ['serious', 'inspiring'], // Trabalho em altura
    };

    const moods = nrRecommendations[nrNumber] || ['professional', 'serious'];
    return this.filterTracks({ moods });
  }

  /**
   * Get categories with counts
   */
  getCategories(): { category: MusicCategory; count: number }[] {
    const categories = new Map<MusicCategory, number>();
    
    for (const track of this.tracks.values()) {
      const current = categories.get(track.category) || 0;
      categories.set(track.category, current + 1);
    }

    return Array.from(categories.entries()).map(([category, count]) => ({
      category,
      count,
    }));
  }

  /**
   * Add custom track (for user uploads)
   */
  addTrack(track: MusicTrack): void {
    this.tracks.set(track.id, track);
    logger.info('Track adicionada à biblioteca', { trackId: track.id });
  }

  /**
   * Create custom playlist
   */
  createPlaylist(playlist: MusicPlaylist): void {
    this.playlists.set(playlist.id, playlist);
    logger.info('Playlist criada', { playlistId: playlist.id });
  }
}

// =============================================================================
// Pixabay Audio API Integration
// =============================================================================

interface PixabayAudioResult {
  id: number;
  pageURL: string;
  type: string;
  tags: string;
  duration: number;
  audio_path: string;
  downloads: number;
  likes: number;
  user: string;
}

interface PixabaySearchResponse {
  total: number;
  totalHits: number;
  hits: PixabayAudioResult[];
}

/**
 * Fetch tracks from Pixabay Audio API
 * Requires PIXABAY_API_KEY environment variable
 */
async function fetchPixabayTracks(options: {
  category?: string;
  query?: string;
  perPage?: number;
}): Promise<MusicTrack[]> {
  const apiKey = process.env.PIXABAY_API_KEY;
  if (!apiKey) {
    logger.warn('Pixabay API key not configured');
    return [];
  }

  try {
    const { category = '', query = '', perPage = 50 } = options;
    const searchQuery = query || category || 'corporate background';

    const url = new URL('https://pixabay.com/api/');
    url.searchParams.set('key', apiKey);
    url.searchParams.set('q', searchQuery);
    url.searchParams.set('media_type', 'music');
    url.searchParams.set('per_page', perPage.toString());
    url.searchParams.set('safesearch', 'true');

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Pixabay API error: ${response.status}`);
    }

    const data: PixabaySearchResponse = await response.json();

    // Map Pixabay results to our MusicTrack format
    return data.hits.map((hit) => ({
      id: `pixabay-${hit.id}`,
      title: hit.tags.split(',')[0]?.trim() || `Track ${hit.id}`,
      artist: hit.user,
      category: mapPixabayCategory(hit.tags) as MusicCategory,
      mood: mapPixabayMoods(hit.tags),
      duration: hit.duration,
      bpm: 100, // Pixabay doesn't provide BPM, use default
      url: hit.audio_path,
      previewUrl: hit.audio_path,
      license: 'royalty-free' as const,
      tags: hit.tags.split(',').map((t) => t.trim()),
      isLoop: hit.duration < 300, // Assume shorter tracks are loops
    }));
  } catch (error) {
    logger.error('Failed to fetch Pixabay tracks', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

function mapPixabayCategory(tags: string): MusicCategory {
  const lowerTags = tags.toLowerCase();
  if (lowerTags.includes('corporate') || lowerTags.includes('business')) return 'corporate';
  if (lowerTags.includes('training') || lowerTags.includes('education')) return 'training';
  if (lowerTags.includes('motivational') || lowerTags.includes('inspiring')) return 'motivational';
  if (lowerTags.includes('ambient') || lowerTags.includes('background')) return 'ambient';
  if (lowerTags.includes('technology') || lowerTags.includes('tech')) return 'technology';
  if (lowerTags.includes('documentary') || lowerTags.includes('cinematic')) return 'documentary';
  if (lowerTags.includes('uplifting') || lowerTags.includes('happy')) return 'uplifting';
  if (lowerTags.includes('calm') || lowerTags.includes('relaxing')) return 'calm';
  return 'ambient';
}

function mapPixabayMoods(tags: string): MusicMood[] {
  const lowerTags = tags.toLowerCase();
  const moods: MusicMood[] = [];

  if (lowerTags.includes('professional') || lowerTags.includes('corporate')) moods.push('professional');
  if (lowerTags.includes('energetic') || lowerTags.includes('upbeat')) moods.push('energetic');
  if (lowerTags.includes('calm') || lowerTags.includes('peaceful')) moods.push('calm');
  if (lowerTags.includes('inspiring') || lowerTags.includes('motivational')) moods.push('inspiring');
  if (lowerTags.includes('serious') || lowerTags.includes('dramatic')) moods.push('serious');
  if (lowerTags.includes('friendly') || lowerTags.includes('warm')) moods.push('friendly');
  if (lowerTags.includes('modern') || lowerTags.includes('contemporary')) moods.push('modern');
  if (lowerTags.includes('classic') || lowerTags.includes('traditional')) moods.push('classic');
  if (lowerTags.includes('minimal') || lowerTags.includes('simple')) moods.push('minimal');
  if (lowerTags.includes('dramatic') || lowerTags.includes('cinematic')) moods.push('dramatic');

  return moods.length > 0 ? moods : ['professional'];
}

// =============================================================================
// Extended Music Library with Pixabay
// =============================================================================

export class ExtendedMusicLibrary extends MusicLibrary {
  private pixabayTracks: Map<string, MusicTrack> = new Map();
  private pixabayLoaded = false;

  /**
   * Load additional tracks from Pixabay
   */
  async loadPixabayTracks(categories: string[] = ['corporate', 'training', 'ambient']): Promise<void> {
    if (this.pixabayLoaded) return;

    const allTracks: MusicTrack[] = [];

    for (const category of categories) {
      const tracks = await fetchPixabayTracks({ category, perPage: 30 });
      allTracks.push(...tracks);
    }

    // Add unique tracks
    for (const track of allTracks) {
      if (!this.pixabayTracks.has(track.id)) {
        this.pixabayTracks.set(track.id, track);
      }
    }

    this.pixabayLoaded = true;
    logger.info(`Loaded ${this.pixabayTracks.size} tracks from Pixabay`);
  }

  /**
   * Get all tracks including Pixabay
   */
  override getAllTracks(): MusicTrack[] {
    const defaultTracks = super.getAllTracks();
    const pixabayTracks = Array.from(this.pixabayTracks.values());
    return [...defaultTracks, ...pixabayTracks];
  }

  /**
   * Get track by ID (including Pixabay)
   */
  override getTrack(id: string): MusicTrack | undefined {
    const defaultTrack = super.getTrack(id);
    if (defaultTrack) return defaultTrack;
    return this.pixabayTracks.get(id);
  }

  /**
   * Search tracks from Pixabay on-demand
   */
  async searchPixabay(query: string): Promise<MusicTrack[]> {
    const tracks = await fetchPixabayTracks({ query, perPage: 20 });

    // Cache results
    for (const track of tracks) {
      this.pixabayTracks.set(track.id, track);
    }

    return tracks;
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let musicLibraryInstance: MusicLibrary | null = null;
let extendedMusicLibraryInstance: ExtendedMusicLibrary | null = null;

export function getMusicLibrary(): MusicLibrary {
  if (!musicLibraryInstance) {
    musicLibraryInstance = new MusicLibrary();
  }
  return musicLibraryInstance;
}

export function getExtendedMusicLibrary(): ExtendedMusicLibrary {
  if (!extendedMusicLibraryInstance) {
    extendedMusicLibraryInstance = new ExtendedMusicLibrary();
  }
  return extendedMusicLibraryInstance;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Format duration as mm:ss
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Get category display name in Portuguese
 */
export function getCategoryDisplayName(category: MusicCategory): string {
  const names: Record<MusicCategory, string> = {
    corporate: 'Corporativo',
    training: 'Treinamento',
    motivational: 'Motivacional',
    ambient: 'Ambiente',
    technology: 'Tecnologia',
    documentary: 'Documentário',
    uplifting: 'Alegre',
    calm: 'Calmo',
  };
  return names[category];
}

/**
 * Get mood display name in Portuguese
 */
export function getMoodDisplayName(mood: MusicMood): string {
  const names: Record<MusicMood, string> = {
    professional: 'Profissional',
    energetic: 'Energético',
    calm: 'Calmo',
    inspiring: 'Inspirador',
    serious: 'Sério',
    friendly: 'Amigável',
    modern: 'Moderno',
    classic: 'Clássico',
    minimal: 'Minimalista',
    dramatic: 'Dramático',
  };
  return names[mood];
}

// =============================================================================
// Exports
// =============================================================================

export default MusicLibrary;
