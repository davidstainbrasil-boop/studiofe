import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from './lib/supabase/middleware';
import { isE2ETestMode } from './lib/auth/e2e-test-auth';

/**
 * Edge-compatible logger (não usa Node.js APIs)
 * Em produção, emite JSON estruturado para observabilidade
 */
const edgeLog = {
  warn: (message: string, context?: Record<string, unknown>) => {
    if (process.env.NODE_ENV === 'production') {
      console.warn(JSON.stringify({ level: 'warn', message, ...context, timestamp: new Date().toISOString() }));
    } else {
      console.warn(`[MIDDLEWARE WARN] ${message}`, context);
    }
  },
  error: (message: string, error?: Error, context?: Record<string, unknown>) => {
    if (process.env.NODE_ENV === 'production') {
      console.error(JSON.stringify({ 
        level: 'error', 
        message, 
        error: error ? { name: error.name, message: error.message } : undefined,
        ...context, 
        timestamp: new Date().toISOString() 
      }));
    } else {
      console.error(`[MIDDLEWARE ERROR] ${message}`, error, context);
    }
  },
};

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
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

function normalizePathname(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

function getLegacyStudioRedirect(pathname: string): string | null {
  if (pathname === '/dashboard') return '/studio-pro';
  if (pathname === '/dashboard/projects') return '/studio-pro';
  if (pathname.startsWith('/dashboard/projects/')) {
    return '/studio-pro';
  }
  if (pathname === '/dashboard/editor') return '/studio-pro';
  if (pathname.startsWith('/dashboard/editor/')) {
    return '/studio-pro';
  }
  if (pathname === '/dashboard/render') return '/studio-pro';
  if (pathname.startsWith('/dashboard/render/')) {
    return '/studio-pro';
  }
  if (pathname === '/dashboard/timeline' || pathname.startsWith('/dashboard/timeline/')) {
    return '/studio-pro';
  }
  if (pathname === '/dashboard/upload') return '/studio-pro';
  if (pathname === '/render-dashboard') return '/studio-pro';
  if (pathname.startsWith('/editor/video-studio/')) {
    return '/studio-pro';
  }
  return null;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const normalizedPath = normalizePathname(pathname);
  const isApiRoute = pathname.startsWith('/api');
  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/register');
  const isProtectedRoute =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/studio-pro') ||
    pathname.startsWith('/studio') ||
    pathname.startsWith('/editor') ||
    pathname.startsWith('/projects') ||
    pathname.startsWith('/create') ||
    pathname.startsWith('/ppt-to-video') ||
    pathname.startsWith('/editor-pro') ||
    pathname.startsWith('/ai-avatars') ||
    pathname.startsWith('/voice-studio') ||
    pathname.startsWith('/export-pro') ||
    pathname.startsWith('/brand-kit') ||
    pathname.startsWith('/templates');
  const legacyStudioRedirect = getLegacyStudioRedirect(normalizedPath);
  const isE2E = isE2ETestMode();

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

    // Enforce HTTPS in production (skip localhost)
    if (process.env.NODE_ENV === 'production') {
      const hostname = request.nextUrl.hostname;
      const isLocalhost =
        hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
      if (!isLocalhost) {
        const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
        const protocol = forwardedProto || request.nextUrl.protocol.replace(':', '');
        if (protocol === 'http') {
          const httpsUrl = request.nextUrl.clone();
          httpsUrl.protocol = 'https:';
          return NextResponse.redirect(httpsUrl, 308);
        }
      }
    }

    if (legacyStudioRedirect && isE2E) {
      return NextResponse.redirect(new URL(legacyStudioRedirect, request.url));
    }

    // E2E test mode: bypass auth redirects to avoid external dependencies
    if (isE2E) {
      return NextResponse.next();
    }

    // Check if Supabase is configured before attempting to create client
    if (!isSupabaseConfigured()) {
      if (!hasLoggedConfigError) {
        edgeLog.warn('Supabase not configured - running in anonymous mode', {
          missingEnv: ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'],
          scope: 'middleware',
        });
        hasLoggedConfigError = true;
      }

      // SECURITY: Em produção, não permitir acesso anônimo a rotas protegidas (fail-closed)
      if (process.env.NODE_ENV === 'production') {
        if (isProtectedRoute) {
          // Redirecionar para login preservando destino original
          const redirectUrl = new URL('/login', request.url);
          redirectUrl.searchParams.set('redirect', request.nextUrl.pathname);
          redirectUrl.searchParams.set('error', 'auth_unavailable');
          return NextResponse.redirect(redirectUrl);
        }

        if (isApiRoute) {
          // APIs protegidas retornam 503 (Service Unavailable)
          return new NextResponse(
            JSON.stringify({
              success: false,
              code: 'SUPABASE_NOT_CONFIGURED',
              message: 'Authentication service unavailable',
            }),
            { status: 503, headers: { 'content-type': 'application/json' } },
          );
        }
      }

      // Em development/test: permitir acesso anônimo (não quebrar dev local)
      return NextResponse.next();
    }

    // 1. Initialize Supabase Client and refresh session
    // This uses @supabase/ssr to handle cookies correctly in the middleware context
    const { supabase, response } = createClient(request);

    // Refresh session if expired - required for Server Components
    // This updates the cookie if the session is refreshed
    let session = null;
    try {
      // REGRA DO REPO: setTimeout proibido em produção
      // Em produção: confiar no timeout HTTP/TCP natural do Supabase SDK
      // Em development: pode usar timeout artificial para debug
      if (process.env.NODE_ENV === 'development') {
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<never>((_, reject) => {
          const id = setTimeout(() => reject(new Error('Session timeout (dev)')), 5000);
          // Cleanup se sessão resolver primeiro (evita leak)
          sessionPromise.finally(() => clearTimeout(id));
        });
        const result = await Promise.race([sessionPromise, timeoutPromise]);
        session = result.data?.session;
      } else {
        // Produção: chamada direta sem setTimeout
        const { data, error } = await supabase.auth.getSession();
        if (!error) {
          session = data?.session;
        }
      }
    } catch (sessionError) {
      // On error, continue without session (will redirect to login if protected route)
      edgeLog.warn('Session fetch error', {
        scope: 'middleware',
        error: sessionError instanceof Error ? sessionError.message : 'Unknown error',
      });
    }

    // 2. Basic Rate Limiting for API routes (in-memory, per-instance)
    // Note: Individual API routes use Redis-backed rate limiting for production-grade protection
    if (request.nextUrl.pathname.startsWith('/api')) {
      const ip =
        request.ip || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
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
          JSON.stringify({
            success: false,
            message: 'Too many requests',
            code: 'RATE_LIMIT_BASIC',
          }),
          { status: 429, headers: { 'content-type': 'application/json', 'Retry-After': '60' } },
        );
      }
    }

    if (legacyStudioRedirect) {
      if (session) {
        return NextResponse.redirect(new URL(legacyStudioRedirect, request.url));
      }

      const redirectUrl = new URL('/login', request.url);
      redirectUrl.searchParams.set('redirect', legacyStudioRedirect);
      return NextResponse.redirect(redirectUrl);
    }

    // If user is logged in and tries to access auth routes, redirect to studio
    if (session && isAuthRoute) {
      return NextResponse.redirect(new URL('/studio-pro', request.url));
    }

    // If user is NOT logged in and tries to access protected routes, redirect to login
    if (!session && isProtectedRoute) {
      const redirectUrl = new URL('/login', request.url);
      // Preserve the intended destination
      redirectUrl.searchParams.set('redirect', request.nextUrl.pathname);
      return NextResponse.redirect(redirectUrl);
    }

    // 4. Add performance headers for API responses
    if (isApiRoute) {
      // Add cache headers for certain API endpoints
      const cacheableEndpoints = ['/api/nr/courses', '/api/nr/modules', '/api/templates'];

      const isCacheable = cacheableEndpoints.some((ep) => request.nextUrl.pathname.startsWith(ep));

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

    return response;
  } catch (e) {
    const error = e instanceof Error ? e : new Error(String(e));
    edgeLog.error('Middleware error', error, { scope: 'middleware' });

    if (isApiRoute) {
      return new NextResponse(
        JSON.stringify({ success: false, code: 'MIDDLEWARE_ERROR', message: 'Middleware failure' }),
        { status: 503, headers: { 'content-type': 'application/json' } },
      );
    }

    if (isProtectedRoute) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    // Exclude all static assets, Next.js internals, and common file types
    // This prevents middleware from processing static asset requests
    '/((?!_next/static|_next/image|_next/data|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js|woff|woff2|ttf|eot|ico|json)$).*)',
  ],
};
