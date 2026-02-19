import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@lib/logger';
import { mockDelay, isProduction } from '@lib/utils/mock-guard';
import { getServerAuth } from '@lib/auth/unified-session';
// Using inline implementations instead of external modules
// import { IntegratedTTSAvatarPipeline } from '@lib/pipeline/integrated-tts-avatar-pipeline';
// import { MonitoringService } from '@lib/monitoring/monitoring-service';
import { applyRateLimit } from '@/lib/rate-limit';
import { integratedPipeline, type PipelineInput } from '@lib/pipeline/integrated-pipeline';
import { prisma } from '@lib/prisma';

// Inline implementations
class MonitoringService {
  private static instance: MonitoringService;
  
  static getInstance(): MonitoringService {
    if (!this.instance) {
      this.instance = new MonitoringService();
    }
    return this.instance;
  }
  
  logEvent(event: string, data: Record<string, unknown>) {
    logger.info(`📊 [${event}]`, { component: 'API: pipeline/integrated', ...data });
  }
}

class IntegratedTTSAvatarPipeline {
  private static instance: IntegratedTTSAvatarPipeline;
  private jobs: Map<string, Record<string, unknown>> = new Map();
  
  static getInstance(): IntegratedTTSAvatarPipeline {
    if (!this.instance) {
      this.instance = new IntegratedTTSAvatarPipeline();
    }
    return this.instance;
  }
  
  async createJob(userId: string, text: string, config: Record<string, unknown>): Promise<string> {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const job = {
      id: jobId,
      userId,
      text,
      config,
      status: 'queued',
      progress: 0,
      results: null,
      error: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      estimatedDuration: 30000,
      actualDuration: null
    };
    
    this.jobs.set(jobId, job);
    return jobId;
  }
  
  async processJob(jobId: string) {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error('Job not found');
    }
    
    job.status = 'processing';
    job.progress = 50;
    job.updatedAt = new Date();
    
    // REGRA DO REPO: mocks proibidos em producao
    if (!isProduction()) {
      await mockDelay(2000, 'pipeline-processing');
    }
    
    job.status = 'completed';
    job.progress = 100;
    job.results = {
      audioUrl: `/api/audio/generated/${jobId}.mp3`,
      videoUrl: `/api/video/generated/${jobId}.mp4`,
      duration: 5000
    };
    job.actualDuration = 2000;
    job.updatedAt = new Date();
    
    return job.results;
  }
  
  getJob(jobId: string) {
    return this.jobs.get(jobId) || null;
  }
  
  getJobsByUser(userId: string) {
    return Array.from(this.jobs.values()).filter(job => job.userId === userId);
  }
  
  getStats() {
    const allJobs = Array.from(this.jobs.values());
    return {
      totalJobs: allJobs.length,
      completedJobs: allJobs.filter(job => job.status === 'completed').length,
      failedJobs: allJobs.filter(job => job.status === 'failed').length,
      queuedJobs: allJobs.filter(job => job.status === 'queued').length,
      processingJobs: allJobs.filter(job => job.status === 'processing').length,
      averageProcessingTime: 25000
    };
  }
  
  async cancelJob(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (!job) return false;
    
    job.status = 'cancelled';
    job.updatedAt = new Date();
    return true;
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function mapQuality(value: unknown): PipelineInput['render_settings']['quality'] {
  const quality = String(value || '').toLowerCase();
  if (quality === 'low') return 'low';
  if (quality === 'high') return 'high';
  if (quality === 'ultra') return 'ultra';
  return 'medium';
}

function mapFormat(value: unknown): PipelineInput['render_settings']['format'] {
  const format = String(value || '').toLowerCase();
  if (format === 'webm') return 'webm';
  if (format === 'gif') return 'gif';
  return 'mp4';
}

function mapEngine(value: unknown): PipelineInput['voice_config']['engine'] {
  const engine = String(value || '').toLowerCase();
  if (engine === 'google') return 'google';
  if (engine === 'azure') return 'azure';
  if (engine === 'aws') return 'aws';
  return 'elevenlabs';
}

function buildPipelineInput(request: NextRequest, text: string, config: Record<string, unknown>): PipelineInput {
  const tts = asRecord(config.tts);
  const avatar = asRecord(config.avatar);
  const video = asRecord(config.video);
  const processing = asRecord(config.processing);
  const origin = new URL(request.url).origin;

  return {
    text,
    voice_config: {
      engine: mapEngine(tts.engine),
      voice_id: String(tts.voiceId || tts.voice || '21m00Tcm4TlvDq8ikWAM'),
      settings: tts
    },
    avatar_config: {
      modelUrl: String(avatar.modelUrl || `${origin}/api/avatars/models`),
      animations: Array.isArray(avatar.animations) ? avatar.animations.map(String) : undefined,
      materials: Array.isArray(avatar.materials) ? avatar.materials : undefined,
      lighting: avatar.lighting,
      camera: avatar.camera,
      environment: avatar.environment
    },
    render_settings: {
      width: Number(video.width || 1280),
      height: Number(video.height || 720),
      fps: Number(video.fps || 30),
      quality: mapQuality(video.quality || avatar.quality),
      format: mapFormat(video.format),
      duration_limit: Number(video.durationLimit || 0) || undefined
    },
    options: {
      cache_enabled: Boolean(processing.enableCache ?? true),
      priority_processing: Boolean(processing.priority === 'high' || processing.priority === 'urgent'),
      quality_optimization: Boolean(processing.enableOptimizations ?? true),
      real_time_preview: Boolean(processing.realTimePreview ?? false)
    }
  };
}

export async function POST(request: NextRequest) {
  // Auth guard
  const session = await getServerAuth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });
  }

  const monitoring = MonitoringService.getInstance();
  const startTime = Date.now();
  
  try {
    // Parse do body da requisição
    const body = await request.json();
    const { 
      text,
      config = {},
      processImmediately = false
    } = body;

    // Use server-side userId
    const userId = session.user.id;

    if (isProduction()) {
      const pipelineInput = buildPipelineInput(request, text, asRecord(config));
      const priority = String(asRecord(config).processing && asRecord(asRecord(config).processing).priority || 'normal');
      const jobId = await integratedPipeline.createJob(userId, pipelineInput, priority);
      const job = await integratedPipeline.getJobStatus(jobId);

      return NextResponse.json({
        success: true,
        data: {
          jobId,
          status: job?.status || 'queued',
          processImmediately: Boolean(processImmediately),
          statusUrl: `/api/pipeline/${jobId}`,
          output: job?.output || null
        }
      });
    }

    // Validações
    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Texto é obrigatório e deve ser uma string' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'userId é obrigatório' },
        { status: 400 }
      );
    }

    // Log da requisição
    monitoring.logEvent('pipeline_integrated_request', {
      userId,
      textLength: text.length,
      processImmediately,
      config
    });

    // Inicializar pipeline
    const pipeline = IntegratedTTSAvatarPipeline.getInstance();

    // Criar job
    const jobId = await pipeline.createJob(userId, text, config);

    if (processImmediately) {
      // Processar imediatamente e aguardar resultado
      try {
        const results = await pipeline.processJob(jobId);
        
        monitoring.logEvent('pipeline_integrated_success', {
          userId,
          jobId,
          processingTime: Date.now() - startTime,
          results
        });

        return NextResponse.json({
          success: true,
          data: {
            jobId,
            status: 'completed',
            results,
            processingTime: Date.now() - startTime
          }
        });

      } catch (processingError: unknown) {
        monitoring.logEvent('pipeline_integrated_processing_error', {
          userId,
          jobId,
          error: processingError instanceof Error ? processingError.message : String(processingError),
          processingTime: Date.now() - startTime
        });

        return NextResponse.json(
          { 
            error: 'Erro no processamento do pipeline',
            message: processingError instanceof Error ? processingError.message : String(processingError),
            jobId,
            code: 'PIPELINE_PROCESSING_ERROR'
          },
          { status: 500 }
        );
      }
    } else {
      // Retornar apenas o ID do job para acompanhamento assíncrono
      return NextResponse.json({
        success: true,
        data: {
          jobId,
          status: 'queued',
          message: 'Job criado e adicionado à fila de processamento'
        }
      });
    }

  } catch (error: unknown) {
    // Log do erro
    monitoring.logEvent('pipeline_integrated_error', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      processingTime: Date.now() - startTime
    });

    const err = error instanceof Error ? error : new Error(String(error)); logger.error('Erro no pipeline integrado:', err, { component: 'API: pipeline/integrated' });

    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : String(error),
        code: 'PIPELINE_INTEGRATED_ERROR'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const rateLimitBlocked = await applyRateLimit(request, 'pipeline-integrated-get', 30);
    if (rateLimitBlocked) return rateLimitBlocked;

    // Auth guard
    const session = await getServerAuth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const jobId = searchParams.get('jobId');
    const userId = session.user.id;

    if (isProduction()) {
      switch (action) {
        case 'status':
          if (!jobId) {
            return NextResponse.json(
              { error: 'jobId é obrigatório para consultar status' },
              { status: 400 }
            );
          }

          {
            const job = await integratedPipeline.getJobStatus(jobId);
            if (!job) {
              return NextResponse.json(
                { error: 'Job não encontrado' },
                { status: 404 }
              );
            }

            return NextResponse.json({
              success: true,
              data: {
                jobId: job.id,
                status: job.status,
                progress: job.progress,
                results: job.output || null,
                error: job.error || null,
                createdAt: job.createdAt,
                updatedAt: job.completed_at || job.started_at || job.createdAt,
                estimatedDuration: job.metadata.estimated_duration,
                actualDuration: null
              }
            });
          }

        case 'user-jobs':
          {
            const jobs = await prisma.render_jobs.findMany({
              where: { userId },
              orderBy: { createdAt: 'desc' },
              take: 20,
              select: {
                id: true,
                status: true,
                progress: true,
                createdAt: true,
                updatedAt: true,
                completedAt: true,
                estimatedDuration: true,
                actualDuration: true,
                outputUrl: true,
                errorMessage: true
              }
            });

            return NextResponse.json({
              success: true,
              data: {
                jobs,
                total: jobs.length
              }
            });
          }

        case 'stats':
          {
            const [queuedJobs, processingJobs, completedJobs, failedJobs] = await Promise.all([
              prisma.render_jobs.count({ where: { status: 'queued' } }),
              prisma.render_jobs.count({ where: { status: 'processing' } }),
              prisma.render_jobs.count({ where: { status: 'completed' } }),
              prisma.render_jobs.count({ where: { status: 'failed' } })
            ]);

            return NextResponse.json({
              success: true,
              data: {
                queuedJobs,
                processingJobs,
                completedJobs,
                failedJobs,
                totalJobs: queuedJobs + processingJobs + completedJobs + failedJobs
              }
            });
          }

        default:
          return NextResponse.json(
            { error: 'Ação não reconhecida. Use: status, user-jobs, ou stats' },
            { status: 400 }
          );
      }
    }

    const pipeline = IntegratedTTSAvatarPipeline.getInstance();

    switch (action) {
      case 'status':
        if (!jobId) {
          return NextResponse.json(
            { error: 'jobId é obrigatório para consultar status' },
            { status: 400 }
          );
        }

        const job = pipeline.getJob(jobId);
        if (!job) {
          return NextResponse.json(
            { error: 'Job não encontrado' },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          data: {
            jobId: job.id,
            status: job.status,
            progress: job.progress,
            results: job.results,
            error: job.error,
            createdAt: job.createdAt,
            updatedAt: job.updatedAt,
            estimatedDuration: job.estimatedDuration,
            actualDuration: job.actualDuration
          }
        });

      case 'user-jobs':
        if (!userId) {
          return NextResponse.json(
            { error: 'userId é obrigatório para consultar jobs do usuário' },
            { status: 400 }
          );
        }

        const userJobs = pipeline.getJobsByUser(userId);
        return NextResponse.json({
          success: true,
          data: {
            jobs: userJobs,
            total: userJobs.length
          }
        });

      case 'stats':
        const stats = pipeline.getStats();
        return NextResponse.json({
          success: true,
          data: stats
        });

      default:
        return NextResponse.json(
          { error: 'Ação não reconhecida. Use: status, user-jobs, ou stats' },
          { status: 400 }
        );
    }

  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error)); logger.error('Erro ao consultar pipeline:', err, { component: 'API: pipeline/integrated' });
    
    return NextResponse.json(
      { 
        error: 'Erro ao consultar pipeline',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Auth guard
    const session = await getServerAuth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });
    }

    const body = await request.json();
    const { jobId, action } = body;

    if (!jobId) {
      return NextResponse.json(
        { error: 'jobId é obrigatório' },
        { status: 400 }
      );
    }

    if (isProduction()) {
      switch (action) {
        case 'process':
          {
            const job = await integratedPipeline.getJobStatus(jobId);
            if (!job) {
              return NextResponse.json(
                { error: 'Job não encontrado' },
                { status: 404 }
              );
            }

            return NextResponse.json({
              success: true,
              data: {
                jobId,
                status: job.status,
                message: 'Processamento é automático no pipeline integrado'
              }
            });
          }

        case 'cancel':
          {
            const cancelled = await integratedPipeline.cancelJob(jobId);
            if (!cancelled) {
              return NextResponse.json(
                { error: 'Job não pode ser cancelado ou não foi encontrado' },
                { status: 400 }
              );
            }

            return NextResponse.json({
              success: true,
              data: {
                jobId,
                status: 'cancelled',
                message: 'Job cancelado com sucesso'
              }
            });
          }

        default:
          return NextResponse.json(
            { error: 'Ação não reconhecida. Use: process ou cancel' },
            { status: 400 }
          );
      }
    }

    const pipeline = IntegratedTTSAvatarPipeline.getInstance();

    switch (action) {
      case 'process':
        // Processar job específico
        try {
          const results = await pipeline.processJob(jobId);
          return NextResponse.json({
            success: true,
            data: {
              jobId,
              status: 'completed',
              results
            }
          });
        } catch (processingError: unknown) {
          return NextResponse.json(
            { 
              error: 'Erro no processamento',
              message: processingError instanceof Error ? processingError.message : String(processingError),
              jobId
            },
            { status: 500 }
          );
        }

      case 'cancel':
        // Cancelar job
        const cancelled = await pipeline.cancelJob(jobId);
        if (!cancelled) {
          return NextResponse.json(
            { error: 'Job não pode ser cancelado ou não foi encontrado' },
            { status: 400 }
          );
        }

        return NextResponse.json({
          success: true,
          data: {
            jobId,
            status: 'cancelled',
            message: 'Job cancelado com sucesso'
          }
        });

      default:
        return NextResponse.json(
          { error: 'Ação não reconhecida. Use: process ou cancel' },
          { status: 400 }
        );
    }

  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error)); logger.error('Erro ao atualizar job:', err, { component: 'API: pipeline/integrated' });
    
    return NextResponse.json(
      { 
        error: 'Erro ao atualizar job',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';
