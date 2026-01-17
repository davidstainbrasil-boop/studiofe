/**
 * Render Health Check API
 * Used by client-side ffmpeg-service to verify server availability
 */

import { NextResponse } from 'next/server';
import { ffmpegServiceServer } from '@lib/video/ffmpeg-service-server';

export async function GET() {
  try {
    const isAvailable = await ffmpegServiceServer.checkFFmpegAvailable();
    
    return NextResponse.json({
      status: 'ok',
      ffmpegAvailable: isAvailable,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      ffmpegAvailable: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
