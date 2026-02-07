/**
 * Storage Upload Engine
 * Motor de upload via Supabase Storage (substitui placeholder S3).
 */

import { logger } from '@lib/logger';
import { supabaseAdmin } from '@lib/supabase/server';

export interface UploadOptions {
  bucket: string;
  key: string;
  buffer: Buffer;
  contentType?: string;
  metadata?: Record<string, string>;
}

export interface UploadResult {
  url: string;
  key: string;
  size: number;
  etag?: string;
}

export class S3UploadEngine {
  async upload(options: UploadOptions): Promise<UploadResult> {
    const { bucket, key, buffer, contentType = 'application/octet-stream' } = options;

    logger.info('Uploading to storage', { bucket, key, size: buffer.length, component: 'UploadEngine' });

    try {
      const { error } = await supabaseAdmin
        .storage
        .from(bucket)
        .upload(key, buffer, {
          contentType,
          upsert: true,
        });

      if (error) {
        logger.error('Upload failed', { error: error.message, bucket, key });
        throw new Error(`Upload failed: ${error.message}`);
      }

      const { data: urlData } = supabaseAdmin
        .storage
        .from(bucket)
        .getPublicUrl(key);

      return {
        url: urlData.publicUrl,
        key,
        size: buffer.length,
      };
    } catch (err) {
      logger.error('Upload engine error', { error: err, bucket, key });
      throw err;
    }
  }

  async uploadMultiple(items: UploadOptions[]): Promise<UploadResult[]> {
    return Promise.all(items.map(item => this.upload(item)));
  }

  async delete(bucket: string, key: string): Promise<boolean> {
    logger.info('Deleting from storage', { bucket, key, component: 'UploadEngine' });
    try {
      const { error } = await supabaseAdmin.storage.from(bucket).remove([key]);
      if (error) {
        logger.error('Delete failed', { error: error.message, bucket, key });
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  async exists(bucket: string, key: string): Promise<boolean> {
    try {
      const { data } = await supabaseAdmin
        .storage
        .from(bucket)
        .list(key.split('/').slice(0, -1).join('/'), { search: key.split('/').pop() });
      return (data?.length ?? 0) > 0;
    } catch {
      return false;
    }
  }
}

export const uploadEngine = new S3UploadEngine();
