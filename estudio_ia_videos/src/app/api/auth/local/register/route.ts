/**
 * API Register Local
 * POST /api/auth/local/register
 */

import { NextRequest, NextResponse } from 'next/server';
import { LocalAuth } from '@lib/auth/local-auth';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { logger } from '@lib/logger';
import { checkRateLimit } from '@/lib/rate-limit';

const registerSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 3 registrations per minute per IP (anti-abuse)
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rl = await checkRateLimit(`auth-register:${ip}`, 3, 60_000);
    if (!rl.allowed) {
      logger.warn('Register rate limit exceeded', { ip, retryAfter: rl.retryAfterSec });
      return NextResponse.json(
        { success: false, error: 'Too many registration attempts. Try again later.', retryAfter: rl.retryAfterSec },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
      );
    }

    const body = await request.json();
    const validation = registerSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Dados inválidos', details: validation.error.format() },
        { status: 400 }
      );
    }

    const { email, password, name } = validation.data;
    const result = await LocalAuth.register(email, password, name);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    // Definir cookie de autenticação
    const cookieStore = await cookies();
    cookieStore.set('auth_token', result.token!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 dias
      path: '/',
    });

    return NextResponse.json({
      success: true,
      user: result.user,
      message: 'Conta criada com sucesso',
    }, { status: 201 });

  } catch (error) {
    logger.error('Erro no registro', error instanceof Error ? error : new Error(String(error)), {
      component: 'API: auth/local/register'
    });
    return NextResponse.json(
      { success: false, error: 'Erro interno' },
      { status: 500 }
    );
  }
}

