/**
 * API Login Local
 * POST /api/auth/local/login
 */

import { NextRequest, NextResponse } from 'next/server';
import { LocalAuth } from '@lib/auth/local-auth';
import { z } from 'zod';
import { cookies } from 'next/headers';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
});

export async function POST(request: NextRequest) {
  try {
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
    console.error('[Login API] Erro:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno' },
      { status: 500 }
    );
  }
}

