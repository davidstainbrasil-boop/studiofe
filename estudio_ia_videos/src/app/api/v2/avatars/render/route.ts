// TODO: Fix v2 API types
/**
 * 🎬 API v2: Avatar Render
 * Pipeline de renderização hiper-realista com Audio2Face
 * FASE 2: Sprint 1 - Audio2Face Integration
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRateLimiter, rateLimitPresets } from '@lib/utils/rate-limit-middleware';
import { avatar3DPipeline } from '@lib/avatar-3d-pipeline'
import { supabaseClient } from '@lib/supabase'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { logger } from '@lib/logger';
import { prisma } from '@lib/db';
import { requireAuth, unauthorizedResponse } from '@lib/api/auth-middleware';
import { applyRateLimit } from '@/lib/rate-limit';

const rateLimiterPost = createRateLimiter(rateLimitPresets.render);
export async function POST(request: NextRequest) {
  return rateLimiterPost(request, async (request: NextRequest) => {
  try {
    // Authenticate user
    const auth = await requireAuth(request);
    if (!auth) {
      return unauthorizedResponse('Authentication required for avatar rendering');
    }
    const userId = auth.user.id;

    logger.info(`Request Content-Type: ${request.headers.get('content-type')}`, { component: 'API: v2/avatars/render' });
    const contentType = request.headers.get('content-type') || '';
    let avatarId: string;
    let animation: string;
    let text: string;
    let audioFile: File | null = null;
    let resolution: string;
    let quality: string;
    let language: string;
    let rayTracing: boolean;
    let realTimeLipSync: boolean;
    let audio2FaceEnabled: boolean;
    let voiceCloning: boolean;

    if (contentType.includes('application/json')) {
        const json = await request.json();
        avatarId = json.avatarId;
        animation = json.animation;
        text = json.text;
        // audioFile not supported in JSON mode unless base64, skipping for now
        resolution = json.resolution || '4K';
        quality = json.quality || 'hyperreal';
        language = json.language || 'pt-BR';
        rayTracing = json.rayTracing === true; // JSON booleans
        realTimeLipSync = json.realTimeLipSync === true;
        audio2FaceEnabled = json.audio2FaceEnabled !== false;
        voiceCloning = json.voiceCloning === true;
    } else {
        const formData = await request.formData();
        avatarId = formData.get('avatarId') as string;
        animation = formData.get('animation') as string;
        text = formData.get('text') as string;
        audioFile = formData.get('audioFile') as File;
        resolution = (formData.get('resolution') as string) || '4K';
        quality = (formData.get('quality') as string) || 'hyperreal';
        language = (formData.get('language') as string) || 'pt-BR';
        rayTracing = formData.get('rayTracing') === 'true';
        realTimeLipSync = formData.get('realTimeLipSync') === 'true';
        audio2FaceEnabled = formData.get('audio2FaceEnabled') !== 'false';
        voiceCloning = formData.get('voiceCloning') === 'true';
    }

    logger.info('🎬 API v2: Iniciando renderização hiper-realista...', { component: 'API: v2/avatars/render' })
    logger.info(`🎭 Avatar: ${avatarId}`, { component: 'API: v2/avatars/render' })
    logger.info(`🎪 Animação: ${animation}`, { component: 'API: v2/avatars/render' })
    logger.info(`📐 Resolução: ${resolution}`, { component: 'API: v2/avatars/render' })
    logger.info(`✨ Qualidade: ${quality}`, { component: 'API: v2/avatars/render' })
    logger.info(`🗣️ Audio2Face: ${audio2FaceEnabled ? 'Ativado' : 'Desativado'}`, { component: 'API: v2/avatars/render' })

    // Validações
    if (!avatarId || !animation) {
      return NextResponse.json({
        success: false,
        error: {
          message: 'Avatar ID e animação são obrigatórios',
          code: 'MISSING_REQUIRED_FIELDS'
        }
      }, { status: 400 })
    }

    // Verificar se avatar existe no Supabase (avatar_models pode não existir no schema tipado)
    const { data: avatar, error: avatarError } = await (supabaseClient
      .from('avatar_models'))
      .select('*')
      .eq('id', avatarId)
      .eq("is_active", true)
      .single()

    if (avatarError || !avatar) {
      return NextResponse.json({
        success: false,
        error: {
          message: 'Avatar não encontrado',
          code: 'AVATAR_NOT_FOUND'
        }
      }, { status: 404 })
    }

    // Processar arquivo de áudio se fornecido
    let audioFilePath: string | undefined
    if (audioFile && audioFile.size > 0) {
      const audioBuffer = await audioFile.arrayBuffer()
      const audioFileName = `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.wav`
      const tempDir = path.join(process.cwd(), 'temp')
      audioFilePath = path.join(tempDir, audioFileName)
      
      // Criar diretório temp se não existir
      try {
        await mkdir(tempDir, { recursive: true })
        await writeFile(audioFilePath, Buffer.from(audioBuffer))
        logger.info(`🎵 Arquivo de áudio salvo: ${audioFilePath}`, { component: 'API: v2/avatars/render' })
      } catch (fileError) {
        logger.error('Erro ao salvar arquivo de áudio', fileError instanceof Error ? fileError : new Error(String(fileError)), { component: 'API: v2/avatars/render' })
        return NextResponse.json({
          success: false,
          error: {
            message: 'Erro ao processar arquivo de áudio',
            code: 'AUDIO_PROCESSING_ERROR'
          }
        }, { status: 500 })
      }
    }

    // Buscar perfil de voz se especificado
    let voiceProfileId: string | undefined
    if (voiceCloning) {
      // TODO: Implementar seleção de perfil de voz
      voiceProfileId = 'default-voice-profile'
    }

    // Configurações de renderização
    const renderOptions = {
      resolution,
      quality,
      rayTracing,
      realTimeLipSync,
      audio2FaceEnabled,
      voiceCloning,
      language
    }

    // --- HEYGEN INTEGRATION START ---
    // Check if using HeyGen Avatar (starts with hg_ or mock-avatar)
    if (avatarId.startsWith('hg_') || avatarId.startsWith('mock-avatar')) {
       try {
         const { heyGenService } = await import('@lib/heygen-service');
         
         // 1. Upload audio if needed (HeyGen needs URL, not raw file usually, or we upload to them)
         // heyGenService.generateVideo takes { video_inputs: ... }
         // We need to upload the audio to Supabase first to get a URL to pass to HeyGen
         // OR HeyGen allows uploading asset via API? 
         // For now, let's assume we need a public URL for the audio.
         
         let audioUrl = '';
         if (audioFile) {
            const audioBuffer = await audioFile.arrayBuffer();
            const fileName = `temp_heygen_${Date.now()}.mp3`;
            const { data, error } = await supabaseClient.storage
                .from('assets')
                .upload(fileName, audioBuffer, { contentType: 'audio/mpeg', upsert: true });
            
            if (error) throw new Error('Failed to upload temp audio for HeyGen');
            
            const { data: urlData } = supabaseClient.storage.from('assets').getPublicUrl(fileName);
            audioUrl = urlData.publicUrl;
         }

         const externalVideoId = await heyGenService.generateVideo({
            video_inputs: [{
                character: {
                    type: 'avatar',
                    avatar_id: avatarId,
                    avatar_style: 'normal'
                },
                voice: audioUrl ? {
                    type: 'audio',
                    audio_url: audioUrl
                } : {
                    type: 'text',
                    input_text: text,
                    voice_id: '131a436c47064f708210df6628ef8fdd' // default en voice
                },
                background: {
                    type: 'color',
                    value: '#000000' // green screen or alpha? HeyGen alpha uses 'alpha' type usually, but 'color' is safe
                }
            }],
            dimension: { width: 1920, height: 1080 }
         });

         // Create Job in DB
         const job = await prisma.render_jobs.create({
            data: {
                status: 'processing', // HeyGen is async
                renderSettings: JSON.parse(JSON.stringify({
                    type: 'heygen_avatar_render',
                    provider: 'heygen',
                    externalId: externalVideoId,
                    text,
                    options: renderOptions,
                    userId: userId // Authenticated user
                })),
                userId: userId, // Authenticated user
                progress: 0
            }
         });

         return NextResponse.json({
            success: true,
            data: {
                jobId: job.id,
                status: 'processing',
                avatar: { id: avatarId, name: 'HeyGen Avatar', category: 'ai' },
                render: { ...renderOptions, provider: 'heygen' },
                output: { 
                    statusUrl: `/api/v2/avatars/render/status/${job.id}`
                }
            }
         });

       } catch (heyGenError) {
         logger.error('HeyGen Generation Failed', heyGenError instanceof Error ? heyGenError : new Error(String(heyGenError)));
         return NextResponse.json({ success: false, error: { message: 'HeyGen failure', code: 'HEYGEN_ERROR' } }, { status: 500 });
       }
    }
    // --- HEYGEN INTEGRATION END ---

    // --- D-ID INTEGRATION START ---
    if (avatarId.startsWith('did_')) {
       try {
         const { DIDServiceReal } = await import('@lib/services/avatar/did-service-real');
         const didService = new DIDServiceReal();

         // Upload audio if needed (D-ID prefers URL or text)
         let audioUrl = '';
         if (audioFile) {
            const audioBuffer = await audioFile.arrayBuffer();
            const fileName = `temp_did_${Date.now()}.mp3`;
            const { data, error } = await supabaseClient.storage
                .from('assets')
                .upload(fileName, audioBuffer, { contentType: 'audio/mpeg', upsert: true });
            
            if (error) throw new Error('Failed to upload temp audio for D-ID');
            
            const { data: urlData } = supabaseClient.storage.from('assets').getPublicUrl(fileName);
            audioUrl = urlData.publicUrl;
         }

         // Look up source image for this D-ID avatar
         const { data: avatarRecord } = await (supabaseClient
            .from('avatar_models'))
            .select('imageUrl')
            .eq('id', avatarId)
            .single();
         
         const sourceUrl = (avatarRecord as unknown as { imageUrl?: string })?.imageUrl || 'https://placehold.co/512x512.png'; // Fallback or Error

         const talkId = await didService.createTalk({
             sourceImage: sourceUrl,
             text: !audioUrl ? text : undefined,
             audioUrl: audioUrl || undefined,
             voice: language === 'pt-BR' ? 'pt-BR-FranciscaNeural' : 'en-US-JennyNeural' // Simple default mapping
         });

         // Create Job in DB
         const job = await prisma.render_jobs.create({
            data: {
                status: 'processing',
                renderSettings: JSON.parse(JSON.stringify({
                    type: 'did_avatar_render',
                    provider: 'did',
                    externalId: talkId,
                    text,
                    options: renderOptions,
                    userId: userId
                })),
                userId: userId,
                progress: 0
            }
         });

         return NextResponse.json({
            success: true,
            data: {
                jobId: job.id,
                status: 'processing',
                avatar: { id: avatarId, name: 'D-ID Avatar', category: 'ai' },
                render: { ...renderOptions, provider: 'did' },
                output: { 
                    statusUrl: `/api/v2/avatars/render/status/${job.id}`
                }
            }
         });

       } catch (didError) {
         logger.error('D-ID Generation Failed', didError instanceof Error ? didError : new Error(String(didError)));
         return NextResponse.json({ success: false, error: { message: 'D-ID failure', code: 'DID_ERROR' } }, { status: 500 });
       }
    }
    // --- D-ID INTEGRATION END ---

    // Iniciar renderização usando o novo pipeline (Internal/UE5)
    const renderResult = await avatar3DPipeline.renderHyperRealisticAvatar(
      userId, // Authenticated user
      text || '',
      voiceProfileId,
      {
        avatarId,
        animation,
        audioFilePath,
        ...renderOptions
      }
    )

    logger.info(`✅ Renderização iniciada - Job ID: ${renderResult.jobId}`, { component: 'API: v2/avatars/render' })

    // Type avatar data from Supabase (tabela pode ter estrutura diferente do schema)
    const avatarData = avatar as Record<string, unknown>
    const response = {
      success: true,
      data: {
        jobId: renderResult.jobId,
        status: renderResult.status,
        avatar: {
          id: avatarData.id,
          name: avatarData.name,
          displayName: avatarData.displayName,
          category: avatarData.category,
          audio2FaceCompatible: avatarData.audio2faceCompatible
        },
        render: {
          animation,
          resolution,
          quality,
          rayTracing,
          audio2FaceEnabled,
          realTimeLipSync,
          voiceCloning,
          language,
          estimatedTime: renderResult.estimatedTime || '30-60s',
          progress: renderResult.progress || 0
        },
        output: {
          videoUrl: renderResult.outputVideo,
          thumbnailUrl: renderResult.outputThumbnail,
          statusUrl: `/api/v2/avatars/render/status/${renderResult.jobId}`,
          downloadUrl: renderResult.outputVideo ? `/api/v2/avatars/render/download/${renderResult.jobId}` : null
        },
        quality: {
          renderingEngine: 'Unreal Engine 5.3',
          lipSyncAccuracy: renderResult.lipSyncAccuracy || 0,
          audio2FaceEnabled: renderResult.audio2FaceEnabled || false,
          rayTracingEnabled: rayTracing
        },
        metadata: {
          startTime: renderResult.startTime ? new Date(renderResult.startTime).toISOString() : new Date().toISOString(),
          version: '2.0.0',
          userId: userId, // Authenticated user
          audioFile: audioFile ? audioFile.name : null,
          textLength: text?.length || 0
        }
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    logger.error('❌ Erro na renderização:', error instanceof Error ? error : new Error(String(error)), { component: 'API: v2/avatars/render' })
    
    return NextResponse.json({
      success: false,
      error: {
        message: 'Erro ao iniciar renderização',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
        code: 'RENDER_ERROR'
      }
    }, { status: 500 })
  }
  });
}

const rateLimiterGet = createRateLimiter(rateLimitPresets.authenticated);
export async function GET(request: NextRequest) {
    const rateLimitBlocked = await applyRateLimit(request, 'v2-avatars-render-get', 60);
    if (rateLimitBlocked) return rateLimitBlocked;

  return rateLimiterGet(request, async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const userId = searchParams.get('userId')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')

    logger.info('📊 API v2: Listando jobs de renderização...', { component: 'API: v2/avatars/render' })

    // Buscar jobs do Supabase
    type SupabaseQueryBuilder = ReturnType<typeof supabaseClient.from>
    let query: SupabaseQueryBuilder = (supabaseClient
      .from('render_jobs')
      .select(`
        *,
        avatar_models (
          id,
          name,
          display_name,
          category
        )
      `))
      .order("createdAt", { ascending: false })

    // Filtrar por status
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    // Filtrar por usuário
    if (userId) {
      query = query.eq("userId", userId)
    }

    // Aplicar paginação
    query = query.range(offset, offset + limit - 1)

    const { data: jobs, error: jobsError } = await query

    if (jobsError) {
      throw new Error(`Erro ao buscar jobs: ${jobsError.message}`)
    }

    // Contar total de jobs
    let countQuery: SupabaseQueryBuilder = (supabaseClient
      .from('render_jobs')
      .select('*', { count: 'exact', head: true }))

    if (status && status !== 'all') {
      countQuery = countQuery.eq('status', status)
    }
    if (userId) {
      countQuery = countQuery.eq("userId", userId)
    }

    const { count: totalJobs } = await countQuery

    // Obter estatísticas do pipeline
    const stats = await avatar3DPipeline.getPipelineStats()

    interface RenderJobRecord {
      id: string; avatarModelId: string; userId: string; status: string;
      progress?: number; createdAt: string; completedAt?: string;
      output_video_url?: string; output_thumbnail_url?: string;
      errorMessage?: string; lipsyncAccuracy?: number; audio2face_enabled?: boolean;
      avatar_models?: { id: string; name: string; displayName: string; category: string };
      quality?: string; resolution?: string; ray_tracing_enabled?: boolean;
      real_time_lipsync?: boolean; language?: string;
    }
    const response = {
      success: true,
      data: {
        jobs: (jobs || []).map((job: RenderJobRecord) => ({
          id: job.id,
          avatarId: job.avatarModelId,
          userId: job.userId,
          status: job.status,
          progress: job.progress || 0,
          startTime: job.createdAt,
          endTime: job.completedAt,
          duration: job.completedAt ? 
            new Date(job.completedAt).getTime() - new Date(job.createdAt).getTime() : 
            Date.now() - new Date(job.createdAt).getTime(),
          outputVideo: job.output_video_url,
          outputThumbnail: job.output_thumbnail_url,
          error: job.errorMessage,
          lipSyncAccuracy: job.lipsyncAccuracy,
          audio2FaceEnabled: job.audio2face_enabled,
          avatar: job.avatar_models ? {
            id: job.avatar_models.id,
            name: job.avatar_models.name,
            displayName: job.avatar_models.displayName,
            category: job.avatar_models.category
          } : null,
          render: {
            quality: job.quality,
            resolution: job.resolution,
            rayTracing: job.ray_tracing_enabled,
            realTimeLipSync: job.real_time_lipsync,
            language: job.language
          }
        })),
        pagination: {
          total: totalJobs || 0,
          limit,
          offset,
          hasMore: offset + limit < (totalJobs || 0)
        },
        stats: {
          ...stats,
          queueLength: (jobs || []).filter((job: { status: string }) => job.status === 'queued').length,
          processingCount: (jobs || []).filter((job: { status: string }) => job.status === 'processing').length,
          completedCount: (jobs || []).filter((job: { status: string }) => job.status === 'completed').length,
          failedCount: (jobs || []).filter((job: { status: string }) => job.status === 'failed').length
        },
        metadata: {
          version: '2.0.0',
          timestamp: new Date().toISOString(),
          filters: {
            status: status || 'all',
            userId: userId || null
          }
        }
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    logger.error('❌ Erro ao listar jobs:', error instanceof Error ? error : new Error(String(error)), { component: 'API: v2/avatars/render' })
    
    return NextResponse.json({
      success: false,
      error: {
        message: 'Erro ao listar jobs de renderização',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
        code: 'LIST_JOBS_ERROR'
      }
    }, { status: 500 })
  }
  });
}

const rateLimiterDelete = createRateLimiter(rateLimitPresets.authenticated);
export async function DELETE(request: NextRequest) {
  return rateLimiterDelete(request, async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')
    const action = searchParams.get('action')

    logger.info(`🗑️ API v2: ${action === 'cancel' ? 'Cancelando' : 'Removendo'} job ${jobId}`, { component: 'API: v2/avatars/render' })

    if (action === 'cancel') {
      if (!jobId) {
        return NextResponse.json({
          success: false,
          error: {
            message: 'Job ID é obrigatório para cancelamento',
            code: 'MISSING_JOB_ID'
          }
        }, { status: 400 })
      }

      // Cancelar job usando o pipeline
      const cancelled = await avatar3DPipeline.cancelRenderJob(jobId)
      
      if (!cancelled) {
        return NextResponse.json({
          success: false,
          error: {
            message: 'Job não pode ser cancelado (não encontrado ou já finalizado)',
            code: 'CANNOT_CANCEL_JOB'
          }
        }, { status: 400 })
      }

      return NextResponse.json({
        success: true,
        data: {
          message: 'Job cancelado com sucesso',
          jobId,
          timestamp: new Date().toISOString()
        }
      })
    } else if (action === 'cleanup') {
      // Limpar jobs antigos
      await avatar3DPipeline.cleanupOldJobs()
      
      // Contar jobs removidos usando Prisma
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      
      const oldJobsCount = await prisma.render_jobs.count({
        where: {
          createdAt: { lt: thirtyDaysAgo },
          status: { in: ['completed', 'failed', 'cancelled'] }
        }
      })

      return NextResponse.json({
        success: true,
        data: {
          message: `Jobs antigos removidos com sucesso`,
          cleanedCount: oldJobsCount,
          cutoffDate: thirtyDaysAgo.toISOString()
        }
      })
    } else {
      return NextResponse.json({
        success: false,
        error: {
          message: 'Ação não suportada. Use action=cancel ou action=cleanup',
          code: 'UNSUPPORTED_ACTION'
        }
      }, { status: 400 })
    }
  } catch (error) {
    logger.error('❌ Erro ao gerenciar job:', error instanceof Error ? error : new Error(String(error)), { component: 'API: v2/avatars/render' })
    
    return NextResponse.json({
      success: false,
      error: {
        message: 'Erro ao gerenciar job',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
        code: 'JOB_MANAGEMENT_ERROR'
      }
    }, { status: 500 })
  }
  });
}
