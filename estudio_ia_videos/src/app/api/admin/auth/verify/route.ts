import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { sessionStore } from '@/lib/admin-auth';
import { logger } from '@lib/logger';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('admin_token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    const session = sessionStore.get(token);

    if (!session) {
      // Tentar verificar se é um token válido via header
      const authHeader = request.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        const bearerToken = authHeader.substring(7);
        const bearerSession = sessionStore.get(bearerToken);
        if (bearerSession && Date.now() <= bearerSession.expiresAt) {
          return NextResponse.json({
            authenticated: true,
            email: bearerSession.email,
            name: bearerSession.name
          });
        }
      }

      return NextResponse.json(
        { error: 'Sessão inválida' },
        { status: 401 }
      );
    }

    if (Date.now() > session.expiresAt) {
      sessionStore.delete(token);
      return NextResponse.json(
        { error: 'Sessão expirada' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      authenticated: true,
      email: session.email,
      name: session.name
    });

  } catch (error) {
    logger.error('Erro na verificação admin', error instanceof Error ? error : new Error(String(error)), {
      component: 'API: admin/auth/verify'
    });
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';
