import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseForRequest } from '@lib/supabase/server'
import { logger } from '@lib/logger'
import { prisma } from '@lib/prisma'
import { applyRateLimit } from '@/lib/rate-limit'

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    // Secure auth - x-user-id BLOCKED in production
    const { getAuthenticatedUserId } = await import('@lib/auth/safe-auth');
    const authResult = await getAuthenticatedUserId(request);
    if (!authResult.authenticated) {
      return NextResponse.json({ error: authResult.error, code: 'AUTH_REQUIRED' }, { status: 401 });
    }
    const userId = authResult.userId;

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
      return NextResponse.json({ error: 'Job not found', code: 'JOB_NOT_FOUND' }, { status: 404 })
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
      return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
    }

    // Remove project data from response
    const { projects: _, ...jobData } = job

    return NextResponse.json({
      success: true,
      status: jobData.status,
      progress: jobData.progress || 0,
      videoUrl: jobData.outputUrl || undefined,
      output_url: jobData.outputUrl || undefined,
      error: jobData.errorMessage || undefined,
      data: jobData,
      job: jobData,
    })

  } catch (error) {
    logger.error('Error fetching render job', error instanceof Error ? error : new Error(String(error)), { component: 'API: render/jobs/[jobId]' })
    return NextResponse.json({ error: 'Erro interno do servidor', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const blocked = await applyRateLimit(request, 'render-job', 20);
    if (blocked) return blocked;

    // Secure auth - x-user-id BLOCKED in production
    const { getAuthenticatedUserId } = await import('@lib/auth/safe-auth');
    const authResult = await getAuthenticatedUserId(request);
    if (!authResult.authenticated) {
      return NextResponse.json({ error: authResult.error, code: 'AUTH_REQUIRED' }, { status: 401 });
    }
    const userId = authResult.userId;

    const { jobId } = params

    // Find the job first to get project_id
    const job = await prisma.render_jobs.findUnique({
      where: { id: jobId },
      select: { projectId: true }
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found', code: 'JOB_NOT_FOUND' }, { status: 404 })
    }

    // Verify ownership via project
    const project = await prisma.projects.findUnique({
      where: { id: job.projectId! },
      select: { userId: true }
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found', code: 'PROJECT_NOT_FOUND' }, { status: 404 })
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
      return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
    }

    // Delete job
    await prisma.render_jobs.delete({
      where: { id: jobId }
    });

    return NextResponse.json({ success: true })

  } catch (error) {
    logger.error('Error deleting render job', error instanceof Error ? error : new Error(String(error)), { component: 'API: render/jobs/[jobId]' })
    return NextResponse.json({ error: 'Erro interno do servidor', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
