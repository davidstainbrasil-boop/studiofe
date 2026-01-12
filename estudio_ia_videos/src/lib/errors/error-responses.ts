/**
 * Improved Error Response System
 *
 * Provides user-friendly error messages with:
 * - Clear descriptions
 * - Actionable suggestions
 * - Error codes for tracking
 * - Localization support (future)
 */

import { NextResponse } from 'next/server';
import { logger } from '@lib/logger';

export type ErrorCode =
  // Authentication
  | 'AUTH_REQUIRED'
  | 'AUTH_INVALID_TOKEN'
  | 'AUTH_EXPIRED'
  // Authorization
  | 'PERMISSION_DENIED'
  | 'RESOURCE_NOT_FOUND'
  | 'RESOURCE_ALREADY_EXISTS'
  // Validation
  | 'VALIDATION_FAILED'
  | 'FILE_TOO_LARGE'
  | 'FILE_INVALID_TYPE'
  | 'FILE_INVALID_FORMAT'
  | 'FILE_CORRUPTED'
  // Quota & Limits
  | 'QUOTA_EXCEEDED'
  | 'RATE_LIMIT_EXCEEDED'
  // Processing
  | 'PROCESSING_FAILED'
  | 'TTS_GENERATION_FAILED'
  | 'RENDER_FAILED'
  | 'UPLOAD_FAILED'
  // External Services
  | 'SERVICE_UNAVAILABLE'
  | 'EXTERNAL_API_ERROR'
  | 'CIRCUIT_BREAKER_OPEN'
  // Concurrency
  | 'CONFLICT'
  | 'RESOURCE_LOCKED'
  // Generic
  | 'INTERNAL_ERROR'
  | 'UNKNOWN_ERROR';

export interface ErrorResponse {
  code: ErrorCode;
  message: string;
  details?: string;
  suggestion?: string;
  documentationUrl?: string;
  context?: Record<string, unknown>;
}

/**
 * Error message templates
 */
const ERROR_MESSAGES: Record<ErrorCode, { message: string; suggestion?: string; status: number }> = {
  // Authentication (401)
  AUTH_REQUIRED: {
    message: 'Autenticação necessária',
    suggestion: 'Por favor, faça login para continuar',
    status: 401
  },
  AUTH_INVALID_TOKEN: {
    message: 'Token de autenticação inválido',
    suggestion: 'Por favor, faça login novamente',
    status: 401
  },
  AUTH_EXPIRED: {
    message: 'Sessão expirada',
    suggestion: 'Por favor, faça login novamente para continuar',
    status: 401
  },

  // Authorization (403)
  PERMISSION_DENIED: {
    message: 'Você não tem permissão para acessar este recurso',
    suggestion: 'Entre em contato com o proprietário do projeto ou administrador',
    status: 403
  },
  RESOURCE_NOT_FOUND: {
    message: 'Recurso não encontrado',
    suggestion: 'Verifique se o ID está correto ou se o recurso ainda existe',
    status: 404
  },
  RESOURCE_ALREADY_EXISTS: {
    message: 'Este recurso já existe',
    suggestion: 'Use um identificador diferente ou atualize o recurso existente',
    status: 409
  },

  // Validation (400)
  VALIDATION_FAILED: {
    message: 'Os dados fornecidos são inválidos',
    suggestion: 'Verifique os campos obrigatórios e seus formatos',
    status: 400
  },
  FILE_TOO_LARGE: {
    message: 'O arquivo é muito grande',
    suggestion: 'Reduza o tamanho do arquivo ou faça upgrade do seu plano',
    status: 400
  },
  FILE_INVALID_TYPE: {
    message: 'Tipo de arquivo não permitido',
    suggestion: 'Apenas arquivos PPTX são aceitos',
    status: 400
  },
  FILE_INVALID_FORMAT: {
    message: 'Formato de arquivo inválido',
    suggestion: 'Certifique-se de que o arquivo não está corrompido',
    status: 400
  },
  FILE_CORRUPTED: {
    message: 'O arquivo parece estar corrompido',
    suggestion: 'Tente exportar o arquivo novamente ou use uma versão anterior',
    status: 400
  },

  // Quota & Limits (429, 413)
  QUOTA_EXCEEDED: {
    message: 'Você atingiu o limite de armazenamento',
    suggestion: 'Delete arquivos antigos ou faça upgrade do seu plano',
    status: 413
  },
  RATE_LIMIT_EXCEEDED: {
    message: 'Muitas requisições',
    suggestion: 'Por favor, aguarde alguns momentos antes de tentar novamente',
    status: 429
  },

  // Processing (500, 502)
  PROCESSING_FAILED: {
    message: 'Falha ao processar o arquivo',
    suggestion: 'Tente novamente. Se o problema persistir, entre em contato com o suporte',
    status: 500
  },
  TTS_GENERATION_FAILED: {
    message: 'Falha ao gerar áudio',
    suggestion: 'Verifique se o texto está correto e tente novamente',
    status: 500
  },
  RENDER_FAILED: {
    message: 'Falha ao renderizar o vídeo',
    suggestion: 'Verifique os slides e configurações, depois tente novamente',
    status: 500
  },
  UPLOAD_FAILED: {
    message: 'Falha ao fazer upload do arquivo',
    suggestion: 'Verifique sua conexão e tente novamente',
    status: 500
  },

  // External Services (503)
  SERVICE_UNAVAILABLE: {
    message: 'Serviço temporariamente indisponível',
    suggestion: 'Estamos trabalhando para resolver. Tente novamente em alguns minutos',
    status: 503
  },
  EXTERNAL_API_ERROR: {
    message: 'Erro ao comunicar com serviço externo',
    suggestion: 'Tente novamente. Se o problema persistir, o serviço pode estar fora do ar',
    status: 502
  },
  CIRCUIT_BREAKER_OPEN: {
    message: 'Serviço temporariamente indisponível',
    suggestion: 'O sistema detectou falhas recorrentes. Aguarde alguns momentos',
    status: 503
  },

  // Concurrency (409)
  CONFLICT: {
    message: 'Conflito detectado',
    suggestion: 'Outro usuário modificou este recurso. Recarregue a página e tente novamente',
    status: 409
  },
  RESOURCE_LOCKED: {
    message: 'Recurso está sendo editado por outro usuário',
    suggestion: 'Aguarde até que a edição seja concluída',
    status: 423
  },

  // Generic (500)
  INTERNAL_ERROR: {
    message: 'Erro interno do servidor',
    suggestion: 'Tente novamente. Se o problema persistir, entre em contato com o suporte',
    status: 500
  },
  UNKNOWN_ERROR: {
    message: 'Ocorreu um erro inesperado',
    suggestion: 'Tente novamente ou entre em contato com o suporte',
    status: 500
  }
};

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  code: ErrorCode,
  details?: string,
  context?: Record<string, unknown>
): NextResponse {
  const template = ERROR_MESSAGES[code];

  const errorResponse: ErrorResponse = {
    code,
    message: template.message,
    details,
    suggestion: template.suggestion,
    context
  };

  // Log error with context
  logger.error('Error response created', new Error(template.message), {
    code,
    details,
    context,
    component: 'ErrorResponse'
  });

  return NextResponse.json(errorResponse, { status: template.status });
}

/**
 * Wrap existing error in standardized format
 */
export function wrapError(
  error: Error | unknown,
  fallbackCode: ErrorCode = 'INTERNAL_ERROR',
  context?: Record<string, unknown>
): NextResponse {
  // Try to extract meaningful error code from error message
  const errorMessage = error instanceof Error ? error.message : String(error);

  // Map common errors to codes
  let code: ErrorCode = fallbackCode;

  if (errorMessage.includes('quota') || errorMessage.includes('storage')) {
    code = 'QUOTA_EXCEEDED';
  } else if (errorMessage.includes('permission') || errorMessage.includes('unauthorized')) {
    code = 'PERMISSION_DENIED';
  } else if (errorMessage.includes('not found')) {
    code = 'RESOURCE_NOT_FOUND';
  } else if (errorMessage.includes('circuit breaker')) {
    code = 'CIRCUIT_BREAKER_OPEN';
  } else if (errorMessage.includes('timeout')) {
    code = 'SERVICE_UNAVAILABLE';
  } else if (errorMessage.includes('conflict') || errorMessage.includes('version')) {
    code = 'CONFLICT';
  }

  return createErrorResponse(code, errorMessage, context);
}

/**
 * Create validation error response
 */
export function createValidationError(
  field: string,
  issue: string,
  context?: Record<string, unknown>
): NextResponse {
  return createErrorResponse(
    'VALIDATION_FAILED',
    `Campo '${field}': ${issue}`,
    { ...context, field, issue }
  );
}

/**
 * Create quota exceeded response with details
 */
export function createQuotaError(
  current: number,
  limit: number,
  required: number
): NextResponse {
  const currentMB = (current / (1024 * 1024)).toFixed(2);
  const limitMB = (limit / (1024 * 1024)).toFixed(2);
  const requiredMB = (required / (1024 * 1024)).toFixed(2);

  return createErrorResponse(
    'QUOTA_EXCEEDED',
    `Usado: ${currentMB}MB / Limite: ${limitMB}MB / Necessário: ${requiredMB}MB`,
    { current, limit, required, currentMB, limitMB, requiredMB }
  );
}

/**
 * Create conflict error for optimistic locking
 */
export function createConflictError(
  resource: string,
  currentVersion: number,
  expectedVersion: number
): NextResponse {
  return createErrorResponse(
    'CONFLICT',
    `${resource} foi modificado. Versão atual: ${currentVersion}, esperada: ${expectedVersion}`,
    { resource, currentVersion, expectedVersion }
  );
}

/**
 * Create circuit breaker error
 */
export function createCircuitBreakerError(serviceName: string): NextResponse {
  return createErrorResponse(
    'CIRCUIT_BREAKER_OPEN',
    `O serviço '${serviceName}' está temporariamente indisponível`,
    { service: serviceName }
  );
}

/**
 * Helper: Extract error details from various error types
 */
export function extractErrorDetails(error: unknown): { message: string; stack?: string } {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack
    };
  }

  if (typeof error === 'string') {
    return { message: error };
  }

  if (error && typeof error === 'object') {
    const obj = error as Record<string, unknown>;
    return {
      message: String(obj.message || obj.error || 'Unknown error'),
      stack: obj.stack as string | undefined
    };
  }

  return { message: 'Unknown error' };
}

/**
 * Get HTTP status code for error code
 */
export function getStatusCode(code: ErrorCode): number {
  return ERROR_MESSAGES[code].status;
}

/**
 * Check if error is retryable
 */
export function isRetryableError(code: ErrorCode): boolean {
  const retryable: ErrorCode[] = [
    'SERVICE_UNAVAILABLE',
    'EXTERNAL_API_ERROR',
    'CIRCUIT_BREAKER_OPEN',
    'INTERNAL_ERROR'
  ];

  return retryable.includes(code);
}
