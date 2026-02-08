import { logger } from '@/lib/logger';
/**
 * 🔍 Debug Text Extraction
 * Teste específico para verificar extração de texto
 */

import PptxGenJS from 'pptxgenjs'
import JSZip from 'jszip'
import { PPTXTextParser } from '@/lib/pptx/parsers/text-parser'

async function debugTextExtraction() {
  logger.info('🔍 DEBUGANDO EXTRAÇÃO DE TEXTO')
  logger.info('=' .repeat(40))
  
  // 1. Criar PPTX simples
  logger.info('📝 Criando PPTX simples...')
  const pptx = new PptxGenJS()
  const slide = pptx.addSlide()
  
  slide.addText('Título de Teste', {
    x: 1,
    y: 1,
    w: 8,
    h: 1,
    fontSize: 24,
    bold: true
  })
  
  slide.addText('Este é o conteúdo do slide de teste.', {
    x: 1,
    y: 2.5,
    w: 8,
    h: 1,
    fontSize: 16
  })
  
  const buffer = await pptx.write({ outputType: 'nodebuffer' }) as Buffer
  logger.info(`✅ PPTX criado: ${buffer.length} bytes`)
  
  // 2. Abrir como ZIP
  logger.info('\n📦 Abrindo como ZIP...')
  const zip = new JSZip()
  await zip.loadAsync(buffer)
  
  // 3. Listar arquivos
  logger.info('\n📁 Arquivos no ZIP:')
  Object.keys(zip.files).forEach(filename => {
    logger.info(`  - ${filename}`)
  })
  
  // 4. Verificar slide1.xml
  logger.info('\n📄 Conteúdo do slide1.xml:')
  const slideFile = zip.file('ppt/slides/slide1.xml')
  if (slideFile) {
    const slideXml = await slideFile.async('text')
    logger.info('Primeiros 500 caracteres:')
    logger.info(slideXml.substring(0, 500))
    logger.info('...')
  } else {
    logger.info('❌ slide1.xml não encontrado!')
  }
  
  // 5. Testar parser
  logger.info('\n🔧 Testando parser de texto...')
  try {
    const parser = new PPTXTextParser()
    const textResult = await parser.extractTextFromSlide(zip, 1)
    
    logger.info('📊 Resultado do parser:')
    logger.info(`- Texto: "${textResult.text}"`)
    logger.info(`- Linhas: ${textResult.lines.length}`)
    logger.info(`- Contagem de palavras: ${textResult.wordCount}`)
    logger.info(`- Bullet points: ${textResult.bulletPoints?.length || 0}`)
    
    textResult.lines.forEach((line: string, index: number) => {
      logger.info(`\n📝 Linha ${index + 1}:`)
      logger.info(`  Texto: "${line}"`)
    })
    
  } catch (error) {
    logger.error('💥 Erro no parser:', error)
  }
}

// Executar debug
if (require.main === module) {
  debugTextExtraction()
    .then(() => {
      logger.info('\n🏁 Debug concluído!')
      process.exit(0)
    })
    .catch((error) => {
      logger.error('💥 Erro fatal:', error)
      process.exit(1)
    })
}

export { debugTextExtraction }