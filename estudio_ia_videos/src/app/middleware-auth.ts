/**
 * 🛡️ Middleware de Autenticação
 * Protege rotas que requerem autenticação
 */

import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { Database } from '@lib/supabase/types'

// Rotas públicas que não requerem autenticação
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/signup',
  '/auth/callback',
  '/auth/reset-password',
  '/api/health',
]

// Rotas que requerem admin
const ADMIN_ROUTES = [
  '/admin',
  '/api/admin',
]

interface UserProfile {
  role: string;
}

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient<Database>({ req, res })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  const path = req.nextUrl.pathname

  // Permitir acesso a rotas públicas
  if (PUBLIC_ROUTES.some(route => path.startsWith(route))) {
    return res
  }

  // Redirecionar para login se não autenticado
  if (!session) {
    const redirectUrl = new URL('/login', req.url)
    redirectUrl.searchParams.set('redirect', path)
    return NextResponse.redirect(redirectUrl)
  }

  // Verificar acesso a rotas admin
  if (ADMIN_ROUTES.some(route => path.startsWith(route))) {
    // Usando 'users' conforme schema atual
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single()

    const userProfile = profile as unknown as UserProfile;

    if (userProfile?.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
  }

  return res
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
