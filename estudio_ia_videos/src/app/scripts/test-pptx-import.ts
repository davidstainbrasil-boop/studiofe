// TODO: Script - DISABLED - needs complete rewrite for new PptxProcessor API
/**
 * 🧪 Script de Teste - Importação PPTX End-to-End
 * NOTE: This script is currently disabled because the PptxProcessor API changed.
 * The new API expects files to already be uploaded to Supabase Storage.
 * 
 * To test PPTX processing:
 * 1. Upload a .pptx file to Supabase Storage
 * 2. Call the PptxProcessor.process({ storagePath: 'path/to/file.pptx' })
 */

import { PptxProcessor, type PptxProcessResult } from '@/lib/pptx/pptx-processor'

async function testPPTXImport(): Promise<void> {
  console.log('⚠️ Este script precisa ser reescrito para a nova API do PptxProcessor')
  console.log('')
  console.log('A nova API espera que os arquivos já estejam no Supabase Storage.')
  console.log('Uso: processor.process({ storagePath: "pptx/uploads/arquivo.pptx" })')
  console.log('')
  console.log('Para testar, use a rota da API: POST /api/pptx/upload')
  
  // Example of how to use the new API (requires file in storage):
  const processor = new PptxProcessor();
  
  // This would work if the file is already in storage:
  // const result: PptxProcessResult = await processor.process({
  //   storagePath: 'pptx/uploads/test.pptx',
  //   extractImages: true,
  //   extractNotes: true
  // });
  // console.log('Slides processados:', result.slideCount);
  // console.log('Conteúdo:', result.content);
}

// Executar teste
testPPTXImport().catch(console.error);
testPPTXImport()
