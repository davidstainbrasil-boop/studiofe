/**
 * Environment Variables Helpers
 * 
 * Helpers para obter e validar variáveis de ambiente de forma segura.
 * Previne crashes em runtime por variáveis não configuradas.
 */

/**
 * Obtém variável de ambiente obrigatória
 * Lança erro imediatamente se variável não estiver configurada
 * 
 * @param key - Nome da variável de ambiente
 * @returns Valor da variável (nunca undefined/null)
 * @throws Error se variável não estiver configurada
 * 
 * @example
 * ```typescript
 * const url = getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL');
 * ```
 */
export function getRequiredEnv(key: string): string {
  const value = process.env[key];
  
  if (!value) {
    throw new Error(
      `❌ Variável de ambiente obrigatória não encontrada: ${key}\n` +
      `   Verifique seu arquivo .env.local e documentação de configuração.\n` +
      `   Consulte: PRODUCTION_ENV_TEMPLATE.md para lista completa de variáveis.`
    );
  }
  
  return value;
}

/**
 * Obtém variável de ambiente opcional
 * Retorna valor padrão se variável não estiver configurada
 * 
 * @param key - Nome da variável de ambiente
 * @param defaultValue - Valor padrão se variável não existir
 * @returns Valor da variável ou valor padrão
 * 
 * @example
 * ```typescript
 * const port = getOptionalEnv('PORT', '3000');
 * ```
 */
export function getOptionalEnv(key: string, defaultValue: string = ''): string {
  return process.env[key] || defaultValue;
}

/**
 * Obtém variável de ambiente como número
 * 
 * @param key - Nome da variável de ambiente
 * @param defaultValue - Valor padrão se variável não existir ou não for número
 * @returns Número ou valor padrão
 * 
 * @example
 * ```typescript
 * const port = getEnvAsNumber('PORT', 3000);
 * ```
 */
export function getEnvAsNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (!value) return defaultValue;
  
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Obtém variável de ambiente como boolean
 * 
 * @param key - Nome da variável de ambiente
 * @param defaultValue - Valor padrão se variável não existir
 * @returns Boolean ou valor padrão
 * 
 * @example
 * ```typescript
 * const enabled = getEnvAsBoolean('FEATURE_ENABLED', false);
 * ```
 */
export function getEnvAsBoolean(key: string, defaultValue: boolean = false): boolean {
  const value = process.env[key];
  if (!value) return defaultValue;
  
  return value.toLowerCase() === 'true' || value === '1';
}
