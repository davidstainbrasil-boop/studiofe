import { NextResponse } from 'next/server';
import { logger } from '@lib/logger';
import { jobManager } from '@lib/render/job-manager';
import { getSupabaseForRequest } from '@lib/supabase/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { projectId } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // Authenticate user
    const supabase = getSupabaseForRequest(request as any); // Type cast if needed depending on Next.js version
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
    logger.error('Error queuing render job', error instanceof Error ? error : new Error(String(error)), {
      component: 'API:Render'
    });
    return NextResponse.json(
      { success: false, message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
