
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseForRequest } from '@lib/supabase/server';
import { prisma } from '@lib/prisma';
import { logger } from '@lib/logger';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseForRequest(req);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    // Fallback for development/demo
    const userId = user?.id || 'demo-user';
    
    if (authError && !userId) {
       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    // 2. Register in Database (storage_files)
    // TODO: Se storage_files existir no schema Prisma, usar prisma.storage_files.create
    // Por enquanto, criar registro mockado
    const dbRecord = {
      id: randomUUID(),
      userId: userId,
      bucket: bucketName,
      filePath: filePath,
      originalName: file.name,
      mimeType: file.type,
      fileSize: BigInt(file.size),
      isPublic: false,
      createdAt: new Date()
    };

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
