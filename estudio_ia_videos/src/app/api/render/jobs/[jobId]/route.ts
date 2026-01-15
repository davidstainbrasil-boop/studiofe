import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseForRequest } from '@lib/supabase/server'
import { logger } from '@lib/logger'
import { prisma } from '@lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    // Support x-user-id header for local dev/testing (fallback to Supabase auth)
    let userId = request.headers.get('x-user-id');

    if (!userId) {
      const supabase = getSupabaseForRequest(request)
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      userId = user.id;
    }

    const { jobId } = params

    // Use Prisma for consistent model names
    const job = await prisma.render_jobs.findUnique({
      where: { id: jobId },
      include: {
        projects: {
          select: { userId: true }
        }
      }
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Verify ownership
    let hasPermission = job.projects?.userId === userId

    if (!hasPermission && job.projectId) {
      // Check collaborators
      const collaborator = await prisma.project_collaborators.findFirst({
        where: {
          project_id: job.projectId,
          user_id: userId
        }
      });
      
      if (collaborator) hasPermission = true
    }

    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Remove project data from response
    const { projects: _, ...jobData } = job

    return NextResponse.json({ success: true, data: jobData, job: jobData })

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
    // Support x-user-id header for local dev/testing
    let userId = request.headers.get('x-user-id');

    if (!userId) {
      const supabase = getSupabaseForRequest(request)
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      userId = user.id;
    }

    const { jobId } = params

    // Find the job first to get project_id
    const job = await prisma.render_jobs.findUnique({
      where: { id: jobId },
      select: { projectId: true }
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Verify ownership via project
    const project = await prisma.projects.findUnique({
      where: { id: job.projectId! },
      select: { userId: true }
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    let hasPermission = project.userId === userId

    if (!hasPermission && job.projectId) {
      const collaborator = await prisma.project_collaborators.findFirst({
        where: {
          project_id: job.projectId,
          user_id: userId
        }
      });
      
      if (collaborator?.role && ['editor', 'owner'].includes(collaborator.role)) {
        hasPermission = true
      }
    }

    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Delete job
    await prisma.render_jobs.delete({
      where: { id: jobId }
    });

    return NextResponse.json({ success: true })

  } catch (error) {
    logger.error('Error deleting render job', error instanceof Error ? error : new Error(String(error)), { component: 'API: render/jobs/[jobId]' })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
