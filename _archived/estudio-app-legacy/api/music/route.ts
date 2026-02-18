/**
 * API Route: Music Library
 * Biblioteca de músicas royalty-free
 * 
 * @route GET /api/music - Lista/busca músicas
 * @route POST /api/music - Gera configuração de mixagem
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getMusicLibraryService,
  MusicCategory,
  MusicMood,
  MusicGenre,
  MusicFilter,
} from '@/src/lib/music/music-library-service';

// ============================================================================
// SCHEMAS
// ============================================================================

const searchSchema = z.object({
  mood: z.array(z.enum([
    'upbeat', 'calm', 'inspiring', 'corporate', 'dramatic', 'energetic',
    'emotional', 'funny', 'mysterious', 'epic', 'ambient', 'cinematic'
  ])).optional(),
  genre: z.array(z.enum([
    'electronic', 'acoustic', 'orchestral', 'pop', 'rock', 'jazz',
    'classical', 'hiphop', 'lofi', 'ambient', 'folk', 'world'
  ])).optional(),
  category: z.array(z.enum([
    'training', 'presentation', 'tutorial', 'safety', 'marketing', 'intro_outro', 'background'
  ])).optional(),
  minDuration: z.number().min(0).optional(),
  maxDuration: z.number().min(0).optional(),
  minBpm: z.number().min(40).max(200).optional(),
  maxBpm: z.number().min(40).max(200).optional(),
  intensity: z.enum(['low', 'medium', 'high']).optional(),
  hasVocals: z.boolean().optional(),
  isLooping: z.boolean().optional(),
  search: z.string().optional(),
});

const mixConfigSchema = z.object({
  action: z.literal('create-mix'),
  trackId: z.string().min(1),
  videoDuration: z.number().positive(),
  volume: z.number().min(0).max(100).optional(),
  fadeIn: z.number().min(0).max(10).optional(),
  fadeOut: z.number().min(0).max(10).optional(),
  loop: z.boolean().optional(),
  ducking: z.number().min(0).max(100).optional(),
});

const ffmpegCommandSchema = z.object({
  action: z.literal('generate-ffmpeg'),
  trackId: z.string().min(1),
  videoPath: z.string().min(1),
  musicPath: z.string().min(1),
  outputPath: z.string().min(1),
  videoDuration: z.number().positive(),
  volume: z.number().min(0).max(100).optional(),
  fadeIn: z.number().min(0).max(10).optional(),
  fadeOut: z.number().min(0).max(10).optional(),
  loop: z.boolean().optional(),
  ducking: z.number().min(0).max(100).optional(),
  useDucking: z.boolean().optional(),
});

const favoritesSchema = z.object({
  action: z.enum(['add-favorite', 'remove-favorite']),
  trackId: z.string().min(1),
});

const historySchema = z.object({
  action: z.literal('add-history'),
  trackId: z.string().min(1),
});

const similarSchema = z.object({
  action: z.literal('get-similar'),
  trackId: z.string().min(1),
  limit: z.number().min(1).max(20).optional(),
});

const recommendSchema = z.object({
  action: z.literal('recommend'),
  videoType: z.enum(['training', 'safety', 'marketing', 'tutorial']),
});

// ============================================================================
// GET - Listar/Buscar músicas
// ============================================================================

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const service = getMusicLibraryService();

    // Obter estatísticas
    if (searchParams.get('stats') === 'true') {
      const stats = service.getStats();
      return NextResponse.json({
        success: true,
        stats,
      });
    }

    // Listar favoritos
    if (searchParams.get('favorites') === 'true') {
      const favorites = service.listFavorites();
      return NextResponse.json({
        success: true,
        tracks: favorites,
        total: favorites.length,
      });
    }

    // Listar recentes
    if (searchParams.get('recent') === 'true') {
      const limit = parseInt(searchParams.get('limit') || '10');
      const recent = service.getRecentlyUsed(limit);
      return NextResponse.json({
        success: true,
        tracks: recent,
        total: recent.length,
      });
    }

    // Obter música por ID
    const trackId = searchParams.get('id');
    if (trackId) {
      const track = service.getById(trackId);
      if (!track) {
        return NextResponse.json(
          { error: 'Música não encontrada' },
          { status: 404 }
        );
      }
      return NextResponse.json({
        success: true,
        track,
        isFavorite: service.isFavorite(trackId),
      });
    }

    // Listar por categoria
    const category = searchParams.get('category') as MusicCategory | null;
    if (category) {
      const tracks = service.listByCategory(category);
      return NextResponse.json({
        success: true,
        tracks,
        total: tracks.length,
        category,
      });
    }

    // Listar por mood
    const mood = searchParams.get('mood') as MusicMood | null;
    if (mood) {
      const tracks = service.listByMood(mood);
      return NextResponse.json({
        success: true,
        tracks,
        total: tracks.length,
        mood,
      });
    }

    // Busca com filtros
    const filter: MusicFilter = {};

    // Parse filtros da query string
    const moodParam = searchParams.get('moods');
    if (moodParam) {
      filter.mood = moodParam.split(',') as MusicMood[];
    }

    const genreParam = searchParams.get('genres');
    if (genreParam) {
      filter.genre = genreParam.split(',') as MusicGenre[];
    }

    const categoryParam = searchParams.get('categories');
    if (categoryParam) {
      filter.category = categoryParam.split(',') as MusicCategory[];
    }

    const minDuration = searchParams.get('minDuration');
    if (minDuration) {
      filter.minDuration = parseInt(minDuration);
    }

    const maxDuration = searchParams.get('maxDuration');
    if (maxDuration) {
      filter.maxDuration = parseInt(maxDuration);
    }

    const minBpm = searchParams.get('minBpm');
    if (minBpm) {
      filter.minBpm = parseInt(minBpm);
    }

    const maxBpm = searchParams.get('maxBpm');
    if (maxBpm) {
      filter.maxBpm = parseInt(maxBpm);
    }

    const intensity = searchParams.get('intensity');
    if (intensity) {
      filter.intensity = intensity as 'low' | 'medium' | 'high';
    }

    const hasVocals = searchParams.get('hasVocals');
    if (hasVocals !== null) {
      filter.hasVocals = hasVocals === 'true';
    }

    const isLooping = searchParams.get('isLooping');
    if (isLooping !== null) {
      filter.isLooping = isLooping === 'true';
    }

    const search = searchParams.get('search');
    if (search) {
      filter.search = search;
    }

    // Se não há filtros, lista todas
    const hasFilters = Object.keys(filter).length > 0;
    const tracks = hasFilters ? service.search(filter) : service.listAll();

    return NextResponse.json({
      success: true,
      tracks,
      total: tracks.length,
      filter: hasFilters ? filter : undefined,
    });
  } catch (error) {
    console.error('[API Music GET] Error:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST - Ações
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const service = getMusicLibraryService();

    // Criar configuração de mixagem
    if (body.action === 'create-mix') {
      const parsed = mixConfigSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Dados inválidos', details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const { trackId, videoDuration, ...options } = parsed.data;

      try {
        const mixConfig = service.createMixConfig(trackId, videoDuration, options);
        const track = service.getById(trackId);

        return NextResponse.json({
          success: true,
          mixConfig,
          track,
        });
      } catch (err) {
        return NextResponse.json(
          { error: err instanceof Error ? err.message : 'Erro desconhecido' },
          { status: 404 }
        );
      }
    }

    // Gerar comando FFmpeg
    if (body.action === 'generate-ffmpeg') {
      const parsed = ffmpegCommandSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Dados inválidos', details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const { 
        trackId, 
        videoPath, 
        musicPath, 
        outputPath, 
        videoDuration, 
        useDucking,
        ...options 
      } = parsed.data;

      try {
        const mixConfig = service.createMixConfig(trackId, videoDuration, options);

        const command = useDucking
          ? service.generateDuckingCommand(videoPath, musicPath, outputPath, mixConfig)
          : service.generateFFmpegMixCommand(videoPath, musicPath, outputPath, mixConfig);

        return NextResponse.json({
          success: true,
          command,
          mixConfig,
        });
      } catch (err) {
        return NextResponse.json(
          { error: err instanceof Error ? err.message : 'Erro desconhecido' },
          { status: 404 }
        );
      }
    }

    // Gerenciar favoritos
    if (body.action === 'add-favorite' || body.action === 'remove-favorite') {
      const parsed = favoritesSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Dados inválidos', details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const { trackId } = parsed.data;

      if (body.action === 'add-favorite') {
        service.addToFavorites(trackId);
      } else {
        service.removeFromFavorites(trackId);
      }

      return NextResponse.json({
        success: true,
        action: body.action,
        trackId,
        isFavorite: service.isFavorite(trackId),
      });
    }

    // Adicionar ao histórico
    if (body.action === 'add-history') {
      const parsed = historySchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Dados inválidos', details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      service.addToHistory(parsed.data.trackId);

      return NextResponse.json({
        success: true,
        message: 'Adicionado ao histórico',
      });
    }

    // Obter músicas similares
    if (body.action === 'get-similar') {
      const parsed = similarSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Dados inválidos', details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const { trackId, limit } = parsed.data;
      const similar = service.getSimilar(trackId, limit);

      return NextResponse.json({
        success: true,
        tracks: similar,
        total: similar.length,
      });
    }

    // Recomendações por tipo de vídeo
    if (body.action === 'recommend') {
      const parsed = recommendSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Dados inválidos', details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const recommendations = service.recommendForVideoType(parsed.data.videoType);

      return NextResponse.json({
        success: true,
        tracks: recommendations,
        total: recommendations.length,
        videoType: parsed.data.videoType,
      });
    }

    // Busca com filtros no body
    if (body.action === 'search') {
      const parsed = searchSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Dados inválidos', details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const tracks = service.search(parsed.data as MusicFilter);

      return NextResponse.json({
        success: true,
        tracks,
        total: tracks.length,
        filter: parsed.data,
      });
    }

    return NextResponse.json(
      { error: 'Ação não especificada ou inválida' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[API Music POST] Error:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
