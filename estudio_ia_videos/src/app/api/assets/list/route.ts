
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseForRequest } from '@lib/supabase/server';
import { prisma } from '@lib/prisma';
import { logger } from '@lib/logger';
import { applyRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const rateLimitBlocked = await applyRateLimit(req, 'assets-list-get', 60);
    if (rateLimitBlocked) return rateLimitBlocked;

    const supabase = getSupabaseForRequest(req);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = user.id;

    const searchParams = req.nextUrl.searchParams;
    const typeFilter = searchParams.get('type'); // image, video, audio

    // List from DB - usando Supabase Storage diretamente já que storage_files pode não existir no Prisma
    // TODO: Se storage_files existir no schema Prisma, usar prisma.storage_files
    // Por enquanto, retornar lista vazia ou usar Supabase Storage API diretamente
    const files: Array<{
      id: string;
      bucket: string;
      filePath: string;
      originalName: string | null;
      mimeType: string | null;
      fileSize: bigint;
      createdAt: Date;
    }> = [];

    // Generate URLs
    const assets = files.map((file: {
      id: string;
      bucket: string;
      filePath: string;
      originalName: string | null;
      mimeType: string | null;
      fileSize: bigint;
      createdAt: Date;
    }) => {
       const { data: { publicUrl } } = supabase.storage.from(file.bucket).getPublicUrl(file.filePath);
       
       return {
         id: file.id,
         url: publicUrl,
         name: file.originalName,
         type: file.mimeType?.startsWith('video') ? 'video' : file.mimeType?.startsWith('audio') ? 'audio' : 'image',
         mimeType: file.mimeType, 
         size: Number(file.fileSize),
         createdAt: file.createdAt
       };
    });

    return NextResponse.json({
        success: true,
        data: assets
    });

  } catch (error) {
    logger.error('Asset List Route Error', error as Error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
