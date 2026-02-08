export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server'
import { getServerAuth } from '@lib/auth/unified-session'
import { logger } from '@lib/logger'
import { applyRateLimit } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  try {
    const rateLimitBlocked = await applyRateLimit(request, 'auth-session-get', 20);
    if (rateLimitBlocked) return rateLimitBlocked;

    const session = await getServerAuth()
    
    return NextResponse.json({
      user: session?.user || null,
      expires: session?.expires || null
    })
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    logger.error('Session error', errorObj, { component: 'API: auth/session' })
    return NextResponse.json({
      user: null,
      expires: null
    })
  }
}

