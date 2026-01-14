
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseForRequest } from '@lib/supabase/server';
import { prisma } from '@lib/prisma';
import { logger } from '@lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseForRequest(req);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    const userId = user?.id || 'demo-user';

    if (authError && !userId) {
       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const typeFilter = searchParams.get('type'); // image, video, audio

    // List from DB
    const files = await prisma.storage_files.findMany({
      where: {
        userId: userId,
        // Simple type filtering based on mimeType
        mimeType: typeFilter ? { startsWith: typeFilter } : undefined
      },
      orderBy: { createdAt: 'desc' }
    });

    // Generate URLs
    const assets = files.map(file => {
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
