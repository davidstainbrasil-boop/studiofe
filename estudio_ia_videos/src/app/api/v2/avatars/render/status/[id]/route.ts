// TODO: Fix v2 avatars types
/**
 * 📊 API v2: Render Status Monitor
 * Monitoramento em tempo real de jobs de renderização
 * FASE 2: Sprint 1 - Audio2Face Integration
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRateLimiter, rateLimitPresets } from '@lib/utils/rate-limit-middleware';
import { avatar3DPipeline } from '@lib/avatar-3d-pipeline'
import { getSupabaseForRequest } from '@lib/supabase/server'
import { logger } from '@lib/logger'
import { prisma } from '@lib/db'
import { getServerSession } from 'next-auth';
import { authOptions } from '@lib/auth';
import { applyRateLimit } from '@/lib/rate-limit';

// Interface para tipagem do avatar
interface AvatarModelInfo {
  id: string;
  name: string;
  displayName: string | null;
  category?: string;
}

interface LipSyncData {
  accuracy?: number;
  processingTime?: number;
  metadata?: {
    totalFrames?: number;
    frameRate?: number;
    audioLength?: number;
  };
}

// Type for avatar_models DB row (not in generated Supabase types)
interface AvatarModelRow {
  id: string;
  name: string;
  display_name: string | null;
  category?: string;
}

// Type for render settings stored as JSON
interface RenderSettingsData {
  quality?: string;
  resolution?: string;
  rayTracing?: boolean;
  realTimeLipSync?: boolean;
  language?: string;
  audio2FaceEnabled?: boolean;
  provider?: string;
  externalId?: string;
  [key: string]: unknown;
}

const rateLimiterGet = createRateLimiter(rateLimitPresets.render);
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
    const rateLimitBlocked = await applyRateLimit(request, 'v2-avatars-render-status-get', 60);
    if (rateLimitBlocked) return rateLimitBlocked;

  return rateLimiterGet(request, async (request: NextRequest) => {
  try {
    const jobId = params.id
    const supabase = getSupabaseForRequest(request);
    
    logger.info(`📊 API v2: Verificando status do job ${jobId}`, { component: 'API: v2/avatars/render/status/[id]' })

    // Buscar job do Supabase/Prisma diretamente para ter acesso ao renderSettings
    const job = await prisma.render_jobs.findUnique({
        where: { id: jobId }
    });
    
    if (!job) {
      return NextResponse.json({
        success: false,
        error: {
          message: 'Job não encontrado',
          code: 'JOB_NOT_FOUND'
        }
      }, { status: 404 })
    }

    // Buscar informações do avatar do Supabase (já que não está no Prisma types)
    // Cast 'avatar_models' to any to avoid literal type check error if table not in generated types
    const { data: avatarData } = await supabase
      .from('avatar_models' as never)
      .select('id, name, display_name, category')
      .eq('id', job.avatarModelId)
      .single();
    
    // Safety check for avatarData
    const avatarRecord = avatarData as unknown as AvatarModelRow | null;
    const avatar: AvatarModelInfo | null = avatarRecord ? {
      id: avatarRecord.id,
      name: avatarRecord.name,
      displayName: avatarRecord.display_name,
      category: avatarRecord.category ?? undefined
    } : null;

    const jobData = job;
    const renderSettings = (jobData.renderSettings || {}) as unknown as RenderSettingsData;

    // Calcular métricas
    const currentTime = Date.now()
    const startTimeTime = jobData.createdAt ? jobData.createdAt.getTime() : currentTime;
    const endTimeTime = jobData.completedAt?.getTime();
    const duration = endTimeTime ? endTimeTime - startTimeTime : currentTime - startTimeTime;
    const isCompleted = jobData.status === 'completed'
    const isFailed = jobData.status === 'failed'
    const isProcessing = jobData.status === 'processing' || jobData.status === 'pending' || jobData.status === 'queued';

    // Estimar tempo restante (baseado no progresso)
    let estimatedTimeRemaining: number | null = null
    const progress = jobData.progress || 0;
    
    if (isProcessing && progress > 0) {
      const timePerPercent = duration / progress
      const remainingPercent = 100 - progress
      estimatedTimeRemaining = Math.round(timePerPercent * remainingPercent)
    }

    const lipSyncData = undefined; // Not in raw prisma yet

    // Access properties safely
    const quality = renderSettings.quality || jobData.quality || 'hyperreal';
    const resolution = renderSettings.resolution || '4K';
    const rayTracing = renderSettings.rayTracing || false;
    const realTimeLipSync = renderSettings.realTimeLipSync || false;
    const language = renderSettings.language || 'pt-BR';
    const audio2FaceEnabled = renderSettings.audio2FaceEnabled || false;

    const response = {
      success: true,
      data: {
        job: {
          id: jobData.id,
          avatarId: jobData.avatarModelId,
          userId: jobData.userId,
          avatarName: avatar?.name || avatar?.displayName || 'Desconhecido',
          status: jobData.status,
          progress: progress,
          startTime: jobData.createdAt ? jobData.createdAt.toISOString() : null,
          endTime: jobData.completedAt?.toISOString() || null,
          duration: Math.round(duration / 1000), // em segundos
          estimatedTimeRemaining: estimatedTimeRemaining ? Math.round(estimatedTimeRemaining / 1000) : null,
          error: jobData.errorMessage
        },
        avatar: avatar ? {
          id: avatar.id,
          name: avatar.name,
          displayName: avatar.displayName,
          category: avatar.category
        } : null,
        output: {
          videoUrl: jobData.outputUrl,
          thumbnailUrl: jobData.thumbnailUrl,
          available: isCompleted && !!jobData.outputUrl,
          downloadUrl: isCompleted && jobData.outputUrl ? `/api/v2/avatars/render/download/${job.id}` : null
        },
        lipSync: null,
        render: {
          quality,
          resolution,
          rayTracing,
          realTimeLipSync,
          language
        },
        performance: {
          renderingEngine: renderSettings.provider === 'heygen' ? 'HeyGen AI' : 'Unreal Engine 5.3 + Audio2Face',
          qualityLevel: isCompleted ? (renderSettings.provider === 'heygen' ? 'Ultra' : 'Hiper-realista') : 'Processando...',
          polygonCount: isCompleted ? 850000 : null,
          textureResolution: isCompleted ? '8K' : null,
          rayTracingEnabled: rayTracing,
          audio2FaceEnabled: audio2FaceEnabled
        },
        metadata: {
          version: '2.0.0',
          timestamp: new Date().toISOString(),
          statusCheckedAt: currentTime,
          nextCheckRecommended: isProcessing ? currentTime + 5000 : null, // 5 segundos
          createdAt: jobData.createdAt ? new Date(jobData.createdAt).toISOString() : null,
          updatedAt: jobData.updatedAt ? new Date(jobData.updatedAt).toISOString() : null
        }
      }
    }

    // --- HEYGEN STATUS CHECK START ---
    const settings = (job.renderSettings || {}) as unknown as RenderSettingsData;
    if (settings.provider === 'heygen' && job.status === 'processing') {
       try {
           const { heyGenService } = await import('@lib/heygen-service');
           // External ID stored in renderSettings
           const externalId = settings.externalId;
           if (externalId) {
               const heyGenStatus = await heyGenService.checkStatus(externalId);
               
               if (heyGenStatus.status === 'completed') {
                   // Update DB
                   await prisma.render_jobs.update({
                       where: { id: jobId },
                       data: {
                           status: 'completed',
                           outputUrl: heyGenStatus.video_url, // Maps to outputVideo
                           thumbnailUrl: heyGenStatus.thumbnail_url,
                           progress: 100,
                           completedAt: new Date()
                       }
                   });
                   // Update local job object for response
                   Object.assign(job, {
                     status: 'completed' as const,
                     outputUrl: heyGenStatus.video_url,
                     thumbnailUrl: heyGenStatus.thumbnail_url,
                     progress: 100,
                     completedAt: new Date()
                   });
               } else if (heyGenStatus.status === 'failed') {
                    await prisma.render_jobs.update({
                       where: { id: jobId },
                       data: {
                           status: 'failed',
                           errorMessage: heyGenStatus.error,
                           completedAt: new Date()
                       }
                   });
                   Object.assign(job, {
                     status: 'failed' as const,
                     errorMessage: heyGenStatus.error
                   });
               }
           }
       } catch (err) {
           logger.error('Error checking HeyGen status', err instanceof Error ? err : new Error(String(err)));
       }
    }
    // --- HEYGEN STATUS CHECK END ---

    // Headers para polling
    const headers: Record<string, string> = {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }

    // Se ainda está processando, sugerir próxima verificação
    if (isProcessing) {
      headers['X-Poll-Interval'] = '5000' // 5 segundos
      headers['X-Status'] = 'processing'
    } else if (isCompleted) {
      headers['X-Status'] = 'completed'
    } else if (isFailed) {
      headers['X-Status'] = 'failed'
    }

    return NextResponse.json(response, { headers })
  } catch (error) {
    logger.error('Erro ao verificar status', error instanceof Error ? error : new Error(String(error)), { component: 'API: v2/avatars/render/status/[id]' })
    
    return NextResponse.json({
      success: false,
      error: {
        message: 'Erro ao verificar status do job',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
        code: 'STATUS_CHECK_ERROR'
      }
    }, { status: 500 })
  }
  });
}

const rateLimiterPost = createRateLimiter(rateLimitPresets.render);
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });
  }

  return rateLimiterPost(request, async (request: NextRequest) => {
  try {
    const jobId = params.id
    const body = await request.json()
    const { action } = body
    
    logger.info(`API v2: Ação ${action} no job ${jobId}`, { component: 'API: v2/avatars/render/status/[id]' })

    const job = await prisma.render_jobs.findUnique({ where: { id: jobId } });
    
    if (!job) {
      return NextResponse.json({
        success: false,
        error: {
          message: 'Job não encontrado',
          code: 'JOB_NOT_FOUND'
        }
      }, { status: 404 })
    }

    switch (action) {
      case 'cancel':
        if (job.status !== 'processing' && job.status !== 'pending' && job.status !== 'queued') {
          return NextResponse.json({
            success: false,
            error: {
              message: 'Job não pode ser cancelado (não está em processamento)',
              code: 'CANNOT_CANCEL'
            }
          }, { status: 400 })
        }

        const cancelled = await avatar3DPipeline.cancelRenderJob(jobId)
        
        return NextResponse.json({
          success: true,
          data: {
            message: 'Job cancelado com sucesso',
            jobId,
            cancelled,
            timestamp: new Date().toISOString()
          }
        })

      case 'retry':
        if (job.status !== 'failed') {
          return NextResponse.json({
            success: false,
            error: {
              message: 'Job não pode ser reexecutado (não falhou)',
              code: 'CANNOT_RETRY'
            }
          }, { status: 400 })
        }

        // Atualizar job no Prisma para reprocessamento
        await prisma.render_jobs.update({
          where: { id: jobId },
          data: {
            status: 'queued',
            progress: 0,
            errorMessage: null,
            completedAt: null,
            updatedAt: new Date()
          }
        })

        return NextResponse.json({
          success: true,
          data: {
            message: 'Job recolocado na fila para reprocessamento',
            jobId,
            newStatus: 'queued',
            timestamp: new Date().toISOString()
          }
        })

      case 'download':
        if (job.status !== 'completed' || !job.outputUrl) {
          return NextResponse.json({
            success: false,
            error: {
              message: 'Job não está completo ou não tem saída disponível',
              code: 'NO_OUTPUT_AVAILABLE'
            }
          }, { status: 400 })
        }

        return NextResponse.json({
          success: true,
          data: {
            downloadUrl: job.outputUrl,
            thumbnailUrl: job.thumbnailUrl,
            fileSize: '~50MB', // Estimativa
            format: 'MP4',
            resolution: '4K',
            duration: 5.0 // TODO: Get from durationMs
          }
        })

      default:
        return NextResponse.json({
          success: false,
          error: {
            message: 'Ação não suportada',
            code: 'UNSUPPORTED_ACTION'
          }
        }, { status: 400 })
    }
  } catch (error) {
    logger.error('Erro na ação do job', error instanceof Error ? error : new Error(String(error)), { component: 'API: v2/avatars/render/status/[id]' })
    
    return NextResponse.json({
      success: false,
      error: {
        message: 'Erro ao executar ação no job',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
        code: 'JOB_ACTION_ERROR'
      }
    }, { status: 500 })
  }
  });
}

const rateLimiterDelete = createRateLimiter(rateLimitPresets.authenticated);
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });
  }

  return rateLimiterDelete(request, async (request: NextRequest) => {
  try {
    const jobId = params.id
    
    logger.info(`API v2: Removendo job ${jobId}`, { component: 'API: v2/avatars/render/status/[id]' })

    const job = await prisma.render_jobs.findUnique({ where: { id: jobId } });
    
    if (!job) {
      return NextResponse.json({
        success: false,
        error: {
          message: 'Job não encontrado',
          code: 'JOB_NOT_FOUND'
        }
      }, { status: 404 })
    }

    // Não permitir remoção de jobs em processamento
    if (job.status === 'processing' || job.status === 'queued') {
      return NextResponse.json({
        success: false,
        error: {
          message: 'Não é possível remover job em processamento. Cancele primeiro.',
          code: 'CANNOT_DELETE_PROCESSING'
        }
      }, { status: 400 })
    }

    // Remover job usando Prisma
    await prisma.render_jobs.delete({
      where: { id: jobId }
    })

    // Também remover da memória se existir
    await avatar3DPipeline.cancelRenderJob(jobId)

    return NextResponse.json({
      success: true,
      data: {
        message: 'Job removido com sucesso',
        jobId,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    logger.error('Erro ao remover job', error instanceof Error ? error : new Error(String(error)), { component: 'API: v2/avatars/render/status/[id]' })
    
    return NextResponse.json({
      success: false,
      error: {
        message: 'Erro ao remover job',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
        code: 'DELETE_JOB_ERROR'
      }
    }, { status: 500 })
  }
  });
}