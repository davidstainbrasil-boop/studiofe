/**
 * Serviço de Storage Local
 * MVP Video TécnicoCursos v7
 * 
 * Gerenciamento de arquivos usando sistema de arquivos local.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { insert, query, queryOne, queryAll } from './index';
import { logger } from '@/lib/logger';

// ============================================
// CONFIGURAÇÃO
// ============================================

const STORAGE_BASE_PATH = process.env.STORAGE_PATH || '/root/_MVP_Video_TecnicoCursos_v7/storage';

const BUCKETS = {
  uploads: 'uploads',
  videos: 'videos',
  audio: 'audio',
  avatars: 'avatars',
  thumbnails: 'thumbnails',
  assets: 'assets',
  temp: 'temp',
} as const;

type BucketName = keyof typeof BUCKETS;

// ============================================
// TIPOS
// ============================================

export interface StorageFile {
  id: string;
  userId: string;
  bucket: string;
  file_path: string;
  original_name: string;
  mime_type: string | null;
  fileSize: number;
  checksum: string | null;
  metadata: Record<string, unknown>;
  is_public: boolean;
  download_count: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UploadResult {
  success: boolean;
  file?: StorageFile;
  url?: string;
  error?: string;
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

/**
 * Garante que o diretório existe
 */
async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

/**
 * Gera checksum do arquivo
 */
async function generateChecksum(filePath: string): Promise<string> {
  const content = await fs.readFile(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Gera nome único para arquivo
 */
function generateUniqueFilename(originalName: string): string {
  const ext = path.extname(originalName);
  const name = path.basename(originalName, ext);
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString('hex');
  return `${name}-${timestamp}-${random}${ext}`;
}

/**
 * Obtém caminho completo do bucket
 */
function getBucketPath(bucket: BucketName): string {
  return path.join(STORAGE_BASE_PATH, BUCKETS[bucket]);
}

/**
 * Obtém caminho completo do arquivo
 */
function getFilePath(bucket: BucketName, filePath: string): string {
  return path.join(getBucketPath(bucket), filePath);
}

/**
 * Detecta MIME type
 */
function detectMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.avi': 'video/x-msvideo',
    '.mov': 'video/quicktime',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.json': 'application/json',
    '.txt': 'text/plain',
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

// ============================================
// OPERAÇÕES DE STORAGE
// ============================================

/**
 * Inicializa diretórios de storage
 */
export async function initStorage(): Promise<void> {
  for (const bucket of Object.values(BUCKETS)) {
    await ensureDir(path.join(STORAGE_BASE_PATH, bucket));
  }
  logger.info('[Storage] Diretórios inicializados');
}

/**
 * Upload de arquivo
 */
export async function uploadFile(
  userId: string,
  bucket: BucketName,
  file: Buffer | string,
  originalName: string,
  options?: {
    subPath?: string;
    isPublic?: boolean;
    metadata?: Record<string, unknown>;
  }
): Promise<UploadResult> {
  try {
    // Gerar nome único
    const uniqueName = generateUniqueFilename(originalName);
    
    // Construir caminho
    const relativePath = options?.subPath
      ? path.join(options.subPath, uniqueName)
      : uniqueName;
    
    const fullPath = getFilePath(bucket, relativePath);
    
    // Garantir diretório
    await ensureDir(path.dirname(fullPath));
    
    // Escrever arquivo
    const content = typeof file === 'string' ? Buffer.from(file) : file;
    await fs.writeFile(fullPath, content);
    
    // Obter informações do arquivo
    const stats = await fs.stat(fullPath);
    const checksum = await generateChecksum(fullPath);
    const mimeType = detectMimeType(originalName);
    
    // Salvar no banco de dados
    const storageFile = await insert<StorageFile>('storage_files', {
      userId: userId,
      bucket,
      file_path: relativePath,
      original_name: originalName,
      mime_type: mimeType,
      fileSize: stats.size,
      checksum,
      metadata: JSON.stringify(options?.metadata || {}),
      is_public: options?.isPublic || false,
    });
    
    // Gerar URL
    const url = getFileUrl(bucket, relativePath, options?.isPublic);
    
    return { success: true, file: storageFile, url };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed';
    logger.error('[Storage] Erro no upload:', message instanceof Error ? message : new Error(String(message)));
    return { success: false, error: message };
  }
}

/**
 * Upload de arquivo a partir de caminho local
 */
export async function uploadFromPath(
  userId: string,
  bucket: BucketName,
  sourcePath: string,
  options?: {
    subPath?: string;
    isPublic?: boolean;
    metadata?: Record<string, unknown>;
  }
): Promise<UploadResult> {
  try {
    const content = await fs.readFile(sourcePath);
    const originalName = path.basename(sourcePath);
    return uploadFile(userId, bucket, content, originalName, options);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'File read failed';
    return { success: false, error: message };
  }
}

/**
 * Download de arquivo
 */
export async function downloadFile(
  bucket: BucketName,
  filePath: string
): Promise<Buffer | null> {
  try {
    const fullPath = getFilePath(bucket, filePath);
    const content = await fs.readFile(fullPath);
    
    // Incrementar contador de downloads
    await query(
      'UPDATE storage_files SET download_count = download_count + 1 WHERE bucket = $1 AND file_path = $2',
      [bucket, filePath]
    );
    
    return content;
  } catch (error) {
    logger.error('[Storage] Erro no download:', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

/**
 * Obtém informações do arquivo
 */
export async function getFileInfo(
  bucket: BucketName,
  filePath: string
): Promise<StorageFile | null> {
  return queryOne<StorageFile>(
    'SELECT * FROM storage_files WHERE bucket = $1 AND file_path = $2',
    [bucket, filePath]
  );
}

/**
 * Obtém URL do arquivo
 */
export function getFileUrl(
  bucket: BucketName,
  filePath: string,
  isPublic?: boolean
): string {
  const basePath = isPublic ? '/api/storage/public' : '/api/storage';
  return `${basePath}/${bucket}/${filePath}`;
}

/**
 * Deleta arquivo
 */
export async function deleteFile(
  bucket: BucketName,
  filePath: string
): Promise<boolean> {
  try {
    const fullPath = getFilePath(bucket, filePath);
    await fs.unlink(fullPath);
    
    await query(
      'DELETE FROM storage_files WHERE bucket = $1 AND file_path = $2',
      [bucket, filePath]
    );
    
    return true;
  } catch (error) {
    logger.error('[Storage] Erro ao deletar:', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

/**
 * Lista arquivos de um bucket
 */
export async function listFiles(
  bucket: BucketName,
  options?: {
    userId?: string;
    subPath?: string;
    limit?: number;
    offset?: number;
  }
): Promise<StorageFile[]> {
  let sql = 'SELECT * FROM storage_files WHERE bucket = $1';
  const params: (string | number)[] = [bucket];
  let paramIndex = 2;
  
  if (options?.userId) {
    sql += ` AND user_id = $${paramIndex++}`;
    params.push(options.userId);
  }
  
  if (options?.subPath) {
    sql += ` AND file_path LIKE $${paramIndex++}`;
    params.push(`${options.subPath}%`);
  }
  
  sql += ' ORDER BY created_at DESC';
  
  if (options?.limit) {
    sql += ` LIMIT ${options.limit}`;
  }
  
  if (options?.offset) {
    sql += ` OFFSET ${options.offset}`;
  }
  
  return queryAll<StorageFile>(sql, params);
}

/**
 * Move arquivo entre buckets
 */
export async function moveFile(
  sourceBucket: BucketName,
  sourceFilePath: string,
  destBucket: BucketName,
  destFilePath?: string
): Promise<boolean> {
  try {
    const sourceFullPath = getFilePath(sourceBucket, sourceFilePath);
    const destPath = destFilePath || path.basename(sourceFilePath);
    const destFullPath = getFilePath(destBucket, destPath);
    
    await ensureDir(path.dirname(destFullPath));
    await fs.rename(sourceFullPath, destFullPath);
    
    await query(
      'UPDATE storage_files SET bucket = $1, file_path = $2, updated_at = NOW() WHERE bucket = $3 AND file_path = $4',
      [destBucket, destPath, sourceBucket, sourceFilePath]
    );
    
    return true;
  } catch (error) {
    logger.error('[Storage] Erro ao mover arquivo:', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

/**
 * Copia arquivo
 */
export async function copyFile(
  sourceBucket: BucketName,
  sourceFilePath: string,
  destBucket: BucketName,
  destFilePath?: string,
  userId?: string
): Promise<UploadResult> {
  try {
    const content = await downloadFile(sourceBucket, sourceFilePath);
    if (!content) {
      return { success: false, error: 'Arquivo não encontrado' };
    }
    
    const sourceInfo = await getFileInfo(sourceBucket, sourceFilePath);
    if (!sourceInfo) {
      return { success: false, error: 'Informações do arquivo não encontradas' };
    }
    
    return uploadFile(
      userId || sourceInfo.userId,
      destBucket,
      content,
      destFilePath || sourceInfo.original_name,
      {
        metadata: sourceInfo.metadata,
        isPublic: sourceInfo.is_public,
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Copy failed';
    return { success: false, error: message };
  }
}

/**
 * Limpa arquivos temporários antigos
 */
export async function cleanupTempFiles(olderThanHours: number = 24): Promise<number> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - olderThanHours);
    
    const oldFiles = await queryAll<StorageFile>(
      'SELECT * FROM storage_files WHERE bucket = $1 AND created_at < $2',
      ['temp', cutoffDate]
    );
    
    let deleted = 0;
    for (const file of oldFiles) {
      if (await deleteFile('temp', file.file_path)) {
        deleted++;
      }
    }
    
    return deleted;
  } catch (error) {
    logger.error('[Storage] Erro ao limpar temp:', error instanceof Error ? error : new Error(String(error)));
    return 0;
  }
}

/**
 * Obtém estatísticas de uso
 */
export async function getStorageStats(userId?: string): Promise<{
  totalFiles: number;
  totalSize: number;
  byBucket: Record<string, { files: number; size: number }>;
}> {
  let sql = `
    SELECT 
      bucket,
      COUNT(*) as files,
      COALESCE(SUM(file_size), 0) as size
    FROM storage_files
  `;
  const params: string[] = [];
  
  if (userId) {
    sql += ' WHERE user_id = $1';
    params.push(userId);
  }
  
  sql += ' GROUP BY bucket';
  
  const rows = await queryAll<{ bucket: string; files: string; size: string }>(sql, params);
  
  const byBucket: Record<string, { files: number; size: number }> = {};
  let totalFiles = 0;
  let totalSize = 0;
  
  for (const row of rows) {
    const files = parseInt(row.files, 10);
    const size = parseInt(row.size, 10);
    byBucket[row.bucket] = { files, size };
    totalFiles += files;
    totalSize += size;
  }
  
  return { totalFiles, totalSize, byBucket };
}

// ============================================
// INICIALIZAÇÃO
// ============================================

// Inicializar diretórios ao carregar módulo
initStorage().catch((err: unknown) => logger.error('Storage initialization failed', err instanceof Error ? err : new Error(String(err))));

// ============================================
// EXPORT
// ============================================

export default {
  initStorage,
  uploadFile,
  uploadFromPath,
  downloadFile,
  getFileInfo,
  getFileUrl,
  deleteFile,
  listFiles,
  moveFile,
  copyFile,
  cleanupTempFiles,
  getStorageStats,
  BUCKETS,
  getBucketPath,
  getFilePath,
};

