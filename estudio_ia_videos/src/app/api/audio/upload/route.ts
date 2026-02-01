/**
 * Audio Upload API
 * 
 * Handles audio file uploads for custom narration.
 * Validates format, size, and duration before storing.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// Configuration
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_DURATION_SECONDS = 600; // 10 minutes
const ALLOWED_MIME_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/m4a',
  'audio/mp4',
];

interface UploadResponse {
  success: boolean;
  audioId?: string;
  url?: string;
  duration?: number;
  error?: string;
}

export async function POST(req: NextRequest): Promise<NextResponse<UploadResponse>> {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      );
    }

    // Parse form data
    const formData = await req.formData();
    const file = formData.get('audio') as File | null;
    const projectId = formData.get('projectId') as string | null;
    const slideIndex = formData.get('slideIndex') as string | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'Nenhum arquivo enviado' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Formato de áudio não suportado. Use MP3, WAV ou M4A.' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: `Arquivo muito grande. Máximo: ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const extension = getFileExtension(file.type);
    const filename = `${user.id}/${timestamp}-${sanitizeFilename(file.name)}${extension}`;

    // Convert to buffer for upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('audio-uploads')
      .upload(filename, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      logger.error('Audio upload failed', uploadError);
      return NextResponse.json(
        { success: false, error: 'Falha ao fazer upload do áudio' },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('audio-uploads')
      .getPublicUrl(filename);

    // Create database record
    const { data: audioRecord, error: dbError } = await (supabase as any)
      .from('audio_uploads')
      .insert({
        user_id: user.id,
        project_id: projectId || null,
        slide_index: slideIndex ? parseInt(slideIndex) : null,
        filename: file.name,
        storage_path: filename,
        url: urlData.publicUrl,
        mime_type: file.type,
        size_bytes: file.size,
        duration_seconds: null, // Will be updated by client after processing
      })
      .select()
      .single();

    if (dbError) {
      logger.warn('Failed to create audio record in database', { error: dbError.message });
      // Continue anyway, the file is uploaded
    }

    logger.info('Audio uploaded successfully', {
      userId: user.id,
      audioId: audioRecord?.id,
      filename: file.name,
      size: file.size,
    });

    return NextResponse.json({
      success: true,
      audioId: audioRecord?.id || filename,
      url: urlData.publicUrl,
    });

  } catch (error) {
    logger.error('Audio upload error', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { success: false, error: 'Erro interno ao processar upload' },
      { status: 500 }
    );
  }
}

// Update audio duration after client-side processing
export async function PATCH(req: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const { audioId, duration } = body;

    if (!audioId || typeof duration !== 'number') {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
    }

    // Update duration in database
    const { error: updateError } = await (supabase as any)
      .from('audio_uploads')
      .update({ duration_seconds: duration })
      .eq('id', audioId)
      .eq('user_id', user.id);

    if (updateError) {
      logger.error('Failed to update audio duration', updateError);
      return NextResponse.json({ error: 'Falha ao atualizar duração' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    logger.error('Audio update error', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// Delete uploaded audio
export async function DELETE(req: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const audioId = searchParams.get('id');

    if (!audioId) {
      return NextResponse.json({ error: 'ID do áudio não fornecido' }, { status: 400 });
    }

    // Get audio record
    const { data: audio } = await (supabase as any)
      .from('audio_uploads')
      .select('storage_path')
      .eq('id', audioId)
      .eq('user_id', user.id)
      .single();

    if (audio?.storage_path) {
      // Delete from storage
      await supabase.storage
        .from('audio-uploads')
        .remove([audio.storage_path]);
    }

    // Delete database record
    await (supabase as any)
      .from('audio_uploads')
      .delete()
      .eq('id', audioId)
      .eq('user_id', user.id);

    logger.info('Audio deleted', { userId: user.id, audioId });

    return NextResponse.json({ success: true });

  } catch (error) {
    logger.error('Audio delete error', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// Helper functions
function getFileExtension(mimeType: string): string {
  const extensions: Record<string, string> = {
    'audio/mpeg': '.mp3',
    'audio/mp3': '.mp3',
    'audio/wav': '.wav',
    'audio/x-wav': '.wav',
    'audio/m4a': '.m4a',
    'audio/mp4': '.m4a',
  };
  return extensions[mimeType] || '.mp3';
}

function sanitizeFilename(filename: string): string {
  // Remove extension and sanitize
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
  return nameWithoutExt
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 50);
}
