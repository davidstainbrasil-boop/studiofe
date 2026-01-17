/**
 * Error Handler Utility
 * Converts technical errors to user-friendly messages
 */

import { logger } from '@lib/logger';
import { prisma } from '@lib/prisma';

export interface UserFriendlyError {
  title: string;
  message: string;
  action?: string;
  technical?: string;
}

/**
 * Maps error types to user-friendly messages
 */
export function handleError(error: unknown): UserFriendlyError {
  const err = error as Error;
  const message = err.message || String(error);

  // PPTX Parsing Errors
  if (message.includes('PPTX') || message.includes('parse')) {
    if (message.includes('Cannot read properties')) {
      return {
        title: 'Arquivo PPTX com problema',
        message: 'O arquivo parece estar corrompido ou incompleto. Tente exportar novamente do PowerPoint.',
        action: 'Fazer upload de outro arquivo',
        technical: message
      };
    }
    if (message.includes('substring') || message.includes('slice')) {
      return {
        title: 'Erro ao processar slide',
        message: 'Alguns slides não puderam ser processados. Verifique se todos os slides têm conteúdo.',
        action: 'Revisar apresentação',
        technical: message
      };
    }
    return {
      title: 'Erro ao processar PPTX',
      message: 'Não conseguimos processar sua apresentação. Verifique se o arquivo está em formato PPTX válido.',
      action: 'Tentar novamente',
      technical: message
    };
  }

  // API Quota Errors
  if (message.includes('quota') || message.includes('limit')) {
    return {
      title: 'Limite de API atingido',
      message: 'Você atingiu o limite de uso de uma das APIs externas (D-ID, HeyGen ou ElevenLabs).',
      action: 'Verificar quotas em Configurações',
      technical: message
    };
  }

  // Network Errors
  if (message.includes('fetch') || message.includes('network') || message.includes('ECONNREFUSED')) {
    return {
      title: 'Erro de conexão',
      message: 'Não foi possível conectar ao servidor. Verifique sua conexão com a internet.',
      action: 'Tentar novamente',
      technical: message
    };
  }

  // Database Errors
  if (message.includes('prisma') || message.includes('database') || message.includes('SQL')) {
    return {
      title: 'Erro de banco de dados',
      message: 'Ocorreu um erro ao salvar seus dados. Tente novamente em alguns instantes.',
      action: 'Tentar novamente',
      technical: message
    };
  }

  // Storage Errors
  if (message.includes('storage') || message.includes('upload') || message.includes('S3')) {
    return {
      title: 'Erro no armazenamento',
      message: 'Não foi possível salvar o arquivo. Verifique o tamanho e tente novamente.',
      action: 'Verificar arquivo',
      technical: message
    };
  }

  // Render Errors
  if (message.includes('render') || message.includes('FFmpeg')) {
    return {
      title: 'Erro ao renderizar vídeo',
      message: 'Ocorreu um problema durante a geração do vídeo. Nossa equipe foi notificada.',
      action: 'Tentar novamente',
      technical: message
    };
  }

  // Avatar/TTS Errors
  if (message.includes('avatar') || message.includes('TTS') || message.includes('voice')) {
    return {
      title: 'Erro na geração de voz',
      message: 'Não foi possível gerar o áudio com o avatar selecionado. Tente outro avatar ou voz.',
      action: 'Selecionar outro avatar',
      technical: message
    };
  }

  // Default error
  return {
    title: 'Erro inesperado',
    message: 'Ocorreu um erro inesperado. Nossa equipe foi notificada e está trabalhando para resolver.',
    action: 'Tentar novamente',
    technical: message
  };
}

/**
 * Logs error to database for audit trail
 */
export async function logErrorToAudit(
  error: Error,
  context: {
    userId?: string;
    projectId?: string;
    action?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  try {
    await prisma.analytics_events.create({
      data: {
        eventType: 'error_logged',
        eventData: {
          errorMessage: error.message,
          errorName: error.name,
          stack: error.stack?.split('\n').slice(0, 10).join('\n'),
          ...context.metadata,
          action: context.action,
          userId: context.userId,
          projectId: context.projectId,
          timestamp: new Date().toISOString()
        }
      }
    });
  } catch (auditError) {
    logger.error('Failed to log error to audit trail', auditError as Error);
  }
}

/**
 * Complete error handling: log, convert to friendly message, and return
 */
export async function processError(
  error: unknown,
  context?: {
    userId?: string;
    projectId?: string;
    action?: string;
  }
): Promise<UserFriendlyError> {
  const err = error instanceof Error ? error : new Error(String(error));
  
  // Log to console/file
  logger.error('Error occurred', err, {
    action: context?.action,
    userId: context?.userId,
    projectId: context?.projectId
  });

  // Log to database audit trail
  if (context) {
    await logErrorToAudit(err, context).catch(() => {
      // Silently fail if audit logging fails
    });
  }

  // Convert to user-friendly message
  return handleError(err);
}
