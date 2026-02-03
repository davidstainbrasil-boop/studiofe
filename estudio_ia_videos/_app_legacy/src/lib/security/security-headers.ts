/**
 * 🔒 Security Headers Middleware - OWASP Best Practices
 * MVP Vídeos TécnicoCursos v7
 * 
 * Implementa headers de segurança conforme OWASP guidelines:
 * - Content Security Policy (CSP)
 * - HTTP Strict Transport Security (HSTS)
 * - X-Frame-Options
 * - X-Content-Type-Options
 * - Referrer-Policy
 * - Permissions-Policy
 * - Cross-Origin headers
 */

import { NextResponse, type NextRequest } from 'next/server';

// ===========================================
// Types & Configuration
// ===========================================

export interface SecurityHeadersConfig {
  /** Habilita CSP */
  cspEnabled: boolean;
  /** Habilita HSTS */
  hstsEnabled: boolean;
  /** Max-age do HSTS em segundos (padrão: 1 ano) */
  hstsMaxAge: number;
  /** Inclui subdomínios no HSTS */
  hstsIncludeSubDomains: boolean;
  /** Adiciona preload ao HSTS */
  hstsPreload: boolean;
  /** Modo de report do CSP */
  cspReportOnly: boolean;
  /** URL para report de violações CSP */
  cspReportUri?: string;
  /** Nonces permitidos (gerados dinamicamente) */
  nonces: string[];
  /** Domínios permitidos para frames */
  frameAncestors: string[];
  /** Domínios permitidos para scripts */
  scriptSources: string[];
  /** Domínios permitidos para estilos */
  styleSources: string[];
  /** Domínios permitidos para imagens */
  imageSources: string[];
  /** Domínios permitidos para fontes */
  fontSources: string[];
  /** Domínios permitidos para conexões */
  connectSources: string[];
  /** Domínios permitidos para mídia */
  mediaSources: string[];
  /** Domínios permitidos para objetos */
  objectSources: string[];
  /** Domínios permitidos para workers */
  workerSources: string[];
}

// ===========================================
// Default Configuration
// ===========================================

const DEFAULT_CONFIG: SecurityHeadersConfig = {
  cspEnabled: true,
  hstsEnabled: true,
  hstsMaxAge: 31536000, // 1 year
  hstsIncludeSubDomains: true,
  hstsPreload: true,
  cspReportOnly: false,
  cspReportUri: '/api/security/csp-report',
  nonces: [],
  frameAncestors: ["'self'"],
  scriptSources: [
    "'self'",
    "'unsafe-inline'", // Necessário para Next.js
    "'unsafe-eval'", // Necessário para Next.js em dev
    'https://vercel.live',
    'https://va.vercel-scripts.com',
    'https://cdn.sentry.io',
    'https://*.sentry.io',
  ],
  styleSources: [
    "'self'",
    "'unsafe-inline'", // Necessário para Tailwind CSS
    'https://fonts.googleapis.com',
  ],
  imageSources: [
    "'self'",
    'data:',
    'blob:',
    'https:',
    'https://*.supabase.co',
    'https://images.unsplash.com',
    'https://lh3.googleusercontent.com', // Google OAuth avatars
  ],
  fontSources: [
    "'self'",
    'https://fonts.gstatic.com',
    'https://fonts.googleapis.com',
  ],
  connectSources: [
    "'self'",
    'https://*.supabase.co',
    'wss://*.supabase.co',
    'https://api.elevenlabs.io',
    'https://api.heygen.com',
    'https://*.sentry.io',
    'https://va.vercel-scripts.com',
    'https://vercel.live',
    'https://api.openai.com',
  ],
  mediaSources: [
    "'self'",
    'blob:',
    'https://*.supabase.co',
  ],
  objectSources: ["'none'"],
  workerSources: [
    "'self'",
    'blob:',
  ],
};

// ===========================================
// Security Headers Builder
// ===========================================

export class SecurityHeadersBuilder {
  private config: SecurityHeadersConfig;

  constructor(config?: Partial<SecurityHeadersConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Gera nonce para CSP
   */
  generateNonce(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Buffer.from(array).toString('base64');
  }

  /**
   * Constrói header Content-Security-Policy
   */
  buildCSP(nonce?: string): string {
    const directives: string[] = [];

    // Default-src como fallback
    directives.push(`default-src 'self'`);

    // Script sources
    const scriptSrc = [...this.config.scriptSources];
    if (nonce) {
      scriptSrc.push(`'nonce-${nonce}'`);
    }
    if (process.env.NODE_ENV === 'development') {
      scriptSrc.push("'unsafe-eval'");
    }
    directives.push(`script-src ${scriptSrc.join(' ')}`);

    // Style sources
    directives.push(`style-src ${this.config.styleSources.join(' ')}`);

    // Image sources
    directives.push(`img-src ${this.config.imageSources.join(' ')}`);

    // Font sources
    directives.push(`font-src ${this.config.fontSources.join(' ')}`);

    // Connect sources (XHR, WebSocket, etc.)
    const connectSrc = [...this.config.connectSources];
    if (process.env.NODE_ENV === 'development') {
      connectSrc.push('ws://localhost:*', 'http://localhost:*');
    }
    directives.push(`connect-src ${connectSrc.join(' ')}`);

    // Media sources
    directives.push(`media-src ${this.config.mediaSources.join(' ')}`);

    // Object sources (Flash, Java applets, etc.)
    directives.push(`object-src ${this.config.objectSources.join(' ')}`);

    // Worker sources
    directives.push(`worker-src ${this.config.workerSources.join(' ')}`);

    // Frame ancestors (clickjacking protection)
    directives.push(`frame-ancestors ${this.config.frameAncestors.join(' ')}`);

    // Frame sources (iframes we embed)
    directives.push(`frame-src 'self' https://www.youtube.com https://player.vimeo.com https://vercel.live`);

    // Base URI
    directives.push(`base-uri 'self'`);

    // Form actions
    directives.push(`form-action 'self'`);

    // Upgrade insecure requests in production
    if (process.env.NODE_ENV === 'production') {
      directives.push('upgrade-insecure-requests');
    }

    // Report URI
    if (this.config.cspReportUri) {
      directives.push(`report-uri ${this.config.cspReportUri}`);
    }

    return directives.join('; ');
  }

  /**
   * Constrói header HSTS
   */
  buildHSTS(): string {
    if (!this.config.hstsEnabled) return '';

    let hsts = `max-age=${this.config.hstsMaxAge}`;
    if (this.config.hstsIncludeSubDomains) {
      hsts += '; includeSubDomains';
    }
    if (this.config.hstsPreload) {
      hsts += '; preload';
    }
    return hsts;
  }

  /**
   * Constrói header Permissions-Policy
   */
  buildPermissionsPolicy(): string {
    return [
      'accelerometer=()',
      'autoplay=(self)',
      'camera=()',
      'cross-origin-isolated=()',
      'display-capture=()',
      'encrypted-media=(self)',
      'fullscreen=(self)',
      'geolocation=()',
      'gyroscope=()',
      'keyboard-map=()',
      'magnetometer=()',
      'microphone=()',
      'midi=()',
      'payment=()',
      'picture-in-picture=(self)',
      'publickey-credentials-get=()',
      'screen-wake-lock=()',
      'sync-xhr=(self)',
      'usb=()',
      'web-share=(self)',
      'xr-spatial-tracking=()',
    ].join(', ');
  }

  /**
   * Aplica todos os headers de segurança a uma response
   */
  applyHeaders(response: NextResponse, nonce?: string): NextResponse {
    // Content-Security-Policy
    if (this.config.cspEnabled) {
      const cspHeader = this.config.cspReportOnly
        ? 'Content-Security-Policy-Report-Only'
        : 'Content-Security-Policy';
      response.headers.set(cspHeader, this.buildCSP(nonce));
    }

    // HTTP Strict Transport Security
    if (this.config.hstsEnabled && process.env.NODE_ENV === 'production') {
      response.headers.set('Strict-Transport-Security', this.buildHSTS());
    }

    // X-Frame-Options (legacy, CSP frame-ancestors é preferido)
    response.headers.set('X-Frame-Options', 'DENY');

    // X-Content-Type-Options
    response.headers.set('X-Content-Type-Options', 'nosniff');

    // X-XSS-Protection (legacy, mas ainda útil para browsers antigos)
    response.headers.set('X-XSS-Protection', '1; mode=block');

    // Referrer-Policy
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Permissions-Policy
    response.headers.set('Permissions-Policy', this.buildPermissionsPolicy());

    // Cross-Origin-Opener-Policy
    response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');

    // Cross-Origin-Resource-Policy
    response.headers.set('Cross-Origin-Resource-Policy', 'same-origin');

    // Cross-Origin-Embedder-Policy (pode quebrar algumas integrações)
    // response.headers.set('Cross-Origin-Embedder-Policy', 'require-corp');

    // X-DNS-Prefetch-Control
    response.headers.set('X-DNS-Prefetch-Control', 'on');

    // X-Permitted-Cross-Domain-Policies
    response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');

    // X-Download-Options (IE specific)
    response.headers.set('X-Download-Options', 'noopen');

    // Se nonce foi gerado, passar via header para uso em scripts
    if (nonce) {
      response.headers.set('X-Nonce', nonce);
    }

    return response;
  }

  /**
   * Gera headers como objeto (para uso fora de middleware)
   */
  getHeadersObject(nonce?: string): Record<string, string> {
    const headers: Record<string, string> = {};

    if (this.config.cspEnabled) {
      headers['Content-Security-Policy'] = this.buildCSP(nonce);
    }

    if (this.config.hstsEnabled && process.env.NODE_ENV === 'production') {
      headers['Strict-Transport-Security'] = this.buildHSTS();
    }

    headers['X-Frame-Options'] = 'DENY';
    headers['X-Content-Type-Options'] = 'nosniff';
    headers['X-XSS-Protection'] = '1; mode=block';
    headers['Referrer-Policy'] = 'strict-origin-when-cross-origin';
    headers['Permissions-Policy'] = this.buildPermissionsPolicy();
    headers['Cross-Origin-Opener-Policy'] = 'same-origin';
    headers['Cross-Origin-Resource-Policy'] = 'same-origin';
    headers['X-DNS-Prefetch-Control'] = 'on';
    headers['X-Permitted-Cross-Domain-Policies'] = 'none';
    headers['X-Download-Options'] = 'noopen';

    if (nonce) {
      headers['X-Nonce'] = nonce;
    }

    return headers;
  }
}

// ===========================================
// Singleton Export
// ===========================================

export const securityHeaders = new SecurityHeadersBuilder();

// ===========================================
// API Security Headers (for API routes)
// ===========================================

export class ApiSecurityHeaders {
  /**
   * Headers para APIs públicas
   */
  static publicApi(): Record<string, string> {
    return {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Cache-Control': 'no-store, max-age=0',
      'Pragma': 'no-cache',
    };
  }

  /**
   * Headers para APIs autenticadas
   */
  static authenticatedApi(): Record<string, string> {
    return {
      ...this.publicApi(),
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    };
  }

  /**
   * Headers para APIs com dados sensíveis
   */
  static sensitiveApi(): Record<string, string> {
    return {
      ...this.authenticatedApi(),
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      'Clear-Site-Data': '"cache", "storage"', // Limpa cache do browser
    };
  }

  /**
   * Headers para download de arquivos
   */
  static fileDownload(filename: string, contentType: string): Record<string, string> {
    return {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, max-age=3600',
    };
  }

  /**
   * Headers para streaming de vídeo
   */
  static videoStream(): Record<string, string> {
    return {
      'Content-Type': 'video/mp4',
      'Accept-Ranges': 'bytes',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'public, max-age=31536000',
    };
  }

  /**
   * Headers CORS para APIs públicas
   */
  static cors(origin: string = '*', methods: string = 'GET, POST, OPTIONS'): Record<string, string> {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': methods,
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Max-Age': '86400', // 24 hours
    };
  }

  /**
   * Headers CORS restritivos (apenas origens específicas)
   */
  static restrictedCors(allowedOrigins: string[]): ((origin: string | null) => Record<string, string>) {
    return (origin: string | null) => {
      const isAllowed = origin && allowedOrigins.includes(origin);
      return {
        'Access-Control-Allow-Origin': isAllowed ? origin : '',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400',
        'Vary': 'Origin',
      };
    };
  }
}

// ===========================================
// Rate Limit Headers
// ===========================================

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
}

export function rateLimitHeaders(info: RateLimitInfo): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': info.limit.toString(),
    'X-RateLimit-Remaining': info.remaining.toString(),
    'X-RateLimit-Reset': info.reset.toString(),
  };

  if (info.retryAfter !== undefined) {
    headers['Retry-After'] = info.retryAfter.toString();
  }

  return headers;
}

// ===========================================
// Middleware Helper
// ===========================================

/**
 * Aplica security headers a uma response existente
 */
export function withSecurityHeaders(
  response: NextResponse,
  config?: Partial<SecurityHeadersConfig>
): NextResponse {
  const builder = config ? new SecurityHeadersBuilder(config) : securityHeaders;
  return builder.applyHeaders(response);
}

/**
 * Cria response com security headers
 */
export function secureJsonResponse<T>(
  data: T,
  status: number = 200,
  config?: Partial<SecurityHeadersConfig>
): NextResponse {
  const response = NextResponse.json(data, { status });
  return withSecurityHeaders(response, config);
}

/**
 * CSP Report endpoint handler
 */
export async function handleCspReport(request: NextRequest): Promise<NextResponse> {
  try {
    const report = await request.json();
    
    // Log para análise
    console.warn('[CSP Violation]', JSON.stringify({
      documentUri: report['csp-report']?.['document-uri'],
      violatedDirective: report['csp-report']?.['violated-directive'],
      blockedUri: report['csp-report']?.['blocked-uri'],
      sourceFile: report['csp-report']?.['source-file'],
      lineNumber: report['csp-report']?.['line-number'],
      timestamp: new Date().toISOString(),
    }));

    // Em produção, enviar para Sentry
    if (process.env.NODE_ENV === 'production') {
      // Importação dinâmica para evitar problemas com edge runtime
      const Sentry = await import('@sentry/nextjs');
      Sentry.captureMessage('CSP Violation', {
        level: 'warning',
        extra: report['csp-report'],
      });
    }

    return NextResponse.json({ received: true }, { status: 204 });
  } catch {
    return NextResponse.json({ error: 'Invalid report' }, { status: 400 });
  }
}

export default securityHeaders;
