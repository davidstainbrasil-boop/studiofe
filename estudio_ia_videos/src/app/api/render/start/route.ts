/**
 * API para iniciar render de vídeo - FASE 2 REAL
 * POST /api/render/start
 * Sistema real de renderização com FFmpeg
 * Updated: Force recompilation
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@lib/prisma';
import { supabaseAdmin } from '@lib/supabase/server';
import { addVideoJob, isQueueAvailable } from '@lib/queue/render-queue';
import { jobManager } from '@lib/render/job-manager';
import { logger } from '@lib/logger';
import { rateLimit, getUserTier } from '@/middleware/rate-limiter';
import { applyRateLimit } from '@/lib/rate-limit';
import { cachedQuery, CacheTier, invalidatePattern } from '@lib/cache/redis-cache';
import crypto from 'crypto';
import { healthCheckService } from '@lib/monitoring/health-check';
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

async function loadProjectSlides(projectId: string): Promise<Array<Record<string, unknown>>> {
  const slides = await prisma.slides.findMany({
    where: { projectId },
    orderBy: { orderIndex: 'asc' },
    select: {
      id: true,
      title: true,
      content: true,
      duration: true,
      backgroundImage: true,
      audioConfig: true,
    },
  });

  return slides.map((slide) => {
    const audioConfig = (slide.audioConfig || {}) as Record<string, unknown>;
    const audioUrlCandidate = audioConfig.audioUrl || audioConfig.url || audioConfig.src;

    return {
      id: slide.id,
      title: slide.title,
      content: slide.content,
      duration: slide.duration || 5,
      imageUrl: slide.backgroundImage || '',
      audioUrl: typeof audioUrlCandidate === 'string' ? audioUrlCandidate : undefined,
      transition: 'fade',
      transitionDuration: 0.5,
    };
  });
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

interface BillingPlanRow {
  id: string
  name: string
  video_limit: number
}

interface SubscriptionRow {
  user_id: string
  plan_id: string
  status: string
  videos_used_this_month: number
}

interface VideoLimitState {
  canCreate: boolean
  videosUsed: number
  videoLimit: number
  planName: string
}

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
    const { data: subscription, error } = await supabaseAdmin
      .from('subscriptions' as never)
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

async function getUserVideoLimitState(userId: string): Promise<VideoLimitState> {
  try {
    const { data: subscriptionData, error: subError } = await supabaseAdmin
      .from('subscriptions' as never)
      .select('*')
      .eq('user_id', userId)
      .single();

    const subscription = subscriptionData as SubscriptionRow | null;

    if (subError || !subscription) {
      return {
        canCreate: true,
        videosUsed: 0,
        videoLimit: 2,
        planName: 'Free',
      };
    }

    const { data: planData } = await supabaseAdmin
      .from('plans' as never)
      .select('*')
      .eq('id', subscription.plan_id)
      .single();

    const plan = planData as BillingPlanRow | null;
    const videosUsed = subscription.videos_used_this_month || 0;
    const videoLimit = typeof plan?.video_limit === 'number' ? plan.video_limit : 2;
    const isUnlimited = videoLimit === -1;

    return {
      canCreate: isUnlimited || videosUsed < videoLimit,
      videosUsed,
      videoLimit,
      planName: plan?.name || 'Free',
    };
  } catch (error) {
    logger.warn('Falha ao verificar limite de vídeos diretamente no banco', {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      canCreate: true,
      videosUsed: 0,
      videoLimit: 2,
      planName: 'Free',
    };
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    const queueAvailable = isQueueAvailable();
    const ffmpegHealth = await healthCheckService.checkFFmpeg();
    const ffmpegAvailable = ffmpegHealth.status === 'healthy';
    const pipelineStatus = queueAvailable && ffmpegAvailable ? 'operational' : 'degraded';

    if (action === 'create-video-job') {
      return NextResponse.json(
        {
          error: 'Ação não suportada via GET. Use POST /api/render/start para criar job real.',
          code: 'METHOD_NOT_ALLOWED',
        },
        { status: 405 }
      );
    }

    if (action === 'video-pipeline' || action === 'video-test') {
      return NextResponse.json({
        success: true,
        message: 'Render pipeline status',
        endpoint: '/api/render/start',
        methods: ['GET', 'POST'],
        timestamp: new Date().toISOString(),
        status: pipelineStatus,
        pipeline_status: pipelineStatus,
        ffmpeg_available: ffmpegAvailable,
        render_queue_status: queueAvailable ? 'operational' : 'unavailable',
        diagnostics: {
          ffmpeg: ffmpegHealth.message,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Render start endpoint (real mode)',
      status: pipelineStatus,
      available_actions: ['video-pipeline', 'video-test'],
      usage: {
        video_pipeline: '/api/render/start?action=video-pipeline',
        video_test: '/api/render/start?action=video-test',
        create_video_job: 'POST /api/render/start'
      },
      diagnostics: {
        ffmpeg_available: ffmpegAvailable,
        render_queue_available: queueAvailable,
        ffmpeg_message: ffmpegHealth.message,
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
    const blocked = await applyRateLimit(req, 'render-start', 10);
    if (blocked) return blocked;

    // Secure auth - x-user-id BLOCKED in production
    const { getAuthenticatedUserId } = await import('@lib/auth/safe-auth');
    const authResult = await getAuthenticatedUserId(req);
    if (!authResult.authenticated) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }
    const userId = authResult.userId;

    const userPlan = await resolveUserPlan(userId);

    // ========================================
    // VERIFICAÇÃO DE LIMITE DE VÍDEOS (MONETIZAÇÃO)
    // ========================================
    try {
      const limitState = await getUserVideoLimitState(userId as string);

      if (!limitState.canCreate) {
        logger.warn('User hit video limit', {
          userId,
          videosUsed: limitState.videosUsed,
          limit: limitState.videoLimit,
        });

        return NextResponse.json(
          {
            error: 'Limite de vídeos atingido',
            code: 'VIDEO_LIMIT_EXCEEDED',
            videosUsed: limitState.videosUsed,
            videoLimit: limitState.videoLimit,
            planName: limitState.planName,
            upgradeUrl: '/pricing',
          },
          { status: 402 } // Payment Required
        );
      }
    } catch (limitError) {
      // Em caso de erro na verificação, permitir (fail-open) e registrar
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
    const { projectId, slides: inputSlides, config } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId obrigatório' },
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

    const sourceSlides = Array.isArray(inputSlides) && inputSlides.length > 0
      ? inputSlides
      : await loadProjectSlides(projectId);

    if (!Array.isArray(sourceSlides) || sourceSlides.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum slide disponível para renderização' },
        { status: 400 }
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
    const validatedSlides = sourceSlides.map((slide: Record<string, unknown>, index: number) => ({
      id: (slide.id as string) || `slide_${index}`,
      orderIndex: index,
      imageUrl: (slide.imageUrl as string) || (slide.backgroundImage as string) || '',
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
      // 1. Create Job in DB only (queue enqueue is handled below in this transaction)
      const createResult = await jobManager.createJobWithoutQueue(userId as string, projectId, idempotencyKey);
      dbJobId = createResult.id;
      logger.info('Job criado no Supabase', { ...logContext, jobId: dbJobId });

      // If idempotency returned an existing queued/processing job, don't enqueue again
      if (createResult.reused) {
        logger.info('Retornando job existente por idempotência', { ...logContext, jobId: dbJobId });
        return NextResponse.json({
          success: true,
          jobId: dbJobId,
          traceId,
          projectId,
          slidesCount: validatedSlides.length,
          config: renderConfig,
          idempotent: true,
          message: 'Job de renderização já existente retornado com sucesso',
          statusUrl: `/api/render/status?jobId=${dbJobId}`
        });
      }

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
