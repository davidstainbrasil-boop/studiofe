/**
 * 🎤 Custom Audio Upload API Route
 * 
 * API para upload de áudio próprio (narração customizada)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { 
  validateAudioFile, 
  uploadCustomAudio,
  getProjectAudio,
  deleteAudio,
  type AudioPurpose 
} from '@/lib/audio/custom-audio-upload';
import { Logger } from '@lib/logger';
import { createClient } from '@lib/supabase/server';
import { globalRateLimiter } from '@lib/rate-limit';
import { headers } from 'next/headers';

const logger = new Logger('api:audio:upload');

// =============================================================================
// POST Handler - Upload Audio
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    // 1. Get client IP for rate limiting
    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    
    // 2. Rate limiting (stricter for uploads)
    const rateLimitResult = globalRateLimiter.check(ip);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Muitas requisições. Tente novamente em alguns minutos.' },
        { status: 429 }
      );
    }
    
    // 3. Auth check
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Autenticação necessária' },
        { status: 401 }
      );
    }
    
    // 4. Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const projectId = formData.get('projectId') as string | null;
    const slideId = formData.get('slideId') as string | null;
    const purpose = formData.get('purpose') as AudioPurpose | null;
    
    // 5. Validate required fields
    if (!file) {
      return NextResponse.json(
        { error: 'Arquivo de áudio é obrigatório' },
        { status: 400 }
      );
    }
    
    if (!projectId) {
      return NextResponse.json(
        { error: 'ID do projeto é obrigatório' },
        { status: 400 }
      );
    }
    
    if (!purpose) {
      return NextResponse.json(
        { error: 'Propósito do áudio é obrigatório' },
        { status: 400 }
      );
    }
    
    // 6. Validate project ownership
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();
    
    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Projeto não encontrado ou sem permissão' },
        { status: 403 }
      );
    }
    
    // 7. Validate audio file
    const validation = await validateAudioFile(file);
    
    if (!validation.valid) {
      return NextResponse.json(
        { 
          error: 'Arquivo de áudio inválido',
          details: validation.errors,
          warnings: validation.warnings,
        },
        { status: 400 }
      );
    }
    
    logger.info('Iniciando upload de áudio', {
      userId: user.id,
      projectId,
      slideId,
      purpose,
      filename: file.name,
      size: file.size,
    });
    
    // 8. Upload audio
    const audioFile = await uploadCustomAudio({
      projectId,
      slideId: slideId || undefined,
      userId: user.id,
      audioBlob: file,
      filename: file.name,
      purpose,
      metadata: validation.metadata,
    });
    
    // 9. Log activity using logger instead of activity_log table
    logger.info('Áudio enviado pelo usuário', {
      userId: user.id,
      audioId: audioFile.id,
      projectId,
      slideId,
      purpose,
      filename: file.name,
      size: file.size,
    });
    
    logger.info('Áudio enviado com sucesso', {
      audioId: audioFile.id,
      userId: user.id,
    });
    
    return NextResponse.json({
      success: true,
      audio: audioFile,
      warnings: validation.warnings,
    });
    
  } catch (error) {
    logger.error('Erro no upload de áudio', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Erro interno ao fazer upload do áudio' },
      { status: 500 }
    );
  }
}

// =============================================================================
// GET Handler - List Project Audio
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    // 1. Auth check
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Autenticação necessária' },
        { status: 401 }
      );
    }
    
    // 2. Get project ID from query
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    
    if (!projectId) {
      return NextResponse.json(
        { error: 'ID do projeto é obrigatório' },
        { status: 400 }
      );
    }
    
    // 3. Get audio files
    const audioFiles = await getProjectAudio(projectId, user.id);
    
    return NextResponse.json({
      success: true,
      audio: audioFiles,
      total: audioFiles.length,
    });
    
  } catch (error) {
    logger.error('Erro ao listar áudios', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Erro interno ao buscar áudios' },
      { status: 500 }
    );
  }
}

// =============================================================================
// DELETE Handler - Delete Audio
// =============================================================================

export async function DELETE(request: NextRequest) {
  try {
    // 1. Auth check
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Autenticação necessária' },
        { status: 401 }
      );
    }
    
    // 2. Get audio ID from query
    const { searchParams } = new URL(request.url);
    const audioId = searchParams.get('id');
    
    if (!audioId) {
      return NextResponse.json(
        { error: 'ID do áudio é obrigatório' },
        { status: 400 }
      );
    }
    
    // 3. Delete audio
    await deleteAudio(audioId, user.id);
    
    logger.info('Áudio removido', { audioId, userId: user.id });
    
    return NextResponse.json({
      success: true,
      message: 'Áudio removido com sucesso',
    });
    
  } catch (error) {
    logger.error('Erro ao remover áudio', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Erro interno ao remover áudio' },
      { status: 500 }
    );
  }
}

// =============================================================================
// OPTIONS Handler - Info
// =============================================================================

export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({
    service: 'Custom Audio Upload',
    version: '1.0.0',
    description: 'Upload de áudio customizado (narração própria)',
    allowedTypes: [
      'audio/mpeg (MP3)',
      'audio/wav (WAV)',
      'audio/ogg (OGG)',
      'audio/webm (WebM)',
      'audio/aac (AAC)',
      'audio/flac (FLAC)',
    ],
    maxFileSize: '50MB',
    maxDuration: '30 minutos',
    purposes: [
      { id: 'narration', name: 'Narração', description: 'Narração principal do slide' },
      { id: 'background', name: 'Música de Fundo', description: 'Música de background' },
      { id: 'sound-effect', name: 'Efeito Sonoro', description: 'Efeitos sonoros pontuais' },
      { id: 'intro', name: 'Introdução', description: 'Áudio de abertura' },
      { id: 'outro', name: 'Encerramento', description: 'Áudio de fechamento' },
    ],
    recommendations: [
      'Use formato MP3 ou WAV para melhor compatibilidade',
      'Taxa de amostragem recomendada: 44100Hz',
      'Grave em ambiente silencioso para melhor qualidade',
      'Normalize o áudio para volume consistente',
    ],
  });
}
