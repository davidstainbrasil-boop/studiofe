/**
 * API de Alteração de Senha
 */

import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@lib/auth/auth-service';
import { logger } from '@lib/logger';
import { getServerAuth } from '@lib/auth/unified-session';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerAuth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Token de acesso obrigatório' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const userEmail = session.user.email;

    const { currentPassword, newPassword, confirmPassword } = await request.json();

    // Validações
    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { error: 'Todos os campos são obrigatórios' },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: 'Nova senha e confirmação não coincidem' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Nova senha deve ter pelo menos 6 caracteres' },
        { status: 400 }
      );
    }

    // Validar força da senha
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumbers = /\d/.test(newPassword);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);

    if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
      return NextResponse.json(
        { error: 'Nova senha deve conter pelo menos uma letra maiúscula, uma minúscula e um número' },
        { status: 400 }
      );
    }

    // Alterar senha
    await authService.changePassword(userId, currentPassword, newPassword);

    // Log de segurança
    logger.info(`Password changed for user: ${userEmail}`, { component: 'API: auth/change-password' });

    return NextResponse.json({
      success: true,
      message: 'Senha alterada com sucesso'
    });

  } catch (error) {
    logger.error('Change password error', error instanceof Error ? error : new Error(String(error)), { component: 'API: auth/change-password' });
    
    const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor';
    
    return NextResponse.json(
      { error: errorMessage },
      { status: errorMessage === 'Senha atual incorreta' ? 400 : 500 }
    );
  }
}
