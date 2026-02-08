import { NextResponse , NextRequest } from 'next/server';
import { heyGenService } from '@lib/heygen-service';
import { logger } from '@lib/logger';
import { applyRateLimit } from '@/lib/rate-limit';

export async function GET(req: NextRequest) {
  try {
    const rateLimitBlocked = await applyRateLimit(req, 'heygen-voices-get', 30);
    if (rateLimitBlocked) return rateLimitBlocked;

    const voices = await heyGenService.listVoices();
    return NextResponse.json({ voices });
  } catch (error) {
    logger.error('Error fetching HeyGen voices', error instanceof Error ? error : new Error(String(error))
, { component: 'API: heygen/voices' });
    return NextResponse.json(
      { error: 'Failed to fetch voices' },
      { status: 500 }
    );
  }
}
