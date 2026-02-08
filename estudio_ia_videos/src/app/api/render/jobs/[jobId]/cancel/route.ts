import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseForRequest } from '@lib/supabase/server'
import { logger } from '@lib/logger'
import { applyRateLimit } from '@/lib/rate-limit'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const blocked = await applyRateLimit(request, 'render-cancel', 20);
    if (blocked) return blocked;

    const supabase = getSupabaseForRequest(request)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 })
    }

    const { jobId } = params

    // Verify ownership via project
    const { data: job, error: jobError } = await supabase
      .from('render_jobs')
      .select("projectId")
      .eq('id', jobId)
      .single()

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found', code: 'JOB_NOT_FOUND' }, { status: 404 })
    }

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select("userId")
      .eq('id', job.projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found', code: 'PROJECT_NOT_FOUND' }, { status: 404 })
    }

    if (project.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
    }

    // Cancel job
    const { error: updateError } = await supabase
      .from('render_jobs')
      .update({ status: 'cancelled' })
      .eq('id', jobId)

    if (updateError) throw updateError

    return NextResponse.json({ success: true })

  } catch (error) {
    logger.error('Error cancelling render job', error instanceof Error ? error : new Error(String(error))
, { component: 'API: render/jobs/[jobId]/cancel' })
    return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
