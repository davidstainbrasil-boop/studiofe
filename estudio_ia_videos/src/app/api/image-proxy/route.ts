// Proxy de imagens — protegido contra SSRF
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@lib/logger'
import { applyRateLimit } from '@/lib/rate-limit';
import { getServerAuth } from '@lib/auth/unified-session';

// Domínios permitidos para proxy (anti-SSRF)
const ALLOWED_DOMAINS = [
  'supabase.co',
  'supabase.in',
  'googleapis.com',
  'googleusercontent.com',
  'unsplash.com',
  'pexels.com',
  'cloudinary.com',
  'cursostecno.com.br',
];

function isAllowedUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    // Block private IPs / localhost
    if (['localhost', '127.0.0.1', '0.0.0.0', '::1'].includes(parsed.hostname)) return false;
    if (parsed.hostname.startsWith('10.') || parsed.hostname.startsWith('192.168.') || parsed.hostname.startsWith('172.')) return false;
    if (parsed.protocol !== 'https:') return false;
    // Check against allowlist
    return ALLOWED_DOMAINS.some(domain => parsed.hostname.endsWith(domain));
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
    const rateLimitBlocked = await applyRateLimit(request, 'image-proxy-get', 60);
    if (rateLimitBlocked) return rateLimitBlocked;

  // Auth check
  const session = await getServerAuth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams
  const url = searchParams.get('url')
  const w = searchParams.get('w')
  const q = searchParams.get('q')
  
  if (!url) {
    return NextResponse.json({ error: 'URL parameter required' }, { status: 400 })
  }

  // SSRF protection: validate URL against allowlist
  if (!isAllowedUrl(url)) {
    logger.warn('Image proxy blocked: URL not in allowlist', { component: 'API: image-proxy', url });
    return NextResponse.json({ error: 'URL domain not allowed' }, { status: 403 })
  }

  try {
    logger.debug('Image Proxy request', {
      component: 'API: image-proxy',
      url,
      width: w,
      quality: q
    });

    const imageResponse = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NextJS-ImageProxy)',
        'Accept': 'image/*',
        'Cache-Control': 'public, max-age=3600',
      },
      next: { revalidate: 3600 } // Cache por 1 hora
    })

    if (!imageResponse.ok) {
      logger.warn('Image fetch failed', {
        component: 'API: image-proxy',
        status: imageResponse.status,
        statusText: imageResponse.statusText,
        url
      });
      return NextResponse.json({ 
        error: 'Failed to fetch image',
        status: imageResponse.status 
      }, { status: 502 })
    }

    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg'
    const imageBuffer = await imageResponse.arrayBuffer()

    // Retornar a imagem com headers apropriados
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
        'Content-Length': imageBuffer.byteLength.toString(),
        'X-Proxy': 'NextJS-Image-Proxy',
      }
    })

  } catch (error) {
    logger.error('Image proxy error', error instanceof Error ? error : new Error(String(error)), {
      component: 'API: image-proxy',
      url
    });
    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}