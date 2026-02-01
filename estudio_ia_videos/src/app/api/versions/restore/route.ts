import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Restore Project Version API
 * 
 * POST /api/versions/restore - Restore a project to a previous version
 * 
 * Uses project metadata for version storage since project_versions table may not exist
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
}

interface ProjectMetadata {
  versions?: ProjectVersion[];
  currentVersion?: number;
  [key: string]: unknown;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { versionId, projectId } = body;

    if (!versionId || !projectId) {
      return NextResponse.json(
        { error: 'Version ID and Project ID required' },
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

    // Type-safe access
    const projectData = project as Record<string, unknown>;
    const projectUserId = projectData.user_id as string | undefined;

    if (projectUserId && projectUserId !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Get metadata and versions
    const metadata = (projectData.metadata || {}) as ProjectMetadata;
    const versions = metadata.versions || [];

    // Find the version to restore
    const versionToRestore = versions.find(v => v.id === versionId);

    if (!versionToRestore) {
      return NextResponse.json(
        { error: 'Version not found' },
        { status: 404 }
      );
    }

    if (!versionToRestore.snapshot) {
      return NextResponse.json(
        { error: 'Version has no snapshot data' },
        { status: 400 }
      );
    }

    // Create backup version before restoring
    const newVersionNumber = versions.length + 1;
    const backupVersion: ProjectVersion = {
      id: `version-${Date.now()}-backup`,
      version_number: newVersionNumber,
      description: `Backup antes de restaurar para v${versionToRestore.version_number}`,
      is_auto_save: true,
      changes_summary: { slidesAdded: 0, slidesModified: 0, slidesDeleted: 0 },
      snapshot: projectData.data,
      created_at: new Date().toISOString(),
      created_by: user.id,
      creator_name: user.user_metadata?.full_name || user.email,
    };

    // Create restored version
    const restoredVersion: ProjectVersion = {
      id: `version-${Date.now()}-restored`,
      version_number: newVersionNumber + 1,
      description: `Restaurado da versão ${versionToRestore.version_number}`,
      is_auto_save: false,
      changes_summary: { slidesAdded: 0, slidesModified: 0, slidesDeleted: 0 },
      snapshot: versionToRestore.snapshot,
      created_at: new Date().toISOString(),
      created_by: user.id,
      creator_name: user.user_metadata?.full_name || user.email,
    };

    // Update versions array
    const updatedVersions = [...versions, backupVersion, restoredVersion].slice(-50);

    // Use JSON.parse/stringify to ensure valid JSON type
    const updatedMetadata = JSON.parse(JSON.stringify({
      ...metadata,
      versions: updatedVersions,
      currentVersion: newVersionNumber + 1,
    }));

    // Update project
    const { error: updateError } = await supabase
      .from('projects')
      .update({
        data: versionToRestore.snapshot,
        metadata: updatedMetadata,
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId);

    if (updateError) {
      console.error('Error restoring version:', updateError);
      return NextResponse.json(
        { error: 'Failed to restore version' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Projeto restaurado para a versão ${versionToRestore.version_number}`,
      newVersion: newVersionNumber + 1,
      backupVersion: newVersionNumber,
    });
  } catch (error) {
    console.error('Version restore error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
