/**
 * API Login Local
 * POST /api/auth/local/login
 */

import { NextRequest, NextResponse } from 'next/server';
import { LocalAuth } from '@lib/auth/local-auth';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { logger } from '@lib/logger';
import { checkRateLimit } from '@/lib/rate-limit';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 5 attempts per minute per IP (brute force prevention)
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rl = await checkRateLimit(`auth-login:${ip}`, 5, 60_000);
    if (!rl.allowed) {
      logger.warn('Login rate limit exceeded', { ip, retryAfter: rl.retryAfterSec });
      return NextResponse.json(
        { success: false, error: 'Too many login attempts. Try again later.', retryAfter: rl.retryAfterSec },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
      );
    }

    const body = await request.json();
    const validation = loginSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Dados inválidos', details: validation.error.format() },
        { status: 400 }
      );
    }

    const { email, password } = validation.data;
    const result = await LocalAuth.login(email, password);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 401 }
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
      message: 'Login realizado com sucesso',
    });

  } catch (error) {
    logger.error('Erro no login', error instanceof Error ? error : new Error(String(error)), {
      component: 'API: auth/local/login'
    });
    return NextResponse.json(
      { success: false, error: 'Erro interno' },
      { status: 500 }
    );
  }
}

