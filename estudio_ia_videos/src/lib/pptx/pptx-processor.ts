
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import { logger } from '@/lib/monitoring/logger';
import { parseOffice } from 'officeparser';

// Tipos de entrada e saída
export interface PptxProcessOptions {
  storagePath: string;
}

export interface PptxProcessResult {
  slideCount: number;
  content: any; // O AST retornado pelo officeparser
}

/**
 * Processa um arquivo .pptx armazenado no Supabase Storage para extrair seu conteúdo.
 */
export class PptxProcessor {
  private supabase: SupabaseClient<Database>;

  constructor(supabaseClient?: SupabaseClient<Database>) {
    this.supabase = supabaseClient || createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
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

    // 2. Fazer o parsing do buffer do arquivo
    const content = await this.parsePptx(fileBuffer);

    logger.info(`Arquivo PPTX processado com sucesso: ${storagePath}`);

    return {
      slideCount: content.slides.length, // Exemplo, a estrutura real do AST precisa ser verificada
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
   * Usa o officeparser para extrair o conteúdo de um buffer de arquivo .pptx.
   * @param fileBuffer - O buffer do arquivo.
   * @returns O AST (Abstract Syntax Tree) do conteúdo do arquivo.
   */
  private async parsePptx(fileBuffer: Buffer): Promise<any> {
    try {
      logger.info('Iniciando o parsing do buffer do arquivo PPTX.');
      const ast = await parseOffice(fileBuffer);
      logger.info('Parsing do PPTX concluído.');
      return ast;
    } catch (error) {
      logger.error('Erro durante o parsing do arquivo PPTX', error instanceof Error ? error : new Error(String(error)));
      throw new Error('Falha ao fazer o parsing do conteúdo do arquivo .pptx.');
    }
  }
}
