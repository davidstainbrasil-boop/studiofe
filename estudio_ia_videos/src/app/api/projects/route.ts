import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@lib/prisma'
import { logger } from '@lib/logger';
import { randomUUID } from 'crypto';
import { cachedQuery, CacheTier } from '@lib/cache/redis-cache';
import { rateLimit, getUserTier } from '@/middleware/rate-limiter';
import { getSupabaseForRequest } from '@lib/supabase/server';

// Schema de validação para projetos
const ProjectSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(255, 'Nome muito longo'),
  description: z.string().optional(),
  type: z.enum(['pptx', 'template-nr', 'talking-photo', 'custom', 'ai-generated']).default('custom'),
  metadata: z.object({
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    tags: z.array(z.string()).optional(),
    category: z.string().optional()
  }).optional(),
  settings: z.object({
    width: z.number().default(1920),
    height: z.number().default(1080),
    fps: z.number().default(30),
    duration: z.number().optional(),
    quality: z.enum(['low', 'medium', 'high']).default('high'),
    format: z.enum(['mp4', 'mov', 'avi']).default('mp4')
  }).optional()
})

// GET - Listar projetos (usando Prisma para banco local)
export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    const supabase = getSupabaseForRequest(request);
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const tier = await getUserTier(user.id);
      const rateLimitResponse = await rateLimit(request, user.id, tier);

      if (rateLimitResponse) {
        logger.warn('Projects list rate limit exceeded', { userId: user.id, tier });
        return rateLimitResponse;
      }
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const search = searchParams.get('search')
    const userId = searchParams.get("userId") || user?.id // Use auth user if available

    // Build where clause
    interface WhereClause {
      userId?: string
      status?: string
      type?: string
      name?: { contains: string; mode: 'insensitive' }
    }
    const whereClause: WhereClause = {}

    if (userId) {
      whereClause.userId = userId
    }

    if (status) {
      whereClause.status = status
    }

    if (type && ['pptx', 'template-nr', 'talking-photo', 'custom', 'ai-generated'].includes(type)) {
      whereClause.type = type
    }

    if (search) {
      whereClause.name = { contains: search, mode: 'insensitive' }
    }

    // Create cache key from query parameters
    const cacheKey = `projects:list:${userId}:${page}:${limit}:${status || 'all'}:${type || 'all'}:${search || 'none'}`;

    // Get projects and count using Prisma with caching (5 min TTL)
    const [projects, count] = await cachedQuery(
      cacheKey,
      async () => {
        return await Promise.all([
          prisma.projects.findMany({
            where: whereClause as Record<string, unknown>,
            orderBy: { updatedAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
          }),
          prisma.projects.count({ where: whereClause as Record<string, unknown> })
        ]);
      },
      CacheTier.SHORT // 5 minutes cache
    )

    const response = {
      success: true,
      data: projects,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit)
      },
      filters: {
        status,
        type,
        search
      },
      timestamp: new Date().toISOString()
    }

    return NextResponse.json(response)

  } catch (error) {
    logger.error('💥 [PROJECTS-API] Erro ao listar projetos:', error instanceof Error ? error : new Error(String(error)), { component: 'API: projects' })
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// POST - Criar novo projeto (usando Prisma)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Get user_id from body or header for local dev
    const userId = body.userId || request.headers.get('x-user-id') || 'demo-user'
    
    // Validação dos dados
    const validationResult = ProjectSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Dados inválidos',
        details: validationResult.error.errors,
        timestamp: new Date().toISOString()
      }, { status: 400 })
    }

    const validatedData = validationResult.data

    // Criar novo projeto usando Prisma
    const newProject = await prisma.projects.create({
      data: {
        id: randomUUID(),
        name: validatedData.name,
        description: validatedData.description || '',
        type: validatedData.type as never,
        status: 'draft',
        userId: userId,
        metadata: (validatedData.metadata || {}) as object,
        isPublic: false,
      },
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
      }
    })
    
    return NextResponse.json({
      success: true,
      message: 'Projeto criado com sucesso!',
      data: newProject,
      timestamp: new Date().toISOString()
    }, { status: 201 })

  } catch (error) {
    logger.error('💥 [PROJECTS-API] Erro ao criar projeto:', error instanceof Error ? error : new Error(String(error)), { component: 'API: projects' })
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
