import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { logger } from '@/lib/logger';

/**
 * Project Versions API
 * 
 * GET /api/versions/project?projectId=xxx - Get version history for a project
 * POST /api/versions/project - Create a new version
 * 
 * Note: Uses project metadata JSON for version tracking to work with any schema
 */

interface ProjectVersion {
  id: string;
  version_number: number;
  description: string;
  is_auto_save: boolean;
  changes_summary: {
    slidesAdded: number;
    slidesModified: number;
    slidesDeleted: number;
  };
  snapshot?: unknown;
  created_at: string;
  created_by: string;
  creator_name?: string;
  creator_email?: string;
}

interface ProjectMetadata {
  versions?: ProjectVersion[];
  currentVersion?: number;
  [key: string]: unknown;
}

const createVersionSchema = z.object({
  projectId: z.string().uuid(),
  description: z.string().max(500).optional(),
  autoSave: z.boolean().default(false),
  snapshot: z.any().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID required' },
        { status: 400 }
      );
    }

    // Get project with generic select
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Type-safe access to project data
    const projectData = project as Record<string, unknown>;
    const projectUserId = projectData.user_id as string | undefined;

    // Check ownership
    if (projectUserId && projectUserId !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Get versions from project metadata
    const metadata = (projectData.metadata || projectData.data || {}) as ProjectMetadata;
    const versions = metadata.versions || [];
    const currentVersion = metadata.currentVersion || versions.length;

    // Transform versions for response
    const transformedVersions = versions
      .slice(-limit)
      .reverse()
      .map((version) => ({
        id: version.id,
        versionNumber: version.version_number,
        description: version.description,
        isAutoSave: version.is_auto_save,
        changesSummary: version.changes_summary || {
          slidesAdded: 0,
          slidesModified: 0,
          slidesDeleted: 0,
        },
        createdAt: new Date(version.created_at),
        createdBy: {
          id: version.created_by,
          name: version.creator_name || 'Unknown',
          email: version.creator_email,
        },
        isCurrent: version.version_number === currentVersion,
      }));

    return NextResponse.json({
      versions: transformedVersions,
      currentVersion,
    });
  } catch (error) {
    logger.error('Versions GET error:', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validationResult = createVersionSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { projectId, description, autoSave, snapshot } = validationResult.data;

    // Get project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    const projectData = project as Record<string, unknown>;
    const projectUserId = projectData.user_id as string | undefined;

    if (projectUserId && projectUserId !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Get existing versions
    const existingMetadata = (projectData.metadata || {}) as ProjectMetadata;
    const existingVersions = existingMetadata.versions || [];
    const existingData = projectData.data as { slides?: unknown[] } | null;

    // Calculate new version number
    const newVersionNumber = existingVersions.length + 1;

    // Calculate changes summary
    const prevSlides = existingData?.slides || [];
    const currentSlides = (snapshot as { slides?: unknown[] } | null)?.slides || prevSlides;

    const changesSummary = {
      slidesAdded: Math.max(0, currentSlides.length - prevSlides.length),
      slidesModified: Math.min(prevSlides.length, currentSlides.length),
      slidesDeleted: Math.max(0, prevSlides.length - currentSlides.length),
    };

    // Create new version
    const newVersion: ProjectVersion = {
      id: `version-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      version_number: newVersionNumber,
      description: description || (autoSave ? 'Auto-save' : `Version ${newVersionNumber}`),
      is_auto_save: autoSave,
      changes_summary: changesSummary,
      snapshot: autoSave ? undefined : snapshot, // Only store snapshot for manual saves
      created_at: new Date().toISOString(),
      created_by: user.id,
      creator_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Unknown',
      creator_email: user.email || undefined,
    };

    // Update versions array (keep last 50)
    const updatedVersions = [...existingVersions, newVersion].slice(-50);

    // Update project metadata - using JSON.parse/stringify to ensure valid JSON type
    const updatedMetadata = JSON.parse(JSON.stringify({
      ...existingMetadata,
      versions: updatedVersions,
      currentVersion: newVersionNumber,
    }));

    const { error: updateError } = await supabase
      .from('projects')
      .update({
        metadata: updatedMetadata,
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId);

    if (updateError) {
      logger.error('Error saving version:', updateError instanceof Error ? updateError : new Error(String(updateError)));
      return NextResponse.json(
        { error: 'Failed to create version' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      id: newVersion.id,
      versionNumber: newVersion.version_number,
      description: newVersion.description,
      isAutoSave: newVersion.is_auto_save,
      changesSummary,
      createdAt: new Date(newVersion.created_at),
    }, { status: 201 });
  } catch (error) {
    logger.error('Versions POST error:', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
