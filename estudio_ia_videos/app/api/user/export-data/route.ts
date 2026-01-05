/**
 * User Data Export Endpoint
 * POST /api/user/export-data
 * 
 * Exports all user data for LGPD/GDPR compliance.
 * Users can request a complete export of their data.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseForRequest } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const exportSchema = z.object({
  format: z.enum(['json', 'csv']).default('json'),
  includeProjects: z.boolean().default(true),
  includeRenders: z.boolean().default(true),
  includeSlides: z.boolean().default(true),
});

interface UserDataExport {
  exportInfo: {
    requestedAt: string;
    format: string;
    userId: string;
    email: string;
  };
  profile: Record<string, unknown>;
  projects: Record<string, unknown>[];
  renders: Record<string, unknown>[];
  slides: Record<string, unknown>[];
}

export async function POST(request: NextRequest): Promise<NextResponse> {
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
  let options: z.infer<typeof exportSchema>;
  try {
    const body = await request.json();
    options = exportSchema.parse(body);
  } catch {
    options = exportSchema.parse({});
  }

  try {
    logger.info('User data export requested', { userId: user.id, format: options.format });

    // Fetch user profile
    const { data: profile } = await supabase
      .from('users')
      .select('id, email, name, role, created_at, updated_at')
      .eq('id', user.id)
      .single();

    // Fetch user's projects
    interface ProjectRecord extends Record<string, unknown> {
      id: string;
      name?: string;
      description?: string;
      status?: string;
      created_at?: string;
      updated_at?: string;
    }
    let projects: ProjectRecord[] = [];
    if (options.includeProjects) {
      const { data: projectData } = await supabase
        .from('projects')
        .select('id, name, description, status, created_at, updated_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      projects = (projectData as ProjectRecord[]) || [];
    }

    // Fetch user's render jobs
    let renders: Record<string, unknown>[] = [];
    if (options.includeRenders) {
      // Avoid deep instantiation by separating the chain
      const rendersTable = supabase.from('render_jobs');
      const { data: renderData } = await rendersTable
        .select('id, status, progress, created_at, completed_at, output_url')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }) as unknown as { data: Record<string, unknown>[] | null };
      renders = renderData || [];
    }

    // Fetch user's slides (through projects)
    let slides: Record<string, unknown>[] = [];
    if (options.includeSlides && projects.length > 0) {
      const projectIds: string[] = projects.map(p => p.id);
      const { data: slideData } = await supabase
        .from('slides')
        .select('id, project_id, order_index, title, content, created_at')
        .in('project_id', projectIds)
        .order('order_index', { ascending: true });
      slides = (slideData as Record<string, unknown>[]) || [];
    }

    const exportData: UserDataExport = {
      exportInfo: {
        requestedAt: new Date().toISOString(),
        format: options.format,
        userId: user.id,
        email: user.email || 'unknown',
      },
      profile: profile || {},
      projects,
      renders,
      slides,
    };

    if (options.format === 'csv') {
      // Convert to CSV format
      const csvContent = convertToCSV(exportData);
      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="user-data-export-${user.id}.csv"`,
        },
      });
    }

    return NextResponse.json(exportData, {
      headers: {
        'Content-Disposition': `attachment; filename="user-data-export-${user.id}.json"`,
      },
    });
  } catch (error) {
    const errorInstance = error instanceof Error ? error : new Error(String(error));
    logger.error('Failed to export user data', errorInstance, { userId: user.id });
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to export data' },
      { status: 500 }
    );
  }
}

function convertToCSV(data: UserDataExport): string {
  const lines: string[] = [];
  
  // Export info header
  lines.push('# User Data Export');
  lines.push(`# Requested At: ${data.exportInfo.requestedAt}`);
  lines.push(`# User ID: ${data.exportInfo.userId}`);
  lines.push(`# Email: ${data.exportInfo.email}`);
  lines.push('');
  
  // Profile section
  lines.push('## Profile');
  lines.push(Object.keys(data.profile).join(','));
  lines.push(Object.values(data.profile).map(v => `"${v}"`).join(','));
  lines.push('');
  
  // Projects section
  if (data.projects.length > 0) {
    lines.push('## Projects');
    const projectHeaders = Object.keys(data.projects[0]);
    lines.push(projectHeaders.join(','));
    for (const project of data.projects) {
      lines.push(projectHeaders.map(h => `"${project[h] ?? ''}"`).join(','));
    }
    lines.push('');
  }
  
  // Renders section
  if (data.renders.length > 0) {
    lines.push('## Render Jobs');
    const renderHeaders = Object.keys(data.renders[0]);
    lines.push(renderHeaders.join(','));
    for (const render of data.renders) {
      lines.push(renderHeaders.map(h => `"${render[h] ?? ''}"`).join(','));
    }
    lines.push('');
  }
  
  // Slides section
  if (data.slides.length > 0) {
    lines.push('## Slides');
    const slideHeaders = Object.keys(data.slides[0]);
    lines.push(slideHeaders.join(','));
    for (const slide of data.slides) {
      lines.push(slideHeaders.map(h => `"${slide[h] ?? ''}"`).join(','));
    }
  }
  
  return lines.join('\n');
}
