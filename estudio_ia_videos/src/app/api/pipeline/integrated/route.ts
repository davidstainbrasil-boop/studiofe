import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@lib/logger';
// Using inline implementations instead of external modules
// import { IntegratedTTSAvatarPipeline } from '@lib/pipeline/integrated-tts-avatar-pipeline';
// import { MonitoringService } from '@lib/monitoring/monitoring-service';

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
  
  async createJob(user_id: string, text: string, config: Record<string, unknown>): Promise<string> {
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
      created_at: new Date(),
      updated_at: new Date(),
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
    job.updated_at = new Date();
    
    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    job.status = 'completed';
    job.progress = 100;
    job.results = {
      audioUrl: `/api/audio/generated/${jobId}.mp3`,
      videoUrl: `/api/video/generated/${jobId}.mp4`,
      duration: 5000
    };
    job.actualDuration = 2000;
    job.updated_at = new Date();
    
    return job.results;
  }
  
  getJob(jobId: string) {
    return this.jobs.get(jobId) || null;
  }
  
  getJobsByUser(user_id: string) {
    return Array.from(this.jobs.values()).filter(job => job.user_id === userId);
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
    job.updated_at = new Date();
    return true;
  }
}

export async function POST(request: NextRequest) {
  const monitoring = MonitoringService.getInstance();
  const startTime = Date.now();
  
  try {
    // Parse do body da requisição
    const body = await request.json();
    const { 
      text,
      config = {},
      userId,
      processImmediately = false
    } = body;

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
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const jobId = searchParams.get('jobId');
    const userId = searchParams.get('userId');

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
            created_at: job.created_at,
            updated_at: job.updated_at,
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
    const body = await request.json();
    const { jobId, action } = body;

    if (!jobId) {
      return NextResponse.json(
        { error: 'jobId é obrigatório' },
        { status: 400 }
      );
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
