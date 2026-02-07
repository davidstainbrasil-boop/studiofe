// Debug route para testar Next.js Image API
// SECURITY: Restricted to development only + requires authentication
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@lib/logger'
import { requireAuth, unauthorizedResponse } from '@lib/api/auth-middleware'

export async function GET(request: NextRequest) {
  // Block in production - this is a debug-only endpoint
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 });
  }

  const auth = await requireAuth(request);
  if (!auth) return unauthorizedResponse();
  const searchParams = request.nextUrl.searchParams
  const url = searchParams.get('url')
  const w = searchParams.get('w')
  const q = searchParams.get('q')
  
  logger.debug('Image Debug request', {
    component: 'API: debug-image',
    url,
    width: w,
    quality: q,
    userAgent: request.headers.get('user-agent'),
    host: request.headers.get('host'),
    accept: request.headers.get('accept'),
  });

  try {
    // Testar se a URL externa é acessível
    if (url) {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)
      
      const imageResponse = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; NextJS-ImageOptimizer)',
        },
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      return NextResponse.json({
        status: 'ok',
        imageAccessible: imageResponse.ok,
        imageStatus: imageResponse.status,
        imageHeaders: Object.fromEntries(imageResponse.headers.entries()),
        contentType: imageResponse.headers.get('content-type'),
        contentLength: imageResponse.headers.get('content-length'),
      })
    } else {
      return NextResponse.json({
        status: 'error',
        message: 'URL parameter required'
      }, { status: 400 })
    }
  } catch (error) {
    logger.error('Erro no debug de imagem', error instanceof Error ? error : new Error(String(error)), {
      component: 'API: debug-image',
      url
    });
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}