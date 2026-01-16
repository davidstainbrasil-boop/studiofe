
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/lib/monitoring/logger';
import { Database } from '@lib/supabase/database.types';
import { getRequiredEnv } from '@lib/env';

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB
const ALLOWED_FILE_TYPES = ['application/vnd.openxmlformats-officedocument.presentationml.presentation'];

export interface PptxUploadOptions {
  file: File;
  userId: string;
  projectId: string;
}

export interface PptxUploadResult {
  storagePath: string;
  fileName: string;
  fileSize: number;
  fileType: string;
}

import * as fs from 'fs/promises';
import * as path from 'path';

export class PptxUploader {
  private supabase: SupabaseClient<Database>;

  constructor(supabaseClient?: SupabaseClient<Database>) {
    this.supabase = supabaseClient || createClient<Database>(
      getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
      getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY')
    );
  }

  async upload(options: PptxUploadOptions): Promise<PptxUploadResult> {
    const { file, userId, projectId } = options;

    // 1. Validar arquivo
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`Tamanho do arquivo excede o limite de ${MAX_FILE_SIZE / 1024 / 1024}MB.`);
    }
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      throw new Error('Tipo de arquivo inválido. Apenas .pptx é permitido.');
    }

    // 2. Gerar caminho de armazenamento
    const timestamp = Date.now();
    const storagePath = `pptx/${userId}/${projectId}/${timestamp}-${file.name}`;

    // 3. Fazer upload
    // Use local storage if configured OR if in mock/dev mode
    const useLocalStorage = process.env.STORAGE_TYPE === 'local' || 
                           (process.env.MOCK_STORAGE === 'true' && process.env.NODE_ENV === 'development');

    if (useLocalStorage) {
      const isMock = process.env.MOCK_STORAGE === 'true';
      logger.info(isMock ? 'MOCK STORAGE: Upload simulado' : 'LOCAL STORAGE: Saving PPTX locally', { storagePath });
      
      // Persist file locally to support subsequent pipeline steps
      const fileName = `${projectId}_${timestamp}_${file.name}`;
      const targetPath = path.join(process.cwd(), 'public', 'uploads', 'pptx', fileName);
      
      await fs.mkdir(path.dirname(targetPath), { recursive: true });
      const buffer = Buffer.from(await file.arrayBuffer());
      await fs.writeFile(targetPath, buffer);
      
      return {
        storagePath: storagePath, // Keep logical path for DB consistency
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
      };
    }

    const { data, error } = await this.supabase.storage
      .from('uploads') // Bucket 'uploads' para arquivos brutos
      .upload(storagePath, file);

    if (error) {
      logger.error('Supabase PPTX upload failed', error);
      throw new Error('Falha no upload do arquivo para o storage.');
    }

    logger.info('PPTX file uploaded successfully', { storagePath });

    return {
      storagePath: data.path,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    };
  }
}
