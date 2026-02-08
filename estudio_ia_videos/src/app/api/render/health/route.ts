/**
 * Render Health Check API
 * Used by client-side ffmpeg-service to verify server availability
 */

import { NextResponse , NextRequest } from 'next/server';
import { ffmpegServiceServer } from '@lib/video/ffmpeg-service-server';
import { logger } from '@/lib/logger';
import { applyRateLimit } from '@/lib/rate-limit';

export async function GET(req: NextRequest) {
  try {
    const rateLimitBlocked = await applyRateLimit(req, 'render-health-get', 120);
    if (rateLimitBlocked) return rateLimitBlocked;

    const isAvailable = await ffmpegServiceServer.checkFFmpegAvailable();
    
    return NextResponse.json({
      status: 'ok',
      ffmpegAvailable: isAvailable,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Render health check failed', error instanceof Error ? error : new Error(String(error)), {
      component: 'API: render/health',
    });
    return NextResponse.json({
      status: 'error',
      ffmpegAvailable: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
