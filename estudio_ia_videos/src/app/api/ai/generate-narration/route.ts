import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

/**
 * AI Narration Generation API
 * 
 * POST /api/ai/generate-narration - Generate narration text for slides
 */

const requestSchema = z.object({
  content: z.object({
    title: z.string(),
    bulletPoints: z.array(z.string()),
    images: z.array(z.string()).optional(),
  }),
  nrCode: z.string().optional(),
  tone: z.enum(['professional', 'friendly', 'formal', 'educational']).default('professional'),
  length: z.enum(['concise', 'standard', 'detailed']).default('standard'),
  targetAudience: z.enum(['beginner', 'intermediate', 'advanced']).default('intermediate'),
  maxDuration: z.number().optional(),
});

type ToneType = 'professional' | 'friendly' | 'formal' | 'educational';
type LengthType = 'concise' | 'standard' | 'detailed';
type AudienceType = 'beginner' | 'intermediate' | 'advanced';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { content, nrCode, tone, length, targetAudience } = parsed.data;

    // Generate narration using internal logic
    // In production, this would call an AI service like OpenAI
    const narration = generateNarration(content, nrCode, tone, length, targetAudience);

    // Calculate metadata
    const wordCount = narration.trim().split(/\s+/).filter(w => w.length > 0).length;
    const estimatedDuration = Math.round((wordCount / 150) * 60); // 150 WPM average

    // Log usage is skipped - table may not exist
    // In production, implement proper usage tracking

    return NextResponse.json({
      narration,
      metadata: {
        wordCount,
        estimatedDuration,
        tone,
        length,
      },
    });
  } catch (error) {
    console.error('Narration generation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function generateNarration(
  content: { title: string; bulletPoints: string[] },
  nrCode: string | undefined,
  tone: ToneType,
  length: LengthType,
  audience: AudienceType
): string {
  // Build introduction based on tone
  const introductions: Record<ToneType, string> = {
    professional: `Neste módulo, abordaremos ${content.title}. `,
    friendly: `Olá! Vamos conversar sobre ${content.title}. `,
    formal: `Apresentamos a seguir o conteúdo referente a ${content.title}. `,
    educational: `Vamos aprender juntos sobre ${content.title}. `,
  };

  // Add NR context if available
  const nrContext = nrCode 
    ? `Este conteúdo está em conformidade com a ${nrCode}, ` +
      `que estabelece os requisitos mínimos para a segurança e saúde no trabalho. `
    : '';

  // Audience-specific language adjustments
  const audienceIntro: Record<AudienceType, string> = {
    beginner: 'Para começar, é importante entender os conceitos básicos. ',
    intermediate: 'Vamos revisar os principais pontos. ',
    advanced: 'Focando nos aspectos técnicos avançados. ',
  };

  // Process bullet points based on length
  const pointsCount = length === 'concise' ? 2 : length === 'standard' ? 3 : content.bulletPoints.length;
  const points = content.bulletPoints.slice(0, pointsCount);

  // Generate content for each point
  const pointsNarration = points.map((point, index) => {
    const transitions = ['Primeiramente', 'Em seguida', 'Além disso', 'Também é importante destacar', 'Por fim'];
    const transition = transitions[Math.min(index, transitions.length - 1)];
    
    // Clean and format the point
    const cleanPoint = point.replace(/^[\-•]\s*/, '').trim();
    
    if (tone === 'educational') {
      return `${transition}, é fundamental compreender que ${cleanPoint.toLowerCase()}.`;
    } else if (tone === 'friendly') {
      return `${transition}, veja que ${cleanPoint.toLowerCase()}.`;
    } else {
      return `${transition}, ${cleanPoint.toLowerCase()}.`;
    }
  }).join(' ');

  // Build conclusion based on tone
  const conclusions: Record<ToneType, string> = {
    professional: 'Estes são os pontos fundamentais para garantir a conformidade e segurança no ambiente de trabalho.',
    friendly: 'Lembre-se: sua segurança e de seus colegas é sempre prioridade! Qualquer dúvida, não hesite em perguntar.',
    formal: 'O cumprimento destas diretrizes é obrigatório e essencial para a prevenção de acidentes ocupacionais.',
    educational: 'Agora que você conhece estes conceitos, poderá aplicá-los no seu dia a dia de trabalho com mais segurança.',
  };

  // Combine all parts
  let narration = introductions[tone];
  narration += nrContext;
  narration += audienceIntro[audience];
  narration += pointsNarration + ' ';
  narration += conclusions[tone];

  return narration;
}
