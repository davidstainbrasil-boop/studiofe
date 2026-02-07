/**
 * STORAGE ASSETS API - Lista assets do projeto do usuário
 * GET /api/storage/assets - Lista arquivos de mídia do Supabase Storage
 *
 * Retorna arquivos do bucket 'assets' organizados por tipo (video, image, audio).
 * Requer autenticação via Supabase session cookie.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@lib/supabase/server';
import { logger } from '@/lib/logger';

const ASSET_BUCKET = 'assets';

/** Mapeia extensão de arquivo para tipo de mídia */
function getAssetType(filename: string): 'video' | 'image' | 'audio' | null {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (!ext) return null;

  const videoExts = ['mp4', 'webm', 'mov', 'avi', 'mkv'];
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];
  const audioExts = ['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a'];

  if (videoExts.includes(ext)) return 'video';
  if (imageExts.includes(ext)) return 'image';
  if (audioExts.includes(ext)) return 'audio';
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const projectId = req.nextUrl.searchParams.get('projectId');
    const folder = projectId ? `${user.id}/${projectId}` : user.id;

    // Lista arquivos no bucket do usuário
    const { data: files, error: storageError } = await supabase
      .storage
      .from(ASSET_BUCKET)
      .list(folder, {
        limit: 100,
        sortBy: { column: 'created_at', order: 'desc' },
      });

    if (storageError) {
      // Bucket pode não existir ainda — retorna lista vazia
      if (storageError.message?.includes('not found') || storageError.message?.includes('does not exist')) {
        return NextResponse.json({ assets: [], total: 0 });
      }

      logger.error('Storage list error', {
        error: storageError.message,
        folder,
        userId: user.id,
      });

      return NextResponse.json(
        { error: 'Erro ao listar assets', code: 'STORAGE_ERROR' },
        { status: 500 }
      );
    }

    // Filtra e mapeia apenas arquivos de mídia (ignora pastas)
    const assets = (files || [])
      .filter((file) => {
        if (!file.name || file.id === null) return false;
        return getAssetType(file.name) !== null;
      })
      .map((file) => {
        const filePath = `${folder}/${file.name}`;
        const { data: urlData } = supabase
          .storage
          .from(ASSET_BUCKET)
          .getPublicUrl(filePath);

        return {
          name: file.name,
          url: urlData.publicUrl,
          type: getAssetType(file.name)!,
          size: file.metadata?.size as number | undefined,
          createdAt: file.created_at,
        };
      });

    return NextResponse.json({
      assets,
      total: assets.length,
      folder,
    });

  } catch (error) {
    logger.error('Storage assets error', { error });
    return NextResponse.json(
      { error: 'Erro interno do servidor', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
