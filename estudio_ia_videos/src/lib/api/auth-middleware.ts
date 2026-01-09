/**
 * 🔐 API Authentication Middleware
 * Middleware reutilizável para autenticação em rotas API
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseForRequest } from '@lib/supabase/server'
import type { User } from '@supabase/supabase-js'

export interface AuthResult {
  user: User
  supabase: ReturnType<typeof getSupabaseForRequest>
}

export interface AuthError {
  success: false
  error: string
  code: string
  status: number
}

/**
 * Verifica autenticação do usuário na requisição
 * @returns AuthResult com user e supabase client, ou null se não autenticado
 */
export async function requireAuth(request: NextRequest): Promise<AuthResult | null> {
  try {
    const supabase = getSupabaseForRequest(request)
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return null
    }
    
    return { user, supabase }
  } catch {
    return null
  }
}

/**
 * Retorna resposta de erro de autenticação padronizada
 */
export function unauthorizedResponse(message = 'Autenticação necessária'): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: message,
      code: 'UNAUTHORIZED',
      timestamp: new Date().toISOString()
    },
    { status: 401 }
  )
}

/**
 * Retorna resposta de erro de autorização (sem permissão)
 */
export function forbiddenResponse(message = 'Permissão negada'): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: message,
      code: 'FORBIDDEN',
      timestamp: new Date().toISOString()
    },
    { status: 403 }
  )
}

/**
 * Retorna resposta de erro de validação padronizada
 */
export function validationErrorResponse(
  errors: Array<{ field: string; message: string }>
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: 'Dados inválidos',
      code: 'VALIDATION_ERROR',
      details: errors,
      timestamp: new Date().toISOString()
    },
    { status: 400 }
  )
}

/**
 * Retorna resposta de erro interno padronizada
 */
export function internalErrorResponse(
  message = 'Erro interno do servidor',
  code = 'INTERNAL_ERROR'
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: message,
      code,
      timestamp: new Date().toISOString()
    },
    { status: 500 }
  )
}

/**
 * Retorna resposta de sucesso padronizada
 */
export function successResponse<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(
    {
      success: true,
      data,
      timestamp: new Date().toISOString()
    },
    { status }
  )
}

/**
 * Retorna resposta de recurso não encontrado
 */
export function notFoundResponse(message = 'Recurso não encontrado'): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: message,
      code: 'NOT_FOUND',
      timestamp: new Date().toISOString()
    },
    { status: 404 }
  )
}

/**
 * Wrapper para handlers de API com autenticação obrigatória
 * 
 * @example
 * export const POST = withAuth(async (request, { user, supabase }) => {
 *   // user is guaranteed to be authenticated
 *   return successResponse({ userId: user.id })
 * })
 */
export function withAuth(
  handler: (request: NextRequest, auth: AuthResult) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const auth = await requireAuth(request)
    
    if (!auth) {
      return unauthorizedResponse()
    }
    
    return handler(request, auth)
  }
}

/**
 * Wrapper para handlers de API com autenticação opcional
 * (user pode ser null)
 */
export function withOptionalAuth(
  handler: (request: NextRequest, auth: AuthResult | null) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const auth = await requireAuth(request)
    return handler(request, auth)
  }
}
