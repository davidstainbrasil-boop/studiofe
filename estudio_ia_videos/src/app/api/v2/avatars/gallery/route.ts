// TODO: Fix v2 API types
/**
 * 🎭 API v2: Avatar Gallery
 * Galeria melhorada de avatares 3D hiper-realistas
 * FASE 2: Sprint 1 - Audio2Face Integration
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRateLimiter, rateLimitPresets } from '@lib/utils/rate-limit-middleware';
import { avatar3DPipeline } from '@lib/avatar-3d-pipeline'
import { supabase as supabaseClient } from '@lib/services'
import { logger } from '@lib/logger';
import { prisma } from '@lib/prisma'; // Corrigido de '@lib/db' para '@lib/prisma'

// Interface para avatar model da tabela
interface AvatarModel {
  id: string;
  name: string;
  displayName: string | null;
  description: string;
  type: string;
  gender?: string;
  quality: string;
  thumbnailUrl?: string;
  modelUrl?: string;
  previewVideoUrl?: string;
  audio2faceCompatible: boolean;
  realTimeLipsync: boolean;
  rayTracingSupport: boolean;
  lipsyncAccuracy?: number;
  modelFilePath?: string;
  textureFiles?: unknown;
  rigFilePath?: string;
  animationSets?: unknown;
  blendShapesFile?: string;
  supportedLanguages?: string[];
  isActive: boolean;
  usageCount?: number;
  avatarStats?: unknown;
  rating?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const rateLimiterGet = createRateLimiter(rateLimitPresets.authenticated);
export async function GET(request: NextRequest) {
  return rateLimiterGet(request, async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const quality = searchParams.get('quality')
    const language = searchParams.get('language')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    logger.info('🎭 API v2: Buscando galeria de avatares...', { component: 'API: v2/avatars/gallery' })
    
    // Buscar avatares usando Prisma em vez de Supabase Client direto
    // para garantir tipagem e consistência
    interface AvatarWhereClause {
      isActive: boolean;
      avatar_type?: string;
      OR?: Array<{
        name?: { contains: string; mode: 'insensitive' };
        displayName?: { contains: string; mode: 'insensitive' };
        description?: { contains: string; mode: 'insensitive' };
      }>;
    }
    
    const whereClause: AvatarWhereClause = { isActive: true };

    if (category && category !== 'all') {
      whereClause.avatar_type = category; // Ajustado para campo correto no schema (avatar_type)
    }

    if (quality && quality !== 'all') {
        // No schema atual não tem campo 'quality', assumindo 'description' ou 'metadata'
        // ou ignorando filtro por enquanto se não existir no schema
    }

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { displayName: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    const avatars = await prisma.avatar_models.findMany({
        where: whereClause as any,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { updated_at: 'desc' } // Ordenar por mais recente
    });

    const totalCount = await prisma.avatar_models.count({ where: whereClause as any });

    // Obter estatísticas do pipeline
    const stats = await avatar3DPipeline.getPipelineStats()

    // Obter categorias e qualidades disponíveis
    // Usando distinct do Prisma
    const categoriesData = await prisma.avatar_models.findMany({
      where: { is_active: true },
      select: { avatar_type: true },
      distinct: ['avatar_type']
    })

    const categories = categoriesData.map(item => item.avatar_type).filter(Boolean);
    const qualities = ['standard', 'high', 'ultra']; // Hardcoded pois não está no schema

    const response = {
      success: true,
      data: {
        avatars: avatars.map(avatar => ({
          id: avatar.id,
          name: avatar.name,
          displayName: avatar.display_name,
          description: avatar.description,
          category: avatar.avatar_type,
          gender: avatar.gender,
          quality: 'high', // Default
          features: {
            audio2FaceCompatible: avatar.supports_audio2face,
            realTimeLipSync: avatar.supports_real_time,
            rayTracing: false,
            lipSyncAccuracy: 95
          },
          preview: {
            thumbnail: avatar.thumbnail_url || `/api/v2/avatars/${avatar.id}/thumbnail.jpg`,
            model3D: avatar.model_file_url || `/api/v2/avatars/${avatar.id}/preview.gltf`,
            animation: avatar.animation_file_url || `/api/v2/avatars/${avatar.id}/idle.mp4`
          },
          assets: {
            modelFile: avatar.model_file_url,
            textureFiles: avatar.texture_file_url,
            rigFile: null,
            animationSets: avatar.animation_file_url,
            blendShapes: null
          },
          supportedLanguages: ['pt-BR'],
          usageCount: 0,
          rating: 5.0,
          createdAt: avatar.created_at,
          updatedAt: avatar.updated_at
        })),
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasNext: (page * limit) < totalCount,
          hasPrev: page > 1
        },
        filters: {
          categories,
          qualities,
          supportedLanguages: ['pt-BR', 'en-US', 'es-ES'],
          applied: {
            category: category || 'all',
            quality: quality || 'all',
            language: language || 'all',
            search: search || ''
          }
        },
        stats: {
          ...stats,
          totalDisplayed: avatars.length,
          totalAvailable: totalCount
        },
        metadata: {
          version: '2.0.0',
          audio2FaceEnabled: stats.audio2FaceStatus,
          supportedQualities: qualities,
          supportedLanguages: ['pt-BR', 'en-US', 'es-ES'],
          renderingEngine: 'Unreal Engine 5 + Audio2Face'
        }
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error)); logger.error('❌ Erro na API v2 Gallery', err, { component: 'API: v2/avatars/gallery' })
    
    return NextResponse.json({
      success: false,
      error: {
        message: 'Erro ao carregar galeria de avatares',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
        code: 'GALLERY_ERROR'
      }
    }, { status: 500 })
  }
  });
}

const rateLimiterPost = createRateLimiter(rateLimitPresets.authenticated);
export async function POST(request: NextRequest) {
  return rateLimiterPost(request, async (request: NextRequest) => {
  try {
    const body = await request.json()
    const { avatarId, action, data } = body

    logger.info(`🎭 API v2: Ação na galeria - ${action} para avatar ${avatarId}`, { component: 'API: v2/avatars/gallery' })

    switch (action) {
      case 'preview': {
        // Buscar avatar usando Prisma
        const avatarData = await prisma.avatar_models.findFirst({
          where: { id: avatarId, is_active: true }
        })

        if (!avatarData) {
          return NextResponse.json({
            success: false,
            error: { message: 'Avatar não encontrado', code: 'AVATAR_NOT_FOUND' }
          }, { status: 404 })
        }

        return NextResponse.json({
          success: true,
          data: {
            avatar: {
              id: avatarData.id,
              name: avatarData.name,
              displayName: avatarData.display_name,
              description: avatarData.description,
              preview: {
                thumbnail: avatarData.thumbnail_url || `/api/v2/avatars/${avatarData.id}/thumbnail.jpg`,
                model3D: avatarData.model_file_url || `/api/v2/avatars/${avatarData.id}/preview.gltf`,
                animation: avatarData.animation_file_url || `/api/v2/avatars/${avatarData.id}/idle.mp4`
              },
              features: {
                audio2FaceCompatible: avatarData.supports_audio2face,
                realTimeLipSync: avatarData.supports_real_time,
                rayTracing: false,
                lipSyncAccuracy: 95
              },
              assets: {
                modelFile: avatarData.model_file_url,
                textureFiles: avatarData.texture_file_url,
                rigFile: null,
                animationSets: avatarData.animation_file_url,
                blendShapes: null
              }
            }
          }
        })
      }

      case 'test_lipsync': {
        // Testar lip-sync do avatar
        const { text, audioFile } = data
        
        if (!text) {
          return NextResponse.json({
            success: false,
            error: { message: 'Texto é obrigatório para teste de lip-sync', code: 'MISSING_TEXT' }
          }, { status: 400 })
        }

        // Verificar se o avatar existe usando Prisma
        const avatarData = await prisma.avatar_models.findFirst({
          where: { id: avatarId, is_active: true },
          select: { id: true, name: true, supports_audio2face: true }
        })

        if (!avatarData) {
          return NextResponse.json({
            success: false,
            error: { message: 'Avatar não encontrado', code: 'AVATAR_NOT_FOUND' }
          }, { status: 404 })
        }

        // Criar um job de teste de lip-sync
        const testJobId = `test_${avatarId}_${Date.now()}`
        
        try {
          const lipSyncResult = await avatar3DPipeline.generateHyperRealisticLipSync(
            avatarId,
            audioFile || '/audio/test-sample.wav',
            text,
            { language: 'pt-BR', quality: 'high' }
          )

          return NextResponse.json({
            success: true,
            data: {
              testJobId,
              lipSync: {
                accuracy: lipSyncResult.accuracy,
                processingTime: lipSyncResult.processingTime,
                audio2FaceEnabled: lipSyncResult.audio2FaceEnabled,
                dataPoints: lipSyncResult.lipSyncData?.length || 0,
                preview: `/api/v2/avatars/${avatarId}/lipsync-test.mp4`,
                blendShapes: lipSyncResult.lipSyncData?.slice(0, 10) // Primeiros 10 frames para preview
              },
              avatar: {
                id: avatarData.id,
                name: avatarData.name,
                audio2FaceCompatible: avatarData.supports_audio2face
              }
            }
          })
        } catch (lipSyncError) {
          logger.error('Erro no teste de lip-sync', lipSyncError instanceof Error ? lipSyncError : new Error(String(lipSyncError)) , { component: 'API: v2/avatars/gallery' })
          return NextResponse.json({
            success: false,
            error: { 
              message: 'Erro ao testar lip-sync', 
              code: 'LIPSYNC_TEST_ERROR',
              details: lipSyncError instanceof Error ? lipSyncError.message : 'Erro desconhecido'
            }
          }, { status: 500 })
        }
      }

      case 'favorite': {
        // Adicionar/remover dos favoritos (requer autenticação)
        const { userId, isFavorite } = data
        
        if (!userId) {
          return NextResponse.json({
            success: false,
            error: { message: 'ID do usuário é obrigatório', code: 'MISSING_USER_ID' }
          }, { status: 400 })
        }

        // TODO: Implementar sistema de favoritos
        return NextResponse.json({
          success: true,
          data: {
            avatarId,
            userId,
            isFavorite: !isFavorite,
            message: isFavorite ? 'Avatar removido dos favoritos' : 'Avatar adicionado aos favoritos'
          }
        })
      }

      default:
        return NextResponse.json({
          success: false,
          error: { message: 'Ação não suportada', code: 'UNSUPPORTED_ACTION' }
        }, { status: 400 })
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error)); logger.error('❌ Erro na ação da galeria', err, { component: 'API: v2/avatars/gallery' })
    
    return NextResponse.json({
      success: false,
      error: {
        message: 'Erro ao executar ação na galeria',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
        code: 'GALLERY_ACTION_ERROR'
      }
    }, { status: 500 })
  }
  });
}
