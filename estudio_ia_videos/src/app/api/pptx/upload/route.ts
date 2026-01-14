
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/monitoring/logger';
import { PptxUploader } from '@/lib/storage/pptx-uploader';
import { rateLimit, getUserTier } from '@/middleware/rate-limiter';
import { getSupabaseForRequest } from '@lib/supabase/server';

export async function POST(req: NextRequest) {
  logger.info('PPTX upload request received');
  logger.info('Cookies:', req.cookies.getAll());

  try {
    // Get authenticated user
    const supabase = getSupabaseForRequest(req);
    let user;
    
    // [DEV] Bypass check
    const bypassId = '12b21f2e-8ac1-480c-af1e-542a7d9b185a';
    const headerUserId = req.headers.get('x-user-id');
    
    if (req.cookies.get('dev_bypass')?.value === 'true' || headerUserId === bypassId) {
        user = { id: bypassId, email: 'admin@estudio.ai' };
    } else {
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        if (authError || !authUser) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
        }
        user = authUser;
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

    if (file.size === 0) {
      logger.warn('Empty file uploaded', { userId: user.id });
      return NextResponse.json({ error: 'O arquivo está vazio.' }, { status: 400 });
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
