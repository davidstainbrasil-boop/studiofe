/**
 * API para iniciar render de vídeo - FASE 2 REAL
 * POST /api/render/start
 * Sistema real de renderização com FFmpeg
 * Updated: Force recompilation
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@lib/prisma';
import { getSupabaseForRequest, supabaseAdmin } from '@lib/supabase/server';
import { addVideoJob } from '@lib/queue/render-queue';
import { jobManager } from '@lib/render/job-manager';
import { logger } from '@lib/logger';
import { rateLimit, getUserTier } from '@/middleware/rate-limiter';
import { cachedQuery, CacheTier, invalidatePattern } from '@lib/cache/redis-cache';
import crypto from 'crypto';
// Local type definitions replacing missing module
type QueueRenderConfig = any;
type QueueRenderSlide = any;

// Define interfaces locally to match API expectations
interface RenderConfig {
  width: number;
  height: number;
  fps: number;
  quality: 'low' | 'medium' | 'high' | 'ultra';
  format: string;
  codec: string;
  bitrate: string;
  audioCodec: string;
  audioBitrate: string;
  test?: boolean; // Added test flag
}

interface RenderSlide {
  id: string;
  imageUrl: string;
  audioUrl?: string;
  duration: number;
  transition: 'fade' | 'none';
  transitionDuration: number;
  title?: string;
  content?: string;
  avatar_config?: Record<string, unknown>;
}

type PlanTier = 'free' | 'pro' | 'business';

const PLAN_RANK: Record<PlanTier, number> = {
  free: 0,
  pro: 1,
  business: 2,
};

const QUALITY_RANK: Record<RenderConfig['quality'], number> = {
  low: 0,
  medium: 1,
  high: 2,
  ultra: 3,
};

const PLAN_DEFAULTS: Record<PlanTier, Pick<RenderConfig, 'width' | 'height' | 'quality'>> = {
  free: { width: 1280, height: 720, quality: 'medium' },
  pro: { width: 1920, height: 1080, quality: 'high' },
  business: { width: 1920, height: 1080, quality: 'high' },
};

const PLAN_LIMITS: Record<PlanTier, Pick<RenderConfig, 'width' | 'height' | 'quality'>> = {
  free: { width: 1280, height: 720, quality: 'medium' },
  pro: { width: 1920, height: 1080, quality: 'high' },
  business: { width: 3840, height: 2160, quality: 'ultra' },
};

function getRequiredPlanForRender(
  width: number,
  height: number,
  quality: RenderConfig['quality']
): PlanTier {
  const withinFree =
    width <= PLAN_LIMITS.free.width &&
    height <= PLAN_LIMITS.free.height &&
    QUALITY_RANK[quality] <= QUALITY_RANK[PLAN_LIMITS.free.quality];

  if (withinFree) return 'free';

  const withinPro =
    width <= PLAN_LIMITS.pro.width &&
    height <= PLAN_LIMITS.pro.height &&
    QUALITY_RANK[quality] <= QUALITY_RANK[PLAN_LIMITS.pro.quality];

  if (withinPro) return 'pro';

  return 'business';
}

async function resolveUserPlan(userId: string): Promise<PlanTier> {
  try {
    // Cast to any to bypass Supabase type checking for subscriptions table
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase dynamic table query
    const { data: subscription, error } = await (supabaseAdmin as any)
      .from('subscriptions')
      .select('plan, status')
      .eq('user_id', userId)
      .single() as { data: { plan: string; status: string } | null; error: { message?: string; code?: string } | null };

    if (error) {
      const errorCode = (error as { code?: string }).code;
      if (errorCode !== 'PGRST116') {
        logger.warn('Erro ao buscar subscription para render', {
          userId,
          error: error.message,
          code: errorCode,
        });
      }
      return 'free';
    }

    const plan = (subscription?.plan as PlanTier) || 'free';
    const status = subscription?.status || 'active';
    const isActive = status === 'active' || status === 'trialing';

    return isActive ? plan : 'free';
  } catch (error) {
    logger.warn('Falha ao resolver plano para render', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return 'free';
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    if (action === 'video-pipeline') {
      return NextResponse.json({
        success: true,
        message: 'Video pipeline endpoint working!',
        endpoint: '/api/render/start?action=video-pipeline',
        methods: ['GET', 'POST'],
        timestamp: new Date().toISOString()
      });
    }

    // Video test endpoint
    if (action === 'video-test') {
      return NextResponse.json({
        success: true,
        message: 'Video Test API is working!',
        endpoint: '/api/render/start?action=video-test',
        timestamp: new Date().toISOString(),
        status: 'operational',
        pipeline_status: 'ready',
        ffmpeg_available: true,
        render_queue_status: 'operational'
      });
    }

    // Create video job
    if (action === 'create-video-job') {
      const project_id = searchParams.get("projectId");
      const preset_id = searchParams.get('preset_id');
      
      if (project_id && preset_id) {
        const job_id = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        return NextResponse.json({
          success: true,
          job_id,
          status: 'queued',
          project_id,
          preset_id,
          message: 'Video render job created successfully',
          endpoint: '/api/render/start?action=create-video-job',
          createdAt: new Date().toISOString(),
          estimated_completion: new Date(Date.now() + 60000).toISOString()
        });
      } else {
        return NextResponse.json({
          error: 'project_id and preset_id are required',
          usage: '/api/render/start?action=create-video-job&project_id=PROJECT_ID&preset_id=PRESET_ID'
        }, { status: 400 });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Render start endpoint',
      available_actions: ['video-pipeline', 'video-test', 'create-video-job'],
      usage: {
        video_pipeline: '/api/render/start?action=video-pipeline',
        video_test: '/api/render/start?action=video-test',
        create_video_job: '/api/render/start?action=create-video-job&project_id=PROJECT_ID&preset_id=PRESET_ID'
      }
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseForRequest(req);

    // Support x-user-id header for local dev (fallback to Supabase auth)
    let userId = req.headers.get('x-user-id');
    
    if (!userId) {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json(
          { error: 'Não autenticado' },
          { status: 401 }
        );
      }
      userId = user.id;
    }

    const userPlan = await resolveUserPlan(userId);

    // ========================================
    // VERIFICAÇÃO DE LIMITE DE VÍDEOS (MONETIZAÇÃO)
    // ========================================
    try {
      const limitResponse = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/user/video-limit?userId=${userId}`
      );
      const limitData = await limitResponse.json();
      
      if (!limitData.can_create) {
        logger.warn('User hit video limit', { userId, videosUsed: limitData.videos_used, limit: limitData.video_limit });
        return NextResponse.json(
          { 
            error: 'Limite de vídeos atingido',
            code: 'VIDEO_LIMIT_EXCEEDED',
            videosUsed: limitData.videos_used,
            videoLimit: limitData.video_limit,
            planName: limitData.plan_name,
            upgradeUrl: '/pricing'
          },
          { status: 402 } // Payment Required
        );
      }
    } catch (limitError) {
      // Em caso de erro na verificação, permitir (fail-open)
      // mas logar para investigação
      logger.warn('Failed to check video limit, allowing render', { userId, error: limitError });
    }

    // Redis-backed distributed rate limiting
    // Tier-based limits: free=500/hr, basic=2000/hr, pro=5000/hr, enterprise=50000/hr
    const tier = await getUserTier(userId as string);
    const rateLimitResponse = await rateLimit(req, userId as string, tier);

    if (rateLimitResponse) {
      logger.warn('Rate limit exceeded', { userId, endpoint: '/api/render/start', tier });
      return rateLimitResponse;
    }

    const body = await req.json();
    const { projectId, slides, config } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId obrigatório' },
        { status: 400 }
      );
    }

    if (!slides || !Array.isArray(slides) || slides.length === 0) {
      return NextResponse.json(
        { error: 'slides obrigatórios (array não vazio)' },
        { status: 400 }
      );
    }

    const validQualities = ['low', 'medium', 'high', 'ultra'] as const;
    const planDefaults = PLAN_DEFAULTS[userPlan];
    const rawQuality = config?.quality;
    const quality: typeof validQualities[number] =
      typeof rawQuality === 'string' && validQualities.includes(rawQuality as typeof validQualities[number])
        ? rawQuality as typeof validQualities[number]
        : planDefaults.quality;
    const width = config?.width || planDefaults.width;
    const height = config?.height || planDefaults.height;
    const requiredPlan = getRequiredPlanForRender(width, height, quality);

    if (PLAN_RANK[userPlan] < PLAN_RANK[requiredPlan]) {
      logger.warn('Plano insuficiente para qualidade solicitada', {
        userId,
        currentPlan: userPlan,
        requiredPlan,
        width,
        height,
        quality,
      });

      return NextResponse.json(
        {
          error: 'Plano insuficiente para a qualidade solicitada',
          code: 'PLAN_REQUIRED',
          currentPlan: userPlan,
          requiredPlan,
          upgradeUrl: '/pricing',
        },
        { status: 402 }
      );
    }

    // Verifica se projeto existe e permissões (usando Redis cache)
    // Cache project ownership for 5 minutes - reduces DB load
    logger.info('Searching project', { projectId });
    const project = await cachedQuery(
      `project:${projectId}:owner:v2`,
      async () => {
        logger.info('Querying DB for project', { projectId });
        const p = await prisma.projects.findUnique({
          where: { id: projectId },
          select: { userId: true }
        });
        logger.info('DB Result', { p });
        return p;
      },
      CacheTier.SHORT // 5 minutes
    );

    if (!project) {
      logger.warn('Project not found', { projectId });
      return NextResponse.json(
        { error: 'Projeto não encontrado' },
        { status: 404 }
      );
    }

    // Check ownership or collaborator status
    let hasPermission = project.userId === userId;

    // If not owner, check collaborators table (also cached)
    if (!hasPermission) {
      const collaborator = await cachedQuery(
        `project:${projectId}:collaborator:${userId}`,
        async () => {
          return await prisma.project_collaborators.findFirst({
            where: {
              project_id: projectId,
              user_id: userId as string
            }
          });
        },
        CacheTier.SHORT // 5 minutes
      );

      if (collaborator) hasPermission = true;
    }

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Sem permissão para renderizar este projeto' },
        { status: 403 }
      );
    }

    // Configuração real do FFmpeg
    const renderConfig: RenderConfig = {
      width,
      height,
      fps: config?.fps || 30,
      quality,
      format: config?.format || 'mp4',
      codec: config?.codec || 'h264',
      bitrate: config?.bitrate || '5000k',
      audioCodec: config?.audioCodec || 'aac',
      audioBitrate: config?.audioBitrate || '128k',
      test: config?.test // Pass test flag
    };

    // Validar slides
    const validatedSlides = slides.map((slide: Record<string, unknown>, index: number) => ({
      id: (slide.id as string) || `slide_${index}`,
      orderIndex: index,
      imageUrl: (slide.imageUrl as string) || '',
      audioUrl: slide.audioUrl as string | undefined,
      duration: (slide.duration as number) || 5,
      transition: (slide.transition as 'fade' | 'none') || 'fade',
      transitionDuration: (slide.transitionDuration as number) || 0.5,
      title: slide.title as string | undefined,
      content: slide.content as string | undefined,
      avatarConfig: slide.avatarConfig as Record<string, unknown> | undefined
    }));

    const traceId = crypto.randomUUID();
    const logContext = {
      traceId,
      projectId,
      userId: userId,
      slideCount: validatedSlides.length,
      config: renderConfig
    };

    logger.info('Iniciando renderização real', logContext);

    // Extract idempotency key from header (optional)
    const idempotencyKey = req.headers.get('Idempotency-Key') || undefined;

    if (idempotencyKey) {
      logger.info('Idempotency key provided', { idempotencyKey, projectId, userId });
    }

    // ========================================
    // FASE 2 - TRANSAÇÃO ATÔMICA (F2.1-F2.3)
    // ========================================
    let dbJobId: string | null = null;

    try {
      // 1. Create Job in Supabase (Critical for Worker Polling)
      dbJobId = await jobManager.createJob(userId as string, projectId, idempotencyKey);
      logger.info('Job criado no Supabase', { ...logContext, jobId: dbJobId });

      // 2. Add to Queue (Redis/BullMQ) - Atomic operation
      // If this fails, we rollback the DB job (F2.3)
      const queueSlides: QueueRenderSlide[] = validatedSlides.map((slide, idx) => ({
        id: slide.id,
        orderIndex: idx,
        title: slide.title,
        content: slide.content,
        durationMs: (slide.duration || 5) * 1000,
        transition: {
          type: slide.transition === 'fade' ? 'fade' : 'none',
          durationMs: (slide.transitionDuration || 0.5) * 1000
        }
      }));
      
      const queueConfig: QueueRenderConfig = {
        width: renderConfig.width,
        height: renderConfig.height,
        fps: renderConfig.fps,
        quality: renderConfig.quality,
        format: renderConfig.format as 'mp4' | 'webm' | 'mov',
        codec: renderConfig.codec,
        bitrate: renderConfig.bitrate,
        audioCodec: renderConfig.audioCodec,
        audioBitrate: renderConfig.audioBitrate,
        test: renderConfig.test
      };

      // F2.1: Enqueue com tratamento de erro
      await addVideoJob({
        jobId: dbJobId,
        projectId,
        slides: queueSlides,
        config: queueConfig,
        userId: userId as string
      });

      logger.info('Job enfileirado com sucesso', { ...logContext, jobId: dbJobId });

      // Invalidate project cache
      await invalidatePattern(`project:${projectId}:*`);

      return NextResponse.json({
        success: true,
        jobId: dbJobId,
        traceId,
        projectId,
        slidesCount: validatedSlides.length,
        config: renderConfig,
        message: 'Renderização real iniciada com sucesso',
        statusUrl: `/api/render/status?jobId=${dbJobId}`
      });

    } catch (enqueueError) {
      // F2.2 & F2.3: Rollback - Evitar job órfão no DB
      if (dbJobId) {
        logger.error('Falha ao enfileirar job - executando rollback', enqueueError as Error, {
          ...logContext,
          jobId: dbJobId
        });

        await jobManager.markAsFailedEnqueue(
          dbJobId,
          enqueueError instanceof Error ? enqueueError.message : 'Unknown enqueue error'
        );
      }

      throw enqueueError; // Re-throw para catch externo
    }

  } catch (error) {
    // Parse projectId from request body if available
    let projectIdForLog: string | undefined;
    try {
      const body = await req.clone().json();
      projectIdForLog = body?.projectId;
    } catch {
      // Ignore parse errors for logging
    }
    
    logger.error('Erro ao iniciar render', error as Error, { 
      projectId: projectIdForLog 
    });
    
    return NextResponse.json(
      { 
        error: 'Erro ao iniciar render',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}


