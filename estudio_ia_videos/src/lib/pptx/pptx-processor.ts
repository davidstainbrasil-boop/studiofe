
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import { logger } from '@/lib/monitoring/logger';
import { getRequiredEnv } from '@lib/env';
import JSZip from 'jszip';
import { PPTXParser } from './pptx-parser';
import { PPTXTextParser } from './parsers/text-parser';
import { PPTXImageParser } from './parsers/image-parser';
import { PPTXNotesParser } from './parsers/notes-parser';
import { processAdvancedPPTX, AdvancedSlideData } from './pptx-processor-advanced';

// Tipos de entrada e saída
export interface PptxProcessOptions {
  storagePath: string;
  extractImages?: boolean;
  extractNotes?: boolean;
}

export interface PptxProcessResult {
  slideCount: number;
  content: AdvancedSlideData[];
}

/**
 * Processa um arquivo .pptx armazenado no Supabase Storage para extrair seu conteúdo.
 */
export class PptxProcessor {
  private supabase: SupabaseClient<Database>;

  constructor(supabaseClient?: SupabaseClient<Database>) {
    this.supabase = supabaseClient || createClient<Database>(
      getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
      getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY')
    );
  }

  /**
   * Orquestra o download e o parsing do arquivo .pptx.
   * @param options - Opções contendo o caminho do arquivo no storage.
   * @returns O conteúdo estruturado do arquivo.
   */
  async process(options: PptxProcessOptions): Promise<PptxProcessResult> {
    const { storagePath } = options;
    logger.info(`Iniciando processamento do arquivo PPTX: ${storagePath}`);

    // 1. Baixar o arquivo do Supabase Storage
    const fileBuffer = await this.downloadFile(storagePath);

    // 2. Fazer o parsing do buffer do arquivo usando processamento avançado
    const content = await this.parsePptx(fileBuffer, options);

    logger.info(`Arquivo PPTX processado com sucesso: ${storagePath}`);

    return {
      slideCount: content.length,
      content: content,
    };
  }

  /**
   * Baixa um arquivo do bucket 'uploads' do Supabase Storage.
   * @param storagePath - O caminho do arquivo no storage.
   * @returns Um Buffer com o conteúdo do arquivo.
   */
  private async downloadFile(storagePath: string): Promise<Buffer> {
    logger.info(`Baixando arquivo de: ${storagePath}`);
    const { data, error } = await this.supabase.storage
      .from('uploads')
      .download(storagePath);

    if (error) {
      logger.error(`Falha ao baixar o arquivo ${storagePath}`, error);
      throw new Error(`Não foi possível encontrar ou baixar o arquivo do storage: ${storagePath}`);
    }

    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * Usa o parser avançado para extrair o conteúdo de um buffer de arquivo .pptx.
   * @param fileBuffer - O buffer do arquivo.
   * @param options - Opções de extração
   * @returns Slides processados
   */
  private async parsePptx(fileBuffer: Buffer, options: PptxProcessOptions): Promise<AdvancedSlideData[]> {
    try {
      logger.info('Iniciando o parsing do buffer do arquivo PPTX.');
      
      // Use advanced processor
      const slides = await processAdvancedPPTX(fileBuffer, {
        extractImages: options.extractImages ?? true,
        extractNotes: options.extractNotes ?? true,
      });

      // Optional: Enrich further if needed
      await this.enrichSlidesWithAdvancedData(slides, fileBuffer);

      logger.info('Parsing do PPTX concluído.');
      return slides;
    } catch (error) {
      logger.error('Erro durante o parsing do arquivo PPTX', error instanceof Error ? error : new Error(String(error)));
      throw new Error('Falha ao fazer o parsing do conteúdo do arquivo .pptx.');
    }
  }

  /**
   * Função auxiliar para enriquecimento adicional (mantida para compatibilidade e extensão)
   */
  private async enrichSlidesWithAdvancedData(slides: AdvancedSlideData[], buffer: Buffer) {
    const zip = await JSZip.loadAsync(buffer);
    // Placeholder for any post-processing logic not covered by processAdvancedPPTX
    // Example: uploading images to CDN, generating specific metadata
    return slides;
  }
}

// Export parsers for reuse if needed
export { PPTXTextParser, PPTXImageParser, PPTXNotesParser };
