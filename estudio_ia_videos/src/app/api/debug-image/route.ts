// Debug route para testar Next.js Image API
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const url = searchParams.get('url')
  const w = searchParams.get('w')
  const q = searchParams.get('q')
  
  console.log('🔍 Image Debug:', {
    url: url,
    width: w,
    quality: q,
    userAgent: request.headers.get('user-agent'),
    host: request.headers.get('host'),
    accept: request.headers.get('accept'),
  })

  try {
    // Testar se a URL externa é acessível
    if (url) {
      const imageResponse = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; NextJS-ImageOptimizer)',
        },
        timeout: 10000
      })
      
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
    console.error('❌ Image debug error:', error)
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}