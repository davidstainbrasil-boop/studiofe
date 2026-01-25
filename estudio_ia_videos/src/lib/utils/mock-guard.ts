/**
 * Mock Guard Utility
 *
 * Garante que mocks/simulacoes so rodam em development.
 * Em producao, retorna erro 501 Not Implemented.
 *
 * REGRA DO REPO: setTimeout, mocks e placeholders sao proibidos fora de NODE_ENV=development
 */

import { NextResponse } from 'next/server';
import { logger } from '@lib/logger';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

/**
 * Verifica se estamos em ambiente de producao
 */
export function isProduction(): boolean {
  return IS_PRODUCTION;
}

/**
 * Delay simulado - APENAS para development
 *
 * @param ms Milissegundos de delay
 * @param featureName Nome da feature para logs
 */
export async function mockDelay(ms: number, featureName: string): Promise<void> {
  if (IS_PRODUCTION) {
    // Em producao, nao faz delay - operacao deveria ser real
    return;
  }

  logger.debug(`Mock delay ${ms}ms for "${featureName}"`, { component: 'MockGuard' });
  await new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retorna resposta 501 Not Implemented para features nao implementadas
 *
 * @param featureName Nome da feature
 * @param details Detalhes adicionais
 */
export function notImplementedResponse(featureName: string, details?: string): NextResponse {
  return NextResponse.json(
    {
      success: false,
      code: 'NOT_IMPLEMENTED',
      message: `Feature "${featureName}" is not yet implemented for production use.`,
      details: details || 'This endpoint uses mock data in development. Production integration pending.',
      environment: process.env.NODE_ENV
    },
    { status: 501 }
  );
}
