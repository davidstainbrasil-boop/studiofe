/**
 * 🎤 Custom Audio Upload Handler
 * 
 * Sistema para upload de áudio próprio (narração customizada)
 * Substitui ou complementa o TTS gerado automaticamente
 */

import { Logger } from '@lib/logger';
import { createClient } from '@lib/supabase/server';

const logger = new Logger('custom-audio');

// =============================================================================
// Types
// =============================================================================

export interface AudioUploadOptions {
  projectId: string;
  slideId?: string;
  userId: string;
  audioBlob: Blob;
  filename: string;
  purpose: AudioPurpose;
  metadata?: AudioMetadata;
}

export type AudioPurpose = 
  | 'narration'      // Narração principal do slide
  | 'background'     // Música de fundo
  | 'sound-effect'   // Efeito sonoro
  | 'intro'          // Áudio de introdução
  | 'outro';         // Áudio de encerramento

export interface AudioMetadata {
  duration?: number;
  sampleRate?: number;
  channels?: number;
  bitrate?: number;
  format?: string;
  transcription?: string;
  language?: string;
}

export interface AudioFile {
  id: string;
  projectId: string;
  slideId?: string;
  userId: string;
  filename: string;
  originalFilename: string;
  purpose: AudioPurpose;
  url: string;
  duration: number;
  fileSize: number;
  mimeType: string;
  metadata: AudioMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export interface AudioValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  metadata?: AudioMetadata;
}

// Database record type (for tables not in schema)
interface ProjectAudioRecord {
  id: string;
  project_id: string;
  slide_id: string | null;
  user_id: string;
  filename: string;
  original_filename: string;
  purpose: AudioPurpose;
  url: string;
  duration: number;
  file_size: number;
  mime_type: string;
  metadata: AudioMetadata;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// Constants
// =============================================================================

const ALLOWED_AUDIO_TYPES = [
  'audio/mpeg',      // MP3
  'audio/mp3',
  'audio/wav',       // WAV
  'audio/wave',
  'audio/x-wav',
  'audio/ogg',       // OGG
  'audio/webm',      // WebM Audio
  'audio/aac',       // AAC
  'audio/m4a',       // M4A
  'audio/x-m4a',
  'audio/flac',      // FLAC
];

const MAX_AUDIO_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_AUDIO_DURATION = 30 * 60; // 30 minutes
const MIN_SAMPLE_RATE = 22050;
const RECOMMENDED_SAMPLE_RATE = 44100;

// =============================================================================
// Audio Validator
// =============================================================================

export async function validateAudioFile(
  file: File | Blob,
  options?: { maxSize?: number; maxDuration?: number }
): Promise<AudioValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const maxSize = options?.maxSize || MAX_AUDIO_SIZE;
  const maxDuration = options?.maxDuration || MAX_AUDIO_DURATION;

  // Check file size
  if (file.size > maxSize) {
    errors.push(`Arquivo muito grande. Máximo permitido: ${formatFileSize(maxSize)}`);
  }

  // Check MIME type
  const mimeType = file.type;
  if (!ALLOWED_AUDIO_TYPES.includes(mimeType)) {
    errors.push(`Formato não suportado: ${mimeType}. Use MP3, WAV, OGG, AAC ou FLAC.`);
  }

  // Try to extract metadata using Web Audio API
  let metadata: AudioMetadata | undefined;
  
  try {
    metadata = await extractAudioMetadata(file);
    
    if (metadata.duration && metadata.duration > maxDuration) {
      errors.push(`Áudio muito longo. Máximo: ${Math.floor(maxDuration / 60)} minutos.`);
    }

    if (metadata.sampleRate && metadata.sampleRate < MIN_SAMPLE_RATE) {
      warnings.push(`Taxa de amostragem baixa (${metadata.sampleRate}Hz). Recomendado: ${RECOMMENDED_SAMPLE_RATE}Hz.`);
    }

    if (metadata.channels && metadata.channels > 2) {
      warnings.push('Áudio com mais de 2 canais será convertido para estéreo.');
    }
  } catch (error) {
    warnings.push('Não foi possível extrair metadados do áudio. O arquivo será processado normalmente.');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    metadata,
  };
}

/**
 * Extract audio metadata using Web Audio API
 */
async function extractAudioMetadata(file: File | Blob): Promise<AudioMetadata> {
  return new Promise((resolve, reject) => {
    // Browser environment check
    if (typeof window === 'undefined' || !window.AudioContext) {
      // Server-side fallback - return minimal metadata
      resolve({
        format: file.type.split('/')[1],
      });
      return;
    }

    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        resolve({
          duration: audioBuffer.duration,
          sampleRate: audioBuffer.sampleRate,
          channels: audioBuffer.numberOfChannels,
          format: file.type.split('/')[1],
        });
      } catch (error) {
        reject(error);
      } finally {
        audioContext.close();
      }
    };

    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

// =============================================================================
// Audio Uploader
// =============================================================================

export async function uploadCustomAudio(
  options: AudioUploadOptions
): Promise<AudioFile> {
  const { projectId, slideId, userId, audioBlob, filename, purpose, metadata } = options;

  logger.info('Iniciando upload de áudio customizado', {
    projectId,
    slideId,
    purpose,
    filename,
    size: audioBlob.size,
  });

  const supabase = await createClient();

  // Generate unique filename
  const timestamp = Date.now();
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  const storagePath = `audio/${userId}/${projectId}/${timestamp}_${sanitizedFilename}`;

  // Upload to Supabase Storage
  const { data: uploadData, error: uploadError } = await supabase
    .storage
    .from('project-assets')
    .upload(storagePath, audioBlob, {
      contentType: audioBlob.type,
      upsert: false,
    });

  if (uploadError) {
    logger.error('Erro no upload de áudio', uploadError);
    throw new Error(`Falha no upload: ${uploadError.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase
    .storage
    .from('project-assets')
    .getPublicUrl(storagePath);

  // Create database record (table may not exist in schema types)
  const audioRecord = {
    project_id: projectId,
    slide_id: slideId,
    user_id: userId,
    filename: storagePath,
    original_filename: filename,
    purpose,
    url: urlData.publicUrl,
    duration: metadata?.duration || 0,
    file_size: audioBlob.size,
    mime_type: audioBlob.type,
    metadata: metadata || {},
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: dbData, error: dbError } = await (supabase as any)
    .from('project_audio')
    .insert(audioRecord)
    .select()
    .single() as { data: ProjectAudioRecord | null; error: Error | null };

  if (dbError || !dbData) {
    // Rollback storage upload
    await supabase.storage.from('project-assets').remove([storagePath]);
    logger.error('Erro ao salvar registro de áudio', dbError ?? undefined);
    throw new Error(`Falha ao salvar registro: ${dbError?.message || 'Dados não retornados'}`);
  }

  logger.info('Áudio customizado enviado com sucesso', {
    audioId: dbData.id,
    projectId,
    purpose,
  });

  return {
    id: dbData.id,
    projectId: dbData.project_id,
    slideId: dbData.slide_id || undefined,
    userId: dbData.user_id,
    filename: dbData.filename,
    originalFilename: dbData.original_filename,
    purpose: dbData.purpose,
    url: dbData.url,
    duration: dbData.duration,
    fileSize: dbData.file_size,
    mimeType: dbData.mime_type,
    metadata: dbData.metadata,
    createdAt: new Date(dbData.created_at),
    updatedAt: new Date(dbData.updated_at),
  };
}

// =============================================================================
// Audio Manager
// =============================================================================

export async function getProjectAudio(
  projectId: string,
  userId: string
): Promise<AudioFile[]> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('project_audio')
    .select('*')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false }) as { data: ProjectAudioRecord[] | null; error: Error | null };

  if (error) {
    logger.error('Erro ao buscar áudios do projeto', error);
    throw new Error(`Falha ao buscar áudios: ${error.message}`);
  }

  if (!data) return [];

  return data.map(record => ({
    id: record.id,
    projectId: record.project_id,
    slideId: record.slide_id || undefined,
    userId: record.user_id,
    filename: record.filename,
    originalFilename: record.original_filename,
    purpose: record.purpose,
    url: record.url,
    duration: record.duration,
    fileSize: record.file_size,
    mimeType: record.mime_type,
    metadata: record.metadata,
    createdAt: new Date(record.created_at),
    updatedAt: new Date(record.updated_at),
  }));
}

export async function getSlideAudio(
  projectId: string,
  slideId: string,
  userId: string
): Promise<AudioFile[]> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('project_audio')
    .select('*')
    .eq('project_id', projectId)
    .eq('slide_id', slideId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false }) as { data: ProjectAudioRecord[] | null; error: Error | null };

  if (error) {
    logger.error('Erro ao buscar áudios do slide', error);
    throw new Error(`Falha ao buscar áudios: ${error.message}`);
  }

  if (!data) return [];

  return data.map(record => ({
    id: record.id,
    projectId: record.project_id,
    slideId: record.slide_id || undefined,
    userId: record.user_id,
    filename: record.filename,
    originalFilename: record.original_filename,
    purpose: record.purpose,
    url: record.url,
    duration: record.duration,
    fileSize: record.file_size,
    mimeType: record.mime_type,
    metadata: record.metadata,
    createdAt: new Date(record.created_at),
    updatedAt: new Date(record.updated_at),
  }));
}

export async function deleteAudio(
  audioId: string,
  userId: string
): Promise<void> {
  const supabase = await createClient();

  // Get audio record (table may not exist in schema types)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: audio, error: fetchError } = await (supabase as any)
    .from('project_audio')
    .select('*')
    .eq('id', audioId)
    .eq('user_id', userId)
    .single() as { data: ProjectAudioRecord | null; error: Error | null };

  if (fetchError || !audio) {
    throw new Error('Áudio não encontrado ou sem permissão');
  }

  // Delete from storage
  const { error: storageError } = await supabase
    .storage
    .from('project-assets')
    .remove([audio.filename]);

  if (storageError) {
    logger.warn('Erro ao remover arquivo de áudio do storage', { error: storageError.message });
  }

  // Delete database record
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: dbError } = await (supabase as any)
    .from('project_audio')
    .delete()
    .eq('id', audioId)
    .eq('user_id', userId) as { error: Error | null };

  if (dbError) {
    throw new Error(`Falha ao remover registro: ${dbError.message}`);
  }

  logger.info('Áudio removido com sucesso', { audioId });
}

// =============================================================================
// Helper Functions
// =============================================================================

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getPurposeDisplayName(purpose: AudioPurpose): string {
  const names: Record<AudioPurpose, string> = {
    narration: 'Narração',
    background: 'Música de Fundo',
    'sound-effect': 'Efeito Sonoro',
    intro: 'Introdução',
    outro: 'Encerramento',
  };
  return names[purpose];
}

// =============================================================================
// Exports
// =============================================================================

export default {
  validateAudioFile,
  uploadCustomAudio,
  getProjectAudio,
  getSlideAudio,
  deleteAudio,
  getPurposeDisplayName,
};
