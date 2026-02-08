// Proxy de imagens como workaround para problemas de configuração
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@lib/logger'
import { applyRateLimit } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
    const rateLimitBlocked = await applyRateLimit(request, 'image-proxy-get', 60);
    if (rateLimitBlocked) return rateLimitBlocked;

  const searchParams = request.nextUrl.searchParams
  const url = searchParams.get('url')
  const w = searchParams.get('w')
  const q = searchParams.get('q')
  
  if (!url) {
    return NextResponse.json({ error: 'URL parameter required' }, { status: 400 })
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