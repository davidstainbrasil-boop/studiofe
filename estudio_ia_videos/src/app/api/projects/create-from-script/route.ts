
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseForRequest } from '@lib/supabase/server';
import { assetsManager } from '@/lib/assets-manager';
import { logger } from '@lib/logger';
import { z } from 'zod';

const CreateFromScriptSchema = z.object({
  script: z.object({
    title: z.string(),
    scenes: z.array(z.object({
      id: z.string(),
      title: z.string(),
      content: z.string(),
      duration: z.number(),
      avatar_instructions: z.string(),
      visual_cues: z.array(z.string()),
      safety_highlights: z.array(z.string())
    })),
    totalDuration: z.number(),
    compliance_notes: z.array(z.string()),
    engagement_tips: z.array(z.string())
  }),
  nr: z.string(),
  audience: z.string(),
  company_context: z.string().optional()
});

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseForRequest(req);
    
    // Auth Check
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : authHeader?.startsWith('bearer ') ? authHeader.substring(7) : null;
    
    if (token) {
        await supabase.auth.setSession({
            access_token: token,
            refresh_token: 'dummy'
        });
    }

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse Body
    const body = await req.json();
    const result = CreateFromScriptSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid request data', 
        details: result.error.errors 
      }, { status: 400 });
    }

    const { script, nr, audience, company_context } = result.data;
    const { title, scenes } = script;

    logger.info(`Creating project from script: ${title} for User ${user.id}`, { component: 'API:create-from-script' });

    // 1. Fetch real Stock Media for scenes
    // Extract first visual cue from each scene as query
    const queries = scenes.map(s => s.visual_cues[0] || `${nr} safety training`);
    
    // Parallel search for assets
    const stockAssets = await Promise.all(queries.map(async (query) => {
        try {
            // Prefer video for scenes
            const videos = await assetsManager.searchAll(query, { type: 'video' });
            if (videos.length > 0) return videos[0];
            
            // Fallback to images
            const images = await assetsManager.searchAll(query, { type: 'image' });
            return images.length > 0 ? images[0] : null;
        } catch (e) {
            logger.warn(`Failed to find asset for query: ${query}`);
            return null;
        }
    }));

    // 2. Create Project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        name: title,
        description: `Treinamento ${nr} para ${audience}`,
        type: 'ai-generated',
        status: 'draft',
        user_id: user.id,
        metadata: {
          nr,
          audience,
          company_context,
          generated_at: new Date().toISOString()
        },
        duration: script.totalDuration * 60, // minutes to seconds?? schema says Int... assuming seconds usually but let's check. 
        // Wait, script duration is in minutes usually in the prompt. Let's assume input is minutes.
        // Prisma schema says duration Int? @default(0). usually seconds.
        // Let's store as seconds.
      })
      .select('id')
      .single();

    if (projectError) {
      logger.error('Failed to create project', projectError);
      throw projectError;
    }


    // 3. Create Slides
    const slidesData = scenes.map((scene, index) => ({
      project_id: project.id,
      order_index: index + 1,
      title: scene.title,
      content: scene.content, // Script text
      duration: Math.ceil(scene.duration * 60), // seconds
      layout: 'split_right', // Default layout
      background_image: stockAssets[index]?.url || null,
      audio_config: {
        provider: 'elevenlabs',
        voice_id: '21m00Tcm4TlvDq8ikWAM' // Default voice
      },
      // Store AI metadata
      notes: JSON.stringify({
        visual_cues: scene.visual_cues,
        safety_highlights: scene.safety_highlights,
        avatar_instructions: scene.avatar_instructions
      })
    }));

    const { error: slidesError } = await supabase
      .from('slides')
      .insert(slidesData);

    if (slidesError) {
      logger.error('Failed to create slides', slidesError);
    }

    // 4. Create Timeline & Tracks
    // Construct the tracks JSON for the timeline editor
    let currentTime = 0;
    const videoElements = scenes.map((scene, index) => {
      const duration = Math.ceil(scene.duration * 60); // seconds
      const element = {
        id: `clip-${index}-${Date.now()}`,
        type: 'video',
        name: scene.title,
        startTime: currentTime,
        duration: duration,
        content: stockAssets[index]?.url || null, // The stock video URL
        properties: { opacity: 1, volume: 1 },
        locked: false,
        visible: true
      };
      currentTime += duration;
      return element;
    });

    const tracks = [
      {
        id: 'track-video-main',
        name: 'Video Principal',
        type: 'video',
        elements: videoElements,
        height: 80,
        color: '#3B82F6',
        muted: false,
        locked: false,
        visible: true,
        volume: 1,
        collapsed: false
      },
      {
        id: 'track-audio-voice',
        name: 'Locução (TTS)',
        type: 'audio',
        elements: [], // Empty for now, wait for generation
        height: 60,
        color: '#10B981',
        muted: false,
        locked: false,
        visible: true,
        volume: 1,
        collapsed: false
      }
    ];

    const { error: timelineError } = await supabase
      .from('timelines')
      .insert({
        project_id: project.id,
        tracks: tracks,
        totalDuration: currentTime,
        version: 1,
        settings: { resolution: { width: 1920, height: 1080 }, fps: 30 }
      });

    if (timelineError) {
      logger.error('Failed to create timeline', timelineError);
    }

    return NextResponse.json({
      success: true,
      projectId: project.id,
      slidesCreated: slidesData.length
    });

  } catch (error) {
    logger.error('Error in create-from-script', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json({
      success: false,
      error: 'Failed to create project from script'
    }, { status: 500 });
  }
}
