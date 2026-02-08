/**
 * API de Profile - Gerenciamento de perfil do usuário
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@lib/logger';
import { applyRateLimit } from '@/lib/rate-limit';
import { getServerAuth } from '@lib/auth/unified-session';

export async function GET(request: NextRequest) {
  try {
    const rateLimitBlocked = await applyRateLimit(request, 'auth-profile-get', 20);
    if (rateLimitBlocked) return rateLimitBlocked;

    const session = await getServerAuth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Token de acesso obrigatório' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      avatar: session.user.image,
      role: 'user',
      permissions: [],
      preferences: {},
    });

  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error)); logger.error('Profile get error', err, { component: 'API: auth/profile' });
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerAuth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Token de acesso obrigatório' },
        { status: 401 }
      );
    }

    const updates = await request.json();

    // Atualizar apenas campos permitidos
    const allowedUpdates = ['name', 'avatar', 'preferences'];
    const filteredUpdates: Record<string, unknown> = {};

    for (const key of allowedUpdates) {
      if (updates[key] !== undefined) {
        filteredUpdates[key] = updates[key];
      }
    }

    // Validações específicas
    if (filteredUpdates.name && (filteredUpdates.name as string).length < 2) {
      return NextResponse.json(
        { error: 'Nome deve ter pelo menos 2 caracteres' },
        { status: 400 }
      );
    }

    // Atualizar usuário (em produção, salvar no banco)
    return NextResponse.json({
      success: true,
      message: 'Perfil atualizado com sucesso',
      user: {
        id: session.user.id,
        email: session.user.email,
        name: filteredUpdates.name || session.user.name,
        avatar: filteredUpdates.avatar || session.user.image,
        role: 'user',
        permissions: [],
        preferences: filteredUpdates.preferences || {}
      }
    });

  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('Profile update error', err, { component: 'API: auth/profile' });
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
