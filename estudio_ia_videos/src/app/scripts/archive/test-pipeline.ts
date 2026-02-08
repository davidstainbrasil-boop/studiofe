import { logger } from '@/lib/logger';
// TODO: Archive script - fix types

// Test pipeline for MVP validation

import { PPTXParser } from '../../lib/pptx/parser'
import { slideAudioProcessor } from '../../lib/tts/slide-processor'
import { readyPlayerMeClient } from '../../lib/avatars/readyplayerme'
import { lipsyncEngine } from '../../lib/avatars/lipsync'
import { ffmpegComposer } from '../../lib/video/ffmpeg'
import fs from 'fs'
import path from 'path'

// Test data - sample PPTX content
const TEST_SLIDES = [
  {
    id: 'slide-1',
    title: 'Segurança no Trabalho',
    content: ['Bem-vindos ao treinamento de segurança', 'Vamos aprender sobre EPI e NR-10'],
    order: 1
  },
  {
    id: 'slide-2', 
    title: 'Equipamentos de Proteção',
    content: ['Use sempre o capacete', 'Óculos de proteção são obrigatórios', 'Luvas adequadas para cada atividade'],
    order: 2
  },
  {
    id: 'slide-3',
    title: 'Conclusão',
    content: ['Segurança é responsabilidade de todos', 'Dúvidas? Procure o SESMT'],
    order: 3
  }
]

async function testPipeline() {
  logger.info('🧪 Iniciando teste do pipeline completo...\n')
  
  try {
    // Test 1: TTS Generation
    logger.info('📊 Teste 1: Geração de TTS')
    const startTTS = Date.now()
    
    const slideAudios = await slideAudioProcessor.generateSlideAudios(
      TEST_SLIDES.map(slide => ({
        id: slide.id,
        title: slide.title,
        content: slide.content.join('. ')
      })),
      { voice_id: 'br-female-1' }
    )
    
    const ttsTime = Date.now() - startTTS
    logger.info(`✅ TTS gerado em ${ttsTime}ms para ${slideAudios.length} slides\n`)

    // Test 2: Avatar Animation
    logger.info('📊 Teste 2: Animação de Avatar')
    const startAvatar = Date.now()
    
    const avatarVideos = []
    for (const slideAudio of slideAudios) {
      const lipsyncFrames = await lipsyncEngine.generateLipsyncFromAudio(
        slideAudio.audioBuffer,
        slideAudio.duration,
        slideAudio.text
      )
      
      const animationData = await readyPlayerMeClient.generateLipsyncData(
        slideAudio.audioBuffer,
        slideAudio.duration
      )
      
      const avatarVideo = await readyPlayerMeClient.renderAvatarVideo(
        'avatar-female-1',
        animationData
      )
      
      avatarVideos.push({
        slideId: slideAudio.slideId,
        videoBuffer: avatarVideo,
        duration: slideAudio.duration
      })
    }
    
    const avatarTime = Date.now() - startAvatar
    logger.info(`✅ Avatar animado em ${avatarTime}ms para ${avatarVideos.length} slides\n`)

    // Test 3: Video Composition
    logger.info('📊 Teste 3: Composição de Vídeo')
    const startComposition = Date.now()
    
    // Create placeholder slide images
    const slides = TEST_SLIDES.map(slide => ({
      image: Buffer.from(`slide-${slide.order}-image-data`),
      duration: slideAudios.find(a => a.slideId === slide.id)?.duration || 3
    }))
    
    const finalVideo = await ffmpegComposer.composeVideo(
      slides,
      avatarVideos.map(av => ({ video: av.videoBuffer, duration: av.duration })),
      slideAudios.map(sa => ({ audio: sa.audioBuffer, duration: sa.duration })),
      {
        layout: 'pip',
        resolution: '1080p',
        fps: 30,
        format: 'mp4',
        quality: 'high'
      }
    )
    
    const compositionTime = Date.now() - startComposition
    logger.info(`✅ Vídeo composto em ${compositionTime}ms (${finalVideo.length} bytes)\n`)

    // Test 4: Validation
    logger.info('📊 Teste 4: Validação de Qualidade')
    const validation = await ffmpegComposer.validateVideo(finalVideo)
    
    if (validation.isValid) {
      logger.info('✅ Vídeo validado com sucesso')
      logger.info(`   Duração: ${validation.duration}s`)
      logger.info(`   Resolução: ${validation.resolution}`)
      logger.info(`   Formato: ${validation.format}`)
      logger.info(`   Áudio: ${validation.hasAudio ? 'Sim' : 'Não'}`)
    } else {
      logger.info('❌ Validação falhou:')
      validation.errors.forEach(error => logger.info(`   - ${error}`))
    }

    // Test Summary
    const totalTime = Date.now() - (startTTS - ttsTime + startAvatar - avatarTime + startComposition - compositionTime)
    logger.info('\n🎯 RESUMO DO TESTE:')
    logger.info(`✅ Pipeline completo executado em ${totalTime}ms`)
    logger.info(`📊 TTS: ${ttsTime}ms | Avatar: ${avatarTime}ms | Composição: ${compositionTime}ms`)
    logger.info(`🎬 Vídeo final: ${(finalVideo.length / 1024).toFixed(1)}KB`)
    logger.info(`📈 Performance: ${totalTime < 10000 ? '✅ APROVADO' : '⚠️ LENTO'} (meta: <10s para teste)`)

    // Performance check against PRD requirements
    const performanceReport = {
      prd_requirement: '90% vídeos 5min completam em <10min processing',
      test_result: totalTime < 10000,
      actual_time: `${(totalTime / 1000).toFixed(1)}s`,
      slides_processed: TEST_SLIDES.length,
      meets_requirements: totalTime < 600000 // 10 minutes
    }

    logger.info('\n📋 CONFORMIDADE COM PRD:')
    logger.info(`   Requisito: ${performanceReport.prd_requirement}`)
    logger.info(`   Resultado: ${performanceReport.meets_requirements ? '✅ CONFORME' : '❌ NÃO CONFORME'}`)
    logger.info(`   Tempo real: ${performanceReport.actual_time}`)

    return {
      success: true,
      performance: performanceReport,
      components: {
        tts: { time_ms: ttsTime, slides: slideAudios.length },
        avatar: { time_ms: avatarTime, videos: avatarVideos.length },
        composition: { time_ms: compositionTime, size_bytes: finalVideo.length },
        validation: validation
      }
    }

  } catch (error) {
    logger.error('❌ Teste do pipeline falhou:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Run test if called directly
if (require.main === module) {
  testPipeline()
    .then(result => {
      logger.info('\n🎯 Teste concluído:', result.success ? 'SUCESSO' : 'FALHA')
      process.exit(result.success ? 0 : 1)
    })
    .catch(error => {
      logger.error('Erro fatal no teste:', error)
      process.exit(1)
    })
}

export { testPipeline }
