// TODO: Fix TTSService constructor signature
import { NextResponse } from 'next/server';
import { TTSService } from '@lib/tts/tts-service';
import { z } from 'zod';
import { logger } from '@lib/logger';
import { applyRateLimit } from '@/lib/rate-limit';
import { getServerSession } from 'next-auth';
import { authOptions } from '@lib/auth';

const ttsSchema = z.object({
  text: z.string().min(1, 'Text is required.'),
  slideId: z.string().uuid('Invalid Slide ID'),
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });
  }

  try {
    const blocked = await applyRateLimit(request, 'tts', 10);
    if (blocked) return blocked;

    const body = await request.json();
    const validation = ttsSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Dados inválidos', code: 'VALIDATION_ERROR', details: validation.error.format() }, { status: 400 });
    }

    const { text, slideId } = validation.data;

    const ttsResponse = await TTSService.synthesize({ text });

    if (!ttsResponse.fileUrl) {
      return NextResponse.json({ error: 'Falha na geração TTS', code: 'TTS_GENERATION_FAILED' }, { status: 500 });
    }

    return NextResponse.json({
      slideId: slideId,
      audioUrl: ttsResponse.fileUrl,
      duration: ttsResponse.duration,
    });
  } catch (error) {
    logger.error('TTS API Error', error instanceof Error ? error : new Error(String(error))
, { component: 'API: tts' });
    return NextResponse.json({ error: 'Erro interno do servidor', code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';
