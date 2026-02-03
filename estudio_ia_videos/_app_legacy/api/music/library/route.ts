/**
 * 🎵 Music Library API Route
 * 
 * API para biblioteca de músicas royalty-free
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { 
  getMusicLibrary, 
  type MusicFilter, 
  type MusicCategory, 
  type MusicMood,
  getCategoryDisplayName,
  getMoodDisplayName,
} from '@/lib/audio/music-library';
import { Logger } from '@lib/logger';
import { createClient } from '@lib/supabase/server';

const logger = new Logger('api:music:library');

// =============================================================================
// Validation Schema
// =============================================================================

const filterSchema = z.object({
  category: z.string().optional(),
  moods: z.string().optional(), // comma-separated
  minDuration: z.coerce.number().optional(),
  maxDuration: z.coerce.number().optional(),
  minBpm: z.coerce.number().optional(),
  maxBpm: z.coerce.number().optional(),
  isLoop: z.coerce.boolean().optional(),
  search: z.string().optional(),
  nrNumber: z.string().optional(),
  playlist: z.string().optional(),
});

// =============================================================================
// GET Handler
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    // Parse query params
    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams);
    const parseResult = filterSchema.safeParse(params);
    
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Parâmetros inválidos', details: parseResult.error.errors },
        { status: 400 }
      );
    }
    
    const { 
      category, 
      moods, 
      minDuration, 
      maxDuration, 
      minBpm, 
      maxBpm, 
      isLoop, 
      search,
      nrNumber,
      playlist,
    } = parseResult.data;
    
    const library = getMusicLibrary();
    
    // If requesting a specific playlist
    if (playlist) {
      const playlistData = library.getPlaylist(playlist);
      if (!playlistData) {
        return NextResponse.json(
          { error: 'Playlist não encontrada' },
          { status: 404 }
        );
      }
      
      return NextResponse.json({
        playlist: playlistData,
        tracks: library.getPlaylistTracks(playlist),
      });
    }
    
    // If requesting recommendations for specific NR
    if (nrNumber) {
      return NextResponse.json({
        nrNumber,
        recommended: library.getRecommendedForNR(nrNumber),
      });
    }
    
    // Build filter
    const filter: MusicFilter = {
      category: category as MusicCategory | undefined,
      moods: moods ? (moods.split(',') as MusicMood[]) : undefined,
      minDuration,
      maxDuration,
      minBpm,
      maxBpm,
      isLoop,
      search,
    };
    
    // Get filtered tracks
    const tracks = Object.keys(filter).some(k => filter[k as keyof MusicFilter] !== undefined)
      ? library.filterTracks(filter)
      : library.getAllTracks();
    
    logger.info('Biblioteca de música consultada', { 
      filter, 
      resultCount: tracks.length 
    });
    
    return NextResponse.json({
      tracks,
      total: tracks.length,
      categories: library.getCategories(),
      playlists: library.getAllPlaylists(),
    });
    
  } catch (error) {
    logger.error('Erro ao consultar biblioteca de música', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Erro interno ao buscar músicas' },
      { status: 500 }
    );
  }
}

// =============================================================================
// Metadata endpoint
// =============================================================================

export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({
    service: 'Music Library',
    version: '1.0.0',
    description: 'Biblioteca de músicas royalty-free para background de vídeos',
    categories: [
      { id: 'corporate', name: getCategoryDisplayName('corporate') },
      { id: 'training', name: getCategoryDisplayName('training') },
      { id: 'motivational', name: getCategoryDisplayName('motivational') },
      { id: 'ambient', name: getCategoryDisplayName('ambient') },
      { id: 'technology', name: getCategoryDisplayName('technology') },
      { id: 'documentary', name: getCategoryDisplayName('documentary') },
      { id: 'uplifting', name: getCategoryDisplayName('uplifting') },
      { id: 'calm', name: getCategoryDisplayName('calm') },
    ],
    moods: [
      { id: 'professional', name: getMoodDisplayName('professional') },
      { id: 'energetic', name: getMoodDisplayName('energetic') },
      { id: 'calm', name: getMoodDisplayName('calm') },
      { id: 'inspiring', name: getMoodDisplayName('inspiring') },
      { id: 'serious', name: getMoodDisplayName('serious') },
      { id: 'friendly', name: getMoodDisplayName('friendly') },
      { id: 'modern', name: getMoodDisplayName('modern') },
      { id: 'classic', name: getMoodDisplayName('classic') },
      { id: 'minimal', name: getMoodDisplayName('minimal') },
      { id: 'dramatic', name: getMoodDisplayName('dramatic') },
    ],
    filterOptions: {
      category: 'Filtrar por categoria',
      moods: 'Filtrar por mood (separados por vírgula)',
      minDuration: 'Duração mínima em segundos',
      maxDuration: 'Duração máxima em segundos',
      minBpm: 'BPM mínimo',
      maxBpm: 'BPM máximo',
      isLoop: 'Apenas músicas que fazem loop',
      search: 'Busca por título, artista ou tags',
      nrNumber: 'Recomendações para NR específica',
      playlist: 'Buscar playlist específica',
    },
  });
}
