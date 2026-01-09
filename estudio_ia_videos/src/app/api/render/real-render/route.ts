/**
 * Real Render API - Server-side video rendering
 * Uses Remotion for high-quality video generation
 */
import { NextRequest, NextResponse } from 'next/server';
// IMPORTANT: Remotion imports moved to dynamic imports to prevent build hangs
import { getSupabaseForRequest } from '@lib/supabase/server';
// import { bundle } from '@remotion/bundler';
// import { renderMedia, selectComposition } from '@remotion/renderer';
// import { join } from 'path';
// import { writeFile } from 'fs/promises';
import { logger } from '@lib/logger';

// Reusing types from TimelineComposition
// We have to define input props structure that matches what TimelineComposition expects
type TimelineTrack = any; // We'll just pass the JSON directly

export async function POST(request: NextRequest) {
    try {
        // Dynamic imports to prevent build-time Chromium downloads
        const { bundle } = await import('@remotion/bundler');
        const { renderMedia, selectComposition } = await import('@remotion/renderer');
        const { join } = await import('path');
        
        const supabase = getSupabaseForRequest(request);
        const body = await request.json();
        const { projectId } = body;

        if (!projectId) {
            return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
        }

        // 1. Fetch Project Data
        const { data: project } = await supabase
            .from('projects')
            .select('*, timeline:timelines(*)')
            .eq('id', projectId)
            .single();

        if (!project || !project.timeline || project.timeline.length === 0) {
            return NextResponse.json({ error: 'Project or timeline not found' }, { status: 404 });
        }

        const timelineData = project.timeline[0]; // Assuming single timeline
        const tracks = timelineData.tracks;

        // 2. Bundle Remotion Project
        // We need to point to the entry point of the Remotion project
        const entryPoint = join(process.cwd(), 'app/remotion/index.ts');
        
        console.log('Bundling Remotion project...');
        const bundleLocation = await bundle({
            entryPoint,
            // If you need to pass webpack config or similar
        });

        // 3. Select Composition
        // We use the new settings to override composition props if needed, or rely on inputProps
        // Remotion's selectComposition determines the resolution from the composition file,
        // BUT we can override output resolution in renderMedia if the codec supports scaling,
        // or better: pass resolution in inputProps so composition resizes itself.
        
        const { settings } = body;
        const resolution = settings?.resolution || { width: 1920, height: 1080 }; // Default 1080p

        const composition = await selectComposition({
            serveUrl: bundleLocation,
            id: 'TimelineVideo',
            inputProps: {
                tracks: tracks,
                resolution: resolution // Pass resolution to composition
            },
        });

        // 4. Render Video
        const outputFileName = `render-${projectId}-${Date.now()}.${settings?.format || 'mp4'}`;
        const outputLocation = join(process.cwd(), 'public', 'renders', outputFileName);


        console.log(`Rendering video to ${outputLocation}... Resolution: ${resolution.width}x${resolution.height}`);
        
        await renderMedia({
            composition,
            serveUrl: bundleLocation,
            codec: 'h264',
            outputLocation,
            inputProps: {
                tracks: tracks,
                resolution: resolution
            }
        });

        console.log('Render complete!');

        return NextResponse.json({
            success: true,
            videoUrl: `/renders/${outputFileName}`
        });

    } catch (error) {
        logger.error('Error rendering video', error instanceof Error ? error : new Error(String(error)));
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Render failed'
        }, { status: 500 });
    }
}
