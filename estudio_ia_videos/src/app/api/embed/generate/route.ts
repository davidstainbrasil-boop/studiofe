import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';

// Generate embed HTML for a video
function generateEmbedCode(
  videoId: string,
  videoUrl: string,
  options: {
    width?: string | number;
    height?: string | number;
    autoplay?: boolean;
    controls?: boolean;
    loop?: boolean;
    muted?: boolean;
    title?: string;
    poster?: string;
    responsive?: boolean;
  }
): string {
  const {
    width = 640,
    height = 360,
    autoplay = false,
    controls = true,
    loop = false,
    muted = false,
    title = 'Vídeo de Treinamento',
    poster,
    responsive = true,
  } = options;

  // Build video attributes
  const videoAttrs = [
    controls ? 'controls' : '',
    autoplay ? 'autoplay' : '',
    loop ? 'loop' : '',
    muted ? 'muted' : '',
    poster ? `poster="${poster}"` : '',
    'playsinline',
    `title="${title}"`,
  ].filter(Boolean).join(' ');

  // Responsive wrapper styles
  const wrapperStyle = responsive
    ? 'position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%;'
    : `width: ${typeof width === 'number' ? width + 'px' : width}; height: ${typeof height === 'number' ? height + 'px' : height};`;

  const videoStyle = responsive
    ? 'position: absolute; top: 0; left: 0; width: 100%; height: 100%;'
    : 'width: 100%; height: 100%;';

  return `<!-- Estúdio IA Vídeos - Embed Code -->
<div class="estudio-ia-video" data-video-id="${videoId}" style="${wrapperStyle}">
  <video ${videoAttrs} style="${videoStyle}">
    <source src="${videoUrl}" type="video/mp4">
    <p>Seu navegador não suporta vídeos HTML5. <a href="${videoUrl}">Clique aqui para baixar</a>.</p>
  </video>
</div>
<!-- End Estúdio IA Vídeos Embed -->`;
}

// Generate iframe embed for more isolation
function generateIframeEmbed(
  videoId: string,
  baseUrl: string,
  options: {
    width?: string | number;
    height?: string | number;
    autoplay?: boolean;
    responsive?: boolean;
  }
): string {
  const {
    width = 640,
    height = 360,
    autoplay = false,
    responsive = true,
  } = options;

  const embedUrl = `${baseUrl}/embed/${videoId}${autoplay ? '?autoplay=1' : ''}`;

  if (responsive) {
    return `<!-- Estúdio IA Vídeos - Embed Code -->
<div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%;">
  <iframe 
    src="${embedUrl}" 
    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;"
    allowfullscreen
    allow="autoplay; fullscreen; picture-in-picture"
    title="Vídeo de Treinamento"
  ></iframe>
</div>
<!-- End Estúdio IA Vídeos Embed -->`;
  }

  return `<!-- Estúdio IA Vídeos - Embed Code -->
<iframe 
  src="${embedUrl}" 
  width="${width}" 
  height="${height}" 
  frameborder="0" 
  allowfullscreen
  allow="autoplay; fullscreen; picture-in-picture"
  title="Vídeo de Treinamento"
></iframe>
<!-- End Estúdio IA Vídeos Embed -->`;
}

// Generate WordPress shortcode
function generateWordPressShortcode(videoId: string, options: {
  autoplay?: boolean;
  controls?: boolean;
}): string {
  const { autoplay = false, controls = true } = options;
  return `[estudio_ia_video id="${videoId}" autoplay="${autoplay}" controls="${controls}"]`;
}

// Generate oEmbed JSON
function generateOEmbedResponse(
  videoId: string,
  videoUrl: string,
  baseUrl: string,
  options: {
    title?: string;
    authorName?: string;
    thumbnailUrl?: string;
    width?: number;
    height?: number;
  }
): object {
  const {
    title = 'Vídeo de Treinamento',
    authorName = 'Estúdio IA Vídeos',
    thumbnailUrl,
    width = 640,
    height = 360,
  } = options;

  return {
    type: 'video',
    version: '1.0',
    title,
    author_name: authorName,
    author_url: baseUrl,
    provider_name: 'Estúdio IA Vídeos',
    provider_url: baseUrl,
    thumbnail_url: thumbnailUrl || `${baseUrl}/api/videos/${videoId}/thumbnail`,
    thumbnail_width: 480,
    thumbnail_height: 270,
    html: generateIframeEmbed(videoId, baseUrl, { width, height, responsive: true }),
    width,
    height,
  };
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await req.json();
    
    const {
      videoId,
      videoUrl,
      format = 'html', // 'html', 'iframe', 'wordpress', 'oembed'
      options = {},
    } = body;

    // Validate required fields
    if (!videoId || !videoUrl) {
      return NextResponse.json(
        { error: 'videoId e videoUrl são obrigatórios' },
        { status: 400 }
      );
    }

    // Get base URL from request
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                    `${req.nextUrl.protocol}//${req.nextUrl.host}`;

    let embedCode: string | object;

    switch (format) {
      case 'html':
        embedCode = generateEmbedCode(videoId, videoUrl, options);
        break;
      
      case 'iframe':
        embedCode = generateIframeEmbed(videoId, baseUrl, options);
        break;
      
      case 'wordpress':
        embedCode = generateWordPressShortcode(videoId, options);
        break;
      
      case 'oembed':
        embedCode = generateOEmbedResponse(videoId, videoUrl, baseUrl, options);
        break;
      
      default:
        return NextResponse.json(
          { error: 'Formato inválido. Use: html, iframe, wordpress, oembed' },
          { status: 400 }
        );
    }

    // Track embed generation
    const { error: analyticsError } = await (supabase as any)
      .from('embed_analytics')
      .insert({
        user_id: user.id,
        video_id: videoId,
        format,
        created_at: new Date().toISOString(),
      });

    if (analyticsError) {
      logger.warn('Failed to track embed generation', { error: analyticsError.message });
    }

    const instructions: Record<string, string> = {
      html: 'Cole este código HTML diretamente na sua página.',
      iframe: 'Use este iframe para incorporar com isolamento total.',
      wordpress: 'Instale nosso plugin e use este shortcode.',
      oembed: 'Compatível com qualquer plataforma que suporte oEmbed.',
    };

    return NextResponse.json({
      success: true,
      videoId,
      format,
      embedCode,
      instructions: instructions[format] || instructions.html,
    });

  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('Embed generation failed', err);
    return NextResponse.json(
      { error: 'Falha ao gerar código de embed' },
      { status: 500 }
    );
  }
}

// GET: oEmbed discovery endpoint
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url');
  const format = searchParams.get('format') || 'json';
  const maxWidth = parseInt(searchParams.get('maxwidth') || '640');
  const maxHeight = parseInt(searchParams.get('maxheight') || '360');

  if (!url) {
    return NextResponse.json(
      { error: 'URL parameter is required' },
      { status: 400 }
    );
  }

  // Extract video ID from URL
  const videoIdMatch = url.match(/\/videos\/([a-zA-Z0-9-]+)/);
  if (!videoIdMatch) {
    return NextResponse.json(
      { error: 'Invalid video URL' },
      { status: 400 }
    );
  }

  const videoId = videoIdMatch[1];
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                  `${req.nextUrl.protocol}//${req.nextUrl.host}`;

  // In production, fetch video details from database
  const oembedResponse = generateOEmbedResponse(
    videoId,
    `${baseUrl}/api/videos/${videoId}/stream`,
    baseUrl,
    {
      width: Math.min(maxWidth, 1920),
      height: Math.min(maxHeight, 1080),
    }
  );

  if (format === 'xml') {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<oembed>
  <type>${(oembedResponse as any).type}</type>
  <version>${(oembedResponse as any).version}</version>
  <title>${(oembedResponse as any).title}</title>
  <author_name>${(oembedResponse as any).author_name}</author_name>
  <provider_name>${(oembedResponse as any).provider_name}</provider_name>
  <provider_url>${(oembedResponse as any).provider_url}</provider_url>
  <width>${(oembedResponse as any).width}</width>
  <height>${(oembedResponse as any).height}</height>
  <html><![CDATA[${(oembedResponse as any).html}]]></html>
</oembed>`;

    return new NextResponse(xml, {
      headers: { 'Content-Type': 'application/xml' },
    });
  }

  return NextResponse.json(oembedResponse);
}
