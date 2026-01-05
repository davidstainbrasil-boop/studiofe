/**
 * User Data Deletion Endpoint
 * DELETE /api/user/delete-account
 * 
 * Deletes all user data for LGPD/GDPR compliance.
 * This is a destructive operation - requires confirmation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseForRequest, supabaseAdmin } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const deleteSchema = z.object({
  confirmPhrase: z.literal('DELETE MY ACCOUNT'),
  deleteProjects: z.boolean().default(true),
  deleteRenders: z.boolean().default(true),
});

interface DeletionResult {
  success: boolean;
  deletedAt: string;
  summary: {
    projectsDeleted: number;
    rendersDeleted: number;
    slidesDeleted: number;
    storageFilesDeleted: number;
    accountDeleted: boolean;
  };
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  // Check authentication
  const supabase = getSupabaseForRequest(request);
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Authentication required' },
      { status: 401 }
    );
  }

  // Parse and validate request body
  let options: z.infer<typeof deleteSchema>;
  try {
    const body = await request.json();
    options = deleteSchema.parse(body);
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Validation Error', 
        message: 'Request body must include confirmPhrase: "DELETE MY ACCOUNT"' 
      },
      { status: 400 }
    );
  }

  logger.warn('Account deletion requested', { userId: user.id, email: user.email });

  try {
    let projectsDeleted = 0;
    let rendersDeleted = 0;
    let slidesDeleted = 0;
    let storageFilesDeleted = 0;

    // Start deletion process using admin client for cascade operations
    
    // 1. Delete slides from user's projects
    const { data: userProjects } = await supabaseAdmin
      .from('projects')
      .select('id')
      .eq('user_id', user.id);
    
    if (userProjects && userProjects.length > 0) {
      const projectIds = userProjects.map(p => p.id);
      
      // Delete slides
      const { count: slidesCount } = await supabaseAdmin
        .from('slides')
        .delete({ count: 'exact' })
        .in('project_id', projectIds);
      slidesDeleted = slidesCount || 0;
    }

    // 2. Delete render jobs
    if (options.deleteRenders) {
      // First, delete output files from storage
      interface RenderJob {
        id: string;
        output_url: string | null;
      }
      // Use explicit typing to avoid deep instantiation
      const renderJobsQuery = supabaseAdmin
        .from('render_jobs')
        .select('id, output_url')
        .eq('user_id', user.id);
      const { data: renderJobs } = await renderJobsQuery as unknown as { data: RenderJob[] | null };
      
      if (renderJobs) {
        for (const job of renderJobs) {
          if (job.output_url) {
            // Extract file path and delete from storage
            try {
              const url = new URL(job.output_url);
              const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/videos\/(.+)/);
              if (pathMatch) {
                await supabaseAdmin.storage.from('videos').remove([pathMatch[1]]);
                storageFilesDeleted++;
              }
            } catch {
              // Continue even if storage deletion fails
            }
          }
        }
      }
      
      const { count: rendersCount } = await supabaseAdmin
        .from('render_jobs')
        .delete({ count: 'exact' })
        .eq('user_id', user.id);
      rendersDeleted = rendersCount || 0;
    }

    // 3. Delete projects
    if (options.deleteProjects) {
      const { count: projectsCount } = await supabaseAdmin
        .from('projects')
        .delete({ count: 'exact' })
        .eq('user_id', user.id);
      projectsDeleted = projectsCount || 0;
    }

    // 4. Delete user profile data
    await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', user.id);

    // 5. Delete auth user (this invalidates all sessions)
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    
    if (authDeleteError) {
      const errorInstance = authDeleteError instanceof Error ? authDeleteError : new Error(String(authDeleteError));
      logger.error('Failed to delete auth user', errorInstance, { userId: user.id });
      // Continue anyway - profile data is already deleted
    }

    const result: DeletionResult = {
      success: true,
      deletedAt: new Date().toISOString(),
      summary: {
        projectsDeleted,
        rendersDeleted,
        slidesDeleted,
        storageFilesDeleted,
        accountDeleted: !authDeleteError,
      },
    };

    logger.info('Account deleted successfully', { 
      userId: user.id, 
      email: user.email,
      summary: result.summary 
    });

    return NextResponse.json(result);
  } catch (error) {
    const errorInstance = error instanceof Error ? error : new Error(String(error));
    logger.error('Failed to delete account', errorInstance, { userId: user.id });
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to delete account. Please contact support.' },
      { status: 500 }
    );
  }
}

// GET endpoint to show what will be deleted
export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = getSupabaseForRequest(request);
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Authentication required' },
      { status: 401 }
    );
  }

  try {
    // Count user's data
    const { count: projectsCount } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);
    
    const { count: rendersCount } = await supabase
      .from('render_jobs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    const { data: userProjects } = await supabase
      .from('projects')
      .select('id')
      .eq('user_id', user.id);
    
    let slidesCount = 0;
    if (userProjects && userProjects.length > 0) {
      const { count } = await supabase
        .from('slides')
        .select('*', { count: 'exact', head: true })
        .in('project_id', userProjects.map(p => p.id));
      slidesCount = count || 0;
    }

    return NextResponse.json({
      userId: user.id,
      email: user.email,
      dataToBeDeleted: {
        projects: projectsCount || 0,
        renders: rendersCount || 0,
        slides: slidesCount,
      },
      warning: 'This action is IRREVERSIBLE. All your data will be permanently deleted.',
      instructions: 'Send DELETE request with body: { "confirmPhrase": "DELETE MY ACCOUNT" }',
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to count user data' },
      { status: 500 }
    );
  }
}
