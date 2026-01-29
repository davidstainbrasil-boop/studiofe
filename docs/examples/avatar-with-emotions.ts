/**
 * Exemplo Avançado: Avatar com Diferentes Emoções
 * Demonstra como usar o sistema de emoções
 */

import { AvatarLipSyncIntegration } from '@/lib/avatar/avatar-lip-sync-integration'
import { AvatarRenderOrchestrator } from '@/lib/avatar/avatar-render-orchestrator'

async function emotionExample() {
  console.log('😊 Exemplo 2: Avatar com Emoções\n')

  const integration = new AvatarLipSyncIntegration()
  const orchestrator = new AvatarRenderOrchestrator({ enableFallback: true })

  // Script com diferentes emoções
  const scenes = [
    {
      text: "Parabéns! Você completou o módulo com sucesso!",
      emotion: 'happy' as const,
      intensity: 0.8
    },
    {
      text: "Infelizmente, você não passou no teste desta vez.",
      emotion: 'sad' as const,
      intensity: 0.6
    },
    {
      text: "Atenção! Este é um conceito muito importante!",
      emotion: 'surprised' as const,
      intensity: 0.7
    },
    {
      text: "Vamos começar nossa aula de hoje.",
      emotion: 'neutral' as const,
      intensity: 0.5
    }
  ]

  console.log(`📝 Gerando ${scenes.length} cenas com diferentes emoções...\n`)

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i]

    console.log(`Cena ${i + 1}: ${scene.emotion.toUpperCase()}`)
    console.log(`Texto: "${scene.text}"`)

    // Gerar animação
    const animation = await integration.generateAvatarAnimation({
      text: scene.text,
      avatarConfig: {
        quality: 'PLACEHOLDER',
        emotion: scene.emotion,
        emotionIntensity: scene.intensity,
        enableBlinks: true,
        enableBreathing: true,
        fps: 30
      }
    })

    console.log(`✅ Frames: ${animation.frames.length}, Duração: ${animation.duration}s`)

    // Validar
    const validation = integration.validateAnimation(animation)
    if (!validation.isValid) {
      console.error('❌ Validação falhou:', validation.errors)
    }

    // Calcular custo estimado
    const cost = orchestrator.calculateRenderCost(animation.duration, 'STANDARD')
    if (cost) {
      console.log(`💰 Custo estimado: ${cost.credits} créditos, ~${cost.estimatedTime}s`)
    }

    console.log('')
  }

  console.log('✅ Todas as cenas geradas com sucesso!')
}

// Executar exemplo
if (require.main === module) {
  emotionExample()
    .then(() => console.log('\n✅ Exemplo concluído!'))
    .catch(error => console.error('❌ Erro:', error))
}

export { emotionExample }
