/**
 * Environment Variables Validator
 * 
 * Valida variáveis de ambiente obrigatórias no startup da aplicação.
 * Falha imediatamente (fail-fast) se alguma variável obrigatória estiver faltando.
 */

import { getRequiredEnv } from './env';
import { logger } from './logger';

/**
 * Lista de variáveis de ambiente obrigatórias
 * Adicione novas variáveis aqui conforme necessário
 */
const REQUIRED_ENV_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
] as const;

/**
 * Variáveis opcionais mas recomendadas
 */
const RECOMMENDED_ENV_VARS = [
  'DATABASE_URL',
  'DIRECT_DATABASE_URL',
  'REDIS_URL',
  'NEXTAUTH_SECRET',
] as const;

/**
 * Valida variáveis de ambiente obrigatórias
 * Lança erro se alguma variável obrigatória estiver faltando
 * 
 * @throws Error se alguma variável obrigatória estiver faltando
 */
export function validateRequiredEnvVars(): void {
  const missing: string[] = [];
  const invalid: string[] = [];

  // Validar variáveis obrigatórias
  for (const key of REQUIRED_ENV_VARS) {
    try {
      const value = getRequiredEnv(key);
      
      // Validações específicas
      if (key.includes('URL') && !value.startsWith('http')) {
        invalid.push(`${key}: deve começar com http:// ou https://`);
      }
      
      if (key.includes('KEY') && value.length < 10) {
        invalid.push(`${key}: parece muito curto para ser uma chave válida`);
      }
    } catch (error) {
      missing.push(key);
    }
  }

  // Verificar variáveis recomendadas
  const missingRecommended: string[] = [];
  for (const key of RECOMMENDED_ENV_VARS) {
    if (!process.env[key]) {
      missingRecommended.push(key);
    }
  }

  // Log de variáveis recomendadas faltando (warning, não erro)
  if (missingRecommended.length > 0) {
    logger.warn('Variáveis de ambiente recomendadas não encontradas', {
      component: 'env-validator',
      missing: missingRecommended,
      message: 'A aplicação pode funcionar, mas algumas funcionalidades podem estar limitadas'
    });
  }

  // Se houver variáveis obrigatórias faltando, lançar erro
  if (missing.length > 0) {
    const errorMessage = [
      '❌ Variáveis de ambiente obrigatórias não encontradas:',
      ...missing.map(key => `   - ${key}`),
      '',
      'Configure essas variáveis no arquivo .env.local',
      'Consulte PRODUCTION_ENV_TEMPLATE.md para documentação completa.'
    ].join('\n');

    logger.error('Environment validation failed', new Error(errorMessage), {
      component: 'env-validator',
      missing
    });

    throw new Error(errorMessage);
  }

  // Se houver variáveis inválidas, lançar erro
  if (invalid.length > 0) {
    const errorMessage = [
      '❌ Variáveis de ambiente com valores inválidos:',
      ...invalid.map(msg => `   - ${msg}`),
      '',
      'Verifique os valores no arquivo .env.local'
    ].join('\n');

    logger.error('Environment validation failed', new Error(errorMessage), {
      component: 'env-validator',
      invalid
    });

    throw new Error(errorMessage);
  }

  logger.info('Environment variables validated successfully', {
    component: 'env-validator',
    required: REQUIRED_ENV_VARS.length,
    recommended: RECOMMENDED_ENV_VARS.length - missingRecommended.length
  });
}

/**
 * Valida variáveis de ambiente apenas em produção
 * Em desenvolvimento, apenas loga warnings
 */
export function validateEnvVarsForEnvironment(): void {
  const isProduction = process.env.NODE_ENV === 'production';
  const isTest = process.env.NODE_ENV === 'test';

  // Não validar em testes (variáveis podem ser mockadas)
  if (isTest) {
    return;
  }

  try {
    validateRequiredEnvVars();
  } catch (error) {
    if (isProduction) {
      // Em produção, falhar imediatamente
      throw error;
    } else {
      // Em desenvolvimento, apenas logar warning
      logger.warn('Environment validation failed (development mode)', {
        component: 'env-validator',
        mode: 'development',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
}
