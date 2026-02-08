import { NextRequest, NextResponse } from 'next/server';
import { backupRecoverySystem as backupSystem } from '@lib/backup-recovery-system';
import { logger } from '@lib/logger';
import { getServerAuth } from '@lib/auth/unified-session';
import { applyRateLimit } from '@/lib/rate-limit';

/** Auth guard - requer sessão autenticada */
async function requireAuth() {
  const session = await getServerAuth();
  if (!session?.user?.id) {
    return { error: true, response: NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 }), session: null };
  }
  return { error: false, response: null, session };
}

/**
 * API de Backup e Recuperação
 * 
 * Endpoints:
 * - GET /api/backup - Lista backups
 * - POST /api/backup - Cria backup
 * - GET /api/backup/:id - Info de backup específico
 * - POST /api/backup/:id/restore - Restaura backup
 * - DELETE /api/backup/cleanup - Remove backups antigos
 */

/**
 * GET /api/backup
 * Lista todos os backups disponíveis
 */
export async function GET(request: NextRequest) {
    const rateLimitBlocked = await applyRateLimit(request, 'backup-get', 60);
    if (rateLimitBlocked) return rateLimitBlocked;

  const auth = await requireAuth();
  if (auth.error) return auth.response!;

  try {
    const { searchParams } = new URL(request.url);
    const backupId = searchParams.get('id');

    // Se ID especificado, retorna info de backup específico
    if (backupId) {
      const backup = backupSystem.getBackupInfo(backupId);
      
      if (!backup) {
        return NextResponse.json(
          { error: 'Backup não encontrado' },
          { status: 404 }
        );
      }

      return NextResponse.json({ backup });
    }

    // Lista todos os backups
    const backups = backupSystem.listBackups();

    return NextResponse.json({
      backups,
      total: backups.length,
      summary: {
        completed: backups.filter(b => b.status === 'completed').length,
        failed: backups.filter(b => b.status === 'failed').length,
        pending: backups.filter(b => b.status === 'pending').length
      }
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error)); logger.error('Erro ao listar backups:', err, { component: 'API: backup' });
    return NextResponse.json(
      { error: 'Erro ao listar backups' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/backup
 * Cria novo backup completo
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.response!;

  try {
    const body = await request.json().catch(() => ({}));
    const { action, backupId, overwrite, dryRun } = body;

    // Restaurar backup
    if (action === 'restore' && backupId) {
      await backupSystem.restoreBackup({
        backupId,
        overwrite: overwrite || false,
        dryRun: dryRun || false
      });

      return NextResponse.json({
        message: dryRun ? 'Dry run concluído' : 'Backup restaurado com sucesso',
        backupId
      });
    }

    // Criar novo backup
    const metadata = await backupSystem.createFullBackup();

    return NextResponse.json({
      message: 'Backup criado com sucesso',
      backup: metadata
    });
  } catch (error) {
    const normalizedError = error instanceof Error ? error : new Error(String(error));
    logger.error('Erro ao processar backup:', normalizedError, { component: 'API: backup' });
    return NextResponse.json(
      { error: normalizedError.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/backup
 * Remove backups antigos
 */
export async function DELETE() {
  const auth = await requireAuth();
  if (auth.error) return auth.response!;

  try {
    const deleted = await backupSystem.cleanupOldBackups();

    return NextResponse.json({
      message: `${deleted} backup(s) antigo(s) removido(s)`,
      deleted
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error)); logger.error('Erro ao limpar backups:', err, { component: 'API: backup' });
    return NextResponse.json(
      { error: 'Erro ao limpar backups' },
      { status: 500 }
    );
  }
}

