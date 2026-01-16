import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ADMIN_CONFIG, hashPassword, generateToken, sessionStore } from '@/lib/admin-auth';
import { logger } from '@lib/logger';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email e senha são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar credenciais
    const passwordHash = hashPassword(password);
    
    if (email !== ADMIN_CONFIG.email || passwordHash !== ADMIN_CONFIG.passwordHash) {
      // Log de tentativa de login falha
      logger.warn('Tentativa de login admin falhou', {
        component: 'API: admin/auth/login',
        email,
        timestamp: new Date().toISOString()
      });
      
      return NextResponse.json(
        { error: 'Credenciais inválidas' },
        { status: 401 }
      );
    }

    // Gerar token de sessão
    const token = generateToken();
    const expiresAt = Date.now() + (24 * 60 * 60 * 1000); // 24 horas

    // Armazenar sessão
    sessionStore.set(token, {
      email: ADMIN_CONFIG.email,
      name: ADMIN_CONFIG.name,
      expiresAt
    });

    // Log de login bem-sucedido
    logger.info('Login admin bem-sucedido', {
      component: 'API: admin/auth/login',
      email,
      timestamp: new Date().toISOString()
    });

    const cookieStore = await cookies();
    cookieStore.set('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 24 horas
      path: '/'
    });

    return NextResponse.json({
      success: true,
      message: 'Login realizado com sucesso',
      user: {
        email: ADMIN_CONFIG.email,
        name: ADMIN_CONFIG.name
      }
    });

  } catch (error) {
    logger.error('Erro no login admin', error instanceof Error ? error : new Error(String(error)), {
      component: 'API: admin/auth/login'
    });
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
