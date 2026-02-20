
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseForRequest } from '@lib/supabase/server';
import { prisma } from '@lib/prisma';
import { logger } from '@lib/logger';
import { randomUUID } from 'crypto';
import { applyRateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    const blocked = await applyRateLimit(req, 'assets-upload', 10);
    if (blocked) return blocked;

    const supabase = getSupabaseForRequest(req);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = user.id;

    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Generate unique path
    const fileExt = file.name.split('.').pop();
    const fileName = `${randomUUID()}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;
    const bucketName = 'uploads';

    // 1. Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from(bucketName)
      .upload(filePath, file);

    if (uploadError) {
      logger.error('Supabase Storage Upload Error', uploadError);
      return NextResponse.json({ error: 'Storage upload failed', details: uploadError.message }, { status: 500 });
    }

    // 2. Register in Database (storage_files) - fail-fast when persistence is unavailable
    const storageFilesModel = (prisma as unknown as {
      storage_files?: {
        create(args: {
          data: {
            id: string;
            userId: string;
            bucket: string;
            filePath: string;
            originalName: string;
            mimeType: string;
            fileSize: bigint;
            isPublic: boolean;
          };
        }): Promise<{ id: string; originalName: string; mimeType: string }>;
      };
    }).storage_files;

    if (!storageFilesModel) {
      await supabase.storage.from(bucketName).remove([filePath]);
      logger.error('Storage upload persistence unavailable: Prisma model storage_files not found', {
        component: 'API: assets/upload',
      });
      return NextResponse.json(
        { error: 'Persistence unavailable for uploaded assets' },
        { status: 503 },
      );
    }

    let dbRecord: { id: string; originalName: string; mimeType: string };
    try {
      dbRecord = await storageFilesModel.create({
        data: {
          id: randomUUID(),
          userId,
          bucket: bucketName,
          filePath,
          originalName: file.name,
          mimeType: file.type,
          fileSize: BigInt(file.size),
          isPublic: false,
        },
      });
    } catch (dbError) {
      await supabase.storage.from(bucketName).remove([filePath]);
      logger.error('Storage upload persistence failed', dbError as Error, {
        component: 'API: assets/upload',
      });
      return NextResponse.json(
        { error: 'Failed to persist uploaded asset metadata' },
        { status: 503 },
      );
    }

    // 3. Get Public URL (Optional, depending on bucket privacy)
    const { data: { publicUrl } } = supabase.storage.from(bucketName).getPublicUrl(filePath);

    return NextResponse.json({
      success: true,
      asset: {
        id: dbRecord.id,
        url: publicUrl,
        type: file.type.startsWith('video') ? 'video' : file.type.startsWith('image') ? 'image' : 'audio',
        name: dbRecord.originalName
      }
    });

  } catch (error) {
    logger.error('Asset Upload Route Error', error as Error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
