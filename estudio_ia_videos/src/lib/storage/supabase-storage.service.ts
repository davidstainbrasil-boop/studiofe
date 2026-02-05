/**
 * 🗂️ Supabase Storage Service
 * Gerenciamento real de arquivos no Supabase Storage
 */

import { createLogger } from '@/lib/monitoring/logger';
import { createClient } from '@supabase/supabase-js';

const logger = createLogger('SupabaseStorageService');

export class SupabaseStorageService {
  private supabase;
  private buckets = {
    videos: 'videos',
    audio: 'audio',
    thumbnails: 'thumbnails',
    avatars: 'avatars'
  };

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase URL and Service Role Key are required');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Faz upload de áudio TTS
   */
  async uploadAudio(audioBuffer: Buffer, filename: string): Promise<{ url?: string; error?: string }> {
    try {
      logger.info('📤 Fazendo upload de áudio TTS', { 
        filename,
        size: `${(audioBuffer.length / 1024).toFixed(1)}KB`
      });

      const { data, error } = await this.supabase.storage
        .from(this.buckets.audio)
        .upload(filename, audioBuffer, {
          contentType: 'audio/mpeg',
          upsert: true
        });

      if (error) {
        throw error;
      }

      // Gerar URL pública
      const { data: urlData } = this.supabase.storage
        .from(this.buckets.audio)
        .getPublicUrl(filename);

      logger.info('✅ Upload de áudio concluído', { 
        filename,
        url: urlData.publicUrl
      });

      return { url: urlData.publicUrl };

    } catch (error) {
      logger.error('❌ Erro no upload de áudio', error as Error, { filename });
      return { error: error instanceof Error ? error.message : 'Erro desconhecido' };
    }
  }

  /**
   * Faz upload de vídeo renderizado
   */
  async uploadVideo(videoBuffer: Buffer, filename: string): Promise<{ url?: string; error?: string }> {
    try {
      logger.info('📤 Fazendo upload de vídeo', { 
        filename,
        size: `${(videoBuffer.length / (1024 * 1024)).toFixed(1)}MB`
      });

      const { data, error } = await this.supabase.storage
        .from(this.buckets.videos)
        .upload(filename, videoBuffer, {
          contentType: 'video/mp4',
          upsert: true
        });

      if (error) {
        throw error;
      }

      // Gerar URL pública
      const { data: urlData } = this.supabase.storage
        .from(this.buckets.videos)
        .getPublicUrl(filename);

      logger.info('✅ Upload de vídeo concluído', { 
        filename,
        url: urlData.publicUrl
      });

      return { url: urlData.publicUrl };

    } catch (error) {
      logger.error('❌ Erro no upload de vídeo', error as Error, { filename });
      return { error: error instanceof Error ? error.message : 'Erro desconhecido' };
    }
  }

  /**
   * Lista arquivos em um bucket
   */
  async listFiles(bucketName: keyof typeof this.buckets, folder?: string) {
    try {
      const { data, error } = await this.supabase.storage
        .from(this.buckets[bucketName])
        .list(folder || '');

      if (error) {
        throw error;
      }

      return data;

    } catch (error) {
      logger.error(`❌ Erro ao listar arquivos do bucket ${bucketName}`, error as Error);
      throw error;
    }
  }

  /**
   * Remove arquivo do storage
   */
  async deleteFile(bucketName: keyof typeof this.buckets, filename: string) {
    try {
      const { error } = await this.supabase.storage
        .from(this.buckets[bucketName])
        .remove([filename]);

      if (error) {
        throw error;
      }

      logger.info('🗑️ Arquivo removido', { bucketName, filename });

    } catch (error) {
      logger.error('❌ Erro ao remover arquivo', error as Error, { bucketName, filename });
      throw error;
    }
  }

  /**
   * Verifica se os buckets necessários existem
   */
  async checkBuckets(): Promise<{ status: 'ok' | 'error'; message: string }> {
    try {
      const { data: buckets, error } = await this.supabase.storage.listBuckets();

      if (error) {
        throw error;
      }

      const existingBuckets = buckets.map(b => b.name);
      const missingBuckets = Object.values(this.buckets).filter(
        bucket => !existingBuckets.includes(bucket)
      );

      if (missingBuckets.length > 0) {
        return {
          status: 'error',
          message: `Buckets ausentes: ${missingBuckets.join(', ')}`
        };
      }

      return {
        status: 'ok',
        message: `Todos os ${Object.keys(this.buckets).length} buckets estão disponíveis`
      };

    } catch (error) {
      logger.error('❌ Erro ao verificar buckets', error as Error);
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }
}