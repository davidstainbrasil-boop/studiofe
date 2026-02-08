
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseForRequest } from '@lib/supabase/server';
import { getDIDService } from '@lib/services/avatar/did-service';
import { logger } from '@lib/logger';
import { randomUUID } from 'crypto';
import { applyRateLimit } from '@/lib/rate-limit';

// Default avatar image if none provided
const DEFAULT_AVATAR = 'https://img.freepik.com/free-photo/portrait-white-man-isolated_53876-40306.jpg';

// Type helpers for Supabase query results
interface SlideWithAudio {
  audio_url?: string;
  audio_config?: { audio_url?: string };
}

interface TimelineTrack {
  id: string;
  name: string;
  type: string;
  elements: unknown[];
  height?: number;
  color?: string;
  muted?: boolean;
  locked?: boolean;
  visible?: boolean;
  volume?: number;
  collapsed?: boolean;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const blocked = await applyRateLimit(request, 'proj-avatar', 5);
    if (blocked) return blocked;

    const supabase = getSupabaseForRequest(request);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check D-ID connection
    let didService;
    try {
        didService = getDIDService();
    } catch {
        return NextResponse.json({ 
            success: false, 
            error: 'D-ID API Key not configured' 
        }, { status: 500 });
    }

    const projectId = params.id;
    logger.info(`Starting Avatar generation for project ${projectId}`, { component: 'API:generate-avatar' });

    // 1. Fetch Slides
    const { data: slides, error: slidesError } = await supabase
      .from('slides')
      .select('*')
      .eq("projectId", projectId)
      .order("order_index", { ascending: true });

    if (slidesError || !slides) {
      throw new Error('Failed to fetch slides');
    }

    const { data: timeline } = await supabase
        .from('timelines')
        .select('*')
        .eq("projectId", projectId)
        .single();
    
    if (!timeline) throw new Error('Timeline not found');

    const avatarElements = [];
    const generatedCount = 0;

    // 2. Process slides with Audio
    // Warning: D-ID is expensive and slow. Batch processing linearly might timeout.
    // Ideally we process ONE slide or use background jobs.
    // For this implementation, let's limit to the first 3 slides to avoid massive credit drain/timeout 
    // OR just process those that have audio and don't have avatar yet.
    
    // We will attempt to process all, but client should handle timeout.
    
    for (const slide of slides) {
        const typedSlide = slide as unknown as SlideWithAudio;
        if (!typedSlide.audio_url && !typedSlide.audio_config?.audio_url) continue;
        
        const audioUrl = typedSlide.audio_url || typedSlide.audio_config?.audio_url;

        // Skip if already has video (optional, maybe force regen?)
        // if (slideAny.video_url && slideAny.video_url.includes('d-id')) continue;

        try {
            logger.info(`Generating avatar for slide ${slide.id}`);
            
            // Check if we have public URL for audio (required by D-ID)
            // If stored in supabase private bucket, we might need a signed URL.
            // Assuming audio_url is accessible by D-ID servers.
            
            const videoUrl = await didService.createTalk({
                sourceImage: DEFAULT_AVATAR, // In proper app, let user select avatar per slide
                audioUrl: audioUrl
            });

            // Update Slide
            await supabase.from('slides').update({
                video_url: videoUrl,
                layout: 'avatar_overlay'
            } as Record<string, unknown>).eq('id', slide.id);

            // Add to Timeline
            // We'll create a new Video/Overlay Track for Avatars
            avatarElements.push({
                id: `avatar-${slide.id}-${randomUUID()}`,
                type: 'video',
                name: `Avatar Slide ${slide.order_index}`,
                startTime: (slide.order_index - 1) * 5, // Simplified timing, ideally calculate from prev slides durations
                // Better: we need exact start time from existing audio track?
                // For now, let's assume loose coupling or client refresh aligns it.
                // Wait, if we just push elements to a new track, they start at 0?
                // We should match the audio element start time if possible. 
                // Let's rely on the Editor to place them or simple sequential assumption.
                duration: 5, // We don't know duration exactly without checking metadata. Assume 5s or match slide duration.
                content: videoUrl,
                properties: { 
                    width: 300, 
                    height: 300, 
                    x: 1500, // Bottom Right
                    y: 700,
                    opacity: 1,
                    rounded: 20 
                },
                locked: false,
                visible: true
            });

        } catch (err) {
            logger.error(`Failed to generate avatar for slide ${slide.id}`, err as Error);
        }
    }

    // 3. Update Timeline Tracks
    if (avatarElements.length > 0) {
        const tracks = timeline.tracks as unknown as TimelineTrack[];
        let avatarTrackIndex = tracks.findIndex(t => t.name === 'Avatar AI');

        if (avatarTrackIndex === -1) {
            tracks.push({
                id: `track-avatar-${randomUUID()}`,
                name: 'Avatar AI',
                type: 'video', // It's a video track layered on top
                elements: avatarElements,
                height: 100,
                color: '#8B5CF6',
                muted: false,
                locked: false,
                visible: true,
                volume: 1,
                collapsed: false
            });
        } else {
            tracks[avatarTrackIndex].elements = avatarElements;
        }

        await supabase
            .from('timelines')
            .update({ tracks: tracks })
            .eq('id', timeline.id);
    }

    return NextResponse.json({
        success: true,
        generatedCount: avatarElements.length
    });

  } catch (error) {
    logger.error('Error in generate-avatar', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal Server Error'
    }, { status: 500 });
  }
}
