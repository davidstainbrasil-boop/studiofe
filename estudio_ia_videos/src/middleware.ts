import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from './lib/supabase/middleware'
import { logger } from './lib/logger'

// Simple in-memory rate limiter for Edge Runtime (basic DDoS protection)
// For production-grade rate limiting, use Redis-backed limiter in API routes
const rateLimit = new Map<string, { count: number; lastReset: number }>();
const WINDOW_SIZE = 60 * 1000; // 1 minute
const MAX_REQUESTS = 500; // 500 requests per minute (basic protection)

// Flag to track if we've already logged the config error
let hasLoggedConfigError = false;

/**
 * Verifica se as variáveis de ambiente do Supabase estão configuradas
 */
function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isApiRoute = pathname.startsWith('/api')
  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/register')
  const isProtectedRoute = pathname.startsWith('/dashboard') ||
                           pathname.startsWith('/editor') ||
                           pathname.startsWith('/projects') ||
                           pathname.startsWith('/create')

  try {
    // Early return for static assets - should never reach here due to matcher, but added as safety
    if (
      pathname.startsWith('/_next/static') ||
      pathname.startsWith('/_next/image') ||
      pathname.startsWith('/_next/data') ||
      /\.(css|js|woff|woff2|ttf|eot|ico|json|svg|png|jpg|jpeg|gif|webp)$/.test(pathname)
    ) {
      return NextResponse.next();
    }

    // Check if Supabase is configured before attempting to create client
    if (!isSupabaseConfigured()) {
      if (!hasLoggedConfigError) {
        logger.warn('Supabase not configured - running in anonymous mode.', {
          missingEnv: [
            'NEXT_PUBLIC_SUPABASE_URL',
            'NEXT_PUBLIC_SUPABASE_ANON_KEY'
          ],
          scope: 'middleware',
        })
        hasLoggedConfigError = true
      }
      // Allow the request to proceed without auth
      return NextResponse.next()
    }

    // [REMOVED] dev_bypass check for security hardening

    // 1. Initialize Supabase Client and refresh session
    // This uses @supabase/ssr to handle cookies correctly in the middleware context
    const { supabase, response } = createClient(request)

    // Refresh session if expired - required for Server Components
    // This updates the cookie if the session is refreshed
    // Add timeout to prevent 502 errors from slow Supabase responses
    let session = null;
    try {
      const sessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Session timeout')), 5000)
      );
      const result = await Promise.race([sessionPromise, timeoutPromise]) as { data: { session: unknown } };
      session = result.data?.session;
    } catch (sessionError) {
      // On timeout or error, continue without session (will redirect to login if protected route)
      logger.warn('Session fetch timeout or error', {
        scope: 'middleware',
        error: sessionError instanceof Error ? sessionError.message : 'Unknown error'
      });
    }

    // 2. Basic Rate Limiting for API routes (in-memory, per-instance)
    // Note: Individual API routes use Redis-backed rate limiting for production-grade protection
    if (request.nextUrl.pathname.startsWith('/api')) {
      const ip = request.ip || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
      const now = Date.now();
      const record = rateLimit.get(ip) || { count: 0, lastReset: now };

      if (now - record.lastReset > WINDOW_SIZE) {
        record.count = 0;
        record.lastReset = now;
      }

      record.count++;
      rateLimit.set(ip, record);

      if (record.count > MAX_REQUESTS) {
        return new NextResponse(
          JSON.stringify({ success: false, message: 'Too many requests', code: 'RATE_LIMIT_BASIC' }),
          { status: 429, headers: { 'content-type': 'application/json', 'Retry-After': '60' } }
        );
      }
    }

    // If user is logged in and tries to access auth routes, redirect to dashboard
    if (session && isAuthRoute) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // If user is NOT logged in and tries to access protected routes, redirect to login
    if (!session && isProtectedRoute) {
      const redirectUrl = new URL('/login', request.url)
      // Preserve the intended destination
      redirectUrl.searchParams.set('redirect', request.nextUrl.pathname)
      return NextResponse.redirect(redirectUrl)
    }

    // 4. Add performance headers for API responses
    if (isApiRoute) {
      // Add cache headers for certain API endpoints
      const cacheableEndpoints = [
        '/api/nr/courses',
        '/api/nr/modules',
        '/api/templates',
      ];
      
      const isCacheable = cacheableEndpoints.some(ep => 
        request.nextUrl.pathname.startsWith(ep)
      );
      
      if (isCacheable && request.method === 'GET') {
        response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
      } else if (request.method === 'GET') {
        // Short cache for other GET endpoints
        response.headers.set('Cache-Control', 'private, max-age=0, must-revalidate');
      } else {
        // No cache for mutations
        response.headers.set('Cache-Control', 'no-store');
      }
      
      // Security headers
      response.headers.set('X-Content-Type-Options', 'nosniff');
      response.headers.set('X-Frame-Options', 'DENY');
      response.headers.set('X-XSS-Protection', '1; mode=block');
    }

    return response
  } catch (e) {
    const error = e instanceof Error ? e : new Error(String(e))
    logger.error('Middleware error', error, { scope: 'middleware' })

    if (isApiRoute) {
      return new NextResponse(
        JSON.stringify({ success: false, code: 'MIDDLEWARE_ERROR', message: 'Middleware failure' }),
        { status: 503, headers: { 'content-type': 'application/json' } }
      )
    }

    if (isProtectedRoute) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    // Exclude all static assets, Next.js internals, and common file types
    // This prevents middleware from processing static asset requests
    '/((?!_next/static|_next/image|_next/data|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js|woff|woff2|ttf|eot|ico|json)$).*)',
  ],
}
