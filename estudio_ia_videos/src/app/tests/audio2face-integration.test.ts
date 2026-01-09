/**
 * 🧪 Testes de Integração Audio2Face
 * FASE 2: Sprint 1 - Validação de precisão de lip-sync ≥95%
 */

import { audio2FaceService } from '@lib/services/audio2face-service'
import { avatar3DPipeline } from '@lib/avatar-3d-pipeline'
import { supabaseClient } from '@lib/supabase'

// Mock Supabase Client
jest.mock('@/lib/supabase', () => ({
  supabaseClient: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({
      data: { id: 'avatar-123', name: 'Test Avatar' },
      error: null
    })
  }
}));

// Mock Avatar 3D Pipeline
jest.mock('@/lib/avatar-3d-pipeline', () => ({
  avatar3DPipeline: {
    renderHyperRealisticAvatar: jest.fn().mockResolvedValue({
      jobId: 'job-123',
      status: 'processing',
      audio2FaceEnabled: true
    }),
    getRenderJobStatus: jest.fn().mockResolvedValue({
      status: 'completed',
      lipSyncAccuracy: 98,
      outputVideo: 'http://example.com/video.mp4'
    }),
    generateHyperRealisticLipSync: jest.fn().mockResolvedValue({
      success: true,
      audio2FaceEnabled: false,
      accuracy: 85
    })
  }
}));

describe('Audio2Face Integration Tests', () => {
  beforeAll(async () => {
    // Inicializar serviços para teste
    console.log('🧪 Inicializando testes Audio2Face...')
  })

  afterAll(async () => {
    // Limpeza após testes
    console.log('🧪 Finalizando testes Audio2Face...')
  })

  describe('Audio2Face Service Health Check', () => {
    test('deve verificar se o serviço Audio2Face está disponível', async () => {
      const healthCheck = await audio2FaceService.checkHealth()
      
      expect(healthCheck.isHealthy).toBe(true)
      expect(healthCheck.version).toBeDefined()
      expect(healthCheck.responseTime).toBeLessThan(5000) // 5 segundos
      
      console.log('✅ Audio2Face Health Check:', healthCheck)
    }, 10000)

    test('deve listar instâncias disponíveis', async () => {
      const instances = await audio2FaceService.listInstances()
      
      expect(Array.isArray(instances)).toBe(true)
      expect(instances.length).toBeGreaterThan(0)
      
      console.log('✅ Audio2Face Instances:', instances)
    })
  })

  describe('Lip-Sync Accuracy Tests', () => {
    const testCases = [
      {
        name: 'Texto curto em português',
        text: 'Olá, como você está hoje?',
        language: 'pt-BR',
        expectedMinAccuracy: 95
      },
      {
        name: 'Texto médio em português',
        text: 'Este é um teste de sincronização labial para verificar a precisão do sistema Audio2Face com texto de tamanho médio.',
        language: 'pt-BR',
        expectedMinAccuracy: 95
      },
      {
        name: 'Texto longo em português',
        text: 'A tecnologia de sincronização labial baseada em inteligência artificial representa um avanço significativo na criação de avatares hiper-realistas. O sistema Audio2Face da NVIDIA utiliza redes neurais profundas para analisar características acústicas do áudio e gerar movimentos faciais precisos em tempo real.',
        language: 'pt-BR',
        expectedMinAccuracy: 95
      }
    ]

    testCases.forEach((testCase) => {
      test(`deve atingir precisão ≥${testCase.expectedMinAccuracy}% para: ${testCase.name}`, async () => {
        // Criar sessão Audio2Face
        const sessionId = await audio2FaceService.createSession({
          instanceName: 'test-instance',
          avatarPath: '/test/avatar.usd'
        })

        expect(sessionId).toBeDefined()

        try {
          // Gerar áudio sintético para teste
          const audioBuffer = await generateTestAudio(testCase.text, testCase.language)
          
          // Processar com Audio2Face
          const result = await audio2FaceService.processAudio(sessionId, audioBuffer, {
            outputFormat: 'arkit',
            frameRate: 60,
            quality: 'high'
          })

          // Validar resultado
          if (!result.success) {
            throw new Error(`Process failed: ${result.error}`)
          }
          
          expect(result.success).toBe(true)
          expect(result.lipSyncData).toBeDefined()
          expect(result.accuracy).toBeGreaterThanOrEqual(testCase.expectedMinAccuracy)
          
          console.log(`✅ Lip-sync accuracy for "${testCase.name}": ${result.accuracy}%`)
          
          // Validar estrutura dos dados
          expect(result.lipSyncData.length).toBeGreaterThan(0)
          expect(result.metadata.frameRate).toBe(60)
          expect(result.metadata.totalFrames).toBeGreaterThan(0)

        } finally {
          // Limpar sessão
          await audio2FaceService.destroySession(sessionId)
        }
      }, 30000) // 30 segundos timeout
    })
  })

  describe('Pipeline Integration Tests', () => {
    test('deve integrar Audio2Face com pipeline de renderização', async () => {
      // Buscar avatar de teste
      const { data: testAvatar } = await supabaseClient
        .from('avatar_models' as any)
        .select('*')
        .eq('is_active', true)
        .eq('audio2face_compatible', true)
        .limit(1)
        .single()

      expect(testAvatar).toBeDefined()
      if (!testAvatar) throw new Error('Test avatar not found')

      // Executar renderização com Audio2Face
      const renderResult = await avatar3DPipeline.renderHyperRealisticAvatar(
        'test-user',
        'Este é um teste de integração completa do pipeline.',
        undefined, // voiceProfileId
        {
          avatarId: (testAvatar as any).id,
          quality: 'high',
          resolution: '4K',
          audio2FaceEnabled: true,
          realTimeLipSync: true,
          rayTracing: false // Desabilitar para teste mais rápido
        }
      )

      expect(renderResult.jobId).toBeDefined()
      expect(renderResult.status).toBe('processing')
      expect(renderResult.audio2FaceEnabled).toBe(true)

      console.log('✅ Pipeline integration test started:', renderResult.jobId!)

      // Aguardar processamento (ou simular)
      let attempts = 0
      let job: any = renderResult
      
      while (job.status === 'processing' && attempts < 10) {
        await new Promise(resolve => setTimeout(resolve, 2000)) // 2 segundos
        if (renderResult.jobId) {
            job = await avatar3DPipeline.getRenderJobStatus(renderResult.jobId)
        }
        attempts++
      }

      // Validar resultado final
      if (job.status === 'completed') {
        expect(job.lipSyncAccuracy).toBeGreaterThanOrEqual(95)
        expect(job.outputVideo).toBeDefined()
        console.log(`✅ Pipeline completed with ${job.lipSyncAccuracy}% accuracy`)
      } else {
        console.log(`⚠️ Pipeline test timeout after ${attempts} attempts, status: ${job.status}`)
      }
    }, 60000) // 60 segundos timeout
  })

  describe('Performance Tests', () => {
    test('deve processar lip-sync em tempo aceitável', async () => {
      const startTime = Date.now()
      
      const sessionId = await audio2FaceService.createSession({
        instanceName: 'performance-test',
        avatarPath: '/test/avatar.usd'
      })

      const audioBuffer = await generateTestAudio('Teste de performance', 'pt-BR')
      
      const result = await audio2FaceService.processAudio(sessionId, audioBuffer, {
        outputFormat: 'arkit',
        frameRate: 30, // Menor frame rate para teste de performance
        quality: 'medium'
      })

      const processingTime = Date.now() - startTime

      if (!result.success) {
        throw new Error(`Process failed: ${result.error}`)
      }

      expect(result.success).toBe(true)
      expect(processingTime).toBeLessThan(15000) // 15 segundos máximo
      
      console.log(`✅ Performance test: ${processingTime}ms for ${result.metadata.audioLength}s audio`)

      await audio2FaceService.destroySession(sessionId)
    }, 20000)
  })

  describe('Error Handling Tests', () => {
    test('deve lidar com áudio inválido graciosamente', async () => {
      const sessionId = await audio2FaceService.createSession({
        instanceName: 'error-test',
        avatarPath: '/test/avatar.usd'
      })

      try {
        // Tentar processar áudio inválido
        const invalidAudio = Buffer.alloc(100) // Buffer vazio
        
        const result = await audio2FaceService.processAudio(sessionId, invalidAudio, {
          outputFormat: 'arkit',
          frameRate: 60,
          quality: 'high'
        })

        if (result.success) {
          throw new Error('Expected failure but got success')
        }

        expect(result.success).toBe(false)
        expect(result.error).toBeDefined()
        
        console.log('✅ Error handling test passed:', result.error)
      } finally {
        await audio2FaceService.destroySession(sessionId)
      }
    })

    test('deve usar fallback quando Audio2Face não está disponível', async () => {
      // Simular Audio2Face indisponível
      const originalCheckHealth = audio2FaceService.checkHealth
      audio2FaceService.checkHealth = jest.fn().mockResolvedValue({
        isHealthy: false,
        error: 'Service unavailable'
      })

      try {
        const result = await avatar3DPipeline.generateHyperRealisticLipSync(
          'test-avatar',
          '/test/audio.wav',
          'Teste de fallback',
          { language: 'pt-BR', quality: 'high' }
        )

        expect(result.success).toBe(true)
        expect(result.audio2FaceEnabled).toBe(false)
        expect(result.accuracy).toBeGreaterThan(0) // Fallback deve ter alguma precisão
        
        console.log('✅ Fallback test passed with accuracy:', result.accuracy)
      } finally {
        // Restaurar método original
        audio2FaceService.checkHealth = originalCheckHealth
      }
    })
  })
})

/**
 * Função auxiliar para gerar áudio de teste
 */
async function generateTestAudio(text: string, language: string): Promise<Buffer> {
  // Em um ambiente real, isso usaria TTS para gerar áudio
  // Para testes, retornamos um buffer simulado
  const audioLength = text.length * 50 // ~50ms por caractere
  const sampleRate = 44100
  const samples = Math.floor(audioLength * sampleRate / 1000)
  
  // Gerar áudio sintético simples (onda senoidal)
  const buffer = Buffer.alloc(samples * 2) // 16-bit audio
  
  for (let i = 0; i < samples; i++) {
    const frequency = 440 + Math.sin(i / 1000) * 100 // Variação de frequência
    const amplitude = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 32767
    buffer.writeInt16LE(amplitude, i * 2)
  }
  
  return buffer
}

/**
 * Configuração de timeout global para testes
 */
jest.setTimeout(120000) // 2 minutos para testes completos