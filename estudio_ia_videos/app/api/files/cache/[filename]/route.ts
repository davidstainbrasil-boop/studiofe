

/**
 * 📁 API para servir arquivos do cache local
 * Serve arquivos armazenados no cache de vídeo/áudio
 */

import { NextRequest, NextResponse } from 'next/server'
import { videoCache } from '@/lib/video/video-cache'
import { audioCache } from '@/lib/audio-cache'
import { logger } from '@/lib/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    const filename = params.filename
    
    if (!filename) {
      return new NextResponse('Filename required', { status: 400 })
    }

    logger.info(`📁 Servindo arquivo do cache: ${filename}`, { component: 'API: files/cache/[filename]' })

    // Tentar primeiro no cache de vídeo
    const cachedVideo = videoCache.get(filename)
    const cachedAudio = !cachedVideo ? audioCache.get(filename) : null
    
    const cached = cachedVideo || cachedAudio

    if (!cached) {
      logger.info(`❌ Arquivo não encontrado em nenhum cache: ${filename}`, { component: 'API: files/cache/[filename]' })
      return new NextResponse('File not found', { status: 404 })
    }

    // Determinar content type
    let contentType = 'application/octet-stream'
    if (cached.format === 'mp4') contentType = 'video/mp4'
    else if (cached.format === 'mp3') contentType = 'audio/mpeg'
    else if (cached.format.includes('/')) contentType = cached.format // Já é mime type

    // Determinar headers baseado no content type
    const headers = new Headers()
    headers.set('Content-Type', contentType)
    headers.set('Content-Length', cached.buffer.length.toString())
    headers.set('Cache-Control', 'public, max-age=300') // Cache por 5 minutos
    headers.set('Access-Control-Allow-Origin', '*')

    // Para arquivos de mídia, adicionar ranges support
    if (contentType.startsWith('video/') || contentType.startsWith('audio/')) {
      headers.set('Accept-Ranges', 'bytes')
    }

    logger.info(`✅ Servindo ${filename} do cache (${cached.buffer.length} bytes)`, { component: 'API: files/cache/[filename]' })

    return new NextResponse(new Uint8Array(cached.buffer), {
      status: 200,
      headers
    })

  } catch (error) {
    logger.error('❌ Erro ao servir arquivo do cache', error instanceof Error ? error : new Error(String(error)), { component: 'API: files/cache/[filename]' })
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

