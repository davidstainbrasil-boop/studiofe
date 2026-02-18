import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from './lib/supabase/middleware';

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 500;
const rateLimitStore = new Map<string, RateLimitEntry>();

// Limpeza automática do rate limit store para evitar memory leaks
function cleanupRateLimitStore() {
  const now = Date.now();
  rateLimitStore.forEach((entry, key) => {
    if (now > entry.resetAt) {
      rateLimitStore.delete(key);
    }
  });
}

const PROTECTED_PREFIXES = [
  '/dashboard',
  '/studio-pro',
  '/studio',
  '/editor',
  '/projects',
  '/create',
  '/ppt-to-video',
  '/editor-pro',
  '/ai-avatars',
  '/voice-studio',
  '/export-pro',
  '/brand-kit',
  '/templates',
];

// Public routes that don't require authentication checks at all
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/register',
  '/signup',
  '/forgot-password',
  '/pricing',
  '/ajuda',
  '/help',
  '/blog',
  '/terms',
  '/privacy',
  '/landing',
  '/auth',
];

function normalizePathname(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

function getLegacyStudioRedirect(pathname: string): string | null {
  if (pathname === '/dashboard') return '/studio-pro';
  if (pathname === '/dashboard/projects') return '/studio-pro';
  if (pathname.startsWith('/dashboard/projects/')) return '/studio-pro';
  if (pathname === '/dashboard/editor') return '/studio-pro';
  if (pathname.startsWith('/dashboard/editor/')) return '/studio-pro';
  if (pathname === '/dashboard/render') return '/studio-pro';
  if (pathname.startsWith('/dashboard/render/')) return '/studio-pro';
  if (pathname === '/dashboard/timeline' || pathname.startsWith('/dashboard/timeline/')) {
    return '/studio-pro';
  }
  if (pathname === '/dashboard/upload') return '/studio-pro';
  if (pathname === '/render-dashboard') return '/studio-pro';
  if (pathname.startsWith('/editor/video-studio/')) return '/studio-pro';
  return null;
}

function applyBasicApiRateLimit(request: NextRequest): NextResponse | null {
  // Limpeza probabilística do store (1% das requisições)
  if (Math.random() < 0.01) {
    cleanupRateLimitStore();
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const now = Date.now();
  const existing = rateLimitStore.get(ip);

  if (!existing || now >= existing.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return null;
  }

  existing.count += 1;
  if (existing.count > RATE_LIMIT_MAX) {
    return NextResponse.json(
      {
        success: false,
        code: 'RATE_LIMIT_BASIC',
        message: 'Too many requests',
      },
      {
        status: 429,
        headers: { 'Retry-After': '60' },
      },
    );
  }

  return null;
}

function applyApiHeaders(response: NextResponse, pathname: string, method: string): void {
  const cacheableEndpoints = ['/api/nr/courses', '/api/nr/modules', '/api/templates'];
  const isCacheable = cacheableEndpoints.some((prefix) => pathname.startsWith(prefix));

  if (method === 'GET' && isCacheable) {
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
  } else if (method === 'GET') {
    response.headers.set('Cache-Control', 'private, max-age=0, must-revalidate');
  } else {
    response.headers.set('Cache-Control', 'no-store');
  }

  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(self), geolocation=(), payment=(), usb=(), accelerometer=(), gyroscope=()',
  );
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // ❌ CRITICAL: NUNCA interceptar recursos do Next.js
  // Permite que _next/, recursos estáticos e APIs de auth sejam servidos diretamente
  // Esta verificação DEVE ser a PRIMEIRA coisa no middleware
  if (
    pathname.startsWith('/_next/static') ||
    pathname.startsWith('/_next/image') ||
    pathname.startsWith('/_next/data') ||
    pathname.startsWith('/api/auth/') ||
    pathname.includes('/favicon') ||
    /\.(css|js|map|svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot|json|xml|txt|pdf|zip)$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  const normalizedPath = normalizePathname(pathname);
  const isApiRoute = pathname.startsWith('/api');
  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/register');
  const isProtectedRoute = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const isPublicRoute = PUBLIC_ROUTES.includes(normalizedPath) || PUBLIC_ROUTES.some((route) => normalizedPath.startsWith(route + '/'));
  const legacyStudioRedirect = getLegacyStudioRedirect(normalizedPath);

  if (process.env.NODE_ENV === 'production') {
    const hostname = request.nextUrl.hostname;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
    if (!isLocalhost) {
      const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
      const protocol = forwardedProto || request.nextUrl.protocol.replace(':', '');
      if (protocol === 'http' && process.env.NEXT_PUBLIC_FORCE_HTTPS !== 'false') {
        const httpsUrl = request.nextUrl.clone();
        httpsUrl.protocol = 'https:';
        // Log redirect to help diagnose loops (Edge Runtime: console is the only option)
        // eslint-disable-next-line no-console
        console.info(`[Middleware] HTTPS redirect: ${request.url}`);
        return NextResponse.redirect(httpsUrl, 308);
      }
    }
  }

  if (isApiRoute) {
    const rateLimited = applyBasicApiRateLimit(request);
    if (rateLimited) return rateLimited;
  }

  // For public routes that don't need authentication, skip Supabase entirely
  // This prevents errors when env vars are missing and avoids unnecessary auth checks
  if (isPublicRoute && !isProtectedRoute && !legacyStudioRedirect) {
    const response = NextResponse.next();
    // Apply security headers to public routes too
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    return response;
  }

  try {
    const { supabase, response } = createClient(request);
    // Use getUser() instead of getSession() for security in Middleware
    // This validates the auth token with the Supabase Auth server
    const { data: { user } } = await supabase.auth.getUser();

    if (legacyStudioRedirect) {
      if (user) {
        return NextResponse.redirect(new URL(legacyStudioRedirect, request.url));
      }
      const redirectUrl = new URL('/login', request.url);
      redirectUrl.searchParams.set('redirect', legacyStudioRedirect);
      return NextResponse.redirect(redirectUrl);
    }

    if (user && isAuthRoute) {
      return NextResponse.redirect(new URL('/studio-pro', request.url));
    }

    if (!user && isProtectedRoute) {
      const redirectUrl = new URL('/login', request.url);
      redirectUrl.searchParams.set('redirect', request.nextUrl.pathname);
      return NextResponse.redirect(redirectUrl);
    }

    if (isApiRoute) {
      applyApiHeaders(response, pathname, request.method);
    }

    return response;
  } catch (error) {
    // Edge Runtime: logger unavailable — console.error is the only option
    console.error('[Middleware Error]', {
      pathname,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    // ❌ CRITICAL: Para recursos Next.js, APIs de auth, ou assets, NUNCA retornar 500
    // Sempre permitir que passem direto mesmo se Supabase estiver inacessível
    if (
      pathname.startsWith('/_next/static') ||
      pathname.startsWith('/_next/image') ||
      pathname.startsWith('/_next/data') ||
      pathname.startsWith('/api/auth/') ||
      pathname.includes('/favicon') ||
      /\.(css|js|map|svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot|json|xml|txt|pdf|zip)$/.test(pathname)
    ) {
      console.info('[Middleware] Bypassing error for static asset:', pathname);
      return NextResponse.next();
    }
    
    if (isApiRoute) {
      return NextResponse.json(
        {
          success: false,
          code: 'MIDDLEWARE_ERROR',
          message: 'Service temporarily unavailable',
        },
        { status: 503 },
      );
    }

    if (isProtectedRoute) {
      // Se Supabase falhou, redirecionar para login (pode ser problema de env vars em prod)
      const redirectUrl = new URL('/login', request.url);
      redirectUrl.searchParams.set('redirect', request.nextUrl.pathname);
      redirectUrl.searchParams.set('error', 'service_unavailable');
      return NextResponse.redirect(redirectUrl);
    }

    // Para rotas públicas, permitir acesso mesmo com erro Supabase
    const response = NextResponse.next();
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');  
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    return response;
  }
}

export const config = {
  matcher: [
    /*
     * CRITICAL: Excluir _next/ (recursos Next.js), api/auth/ e arquivos estáticos
     * Evita interceptar bundles JS/CSS que causavam erro MIME type
     * 
     * Formato recomendado pelo Next.js para excluir static assets
     */
    '/((?!_next/static|_next/image|_next/data|api/auth/|favicon\\.ico|.*\\.(?:css|js|map|svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot)).*)',
  ],
};
