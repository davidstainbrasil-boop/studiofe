/**
 * Type Guards and Type Utilities
 * 
 * Funções auxiliares para reduzir uso de 'any' e melhorar type safety.
 */

// ============================================================================
// Error Type Guards
// ============================================================================

/**
 * Type guard para verificar se um valor é um Error
 */
export function isError(error: unknown): error is Error {
  return error instanceof Error;
}

/**
 * Type guard para erro com código
 */
export interface ErrorWithCode extends Error {
  code: string | number;
}

export function isErrorWithCode(error: unknown): error is ErrorWithCode {
  return isError(error) && 'code' in error;
}

/**
 * Converte unknown para Error seguro
 */
export function toError(error: unknown): Error {
  if (isError(error)) {
    return error;
  }
  if (typeof error === 'string') {
    return new Error(error);
  }
  return new Error(String(error));
}

/**
 * Extrai mensagem de erro segura
 */
export function getErrorMessage(error: unknown): string {
  if (isError(error)) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Unknown error occurred';
}

// ============================================================================
// Database Parameter Types
// ============================================================================

/**
 * Tipo para parâmetros de query SQL
 */
export type QueryParam = string | number | boolean | null | Date;

/**
 * Type guard para QueryParam
 */
export function isQueryParam(value: unknown): value is QueryParam {
  return (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value === null ||
    value instanceof Date
  );
}

/**
 * Valida array de parâmetros SQL
 */
export function validateQueryParams(params: unknown[]): QueryParam[] {
  return params.filter(isQueryParam);
}

// ============================================================================
// Generic Array Type Guards
// ============================================================================

/**
 * Type guard genérico para arrays
 */
export function isArrayOf<T>(
  arr: unknown,
  guard: (item: unknown) => item is T
): arr is T[] {
  return Array.isArray(arr) && arr.every(guard);
}

/**
 * Type guard para array de strings
 */
export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

/**
 * Type guard para array de números
 */
export function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'number');
}

// ============================================================================
// Object Type Guards
// ============================================================================

/**
 * Type guard para verificar se é objeto
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Type guard para objeto com propriedade específica
 */
export function hasProperty<K extends string>(
  obj: unknown,
  key: K
): obj is Record<K, unknown> {
  return isObject(obj) && key in obj;
}

/**
 * Type guard para objeto com múltiplas propriedades
 */
export function hasProperties<K extends string>(
  obj: unknown,
  keys: K[]
): obj is Record<K, unknown> {
  return isObject(obj) && keys.every((key) => key in obj);
}

// ============================================================================
// JSON Type Guards
// ============================================================================

/**
 * Tipo para valores JSON válidos
 */
export type JSONValue =
  | string
  | number
  | boolean
  | null
  | JSONValue[]
  | { [key: string]: JSONValue };

/**
 * Type guard para JSONValue
 */
export function isJSONValue(value: unknown): value is JSONValue {
  if (value === null) return true;
  if (typeof value === 'string') return true;
  if (typeof value === 'number') return true;
  if (typeof value === 'boolean') return true;
  if (Array.isArray(value)) return value.every(isJSONValue);
  if (isObject(value)) {
    return Object.values(value).every(isJSONValue);
  }
  return false;
}

/**
 * Parse JSON seguro
 */
export function safeJsonParse<T = JSONValue>(
  json: string
): { success: true; data: T } | { success: false; error: string } {
  try {
    const data = JSON.parse(json);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: getErrorMessage(error) };
  }
}

// ============================================================================
// Function Type Guards
// ============================================================================

/**
 * Type guard para função
 */
export function isFunction(value: unknown): value is (...args: unknown[]) => unknown {
  return typeof value === 'function';
}

/**
 * Type guard para função async
 */
export function isAsyncFunction(
  value: unknown
): value is (...args: unknown[]) => Promise<unknown> {
  return isFunction(value) && value.constructor.name === 'AsyncFunction';
}

// ============================================================================
// Optional/Nullable Type Guards
// ============================================================================

/**
 * Type guard para valor definido (não null/undefined)
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Type guard para valor não-nulo
 */
export function isNotNull<T>(value: T | null): value is T {
  return value !== null;
}

/**
 * Filtra valores definidos de array
 */
export function filterDefined<T>(arr: (T | null | undefined)[]): T[] {
  return arr.filter(isDefined);
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Extrai tipo de Promise
 */
export type Awaited<T> = T extends Promise<infer U> ? U : T;

/**
 * Torna todas propriedades opcionais recursivamente
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Torna todas propriedades obrigatórias recursivamente
 */
export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};
