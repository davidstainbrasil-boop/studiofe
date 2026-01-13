
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/monitoring/logger';
import { PptxUploader } from '@/lib/storage/pptx-uploader';
import { rateLimit, getUserTier } from '@/middleware/rate-limiter';
import { getSupabaseForRequest } from '@lib/supabase/server';

export async function POST(req: NextRequest) {
  logger.info('PPTX upload request received');

  try {
    // Get authenticated user
    const supabase = getSupabaseForRequest(req);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Apply rate limiting (PPTX upload is resource-intensive)
    const tier = await getUserTier(user.id);
    const rateLimitResponse = await rateLimit(req, user.id, tier);

    if (rateLimitResponse) {
      logger.warn('PPTX upload rate limit exceeded', { userId: user.id, tier });
      return rateLimitResponse;
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const projectId = formData.get('projectId') as string || 'mock-project-id';

    if (!file) {
      logger.warn('No file found in the upload request');
      return NextResponse.json({ error: 'Nenhum arquivo encontrado.' }, { status: 400 });
    }

    const uploader = new PptxUploader();
    const result = await uploader.upload({ file, userId: user.id, projectId });

    logger.info('File uploaded successfully via service', { result, userId: user.id });

    return NextResponse.json(result);

  } catch (error) {
    logger.error('Error handling PPTX upload', error instanceof Error ? error : new Error(String(error)));
    const message = error instanceof Error ? error.message : 'Erro ao processar o upload.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
