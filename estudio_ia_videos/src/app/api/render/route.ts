import { NextResponse } from 'next/server';
import { logger } from '@lib/logger';
import { jobManager } from '@lib/render/job-manager';
import { getSupabaseForRequest } from '@lib/supabase/server';
import { isQueueAvailable } from '@lib/queue/render-queue';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    // Rate limit: 10 render requests per minute per IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rl = await checkRateLimit(`render:${ip}`, 10, 60_000);
    if (!rl.allowed) {
      logger.warn('Render rate limit exceeded', { ip, retryAfter: rl.retryAfterSec });
      return NextResponse.json(
        { success: false, error: 'Too many render requests', retryAfter: rl.retryAfterSec },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
      );
    }

    // Verificar disponibilidade da queue antes de processar
    if (!isQueueAvailable()) {
      logger.warn('Render queue unavailable - Redis not connected', { component: 'API:Render' });
      return NextResponse.json(
        { 
          success: false, 
          error: 'Service Unavailable', 
          message: 'Render queue is temporarily unavailable. Please try again later.',
          code: 'QUEUE_UNAVAILABLE'
        },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { projectId } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // Authenticate user
    const supabase = getSupabaseForRequest(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
         return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    logger.info('Received render request', { projectId, userId: user.id, component: 'API:Render' });

    logger.info('Received render request', { projectId, userId: user.id, component: 'API:Render' });

    // Check plan limits
    const { checkLimit } = await import('@lib/billing/limits');
    const limitCheck = await checkLimit(user.id, 'renders');
    
    if (!limitCheck.allowed) {
        logger.warn('Render limit reached', { userId: user.id, component: 'API:Render' });
        return NextResponse.json(
            { error: 'Payment Required', message: limitCheck.reason },
            { status: 402 } // 402 Payment Required
        );
    }

    // Create asynchronous job
    const jobId = await jobManager.createJob(user.id, projectId);

    return NextResponse.json({
      success: true,
      jobId,
      message: 'Render job queued successfully'
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Tratar erro de queue indisponível especificamente
    if (errorMessage.includes('QUEUE_UNAVAILABLE')) {
      logger.warn('Render queue unavailable during job creation', { component: 'API:Render' });
      return NextResponse.json(
        { 
          success: false, 
          error: 'Service Unavailable', 
          message: 'Render queue is temporarily unavailable. Please try again later.',
          code: 'QUEUE_UNAVAILABLE'
        },
        { status: 503 }
      );
    }

    logger.error('Error queuing render job', error instanceof Error ? error : new Error(String(error)), {
      component: 'API:Render'
    });
    return NextResponse.json(
      { success: false, message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
