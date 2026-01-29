/**
 * Exemplo Básico: Geração de Avatar
 * Demonstra o uso mais simples do sistema
 */

import { AvatarLipSyncIntegration } from '@/lib/avatar/avatar-lip-sync-integration'

async function basicExample() {
  console.log('🎬 Exemplo 1: Geração Básica de Avatar\n')

  // 1. Criar instância do integration
  const integration = new AvatarLipSyncIntegration()

  // 2. Gerar animação de avatar
  const animation = await integration.generateAvatarAnimation({
    text: "Olá! Bem-vindo ao curso de JavaScript. Hoje vamos aprender sobre funções e arrays.",
    avatarConfig: {
      quality: 'PLACEHOLDER', // Grátis, rápido para testes
      emotion: 'happy',
      enableBlinks: true,
      enableBreathing: true,
      fps: 30
    }
  })

  // 3. Verificar resultado
  console.log('✅ Animação gerada com sucesso!')
  console.log(`   Frames: ${animation.frames.length}`)
  console.log(`   Duração: ${animation.duration}s`)
  console.log(`   FPS: ${animation.fps}`)
  console.log(`   Provider: ${animation.metadata.provider}`)
  console.log(`   Cached: ${animation.metadata.cached}`)

  // 4. Estatísticas
  const stats = integration.getAnimationStats(animation)
  console.log('\n📊 Estatísticas:')
  console.log(`   Total de frames: ${stats.frameCount}`)
  console.log(`   Blend shapes utilizados: ${stats.totalBlendShapeChanges}`)
  console.log(`   Tamanho médio por frame: ${stats.avgFrameSize} bytes`)

  return animation
}

// Executar exemplo
if (require.main === module) {
  basicExample()
    .then(() => console.log('\n✅ Exemplo concluído!'))
    .catch(error => console.error('❌ Erro:', error))
}

export { basicExample }
