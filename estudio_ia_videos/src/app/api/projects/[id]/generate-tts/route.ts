
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseForRequest } from '@lib/supabase/server';
import { generateAndUploadTTSAudio } from '@lib/elevenlabs-service';
import { logger } from '@lib/logger';
import { prisma } from '@lib/prisma'; // Using Prisma for easier JSON manipulation if Supabase client is tricky for deep JSON updates

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseForRequest(request);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = params.id;
    logger.info(`Starting TTS generation for project ${projectId}`, { component: 'API:generate-tts' });

    // 1. Fetch Slides
    const { data: slides, error: slidesError } = await supabase
      .from('slides')
      .select('*')
      .eq('project_id', projectId)
      .order('slide_order', { ascending: true });

    if (slidesError || !slides) {
      throw new Error('Failed to fetch slides');
    }

    const audioElements = [];
    let currentTime = 0;

    // 2. Process each slide (Sequentially to avoid rate limits/race conditions on simple implementation)
    // For Production, this should be a background job (BullMQ). For MVP/Demo, we do it inline with long timeout.
    
    // Check if we have too many slides for inline processing
    if (slides.length > 5) {
        // Warning: this might timeout on Vercel (10s limit on free). User is likely running on VPS/Docker based on file structure.
        // We will proceed but log warning.
        logger.warn('Large number of slides for inline TTS. Consider background job.', { count: slides.length });
    }

    for (const slide of slides) {
      // Extract text
      const content = slide.content as any;
      const text = content?.text || content?.script || slide.notes;

      if (!text) {
        currentTime += (slide.duration_seconds || 5);
        continue;
      }

      // Generate Audio
      try {
        const fileName = `project-${projectId}-slide-${slide.id}-${Date.now()}.mp3`;
        const audioUrl = await generateAndUploadTTSAudio(
           text, 
           fileName, 
           (slide.tts_settings as any)?.voice_id
        );

        // Update Slide Record
        await supabase
          .from('slides')
          .update({ audio_url: audioUrl })
          .eq('id', slide.id);

        // Create Timeline Audio Element
        // We assume 150 words/min approx for duration if we don't have exact duration file metadata handy quickly
        // But wait, generateAndUploadTTSAudio doesn't return duration. 
        // Ideally we should get metadata. 
        // For now, we will estimate or just use the slide duration.
        // Better: Fetch the file metadata or let the client handle it?
        // Let's rely on slide duration for now to keep timeline in sync with video track.
        
        audioElements.push({
            id: `audio-${slide.id}-${Date.now()}`,
            type: 'audio',
            name: `Narração Slide ${slide.slide_order}`,
            startTime: currentTime,
            duration: slide.duration_seconds || 5, // Ideally this should match audio length
            content: audioUrl,
            properties: { volume: 1 },
            locked: false,
            visible: true
        });

      } catch (err) {
        logger.error(`Failed to generate TTS for slide ${slide.id}`, err as Error);
      }

      currentTime += (slide.duration_seconds || 5);
    }

    // 3. Update Timeline
    // Fetch current timeline
    const { data: timeline } = await supabase
      .from('timelines')
      .select('*')
      .eq('project_id', projectId)
      .single();

    if (timeline) {
      const tracks = timeline.tracks as any[];
      const audioTrackIndex = tracks.findIndex(t => t.type === 'audio' || t.name.includes('Locução'));
      
      if (audioTrackIndex >= 0) {
        tracks[audioTrackIndex].elements = audioElements;
      } else {
        tracks.push({
            id: 'track-audio-generated',
            name: 'Locução Gerada',
            type: 'audio',
            elements: audioElements,
            height: 60,
            color: '#10B981',
            muted: false,
            locked: false,
            visible: true,
            volume: 1,
            collapsed: false
        });
      }

      await supabase
        .from('timelines')
        .update({ tracks: tracks })
        .eq('id', timeline.id);
    }

    return NextResponse.json({
      success: true,
      generatedCount: audioElements.length
    });

  } catch (error) {
    logger.error('Error in generate-tts', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json({
      success: false,
      error: 'Internal Server Error'
    }, { status: 500 });
  }
}
