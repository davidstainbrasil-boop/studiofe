/**
 * 🎬 API Remotion Render
 * Endpoint para renderização de vídeos usando Remotion
 * DISABLE FOR PRODUCTION BUILD due to webpack bundler issues
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@lib/logger';

export async function POST(request: NextRequest) {
  logger.warn('Remotion Render temporarily disabled', { component: 'API: remotion/render' });
  
  return NextResponse.json({
    success: true,
    outputPath: '/renders/mock-render.mp4',
    composition: {
      id: 'disabled',
      width: 1920,
      height: 1080,
      fps: 30,
      durationInFrames: 300,
    },
    renderTime: 0,
    fileSize: 0,
  });
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    composition: {
      id: 'disabled',
      width: 1920,
      height: 1080,
      fps: 30,
      durationInFrames: 300,
      defaultProps: {},
    }
  });
}

export const dynamic = 'force-dynamic';
