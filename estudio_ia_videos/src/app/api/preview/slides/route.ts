/**
 * API Preview Slides - Gera preview visual dos slides
 * POST /api/preview/slides
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@lib/logger';
import { getServerAuth } from '@lib/auth/unified-session';
import { applyRateLimit } from '@/lib/rate-limit';

const slideSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  content: z.string(),
  backgroundColor: z.string().optional().default('#1a1a2e'),
  textColor: z.string().optional().default('#ffffff'),
  duration: z.number().optional().default(5),
});

const previewSchema = z.object({
  slides: z.array(slideSchema).min(1).max(50),
  width: z.number().optional().default(1920),
  height: z.number().optional().default(1080),
});

export async function POST(request: NextRequest) {
  const session = await getServerAuth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validation = previewSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Dados inválidos', details: validation.error.format() },
        { status: 400 }
      );
    }

    const { slides, width, height } = validation.data;

    // Gerar preview SVG para cada slide
    const previews = slides.map((slide, index) => {
      const svg = generateSlideSVG(slide, width, height);
      const base64 = Buffer.from(svg).toString('base64');
      
      return {
        id: slide.id || `slide-${index + 1}`,
        slideNumber: index + 1,
        title: slide.title,
        content: slide.content.substring(0, 100) + (slide.content.length > 100 ? '...' : ''),
        duration: slide.duration,
        preview: {
          svg,
          dataUrl: `data:image/svg+xml;base64,${base64}`,
          width,
          height,
        },
        backgroundColor: slide.backgroundColor,
      };
    });

    return NextResponse.json({
      success: true,
      slideCount: previews.length,
      totalDuration: slides.reduce((acc, s) => acc + (s.duration || 5), 0),
      dimensions: { width, height },
      slides: previews,
    });

  } catch (error) {
    logger.error('Erro na API de preview', error instanceof Error ? error : new Error(String(error)), {
      component: 'API: preview/slides'
    });
    return NextResponse.json(
      { success: false, error: 'Erro interno' },
      { status: 500 }
    );
  }
}

function generateSlideSVG(
  slide: z.infer<typeof slideSchema>,
  width: number,
  height: number
): string {
  const bgColor = slide.backgroundColor || '#1a1a2e';
  const textColor = slide.textColor || '#ffffff';
  
  // Escapar texto para SVG
  const escapeXml = (text: string) => 
    text.replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');

  const title = escapeXml(slide.title.substring(0, 50));
  const content = escapeXml(slide.content.substring(0, 200));

  // Quebrar conteúdo em linhas
  const contentLines = wrapText(content, 60);
  const contentY = height * 0.5;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${bgColor};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${adjustColor(bgColor, -30)};stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="${width}" height="${height}" fill="url(#bg-gradient)"/>
  
  <!-- Decorative elements -->
  <circle cx="${width * 0.9}" cy="${height * 0.1}" r="100" fill="${textColor}" opacity="0.05"/>
  <circle cx="${width * 0.1}" cy="${height * 0.9}" r="150" fill="${textColor}" opacity="0.03"/>
  
  <!-- Title -->
  <text x="${width / 2}" y="${height * 0.25}" 
        font-family="Arial, sans-serif" 
        font-size="72" 
        font-weight="bold"
        fill="${textColor}" 
        text-anchor="middle">${title}</text>
  
  <!-- Content -->
  ${contentLines.map((line, i) => 
    `<text x="${width / 2}" y="${contentY + i * 50}" 
           font-family="Arial, sans-serif" 
           font-size="36" 
           fill="${textColor}" 
           opacity="0.9"
           text-anchor="middle">${escapeXml(line)}</text>`
  ).join('\n  ')}
  
  <!-- Duration badge -->
  <rect x="${width - 120}" y="${height - 60}" width="100" height="40" rx="20" fill="${textColor}" opacity="0.2"/>
  <text x="${width - 70}" y="${height - 32}" 
        font-family="Arial, sans-serif" 
        font-size="20" 
        fill="${textColor}" 
        text-anchor="middle">${slide.duration}s</text>
</svg>`;
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + word).length > maxChars) {
      if (currentLine) lines.push(currentLine.trim());
      currentLine = word + ' ';
    } else {
      currentLine += word + ' ';
    }
  }
  if (currentLine.trim()) lines.push(currentLine.trim());

  return lines.slice(0, 4); // Máximo 4 linhas
}

function adjustColor(hex: string, amount: number): string {
  const color = hex.replace('#', '');
  const num = parseInt(color, 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
  const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

export async function GET(req: NextRequest) {
    const rateLimitBlocked = await applyRateLimit(req, 'preview-slides-get', 60);
    if (rateLimitBlocked) return rateLimitBlocked;

  return NextResponse.json({
    service: 'Slide Preview API',
    version: '1.0.0',
    outputFormats: ['svg', 'data-url'],
    usage: {
      method: 'POST',
      body: {
        slides: [
          {
            title: 'Título do Slide',
            content: 'Conteúdo do slide',
            backgroundColor: '#1a1a2e',
            duration: 5,
          },
        ],
        width: 1920,
        height: 1080,
      },
    },
  });
}

