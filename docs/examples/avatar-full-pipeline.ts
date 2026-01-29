/**
 * Exemplo Completo: Pipeline End-to-End
 * Demonstra o fluxo completo: texto → animação → rendering → vídeo
 */

import { AvatarLipSyncIntegration } from '@/lib/avatar/avatar-lip-sync-integration'
import { AvatarRenderOrchestrator } from '@/lib/avatar/avatar-render-orchestrator'

async function fullPipelineExample() {
  console.log('🎬 Exemplo 3: Pipeline Completo End-to-End\n')
  console.log('=' .repeat(60))

  const integration = new AvatarLipSyncIntegration()
  const orchestrator = new AvatarRenderOrchestrator({
    enableFallback: true,
    maxRetries: 3
  })

  // Script do curso
  const courseScript = `
    Olá! Seja muito bem-vindo ao nosso curso de programação.
    Hoje vamos aprender sobre os fundamentos de JavaScript.
    Prepare-se para uma jornada incrível no mundo do desenvolvimento web!
  `.trim()

  console.log('\n📝 ETAPA 1: Preparação')
  console.log('-'.repeat(60))
  console.log(`Texto: "${courseScript}"`)
  console.log(`Tamanho: ${courseScript.length} caracteres`)
  console.log(`Palavras: ${courseScript.split(' ').length}`)

  // ETAPA 1: Gerar animação facial (Phase 1 + Phase 2)
  console.log('\n🎭 ETAPA 2: Geração de Animação Facial')
  console.log('-'.repeat(60))

  const startTime = Date.now()

  const animation = await integration.generateAvatarAnimation({
    text: courseScript,
    avatarConfig: {
      quality: 'PLACEHOLDER',
      emotion: 'happy',
      emotionIntensity: 0.6,
      enableBlinks: true,
      enableBreathing: true,
      enableHeadMovement: true,
      fps: 30
    }
  })

  const animationTime = Date.now() - startTime

  console.log('✅ Animação gerada!')
  console.log(`   Tempo: ${animationTime}ms`)
  console.log(`   Frames: ${animation.frames.length}`)
  console.log(`   Duração: ${animation.duration}s`)
  console.log(`   FPS: ${animation.fps}`)
  console.log(`   Provider lip-sync: ${animation.metadata.provider}`)
  console.log(`   Cached: ${animation.metadata.cached ? 'Sim' : 'Não'}`)

  // ETAPA 2: Validar animação
  console.log('\n✅ ETAPA 3: Validação de Qualidade')
  console.log('-'.repeat(60))

  const validation = integration.validateAnimation(animation)

  if (validation.isValid) {
    console.log('✅ Validação: PASSOU')
  } else {
    console.log('❌ Validação: FALHOU')
    validation.errors.forEach(error => console.log(`   ❌ ${error}`))
  }

  if (validation.warnings.length > 0) {
    console.log('\n⚠️  Avisos:')
    validation.warnings.forEach(warning => console.log(`   ⚠️  ${warning}`))
  }

  // ETAPA 3: Estatísticas
  console.log('\n📊 ETAPA 4: Análise de Estatísticas')
  console.log('-'.repeat(60))

  const stats = integration.getAnimationStats(animation)

  console.log(`   Total de frames: ${stats.frameCount}`)
  console.log(`   Duração: ${stats.duration}s`)
  console.log(`   FPS: ${stats.fps}`)
  console.log(`   Tamanho médio/frame: ${stats.avgFrameSize} bytes`)
  console.log(`   Blend shapes total: ${stats.totalBlendShapeChanges}`)
  console.log(`   Quality tier: ${stats.quality}`)
  console.log(`   Provider: ${stats.provider}`)

  // ETAPA 4: Otimização (opcional)
  console.log('\n⚡ ETAPA 5: Otimização (Opcional)')
  console.log('-'.repeat(60))

  const optimized = await integration.optimizeAnimation(animation, 0.001)

  const reduction = ((1 - optimized.frames.length / animation.frames.length) * 100).toFixed(1)
  console.log(`   Frames originais: ${animation.frames.length}`)
  console.log(`   Frames otimizados: ${optimized.frames.length}`)
  console.log(`   Redução: ${reduction}%`)

  // ETAPA 5: Exportar para diferentes formatos
  console.log('\n💾 ETAPA 6: Export para Diferentes Formatos')
  console.log('-'.repeat(60))

  const jsonExport = integration.exportAnimation(animation, 'json')
  const usdExport = integration.exportAnimation(animation, 'usd')
  const fbxExport = integration.exportAnimation(animation, 'fbx')

  console.log(`   JSON: ${typeof jsonExport === 'string' ? jsonExport.length : 'N/A'} bytes`)
  console.log(`   USD: ${typeof usdExport === 'string' ? usdExport.length : 'N/A'} bytes`)
  console.log(`   FBX: ${typeof fbxExport === 'object' ? JSON.stringify(fbxExport).length : 'N/A'} bytes`)

  // ETAPA 6: Calcular custo de rendering
  console.log('\n💰 ETAPA 7: Cálculo de Custos')
  console.log('-'.repeat(60))

  const qualities = ['PLACEHOLDER', 'STANDARD', 'HIGH'] as const

  qualities.forEach(quality => {
    const cost = orchestrator.calculateRenderCost(animation.duration, quality)
    if (cost) {
      console.log(`   ${quality}:`)
      console.log(`      Créditos: ${cost.credits}`)
      console.log(`      Tempo estimado: ${cost.estimatedTime}s (~${(cost.estimatedTime / 60).toFixed(1)}min)`)
      console.log(`      Provider: ${cost.provider}`)
    }
  })

  // ETAPA 7: Iniciar rendering (simulado)
  console.log('\n🎬 ETAPA 8: Rendering (Simulado)')
  console.log('-'.repeat(60))

  const mockUserCredits = {
    available: 10,
    used: 0,
    limit: 100
  }

  console.log(`   Créditos disponíveis: ${mockUserCredits.available}`)

  const renderResult = await orchestrator.render(
    {
      animation,
      resolution: '1080p',
      outputFormat: 'mp4',
      backgroundColor: '#FFFFFF'
    },
    mockUserCredits
  )

  console.log('✅ Rendering iniciado!')
  console.log(`   Job ID: ${renderResult.jobId}`)
  console.log(`   Status: ${renderResult.status}`)
  console.log(`   Provider: ${renderResult.metadata?.provider || 'N/A'}`)

  // Resumo final
  const totalTime = Date.now() - startTime

  console.log('\n' + '='.repeat(60))
  console.log('🎉 PIPELINE COMPLETO EXECUTADO COM SUCESSO!')
  console.log('='.repeat(60))
  console.log(`\n📊 Resumo Final:`)
  console.log(`   Tempo total: ${totalTime}ms`)
  console.log(`   Texto processado: ${courseScript.length} chars`)
  console.log(`   Frames gerados: ${animation.frames.length}`)
  console.log(`   Duração vídeo: ${animation.duration}s`)
  console.log(`   Quality tier: ${animation.metadata.quality}`)
  console.log(`   Status validação: ${validation.isValid ? '✅ PASSOU' : '❌ FALHOU'}`)
  console.log(`   Job ID: ${renderResult.jobId}`)

  console.log('\n✅ Pipeline Phase 1 + Phase 2: OPERACIONAL')

  return {
    animation,
    optimized,
    validation,
    stats,
    renderResult
  }
}

// Executar exemplo
if (require.main === module) {
  fullPipelineExample()
    .then(() => console.log('\n✅ Exemplo completo concluído!'))
    .catch(error => {
      console.error('\n❌ Erro durante execução:')
      console.error(error)
      process.exit(1)
    })
}

export { fullPipelineExample }
