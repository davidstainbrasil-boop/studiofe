
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseForRequest } from '@lib/supabase/server';
import { logger } from '@lib/logger';
import { applyRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

function inferAssetType(name: string, mimeType?: string | null): 'image' | 'video' | 'audio' | 'file' {
  if (mimeType?.startsWith('video/')) return 'video';
  if (mimeType?.startsWith('audio/')) return 'audio';
  if (mimeType?.startsWith('image/')) return 'image';

  const ext = name.split('.').pop()?.toLowerCase() || '';
  if (['mp4', 'mov', 'webm', 'mkv', 'avi'].includes(ext)) return 'video';
  if (['mp3', 'wav', 'aac', 'ogg', 'm4a'].includes(ext)) return 'audio';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) return 'image';
  return 'file';
}

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
    const limit = Math.min(Number(searchParams.get('limit') || 100), 200);
    const offset = Math.max(Number(searchParams.get('offset') || 0), 0);
    const bucket = 'uploads';

    const { data: files, error: listError } = await supabase.storage
      .from(bucket)
      .list(userId, {
        limit,
        offset,
        sortBy: { column: 'created_at', order: 'desc' },
      });

    if (listError) {
      logger.error('Asset List Route Storage Error', listError, { component: 'API: assets/list' });
      return NextResponse.json({ error: 'Failed to list assets' }, { status: 500 });
    }

    const assets = (files || [])
      .map((file) => {
        const filePath = `${userId}/${file.name}`;
        const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(filePath);

        const mimeType = (file.metadata as { mimetype?: string } | null)?.mimetype || null;
        const type = inferAssetType(file.name, mimeType);

        return {
          id: file.id || filePath,
          url: publicUrl,
          name: file.name,
          type,
          mimeType,
          size: Number(file.metadata?.size || 0),
          createdAt: file.created_at || null,
        };
      })
      .filter((asset) => {
        if (!typeFilter) return true;
        return asset.type === typeFilter;
      });

    return NextResponse.json({
        success: true,
        data: assets,
        pagination: {
          limit,
          offset,
          count: assets.length,
        },
    });

  } catch (error) {
    logger.error('Asset List Route Error', error as Error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
