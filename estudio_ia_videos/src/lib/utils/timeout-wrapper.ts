/**
 * Timeout Wrapper Utilities
 *
 * Adiciona timeouts a operações assíncronas para evitar requests pendurados
 */

/**
 * Erro lançado quando uma operação excede o timeout
 */
export class TimeoutError extends Error {
  constructor(operation: string, timeoutMs: number) {
    super(`Operation '${operation}' timed out after ${timeoutMs}ms`);
    this.name = 'TimeoutError';
  }
}

/**
 * Wrapper genérico para adicionar timeout a qualquer Promise
 *
 * @param promise - Promise a ser executada
 * @param timeoutMs - Timeout em milissegundos
 * @param operation - Nome da operação (para logs)
 * @returns Promise com timeout
 *
 * @example
 * const data = await withTimeout(
 *   fetch('https://api.example.com/data'),
 *   5000,
 *   'fetch_api_data'
 * );
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operation: string
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new TimeoutError(operation, timeoutMs));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]);
}

/**
 * Fetch com timeout usando AbortController
 *
 * @param url - URL a ser fetched
 * @param options - Opções do fetch + timeout opcional
 * @returns Response do fetch
 *
 * @example
 * const response = await fetchWithTimeout('https://api.example.com/data', {
 *   method: 'POST',
 *   body: JSON.stringify(data),
 *   timeout: 10000 // 10s
 * });
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeout?: number } = {}
): Promise<Response> {
  const timeout = options.timeout || 30000; // 30s default
  const controller = new AbortController();

  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    return response;
  } catch (error: unknown) {
    clearTimeout(timeoutId);

    // AbortError significa timeout
    if (error instanceof Error && error.name === 'AbortError') {
      throw new TimeoutError(`fetch(${url})`, timeout);
    }

    throw error;
  }
}

/**
 * Configurações de timeout padrão por tipo de operação
 */
export const DEFAULT_TIMEOUTS = {
  SUPABASE_QUERY: 10000,      // 10s
  TTS_API: 60000,             // 60s (geração de áudio pode demorar)
  FILE_UPLOAD: 120000,        // 2min
  REMOTION_RENDER: 1800000,   // 30min (renderização de vídeo)
  GENERAL_FETCH: 30000,       // 30s
  WEBHOOK: 15000,             // 15s
  DATABASE_QUERY: 5000        // 5s
} as const;

/**
 * Wrapper para Supabase queries com timeout
 *
 * @example
 * import { supabaseWithTimeout } from '@/lib/utils/timeout-wrapper';
 *
 * const result = await supabaseWithTimeout(
 *   supabase.from('projects').select('*').eq('id', projectId),
 *   'fetch_project',
 *   5000
 * );
 */
export async function supabaseWithTimeout<T>(
  query: Promise<{ data: T | null; error: any }>,
  operation: string,
  timeoutMs: number = DEFAULT_TIMEOUTS.SUPABASE_QUERY
) {
  return withTimeout(query, timeoutMs, `Supabase: ${operation}`);
}
