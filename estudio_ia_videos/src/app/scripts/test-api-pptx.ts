import { logger } from '@/lib/logger';
// TODO: Script - fix types
// 🧪 Teste da API PPTX
// Teste completo via HTTP da API de processamento PPTX

import PptxGenJS from 'pptxgenjs'

interface ProcessedSlidePreview {
  slideNumber: number
  title: string
  content?: string
  images?: unknown[]
  duration?: number
}

async function testPPTXAPI() {
  logger.info('🧪 TESTANDO API PPTX VIA HTTP')
  logger.info('=' .repeat(40))
  
  try {
    // 1. Criar PPTX de teste
    logger.info('📝 Criando PPTX de teste...')
    const pptx = new PptxGenJS()
    
    const slide1 = pptx.addSlide()
    slide1.addText('API Test - Slide 1', {
      x: 1, y: 1, w: 8, h: 1,
      fontSize: 24, bold: true
    })
    slide1.addText('Testando processamento real via API', {
      x: 1, y: 2.5, w: 8, h: 1,
      fontSize: 16
    })
    
    const slide2 = pptx.addSlide()
    slide2.addText('API Test - Slide 2', {
      x: 1, y: 1, w: 8, h: 1,
      fontSize: 24, bold: true
    })
    slide2.addText('Sistema funcionando sem mocks!', {
      x: 1, y: 2.5, w: 8, h: 1,
      fontSize: 16
    })
    
    const buffer = await pptx.write({ outputType: 'nodebuffer' }) as Buffer
    logger.info(`✅ PPTX criado: ${buffer.length} bytes`)
    
    // 2. Preparar FormData
    logger.info('\n📤 Enviando para API...')
    const formData = new FormData()
    const blob = new Blob([new Uint8Array(buffer)], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' })
    formData.append('file', blob, 'test-api.pptx')
    
    // 3. Fazer requisição
    const response = await fetch('http://localhost:3000/api/pptx/process', {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': 'Bearer test-token' // Token de teste
      }
    })
    
    logger.info(`📊 Status: ${response.status} ${response.statusText}`)
    
    if (response.ok) {
      const result = await response.json()
      
      logger.info('\n✅ RESPOSTA DA API:')
      logger.info(`- Sucesso: ${result.success}`)
      logger.info(`- Project ID: ${result.projectId}`)
      logger.info(`- Total slides: ${result.stats?.totalSlides}`)
      logger.info(`- Total imagens: ${result.stats?.totalImages}`)
      logger.info(`- Blocos de texto: ${result.stats?.totalTextBlocks}`)
      logger.info(`- Duração estimada: ${result.stats?.estimatedDuration}s`)
      logger.info(`- Tamanho do arquivo: ${result.stats?.fileSize} bytes`)
      logger.info(`- Tempo de processamento: ${result.stats?.processingTime}ms`)
      
      if (result.slidesData && result.slidesData.length > 0) {
        logger.info('\n📄 SLIDES PROCESSADOS:')
        result.slidesData.forEach((slide: ProcessedSlidePreview, index: number) => {
          logger.info(`\nSlide ${slide.slideNumber}:`)
          logger.info(`  Título: ${slide.title}`)
          logger.info(`  Conteúdo: ${slide.content?.substring(0, 50)}...`)
          logger.info(`  Imagens: ${slide.images?.length || 0}`)
          logger.info(`  Duração: ${slide.duration}s`)
        })
      }
      
      logger.info('\n🎉 TESTE DA API PASSOU!')
      return true
      
    } else {
      const error = await response.text()
      logger.error(`❌ Erro na API: ${error}`)
      return false
    }
    
  } catch (error) {
    logger.error('💥 Erro no teste:', error)
    return false
  }
}

// Executar teste
if (require.main === module) {
  testPPTXAPI()
    .then((success) => {
      if (success) {
        logger.info('\n🏁 Teste da API concluído com sucesso!')
        process.exit(0)
      } else {
        logger.info('\n💥 Teste da API falhou!')
        process.exit(1)
      }
    })
    .catch((error) => {
      logger.error('💥 Erro fatal:', error)
      process.exit(1)
    })
}

export { testPPTXAPI }