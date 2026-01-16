/**
 * 🗑️ Storage Garbage Collection
 * Cleans up orphaned files from Supabase Storage
 */

import { createClient } from '@supabase/supabase-js';
import { prisma } from '@lib/prisma';
import { logger } from '@lib/logger';
import { getRequiredEnv } from '@lib/env';

interface GCResult {
  scannedFiles: number;
  orphanedFiles: string[];
  deletedFiles: string[];
  reclaimedBytes: number;
  errors: string[];
}

interface GCOptions {
  dryRun?: boolean;
  minAgeHours?: number;
  buckets?: string[];
}

const DEFAULT_BUCKETS = ['assets', 'videos', 'audio', 'pptx-uploads', 'thumbnails'];
const DEFAULT_MIN_AGE_HOURS = 24; // Only delete files older than 24 hours

/**
 * Run garbage collection on storage
 */
export async function runStorageGC(options: GCOptions = {}): Promise<GCResult> {
  const {
    dryRun = true,
    minAgeHours = DEFAULT_MIN_AGE_HOURS,
    buckets = DEFAULT_BUCKETS
  } = options;

  const supabaseUrl = getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL');
  const supabaseKey = getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY');
  const supabase = createClient(supabaseUrl, supabaseKey);

  const result: GCResult = {
    scannedFiles: 0,
    orphanedFiles: [],
    deletedFiles: [],
    reclaimedBytes: 0,
    errors: []
  };

  try {
    // Collect all referenced asset URLs from the database
    const referencedUrls = await collectReferencedUrls();
    const referencedPaths = new Set(
      referencedUrls.map(url => extractStoragePath(url)).filter(Boolean)
    );

    logger.info(`Found ${referencedPaths.size} referenced assets in database`, {
      component: 'StorageGC'
    });

    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - minAgeHours);

    // Scan each bucket
    for (const bucket of buckets) {
      try {
        const { data: files, error } = await supabase.storage
          .from(bucket)
          .list('', { limit: 1000 });

        if (error) {
          result.errors.push(`Bucket ${bucket}: ${error.message}`);
          continue;
        }

        if (!files) continue;

        for (const file of files) {
          result.scannedFiles++;
          const filePath = `${bucket}/${file.name}`;
          
          // Check if file is referenced
          const isReferenced = referencedPaths.has(filePath) || 
            Array.from(referencedPaths).some(p => p?.includes(file.name));

          if (isReferenced) {
            continue; // File is still in use
          }

          // Check file age
          const fileDate = new Date(file.created_at || file.updated_at || 0);
          if (fileDate > cutoffDate) {
            continue; // File is too recent
          }

          result.orphanedFiles.push(filePath);

          if (!dryRun) {
            const { error: deleteError } = await supabase.storage
              .from(bucket)
              .remove([file.name]);

            if (deleteError) {
              result.errors.push(`Delete ${filePath}: ${deleteError.message}`);
            } else {
              result.deletedFiles.push(filePath);
              result.reclaimedBytes += file.metadata?.size || 0;
            }
          }
        }
      } catch (bucketError) {
        result.errors.push(`Bucket ${bucket}: ${bucketError}`);
      }
    }

    logger.info(`Storage GC complete`, {
      component: 'StorageGC',
      dryRun,
      scanned: result.scannedFiles,
      orphaned: result.orphanedFiles.length,
      deleted: result.deletedFiles.length,
      reclaimed: result.reclaimedBytes
    });

    return result;
  } catch (error) {
    logger.error('Storage GC failed', error instanceof Error ? error : new Error(String(error)), {
      component: 'StorageGC'
    });
    result.errors.push(String(error));
    return result;
  }
}

/**
 * Collect all asset URLs referenced in the database
 */
async function collectReferencedUrls(): Promise<string[]> {
  const urls: string[] = [];

  // Projects - thumbnails and preview URLs
  const projects = await prisma.projects.findMany({
    select: { thumbnailUrl: true, previewUrl: true }
  });
  for (const p of projects) {
    if (p.thumbnailUrl) urls.push(p.thumbnailUrl);
    if (p.previewUrl) urls.push(p.previewUrl);
  }

  // Render jobs - output URLs
  const jobs = await prisma.render_jobs.findMany({
    select: { outputUrl: true, thumbnailUrl: true }
  });
  for (const j of jobs) {
    if (j.outputUrl) urls.push(j.outputUrl);
    if (j.thumbnailUrl) urls.push(j.thumbnailUrl);
  }

  // PPTX uploads - check original_filename path
  const pptxUploads = await prisma.pptx_uploads.findMany({
    select: { id: true, original_filename: true }
  });
  // Note: pptx_uploads doesn't have a direct URL field, skipping

  // Media assets table if it exists
  try {
    const assets = await (prisma as any).media_assets?.findMany({
      select: { url: true, thumbnailUrl: true }
    });
    if (assets) {
      for (const a of assets) {
        if (a.url) urls.push(a.url);
        if (a.thumbnailUrl) urls.push(a.thumbnailUrl);
      }
    }
  } catch {
    // Table might not exist, ignore
  }

  // User avatars
  const users = await prisma.users.findMany({
    select: { avatarUrl: true }
  });
  for (const u of users) {
    if (u.avatarUrl) urls.push(u.avatarUrl);
  }

  return urls;
}

/**
 * Extract storage path from a full URL
 */
function extractStoragePath(url: string): string | null {
  if (!url) return null;
  
  try {
    // Handle Supabase Storage URLs
    // Format: https://xxx.supabase.co/storage/v1/object/public/bucket/path
    const match = url.match(/\/storage\/v1\/object\/(?:public|sign)\/([^?]+)/);
    if (match) {
      return match[1]; // Returns "bucket/path"
    }
    
    // Handle direct bucket URLs
    const bucketMatch = url.match(/\/(assets|videos|audio|pptx-uploads|thumbnails)\/(.+?)(?:\?|$)/);
    if (bucketMatch) {
      return `${bucketMatch[1]}/${bucketMatch[2]}`;
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Get storage usage statistics
 */
export async function getStorageStats(): Promise<{
  totalFiles: number;
  totalBytes: number;
  byBucket: Record<string, { files: number; bytes: number }>;
}> {
  const supabaseUrl = getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL');
  const supabaseKey = getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY');
  const supabase = createClient(supabaseUrl, supabaseKey);

  const stats = {
    totalFiles: 0,
    totalBytes: 0,
    byBucket: {} as Record<string, { files: number; bytes: number }>
  };

  for (const bucket of DEFAULT_BUCKETS) {
    try {
      const { data: files } = await supabase.storage.from(bucket).list('', { limit: 1000 });
      
      const bucketStats = {
        files: files?.length || 0,
        bytes: files?.reduce((sum, f) => sum + (f.metadata?.size || 0), 0) || 0
      };
      
      stats.byBucket[bucket] = bucketStats;
      stats.totalFiles += bucketStats.files;
      stats.totalBytes += bucketStats.bytes;
    } catch {
      stats.byBucket[bucket] = { files: 0, bytes: 0 };
    }
  }

  return stats;
}
