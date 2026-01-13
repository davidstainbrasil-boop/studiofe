// Proxy de imagens como workaround para problemas de configuração
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const url = searchParams.get('url')
  const w = searchParams.get('w')
  const q = searchParams.get('q')
  
  if (!url) {
    return NextResponse.json({ error: 'URL parameter required' }, { status: 400 })
  }

  try {
    console.log('📷 Image Proxy:', { url, width: w, quality: q })

    const imageResponse = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NextJS-ImageProxy)',
        'Accept': 'image/*',
        'Cache-Control': 'public, max-age=3600',
      },
      next: { revalidate: 3600 } // Cache por 1 hora
    })

    if (!imageResponse.ok) {
      console.error('❌ Image fetch failed:', imageResponse.status, imageResponse.statusText)
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
    console.error('❌ Image proxy error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}