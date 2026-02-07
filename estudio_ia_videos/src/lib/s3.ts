/**
 * Storage Client
 * Abstração de upload sobre Supabase Storage.
 * Substitui antigo S3 placeholder por integração real.
 */

import { logger } from '@lib/logger';
import { supabaseAdmin } from '@lib/supabase/server';

export interface S3UploadOptions {
  bucket: string;
  key: string;
  body: Buffer | string;
  contentType?: string;
  acl?: 'private' | 'public-read';
}

export class S3Client {
  async upload(options: S3UploadOptions): Promise<string> {
    const { bucket, key, body, contentType } = options;
    logger.info('Uploading to storage', { bucket, key, component: 'Storage' });

    try {
      const buffer = typeof body === 'string' ? Buffer.from(body) : body;
      const { error } = await supabaseAdmin
        .storage
        .from(bucket)
        .upload(key, buffer, {
          contentType: contentType || 'application/octet-stream',
          upsert: true,
        });

      if (error) {
        logger.error('Storage upload failed', { error: error.message, bucket, key });
        throw new Error(`Storage upload failed: ${error.message}`);
      }

      const { data: urlData } = supabaseAdmin
        .storage
        .from(bucket)
        .getPublicUrl(key);

      return urlData.publicUrl;
    } catch (err) {
      logger.error('Storage upload error', { error: err, bucket, key });
      throw err;
    }
  }

  async download(bucket: string, key: string): Promise<Buffer> {
    logger.info('Downloading from storage', { bucket, key, component: 'Storage' });

    try {
      const { data, error } = await supabaseAdmin
        .storage
        .from(bucket)
        .download(key);

      if (error || !data) {
        logger.error('Storage download failed', { error: error?.message, bucket, key });
        return Buffer.from('');
      }

      const arrayBuffer = await data.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (err) {
      logger.error('Storage download error', { error: err, bucket, key });
      return Buffer.from('');
    }
  }

  async delete(bucket: string, key: string): Promise<boolean> {
    logger.info('Deleting from storage', { bucket, key, component: 'Storage' });

    try {
      const { error } = await supabaseAdmin
        .storage
        .from(bucket)
        .remove([key]);

      if (error) {
        logger.error('Storage delete failed', { error: error.message, bucket, key });
        return false;
      }
      return true;
    } catch (err) {
      logger.error('Storage delete error', { error: err, bucket, key });
      return false;
    }
  }

  async exists(bucket: string, key: string): Promise<boolean> {
    try {
      const { data } = await supabaseAdmin
        .storage
        .from(bucket)
        .list(key.split('/').slice(0, -1).join('/'), {
          search: key.split('/').pop(),
        });
      return (data?.length ?? 0) > 0;
    } catch {
      return false;
    }
  }
}

export const s3Client = new S3Client();

export async function uploadFile(bucket: string, key: string, body: Buffer | string, contentType?: string): Promise<string> {
  return s3Client.upload({ bucket, key, body, contentType });
}
