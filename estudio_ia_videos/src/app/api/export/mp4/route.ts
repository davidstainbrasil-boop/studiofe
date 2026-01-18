/**
 * 📤 API EXPORT MP4 - Implementação real
 * Fluxo: cria job persistente, enfileira processamento e retorna status.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@lib/auth';
import { prisma } from '@lib/prisma';
import { addVideoJob } from '@lib/queue/render-queue';
import { z } from 'zod';
import { logger } from '@lib/logger';
import { randomUUID } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { getOptionalEnv } from '@lib/env';
import type {
  ExportSettings,
  ExportFormat,
  ExportQuality,
  ExportResolution,
} from '@/types/export.types';

const ExportConfigSchema = z.object({
  projectId: z.string(),
  exportConfig: z
    .object({
      format: z.enum(['mp4', 'webm', 'mov', 'avi']).default('mp4'),
      quality: z.enum(['480p', '720p', '1080p', '4k']).default('1080p'),
      compression: z.enum(['low', 'medium', 'high']).default('medium'),
      includeSubtitles: z.boolean().default(false),
      watermark: z
        .object({
          enabled: z.boolean().default(false),
          text: z.string().optional(),
          position: z.enum(['top-left', 'top-right', 'bottom-left', 'bottom-right']).optional(),
        })
        .optional(),
      metadata: z
        .object({
          title: z.string().optional(),
          description: z.string().optional(),
          author: z.string().optional(),
          tags: z.array(z.string()).optional(),
        })
        .optional(),
    })
    .optional(),
});

type ExportConfig = z.infer<typeof ExportConfigSchema>['exportConfig'];

const SUPABASE_PUBLIC_URL_PREFIX = '/storage/v1/object/public/';

const resolveResolution = (quality: string): ExportResolution => {
  if (quality === '4k') return '4k';
  if (quality === '1080p') return '1080p';
  if (quality === '720p') return '720p';
  return '480p' as ExportResolution;
};

const resolveQuality = (compression: string): ExportQuality => {
  if (compression === 'high') return 'high';
  if (compression === 'low') return 'low';
  return 'medium';
};

const buildExportSettings = (config?: ExportConfig): ExportSettings => ({
  format: (config?.format || 'mp4') as ExportFormat,
  resolution: resolveResolution(config?.quality || '1080p'),
  quality: resolveQuality(config?.compression || 'medium'),
  fps: 30,
  subtitle: config?.includeSubtitles
    ? {
        enabled: true,
        burnIn: true,
      }
    : undefined,
});

const parseSupabasePublicUrl = (url: string) => {
  const supabaseUrl = getOptionalEnv('NEXT_PUBLIC_SUPABASE_URL');
  if (!supabaseUrl || !url.startsWith(supabaseUrl)) return null;
  const idx = url.indexOf(SUPABASE_PUBLIC_URL_PREFIX);
  if (idx === -1) return null;
  const pathPart = url.slice(idx + SUPABASE_PUBLIC_URL_PREFIX.length);
  const [bucket, ...pathParts] = pathPart.split('/');
  if (!bucket || pathParts.length === 0) return null;
  return { bucket, path: pathParts.join('/') };
};

const buildSignedUrl = async (outputUrl: string): Promise<string | null> => {
  const supabaseUrl = getOptionalEnv('NEXT_PUBLIC_SUPABASE_URL');
  const supabaseKey = getOptionalEnv('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !supabaseKey) return null;
  const parsed = parseSupabasePublicUrl(outputUrl);
  if (!parsed) return null;
  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data, error } = await supabase.storage
    .from(parsed.bucket)
    .createSignedUrl(parsed.path, 3600);
  if (error || !data?.signedUrl) {
    logger.warn('Falha ao gerar signed URL para export', { error: error?.message });
    return null;
  }
  return data.signedUrl;
};

const getLatestRenderOutput = async (projectId: string) => {
  return prisma.render_jobs.findFirst({
    where: {
      projectId,
      status: 'completed',
      outputUrl: { not: null },
    },
    orderBy: { completedAt: 'desc' },
  });
};

const getSubtitleSourceForProject = async (projectId: string) => {
  const latest = await prisma.transcriptions.findFirst({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
  });
  if (!latest) return null;
  return latest.srtUrl || latest.vttUrl || null;
};

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = ExportConfigSchema.parse(body);
    if (validatedData.exportConfig?.watermark?.enabled) {
      return NextResponse.json(
        { error: "Marca d'agua requer URL real para imagem. Informe arquivo valido." },
        { status: 422 },
      );
    }

    const exportSettings = buildExportSettings(validatedData.exportConfig);

    const project = await prisma.projects.findFirst({
      where: {
        id: validatedData.projectId,
        userId: session.user.id,
      },
      select: { id: true, userId: true },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const latestRender = await getLatestRenderOutput(validatedData.projectId);
    if (!latestRender?.outputUrl) {
      return NextResponse.json(
        { error: 'Projeto ainda não renderizado. Renderize antes de exportar.' },
        { status: 409 },
      );
    }

    let subtitleUrl: string | null = null;
    if (validatedData.exportConfig?.includeSubtitles) {
      subtitleUrl = await getSubtitleSourceForProject(validatedData.projectId);
      if (!subtitleUrl) {
        return NextResponse.json(
          { error: 'Legendas não encontradas para este projeto' },
          { status: 422 },
        );
      }
    }

    const jobId = randomUUID();
    const job = await prisma.render_jobs.create({
      data: {
        id: jobId,
        projectId: validatedData.projectId,
        userId: session.user.id,
        status: 'queued',
        progress: 0,
        renderSettings: exportSettings as unknown as object,
        settings: {
          type: 'export',
          sourceUrl: latestRender.outputUrl,
          exportConfig: validatedData.exportConfig || {},
          subtitleUrl,
        },
      },
      select: { id: true },
    });

    await addVideoJob({
      jobId: job.id,
      projectId: validatedData.projectId,
      userId: session.user.id,
      type: 'export',
      sourceUrl: latestRender.outputUrl,
      exportSettings,
      subtitleUrl,
    });

    return NextResponse.json(
      {
        success: true,
        jobId: job.id,
        status: 'queued',
        statusUrl: `/api/export/mp4?jobId=${job.id}`,
      },
      { status: 202 },
    );
  } catch (error) {
    logger.error('Export API Error', error instanceof Error ? error : new Error(String(error)), {
      component: 'API: export/mp4',
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const jobId = searchParams.get('jobId');
    const projectId = searchParams.get('projectId');

    if (action === 'formats') {
      return NextResponse.json({
        formats: [
          { id: 'mp4', name: 'MP4', extension: '.mp4', mimeType: 'video/mp4' },
          { id: 'webm', name: 'WebM', extension: '.webm', mimeType: 'video/webm' },
          { id: 'mov', name: 'MOV', extension: '.mov', mimeType: 'video/quicktime' },
          { id: 'avi', name: 'AVI', extension: '.avi', mimeType: 'video/x-msvideo' },
        ],
      });
    }

    if (jobId) {
      const job = await prisma.render_jobs.findUnique({
        where: { id: jobId },
        select: {
          id: true,
          projectId: true,
          userId: true,
          status: true,
          progress: true,
          outputUrl: true,
          errorMessage: true,
          completedAt: true,
        },
      });

      if (!job) {
        return NextResponse.json({ error: 'Export job not found' }, { status: 404 });
      }

      if (job.userId !== session.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      if (job.status === 'completed' && job.outputUrl) {
        const signedUrl = await buildSignedUrl(job.outputUrl);
        return NextResponse.json({
          success: true,
          status: job.status,
          outputUrl: job.outputUrl,
          signedUrl,
          completedAt: job.completedAt,
        });
      }

      if (job.status === 'failed') {
        return NextResponse.json(
          { success: false, status: job.status, error: job.errorMessage || 'Export failed' },
          { status: 500 },
        );
      }

      return NextResponse.json(
        {
          success: false,
          status: job.status,
          progress: job.progress || 0,
        },
        { status: 202 },
      );
    }

    if (projectId) {
      const project = await prisma.projects.findFirst({
        where: {
          id: projectId,
          userId: session.user.id,
        },
        select: { id: true },
      });

      if (!project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }

      const jobs = await prisma.render_jobs.findMany({
        where: {
          projectId,
          settings: {
            path: ['type'],
            equals: 'export',
          },
        },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          status: true,
          progress: true,
          outputUrl: true,
          errorMessage: true,
          createdAt: true,
          completedAt: true,
        },
      });

      return NextResponse.json({ jobs });
    }

    return NextResponse.json({ error: 'Action, Job ID or Project ID required' }, { status: 400 });
  } catch (error) {
    logger.error('Export GET Error', error instanceof Error ? error : new Error(String(error)), {
      component: 'API: export/mp4',
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID required' }, { status: 400 });
    }

    const job = await prisma.render_jobs.findUnique({
      where: { id: jobId },
      select: { userId: true, status: true },
    });

    if (!job) {
      return NextResponse.json({ error: 'Export job not found' }, { status: 404 });
    }

    if (job.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (job.status === 'completed') {
      return NextResponse.json({ error: 'Export job already completed' }, { status: 400 });
    }

    await prisma.render_jobs.update({
      where: { id: jobId },
      data: {
        status: 'cancelled',
        errorMessage: 'Exportação cancelada pelo usuário',
        completedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, message: 'Export job cancelled' });
  } catch (error) {
    logger.error('Export DELETE Error', error instanceof Error ? error : new Error(String(error)), {
      component: 'API: export/mp4',
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
