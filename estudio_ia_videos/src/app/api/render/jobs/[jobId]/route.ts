import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseForRequest } from '@lib/supabase/server'
import { logger } from '@lib/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const supabase = getSupabaseForRequest(request)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { jobId } = params

    const { data: job, error } = await supabase
      .from('render_jobs')
      .select('*, project:projects(user_id)')
      .eq('id', jobId)
      .single()

    if (error || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Verify ownership
    const jobWithProject = job as typeof job & { project?: { userId: string } }
    const project = jobWithProject.project
    let hasPermission = project?.userId === user.id

    if (!hasPermission) {
      const { data: collaborator } = await supabase
        .from('collaborators')
        .select("userId")
        .eq("projectId", job.projectId)
        .eq("userId", user.id)
        .single()
      
      if (collaborator) hasPermission = true
    }

    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Remove project data from response
    const { project: _, ...jobData } = job

    return NextResponse.json({ success: true, data: jobData })

  } catch (error) {
    logger.error('Error fetching render job', error instanceof Error ? error : new Error(String(error)), { component: 'API: render/jobs/[jobId]' })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const supabase = getSupabaseForRequest(request)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { jobId } = params

    // Verify ownership via project
    // We need to find the job first to get project_id
    const { data: job, error: jobError } = await supabase
      .from('render_jobs')
      .select("projectId")
      .eq('id', jobId)
      .single()

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select("userId")
      .eq('id', job.projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    let hasPermission = project.userId === user.id

    if (!hasPermission) {
      const { data: collaboratorData } = await supabase
        .from('collaborators')
        .select('role')
        .eq("projectId", job.projectId)
        .eq("userId", user.id)
        .single()
      
      const collaborator = collaboratorData as unknown as { role: string } | null;
      if (collaborator?.role && ['editor', 'owner'].includes(collaborator.role)) {
        hasPermission = true
      }
    }

    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Delete job
    const { error: deleteError } = await supabase
      .from('render_jobs')
      .delete()
      .eq('id', jobId)

    if (deleteError) throw deleteError

    return NextResponse.json({ success: true })

  } catch (error) {
    logger.error('Error deleting render job', error instanceof Error ? error : new Error(String(error)), { component: 'API: render/jobs/[jobId]' })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
