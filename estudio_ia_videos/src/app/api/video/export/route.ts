/**
 * API Endpoint to trigger video export
 * In a real production app, this would dispatch a job to Remotion Lambda or a specialized worker.
 * For MVP/Force Mode, we will mock the "Start Job" and returning a job ID using queue logic.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { projectId, settings } = await req.json()

    if (!projectId) {
        return NextResponse.json({ error: 'Missing projectId' }, { status: 400 })
    }

    // 1. Fetch Project Data from DB (to ensure it exists)
    const { data: project, error: projError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()

    if (projError || !project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // 2. Create Render Job in DB
    const { data: job, error: jobError } = await supabase
        .from('render_jobs')
        .insert({
            projectId: projectId,
            userId: user.id,
            status: 'queued',
            progress: 0,
            settings: settings || {}
        })
        .select()
        .single()

    if (jobError) {
        throw new Error(jobError.message)
    }

    // 3. Trigger Worker (Mock or Real)
    // In strict Force Mode, we can just return the Job ID and let the background worker pick it up.
    // Assuming 'RenderWorker' is running in background (as per `test-render-worker.ts` in metadata).

    logger.info('Video Export Job Created', { jobId: job.id, projectId })

    return NextResponse.json({
        success: true,
        data: {
            jobId: job.id,
            status: 'queued'
        }
    })

  } catch (error) {
    logger.error('Video Export Failed', error as Error)
    return NextResponse.json({ error: 'Failed to start export' }, { status: 500 })
  }
}
