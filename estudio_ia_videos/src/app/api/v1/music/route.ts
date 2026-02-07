/**
 * API v1: GET /api/v1/music
 *
 * List available background music tracks
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAPIKey, APIKey } from '@/lib/api/api-key-middleware';
import { withRateLimit } from '@/lib/api/rate-limiter';
import {
  getMusicLibrary,
  getCategoryDisplayName,
  getMoodDisplayName,
  formatDuration,
  MusicCategory,
  MusicMood,
} from '@/lib/audio/music-library';

async function handleRequest(request: NextRequest, apiKey: APIKey): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category') as MusicCategory | null;
    const mood = searchParams.get('mood') as MusicMood | null;
    const search = searchParams.get('search') || undefined;
    const minDuration = searchParams.get('min_duration')
      ? parseInt(searchParams.get('min_duration')!)
      : undefined;
    const maxDuration = searchParams.get('max_duration')
      ? parseInt(searchParams.get('max_duration')!)
      : undefined;

    const library = getMusicLibrary();

    // Get filtered tracks
    const tracks = library.filterTracks({
      category: category || undefined,
      moods: mood ? [mood] : undefined,
      search,
      minDuration,
      maxDuration,
    });

    // Get categories with counts
    const categories = library.getCategories().map((c) => ({
      id: c.category,
      name: getCategoryDisplayName(c.category),
      count: c.count,
    }));

    // Get playlists
    const playlists = library.getAllPlaylists().map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      track_count: p.trackIds.length,
      is_default: p.isDefault,
    }));

    return NextResponse.json({
      success: true,
      count: tracks.length,
      categories,
      playlists,
      tracks: tracks.map((track) => ({
        id: track.id,
        title: track.title,
        artist: track.artist,
        category: track.category,
        category_name: getCategoryDisplayName(track.category),
        mood: track.mood.map((m) => ({
          id: m,
          name: getMoodDisplayName(m),
        })),
        duration: track.duration,
        duration_formatted: formatDuration(track.duration),
        bpm: track.bpm,
        url: track.url,
        preview_url: track.previewUrl,
        license: track.license,
        tags: track.tags,
        is_loop: track.isLoop,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list music',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return withRateLimit(request, (req) => withAPIKey(req, handleRequest));
}
