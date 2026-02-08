import { logger } from '@/lib/logger';
/**
 * E2E Test Helpers for PPTX-to-Video Pipeline
 *
 * Utilities for uploading PPTX, polling render jobs, validating database records,
 * and detecting placeholder/mock responses.
 */

import { APIRequestContext, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Placeholder detection patterns
const PLACEHOLDER_PATTERNS = [
  /fake/i,
  /placeholder/i,
  /mock/i,
  /example/i,
  /test\.mp4$/,
  /dummy/i,
  /lorem/i,
];

/**
 * Detect if a path or value contains placeholder/mock data
 */
export function isPlaceholderPath(value: string | null | undefined): boolean {
  if (!value) return true; // null/undefined is suspicious
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(value));
}

/**
 * Upload PPTX file via API
 */
export async function uploadPPTX(
  request: APIRequestContext,
  filePath: string,
  fileName: string = 'test-presentation.pptx',
): Promise<{
  success: boolean;
  processingId: string;
  slideCount: number;
  response: any;
}> {
  const fs = await import('fs');
  const path = await import('path');

  const fileBuffer = fs.readFileSync(filePath);
  const formData = new FormData();
  const blob = new Blob([fileBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  });
  formData.append('file', blob, fileName);

  const response = await request.post('/api/v1/pptx/upload', {
    multipart: {
      file: {
        name: fileName,
        mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        buffer: fileBuffer,
      },
    },
  });

  expect(response.status()).toBe(200);
  const data = await response.json();

  expect(data.success).toBe(true);
  expect(data.data?.processingId).toBeTruthy();
  expect(isPlaceholderPath(data.data?.processingId)).toBe(false);

  return {
    success: data.success,
    processingId: data.data.processingId,
    slideCount: data.data.result?.slides?.length || 0,
    response: data,
  };
}

/**
 * Poll render job status with exponential backoff
 */
export async function pollRenderJob(
  request: APIRequestContext,
  jobId: string,
  maxWaitMs: number = 180000, // 3 minutes
  initialIntervalMs: number = 5000,
  userId?: string
): Promise<{
  status: string;
  outputUrl: string | null;
  error: string | null;
  job: any;
}> {
  const startTime = Date.now();
  let intervalMs = initialIntervalMs;
  let attempts = 0;

  while (Date.now() - startTime < maxWaitMs) {
    attempts++;

    const response = await request.get(`/api/render/jobs/${jobId}`, {
      headers: userId ? { 'x-user-id': userId } : {}
    });
    expect(response.status()).toBe(200);

    const data = await response.json();
    const job = data.job || data.data;

    logger.info(`[Poll ${attempts}] Job ${jobId} status: ${job.status}`);

    if (job.status === 'completed') {
      return {
        status: job.status,
        outputUrl: job.output_url || job.outputUrl,
        error: null,
        job,
      };
    }

    if (job.status === 'failed') {
      return {
        status: job.status,
        outputUrl: null,
        error: job.error_message || job.errorMessage || 'Render job failed',
        job,
      };
    }

    // Exponential backoff (max 20s interval)
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    intervalMs = Math.min(intervalMs * 1.5, 20000);
  }

  throw new Error(`Render job ${jobId} timed out after ${maxWaitMs}ms`);
}

/**
 * Validate database record exists and matches expected fields
 */
export async function validateDatabaseRecord(
  table: string,
  id: string,
  expectedFields: Record<string, any>,
): Promise<any> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { data, error } = await supabase.from(table).select('*').eq('id', id).single();

  if (error) {
    throw new Error(`Failed to fetch ${table} record ${id}: ${error.message}`);
  }

  expect(data, `Record should exist in ${table}`).toBeTruthy();

  // Validate expected fields
  for (const [field, expectedValue] of Object.entries(expectedFields)) {
    if (expectedValue !== undefined) {
      expect(data[field], `${table}.${field}`).toBe(expectedValue);
    }
  }

  return data;
}

/**
 * Validate video file exists in Supabase Storage and has size > 0
 */
export async function validateStorageFile(
  outputUrl: string,
): Promise<{ exists: boolean; size: number; path: string }> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Parse storage path from output URL
  // Expected format: https://<project>.supabase.co/storage/v1/object/public/videos/<path>
  const storagePath = parseStoragePath(outputUrl);

  logger.info(`Validating storage file: ${storagePath}`);

  // Use HEAD request to check existence and get Content-Length
  const { data, error } = await supabase.storage.from('videos').download(storagePath);

  if (error) {
    logger.error(`Storage validation failed: ${error.message}`);
    return { exists: false, size: 0, path: storagePath };
  }

  const size = data?.size || 0;
  logger.info(`Storage file exists: ${storagePath}, size: ${size} bytes`);

  return { exists: true, size, path: storagePath };
}

/**
 * Parse storage path from output URL
 */
function parseStoragePath(outputUrl: string): string {
  // Handle various URL formats
  if (outputUrl.includes('/storage/v1/object/public/')) {
    // Format: https://project.supabase.co/storage/v1/object/public/videos/path/to/file.mp4
    const match = outputUrl.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/);
    return match ? match[1] : outputUrl;
  }

  if (outputUrl.includes('/videos/')) {
    // Format: /videos/path/to/file.mp4
    const match = outputUrl.match(/\/videos\/(.+)$/);
    return match ? match[1] : outputUrl;
  }

  // Assume it's already a path
  return outputUrl.replace(/^\//, '');
}

/**
 * Cleanup test database records
 */
export async function cleanupTestData(
  uploadId?: string,
  jobId?: string,
  projectId?: string,
  avatarId?: string
): Promise<void> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    if (uploadId) {
      // Delete slides first (foreign key dependency)
      await supabase.from('pptx_slides').delete().eq('upload_id', uploadId);
      await supabase.from('pptx_uploads').delete().eq('id', uploadId);
      logger.info(`Cleaned up PPTX upload: ${uploadId}`);
    }

    if (jobId) {
      await supabase.from('render_jobs').delete().eq('id', jobId);
      logger.info(`Cleaned up render job: ${jobId}`);
    }

    if (projectId) {
      // Clean up project and related data
      await supabase.from('slides').delete().eq('project_id', projectId);
      await supabase.from('timelines').delete().eq('project_id', projectId);
      await supabase.from('projects').delete().eq('id', projectId);
      logger.info(`Cleaned up project: ${projectId}`);
    }

    if (avatarId) {
        await supabase.from('avatar_models').delete().eq('id', avatarId);
        logger.info(`Cleaned up avatar: ${avatarId}`);
    }
  } catch (error) {
    logger.error('Cleanup error (non-fatal):', error);
  }
}

/**
 * Get slide count from database for a PPTX upload
 */
export async function getSlideCount(uploadId: string): Promise<number> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { count, error } = await supabase
    .from('pptx_slides')
    .select('*', { count: 'exact', head: true })
    .eq('upload_id', uploadId);

  if (error) {
    throw new Error(`Failed to count slides for upload ${uploadId}: ${error.message}`);
  }

  return count || 0;
}

/**
 * Get a valid user ID from public.users (linked to auth.users)
 */
export async function getValidUserId(): Promise<string> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  
  // List users from public table
  const { data: users, error } = await supabase.from('users').select('id').limit(1);
  
  if (error) {
    throw new Error(`Failed to list users from public.users: ${error.message}`);
  }
  
  if (!users || users.length === 0) {
     // If no users in public table, we can't easily creating one without auth admin which failed.
     // Fallback to a known ID if available or throw clear error
    throw new Error('No users found in public.users table. Cannot run real pipeline test without a seed user.');
  }
  
  return users[0].id;
}

/**
 * Create a test project in the database
 */
export async function createTestProject(userId: string, projectId: string): Promise<void> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  
  const { error } = await supabase.from('projects').insert({
    id: projectId,
    user_id: userId,
    name: 'E2E Test Project',
    type: 'pptx',
    status: 'draft',
    metadata: {}
  });
  
  if (error) {
    throw new Error(`Failed to create test project: ${error.message}`);
  }
  logger.info(`Created test project: ${projectId} for user ${userId}`);
}

/**
 * Create a test avatar in the database
 */
export async function createTestAvatar(avatarId: string, userId?: string): Promise<void> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  
  const { error } = await supabase.from('avatar_models').insert({
    id: avatarId,
    name: 'Test Avatar',
    display_name: 'Test Avatar', // match schema inference
    category: 'ai', // This might fail if 'category' column doesn't exist in SQL. SQL has 'avatar_type'.
    // SQL Schema: name, display_name, avatar_type, gender, model_file_url
    avatar_type: 'realistic',
    gender: 'neutral',
    model_file_url: 'https://example.com/model.glb',
    is_active: true,
    created_by: userId // optional ref
  });
  
  if (error) {
       logger.error(`Failed to create test avatar (attempt 1): ${error.message}`);
       
       // Fallback or retry with different structure if needed, but SQL seems clear.
       // Note: 'category' was in my previous guess but SQL has 'avatar_type'.
       // SQL does NOT have 'category' column. Remove it.
       // SQL DOES have 'is_active'.
       
       const { error: error2 } = await supabase.from('avatar_models').insert({
        id: avatarId,
        name: 'Test Avatar',
        display_name: 'Test Avatar',
        avatar_type: 'realistic',
        gender: 'neutral',
        model_file_url: 'https://example.com/model.glb',
        is_active: true
       });
       
       if (error2) {
           throw new Error(`Failed to create test avatar: ${error2.message}`);
       }
  }
  logger.info(`Created test avatar: ${avatarId}`);
}
