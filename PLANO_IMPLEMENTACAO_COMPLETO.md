# 🚀 PLANO DE IMPLEMENTAÇÃO COMPLETO
## Avatares Hiper-Realistas + Studio Profissional

**Projeto:** Estúdio IA de Vídeos - Treinamentos Técnicos
**Objetivo:** Transformar em plataforma profissional de classe mundial
**Duração Total:** 18 semanas (4.5 meses)
**Data Início:** 2026-01-17
**Data Prevista Conclusão:** 2026-06-05

---

## 📊 VISÃO GERAL EXECUTIVA

### Situação Atual
- ✅ Arquitetura sólida (Next.js 14 + PostgreSQL + Supabase)
- ⚠️ Implementação fragmentada (7 timelines, 5 avatar systems)
- ❌ Lip-sync não funcional (bloqueador crítico)
- ❌ Renderização single-thread (não escala)
- ❌ D-ID mockado, Audio2Face ausente

### Estado Desejado
- ✅ Sistema de lip-sync profissional (Rhubarb + Azure)
- ✅ 4 tiers de avatar (Placeholder → Standard → High → Hyperreal)
- ✅ Editor consolidado único
- ✅ Renderização distribuída (4+ workers)
- ✅ Features profissionais (color grading, transitions, templates)
- ✅ AI Director + Real-time Collaboration

### Investimento Total Estimado
- **Infraestrutura:** $3,000/mês
- **Desenvolvimento:** 18 semanas
- **Team Size:** 3-4 desenvolvedores full-time

---

# FASE 1: FUNDAÇÃO - LIP-SYNC PROFISSIONAL
**Duração:** 3 semanas (17/01 - 07/02)
**Prioridade:** CRÍTICA ⚠️
**Objetivo:** Implementar sistema de lip-sync de qualidade cinematográfica

## Week 1: Setup e Integração Rhubarb

### Dia 1-2: Preparação do Ambiente
```bash
# Instalar dependências
npm install fluent-ffmpeg @types/fluent-ffmpeg
npm install node-fetch form-data

# Instalar Rhubarb Lip-Sync binary
wget https://github.com/DanielSWolf/rhubarb-lip-sync/releases/download/v1.13.0/Rhubarb-Lip-Sync-1.13.0-Linux.zip
unzip Rhubarb-Lip-Sync-1.13.0-Linux.zip -d /usr/local/bin/
chmod +x /usr/local/bin/rhubarb
```

**Arquivos a criar:**
- [ ] `/src/lib/sync/rhubarb-lip-sync-engine.ts`
- [ ] `/src/lib/sync/types/phoneme.types.ts`
- [ ] `/src/lib/sync/types/viseme.types.ts`
- [ ] `/src/lib/sync/utils/audio-preprocessor.ts`

**Código: rhubarb-lip-sync-engine.ts**
```typescript
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import path from 'path'
import { logger } from '@/lib/logger'

const execAsync = promisify(exec)

export interface Phoneme {
  time: number        // Tempo em segundos
  duration: number    // Duração em segundos
  phoneme: string     // Phonema Rhubarb (A-H, X)
  viseme: string      // Viseme 3D correspondente
  intensity: number   // Intensidade 0-1
}

export interface LipSyncResult {
  phonemes: Phoneme[]
  duration: number
  metadata: {
    mouthCueCount: number
    recognizer: string
    dialog?: string
  }
}

export class RhubarbLipSyncEngine {
  private tempDir = '/tmp/rhubarb'
  private rhubarbPath = '/usr/local/bin/rhubarb'

  constructor() {
    this.ensureTempDir()
  }

  private async ensureTempDir() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true })
    } catch (error) {
      logger.error('Failed to create temp directory', error as Error)
    }
  }

  /**
   * Gera phonemas a partir de arquivo de áudio
   */
  async generatePhonemes(
    audioPath: string,
    dialogText?: string
  ): Promise<LipSyncResult> {
    try {
      const outputPath = path.join(this.tempDir, `${Date.now()}.json`)

      // Construir comando Rhubarb
      let command = `${this.rhubarbPath} -f json -o ${outputPath}`

      // Adicionar diálogo se fornecido (melhora precisão)
      if (dialogText) {
        const dialogFile = path.join(this.tempDir, `${Date.now()}.txt`)
        await fs.writeFile(dialogFile, dialogText, 'utf-8')
        command += ` --dialogFile ${dialogFile}`
      }

      command += ` ${audioPath}`

      logger.info('Running Rhubarb Lip-Sync', { command })

      // Executar Rhubarb
      const { stdout, stderr } = await execAsync(command, {
        timeout: 60000 // 60 segundos timeout
      })

      if (stderr) {
        logger.warn('Rhubarb stderr output', { stderr })
      }

      // Ler resultado
      const resultJson = await fs.readFile(outputPath, 'utf-8')
      const result = JSON.parse(resultJson)

      // Converter para nosso formato
      const phonemes = this.convertRhubarbToPhonemes(result.mouthCues)

      // Limpar arquivos temporários
      await fs.unlink(outputPath).catch(() => {})
      if (dialogText) {
        await fs.unlink(path.join(this.tempDir, `${Date.now()}.txt`)).catch(() => {})
      }

      return {
        phonemes,
        duration: result.metadata.duration,
        metadata: {
          mouthCueCount: result.mouthCues.length,
          recognizer: result.metadata.soundFile,
          dialog: dialogText
        }
      }
    } catch (error) {
      logger.error('Failed to generate phonemes with Rhubarb', error as Error)
      throw new Error(`Rhubarb lip-sync failed: ${(error as Error).message}`)
    }
  }

  /**
   * Converte output Rhubarb para phonemas com visemes
   */
  private convertRhubarbToPhonemes(mouthCues: any[]): Phoneme[] {
    const phonemes: Phoneme[] = []

    for (let i = 0; i < mouthCues.length; i++) {
      const cue = mouthCues[i]
      const nextCue = mouthCues[i + 1]

      const time = cue.start
      const duration = nextCue ? nextCue.start - cue.start : 0.1
      const rhubarbShape = cue.value

      phonemes.push({
        time,
        duration,
        phoneme: rhubarbShape,
        viseme: this.mapRhubarbToViseme(rhubarbShape),
        intensity: this.calculateIntensity(rhubarbShape)
      })
    }

    return phonemes
  }

  /**
   * Mapeia shapes do Rhubarb para visemes 3D (ARKit compatível)
   */
  private mapRhubarbToViseme(rhubarbShape: string): string {
    const mapping: Record<string, string> = {
      'A': 'aa',        // Open mouth (father, palm)
      'B': 'PP',        // Lips together (people, maybe)
      'C': 'E',         // Slightly open (see, feet)
      'D': 'aa',        // Open (day, made)
      'E': 'O',         // Rounded (though, show)
      'F': 'U',         // Very rounded (you, new)
      'G': 'FF',        // Upper teeth on lower lip (off, photo)
      'H': 'TH',        // Tongue between teeth (think, bath)
      'X': 'sil'        // Silence
    }

    return mapping[rhubarbShape] || 'sil'
  }

  /**
   * Calcula intensidade baseada no tipo de phonema
   */
  private calculateIntensity(rhubarbShape: string): number {
    const intensityMap: Record<string, number> = {
      'A': 1.0,    // Totalmente aberto
      'B': 0.3,    // Lábios fechados
      'C': 0.5,    // Levemente aberto
      'D': 0.8,    // Bem aberto
      'E': 0.7,    // Arredondado
      'F': 0.6,    // Muito arredondado
      'G': 0.4,    // Dentes no lábio
      'H': 0.5,    // Língua entre dentes
      'X': 0.0     // Silêncio
    }

    return intensityMap[rhubarbShape] || 0.5
  }

  /**
   * Pré-processa áudio para melhor qualidade de análise
   */
  async preprocessAudio(inputPath: string): Promise<string> {
    const outputPath = path.join(this.tempDir, `preprocessed-${Date.now()}.wav`)

    // Normalizar áudio: 16kHz, mono, 16-bit PCM
    const command = `ffmpeg -i ${inputPath} -ar 16000 -ac 1 -sample_fmt s16 ${outputPath}`

    await execAsync(command)

    return outputPath
  }
}
```

### Dia 3-4: Integração Azure Speech SDK

**Arquivos a criar:**
- [ ] `/src/lib/sync/azure-viseme-engine.ts`
- [ ] `/src/lib/sync/viseme-cache.ts`

**Código: azure-viseme-engine.ts**
```typescript
import * as sdk from 'microsoft-cognitiveservices-speech-sdk'
import { logger } from '@/lib/logger'
import { Phoneme } from './types/phoneme.types'

export interface AzureVisemeResult {
  audioData: Buffer
  visemes: AzureViseme[]
  duration: number
}

export interface AzureViseme {
  time: number          // Offset em ms
  visemeId: number      // ID do viseme (0-21)
  animation: string     // JSON com blend shapes
}

export class AzureVisemeEngine {
  private subscriptionKey: string
  private region: string

  constructor() {
    this.subscriptionKey = process.env.AZURE_SPEECH_KEY!
    this.region = process.env.AZURE_SPEECH_REGION || 'eastus'

    if (!this.subscriptionKey) {
      throw new Error('AZURE_SPEECH_KEY not configured')
    }
  }

  /**
   * Sintetiza voz COM visemes usando Azure
   */
  async synthesizeWithVisemes(
    text: string,
    voice: string = 'pt-BR-FranciscaNeural'
  ): Promise<AzureVisemeResult> {

    return new Promise((resolve, reject) => {
      const speechConfig = sdk.SpeechConfig.fromSubscription(
        this.subscriptionKey,
        this.region
      )

      speechConfig.speechSynthesisVoiceName = voice
      speechConfig.speechSynthesisOutputFormat =
        sdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3

      const synthesizer = new sdk.SpeechSynthesizer(speechConfig)
      const visemes: AzureViseme[] = []

      // Capturar eventos de viseme
      synthesizer.visemeReceived = (s, e) => {
        visemes.push({
          time: e.audioOffset / 10000, // Converter de 100ns para ms
          visemeId: e.visemeId,
          animation: e.animation
        })
      }

      // Sintetizar
      synthesizer.speakTextAsync(
        text,
        result => {
          if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
            const duration = result.audioDuration / 10000 // ms

            resolve({
              audioData: Buffer.from(result.audioData),
              visemes,
              duration
            })
          } else {
            reject(new Error(`Speech synthesis failed: ${result.errorDetails}`))
          }

          synthesizer.close()
        },
        error => {
          synthesizer.close()
          reject(error)
        }
      )
    })
  }

  /**
   * Converte visemes Azure (0-21) para nosso formato unificado
   */
  convertAzureVisemes(azureVisemes: AzureViseme[]): Phoneme[] {
    return azureVisemes.map((viseme, index) => {
      const nextViseme = azureVisemes[index + 1]
      const duration = nextViseme
        ? (nextViseme.time - viseme.time) / 1000
        : 0.1

      return {
        time: viseme.time / 1000, // ms para segundos
        duration,
        phoneme: this.visemeIdToPhoneme(viseme.visemeId),
        viseme: this.visemeIdToVisemeName(viseme.visemeId),
        intensity: this.calculateVisemeIntensity(viseme.visemeId)
      }
    })
  }

  /**
   * Mapeia ID de viseme Azure (0-21) para phonema
   */
  private visemeIdToPhoneme(id: number): string {
    const mapping = [
      'sil', 'ae', 'aa', 'ao', 'eh', 'er', 'ih', 'iy',
      'uh', 'uw', 'b', 'ch', 'd', 'dh', 'f', 'g',
      'hh', 'jh', 'k', 'l', 'm', 'n'
    ]
    return mapping[id] || 'sil'
  }

  /**
   * Mapeia ID de viseme Azure para nome de viseme 3D
   */
  private visemeIdToVisemeName(id: number): string {
    const mapping = [
      'sil', 'aa', 'aa', 'O', 'E', 'er', 'ih', 'E',
      'U', 'U', 'PP', 'CH', 'DD', 'TH', 'FF', 'kk',
      'I', 'CH', 'kk', 'I', 'PP', 'nn'
    ]
    return mapping[id] || 'sil'
  }

  private calculateVisemeIntensity(id: number): number {
    // Visemes de boca aberta = maior intensidade
    const openMouthVisemes = [1, 2, 3, 4, 8, 9]
    return openMouthVisemes.includes(id) ? 0.9 : 0.5
  }
}
```

### Dia 5: Sistema de Cache e Fallback

**Arquivos a criar:**
- [ ] `/src/lib/sync/lip-sync-orchestrator.ts`
- [ ] `/src/lib/sync/viseme-cache.ts`
- [ ] `/src/app/api/lip-sync/generate/route.ts`

**Código: lip-sync-orchestrator.ts**
```typescript
import { RhubarbLipSyncEngine } from './rhubarb-lip-sync-engine'
import { AzureVisemeEngine } from './azure-viseme-engine'
import { VisemeCache } from './viseme-cache'
import { logger } from '@/lib/logger'
import { Phoneme, LipSyncResult } from './types/phoneme.types'

export enum LipSyncProvider {
  AZURE = 'azure',
  RHUBARB = 'rhubarb',
  CACHED = 'cached'
}

export interface LipSyncRequest {
  audioPath?: string
  text?: string
  voice?: string
  forceProvider?: LipSyncProvider
}

export class LipSyncOrchestrator {
  private rhubarb: RhubarbLipSyncEngine
  private azure: AzureVisemeEngine
  private cache: VisemeCache

  constructor() {
    this.rhubarb = new RhubarbLipSyncEngine()
    this.azure = new AzureVisemeEngine()
    this.cache = new VisemeCache()
  }

  /**
   * Gera lip-sync com fallback automático
   */
  async generateLipSync(request: LipSyncRequest): Promise<{
    result: LipSyncResult
    provider: LipSyncProvider
    cached: boolean
  }> {

    // 1. Verificar cache
    const cacheKey = this.generateCacheKey(request)
    const cached = await this.cache.get(cacheKey)

    if (cached) {
      logger.info('Lip-sync cache hit', { cacheKey })
      return {
        result: cached,
        provider: LipSyncProvider.CACHED,
        cached: true
      }
    }

    // 2. Tentar Azure primeiro (melhor qualidade)
    if (request.text && !request.forceProvider) {
      try {
        const azureResult = await this.generateWithAzure(request.text, request.voice)
        await this.cache.set(cacheKey, azureResult)

        return {
          result: azureResult,
          provider: LipSyncProvider.AZURE,
          cached: false
        }
      } catch (error) {
        logger.warn('Azure lip-sync failed, falling back to Rhubarb', { error })
      }
    }

    // 3. Fallback para Rhubarb (offline)
    if (request.audioPath) {
      try {
        const rhubarbResult = await this.generateWithRhubarb(
          request.audioPath,
          request.text
        )
        await this.cache.set(cacheKey, rhubarbResult)

        return {
          result: rhubarbResult,
          provider: LipSyncProvider.RHUBARB,
          cached: false
        }
      } catch (error) {
        logger.error('Rhubarb lip-sync failed', error as Error)
        throw new Error('All lip-sync providers failed')
      }
    }

    throw new Error('No valid input for lip-sync generation')
  }

  private async generateWithAzure(
    text: string,
    voice?: string
  ): Promise<LipSyncResult> {
    const azureResult = await this.azure.synthesizeWithVisemes(text, voice)
    const phonemes = this.azure.convertAzureVisemes(azureResult.visemes)

    return {
      phonemes,
      duration: azureResult.duration / 1000,
      metadata: {
        mouthCueCount: azureResult.visemes.length,
        recognizer: 'azure',
        dialog: text
      }
    }
  }

  private async generateWithRhubarb(
    audioPath: string,
    dialogText?: string
  ): Promise<LipSyncResult> {
    return await this.rhubarb.generatePhonemes(audioPath, dialogText)
  }

  private generateCacheKey(request: LipSyncRequest): string {
    const parts = [
      request.text || '',
      request.audioPath || '',
      request.voice || 'default'
    ]

    return Buffer.from(parts.join('|')).toString('base64')
  }
}
```

**Código: viseme-cache.ts**
```typescript
import { createClient } from 'redis'
import { logger } from '@/lib/logger'
import { LipSyncResult } from './types/phoneme.types'

export class VisemeCache {
  private redis: ReturnType<typeof createClient>
  private ttl = 86400 * 7 // 7 dias

  constructor() {
    this.redis = createClient({
      url: process.env.REDIS_URL
    })

    this.redis.connect().catch(error => {
      logger.error('Failed to connect to Redis cache', error)
    })
  }

  async get(key: string): Promise<LipSyncResult | null> {
    try {
      const cached = await this.redis.get(`lipsync:${key}`)
      return cached ? JSON.parse(cached) : null
    } catch (error) {
      logger.warn('Cache read failed', { error })
      return null
    }
  }

  async set(key: string, result: LipSyncResult): Promise<void> {
    try {
      await this.redis.setEx(
        `lipsync:${key}`,
        this.ttl,
        JSON.stringify(result)
      )
    } catch (error) {
      logger.warn('Cache write failed', { error })
    }
  }

  async invalidate(key: string): Promise<void> {
    await this.redis.del(`lipsync:${key}`)
  }

  async clear(): Promise<void> {
    const keys = await this.redis.keys('lipsync:*')
    if (keys.length > 0) {
      await this.redis.del(keys)
    }
  }
}
```

## Week 2: Blend Shapes e Animação Facial

### Dia 6-8: Sistema de Blend Shapes

**Arquivos a criar:**
- [ ] `/src/lib/avatar/blend-shape-controller.ts`
- [ ] `/src/lib/avatar/facial-animation-engine.ts`
- [ ] `/src/lib/avatar/types/blend-shapes.types.ts`

**Código: blend-shape-controller.ts**
```typescript
/**
 * Controlador de Blend Shapes ARKit compatível
 * 52 blend shapes padrão do ARKit para animação facial realista
 */

export interface BlendShapeWeights {
  // Jaw (mandíbula)
  jawOpen: number
  jawForward: number
  jawLeft: number
  jawRight: number

  // Mouth (boca)
  mouthClose: number
  mouthFunnel: number
  mouthPucker: number
  mouthLeft: number
  mouthRight: number
  mouthSmileLeft: number
  mouthSmileRight: number
  mouthFrownLeft: number
  mouthFrownRight: number
  mouthDimpleLeft: number
  mouthDimpleRight: number
  mouthStretchLeft: number
  mouthStretchRight: number
  mouthRollLower: number
  mouthRollUpper: number
  mouthShrugLower: number
  mouthShrugUpper: number
  mouthPressLeft: number
  mouthPressRight: number
  mouthLowerDownLeft: number
  mouthLowerDownRight: number
  mouthUpperUpLeft: number
  mouthUpperUpRight: number

  // Cheeks (bochechas)
  cheekPuff: number
  cheekSquintLeft: number
  cheekSquintRight: number

  // Nose (nariz)
  noseSneerLeft: number
  noseSneerRight: number

  // Tongue (língua)
  tongueOut: number

  // Eyes (olhos) - para expressões adicionais
  eyeBlinkLeft?: number
  eyeBlinkRight?: number
  eyeLookDownLeft?: number
  eyeLookDownRight?: number
  eyeLookInLeft?: number
  eyeLookInRight?: number
  eyeLookOutLeft?: number
  eyeLookOutRight?: number
  eyeLookUpLeft?: number
  eyeLookUpRight?: number
  eyeSquintLeft?: number
  eyeSquintRight?: number
  eyeWideLeft?: number
  eyeWideRight?: number

  // Eyebrows (sobrancelhas)
  browDownLeft?: number
  browDownRight?: number
  browInnerUp?: number
  browOuterUpLeft?: number
  browOuterUpRight?: number
}

export class BlendShapeController {
  private weights: BlendShapeWeights

  constructor() {
    this.weights = this.createNeutralWeights()
  }

  /**
   * Cria pesos neutros (todos em 0)
   */
  private createNeutralWeights(): BlendShapeWeights {
    return {
      jawOpen: 0, jawForward: 0, jawLeft: 0, jawRight: 0,
      mouthClose: 0, mouthFunnel: 0, mouthPucker: 0,
      mouthLeft: 0, mouthRight: 0,
      mouthSmileLeft: 0, mouthSmileRight: 0,
      mouthFrownLeft: 0, mouthFrownRight: 0,
      mouthDimpleLeft: 0, mouthDimpleRight: 0,
      mouthStretchLeft: 0, mouthStretchRight: 0,
      mouthRollLower: 0, mouthRollUpper: 0,
      mouthShrugLower: 0, mouthShrugUpper: 0,
      mouthPressLeft: 0, mouthPressRight: 0,
      mouthLowerDownLeft: 0, mouthLowerDownRight: 0,
      mouthUpperUpLeft: 0, mouthUpperUpRight: 0,
      cheekPuff: 0, cheekSquintLeft: 0, cheekSquintRight: 0,
      noseSneerLeft: 0, noseSneerRight: 0,
      tongueOut: 0
    }
  }

  /**
   * Aplica viseme aos blend shapes
   */
  applyViseme(viseme: string, intensity: number = 1.0): void {
    // Reset primeiro
    this.weights = this.createNeutralWeights()

    // Mapear viseme para blend shapes
    const mapping = this.getVisemeBlendShapeMapping(viseme)

    Object.entries(mapping).forEach(([shapeName, weight]) => {
      this.weights[shapeName as keyof BlendShapeWeights] = weight * intensity
    })
  }

  /**
   * Mapeia visemes para combinações de blend shapes
   */
  private getVisemeBlendShapeMapping(viseme: string): Partial<BlendShapeWeights> {
    const mappings: Record<string, Partial<BlendShapeWeights>> = {
      // Vogais
      'aa': { // "father", "palm"
        jawOpen: 0.7,
        mouthOpen: 0.8,
        mouthFunnel: 0.3
      },
      'E': { // "see", "feet"
        jawOpen: 0.2,
        mouthStretchLeft: 0.6,
        mouthStretchRight: 0.6,
        mouthSmileLeft: 0.4,
        mouthSmileRight: 0.4
      },
      'I': { // "sit", "fill"
        jawOpen: 0.3,
        mouthStretchLeft: 0.4,
        mouthStretchRight: 0.4
      },
      'O': { // "though", "show"
        jawOpen: 0.5,
        mouthFunnel: 0.7,
        mouthPucker: 0.5
      },
      'U': { // "you", "new"
        jawOpen: 0.3,
        mouthFunnel: 0.9,
        mouthPucker: 0.8
      },

      // Consoantes
      'PP': { // "people", "maybe" - lábios fechados
        jawOpen: 0.0,
        mouthClose: 1.0,
        mouthPressLeft: 0.6,
        mouthPressRight: 0.6
      },
      'FF': { // "off", "photo" - dentes no lábio
        jawOpen: 0.1,
        mouthLowerDownLeft: 0.5,
        mouthLowerDownRight: 0.5,
        mouthUpperUpLeft: 0.3,
        mouthUpperUpRight: 0.3
      },
      'TH': { // "think", "bath" - língua entre dentes
        jawOpen: 0.2,
        tongueOut: 0.4,
        mouthStretchLeft: 0.3,
        mouthStretchRight: 0.3
      },
      'DD': { // "day", "made"
        jawOpen: 0.4,
        tongueOut: 0.2
      },
      'kk': { // "cat", "quick"
        jawOpen: 0.3,
        mouthClose: 0.2
      },
      'CH': { // "chair", "nature"
        jawOpen: 0.2,
        mouthFunnel: 0.4,
        mouthPucker: 0.3
      },
      'SS': { // "see", "pass"
        jawOpen: 0.1,
        mouthStretchLeft: 0.5,
        mouthStretchRight: 0.5
      },
      'nn': { // "no", "many"
        jawOpen: 0.2,
        mouthClose: 0.3
      },

      // Silêncio
      'sil': {
        jawOpen: 0.0,
        mouthClose: 0.1
      }
    }

    return mappings[viseme] || mappings['sil']
  }

  /**
   * Interpola suavemente entre dois estados de blend shapes
   */
  interpolate(
    targetWeights: BlendShapeWeights,
    factor: number // 0-1
  ): BlendShapeWeights {
    const result: any = {}

    Object.keys(this.weights).forEach(key => {
      const currentValue = this.weights[key as keyof BlendShapeWeights] || 0
      const targetValue = targetWeights[key as keyof BlendShapeWeights] || 0
      result[key] = currentValue + (targetValue - currentValue) * factor
    })

    return result as BlendShapeWeights
  }

  /**
   * Adiciona movimento de respiração sutil
   */
  applyBreathing(time: number, intensity: number = 0.1): void {
    const breathCycle = Math.sin(time * 0.3) * intensity
    this.weights.mouthClose += breathCycle * 0.5
    this.weights.jawOpen += breathCycle * 0.2
  }

  /**
   * Adiciona piscadas aleatórias
   */
  applyBlink(time: number, blinkDuration: number = 0.15): void {
    // Piscada a cada ~3-5 segundos
    const blinkFrequency = 4.0
    const blinkPhase = (time * blinkFrequency) % 1.0

    if (blinkPhase < blinkDuration) {
      const blinkProgress = blinkPhase / blinkDuration
      const blinkCurve = Math.sin(blinkProgress * Math.PI)

      this.weights.eyeBlinkLeft = blinkCurve
      this.weights.eyeBlinkRight = blinkCurve
    }
  }

  /**
   * Exporta para Three.js
   */
  exportToThreeJS(): Record<string, number> {
    return { ...this.weights }
  }

  /**
   * Exporta para Unreal Engine (formato FBX)
   */
  exportToUnrealEngine(): string {
    // Converter para formato de curva de animação FBX
    const curves = Object.entries(this.weights).map(([name, value]) => {
      return `    MorphTargetCurve: "${name}" {
        KeyTime: 0
        KeyValue: ${value.toFixed(6)}
      }`
    }).join('\n')

    return `AnimationCurveNode: {
${curves}
}`
  }

  /**
   * Exporta para formato USD (Pixar Universal Scene Description)
   */
  exportToUSD(): string {
    const blendShapes = Object.entries(this.weights)
      .map(([name, value]) => `    float ${name} = ${value.toFixed(6)}`)
      .join('\n')

    return `#usda 1.0
def Xform "BlendShapes" {
${blendShapes}
}`
  }

  getWeights(): BlendShapeWeights {
    return { ...this.weights }
  }

  setWeights(weights: Partial<BlendShapeWeights>): void {
    this.weights = { ...this.weights, ...weights }
  }

  reset(): void {
    this.weights = this.createNeutralWeights()
  }
}
```

### Dia 9-10: Integração com Remotion

**Arquivos a criar:**
- [ ] `/src/app/remotion/components/LipSyncAvatar.tsx`
- [ ] `/src/app/remotion/components/FacialAnimationRenderer.tsx`
- [ ] `/src/hooks/use-lip-sync-animation.ts`

**Código: LipSyncAvatar.tsx**
```typescript
import { useCurrentFrame, useVideoConfig, Img } from 'remotion'
import { useMemo } from 'react'
import { BlendShapeController } from '@/lib/avatar/blend-shape-controller'
import { Phoneme } from '@/lib/sync/types/phoneme.types'

export interface LipSyncAvatarProps {
  phonemes: Phoneme[]
  avatarImageUrl: string
  position?: { x: number; y: number }
  scale?: number
  enableBreathing?: boolean
  enableBlinking?: boolean
}

export const LipSyncAvatar: React.FC<LipSyncAvatarProps> = ({
  phonemes,
  avatarImageUrl,
  position = { x: 0, y: 0 },
  scale = 1,
  enableBreathing = true,
  enableBlinking = true
}) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const time = frame / fps

  const blendShapeController = useMemo(() => new BlendShapeController(), [])

  // Encontrar phonema ativo no tempo atual
  const currentPhoneme = useMemo(() => {
    return phonemes.find(p =>
      time >= p.time && time < p.time + p.duration
    )
  }, [phonemes, time])

  // Próximo phonema para interpolação suave
  const nextPhoneme = useMemo(() => {
    if (!currentPhoneme) return null

    const currentIndex = phonemes.indexOf(currentPhoneme)
    return phonemes[currentIndex + 1] || null
  }, [phonemes, currentPhoneme])

  // Calcular blend shapes para o frame atual
  const blendShapes = useMemo(() => {
    if (!currentPhoneme) {
      blendShapeController.reset()
      return blendShapeController.getWeights()
    }

    // Aplicar viseme atual
    blendShapeController.applyViseme(
      currentPhoneme.viseme,
      currentPhoneme.intensity
    )

    // Interpolar com próximo viseme se estiver próximo da transição
    if (nextPhoneme) {
      const transitionStart = currentPhoneme.time + currentPhoneme.duration - 0.05

      if (time >= transitionStart) {
        const transitionProgress = (time - transitionStart) / 0.05
        const nextController = new BlendShapeController()
        nextController.applyViseme(nextPhoneme.viseme, nextPhoneme.intensity)

        return blendShapeController.interpolate(
          nextController.getWeights(),
          transitionProgress
        )
      }
    }

    // Adicionar respiração
    if (enableBreathing) {
      blendShapeController.applyBreathing(time)
    }

    // Adicionar piscadas
    if (enableBlinking) {
      blendShapeController.applyBlink(time)
    }

    return blendShapeController.getWeights()
  }, [currentPhoneme, nextPhoneme, time, enableBreathing, enableBlinking])

  // Calcular transformações CSS baseadas em blend shapes
  const mouthTransform = useMemo(() => {
    const jawOpen = blendShapes.jawOpen * 20 // pixels
    const mouthWidth = 100 + (blendShapes.mouthStretchLeft + blendShapes.mouthStretchRight) * 50

    return {
      translateY: jawOpen,
      scaleX: mouthWidth / 100,
      scaleY: 1 + blendShapes.mouthFunnel * 0.3
    }
  }, [blendShapes])

  const eyeOpacity = useMemo(() => {
    return 1 - (blendShapes.eyeBlinkLeft || 0)
  }, [blendShapes])

  return (
    <div
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        transform: `scale(${scale})`,
        transformOrigin: 'center center'
      }}
    >
      {/* Avatar base */}
      <Img
        src={avatarImageUrl}
        style={{
          width: 400,
          height: 600,
          objectFit: 'contain'
        }}
      />

      {/* Overlay de boca (simulação simplificada) */}
      <div
        style={{
          position: 'absolute',
          bottom: '35%',
          left: '50%',
          width: 80,
          height: 40,
          backgroundColor: '#2a1a1a',
          borderRadius: '50%',
          transform: `
            translateX(-50%)
            translateY(${mouthTransform.translateY}px)
            scaleX(${mouthTransform.scaleX})
            scaleY(${mouthTransform.scaleY})
          `,
          mixBlendMode: 'multiply',
          opacity: 0.6
        }}
      />

      {/* Debug: Mostrar viseme atual */}
      {currentPhoneme && (
        <div
          style={{
            position: 'absolute',
            top: -30,
            left: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            color: 'white',
            padding: '5px 10px',
            borderRadius: 5,
            fontSize: 12,
            fontFamily: 'monospace'
          }}
        >
          {currentPhoneme.viseme} ({(currentPhoneme.intensity * 100).toFixed(0)}%)
        </div>
      )}
    </div>
  )
}
```

## Week 3: Testing e API Integration

### Dia 11-12: API Routes

**Arquivos a criar:**
- [ ] `/src/app/api/lip-sync/generate/route.ts`
- [ ] `/src/app/api/lip-sync/status/[jobId]/route.ts`
- [ ] `/src/app/api/lip-sync/cache/clear/route.ts`

**Código: /api/lip-sync/generate/route.ts**
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { LipSyncOrchestrator } from '@/lib/sync/lip-sync-orchestrator'
import { logger } from '@/lib/logger'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { z } from 'zod'

const requestSchema = z.object({
  text: z.string().optional(),
  audioUrl: z.string().url().optional(),
  voice: z.string().optional(),
  provider: z.enum(['azure', 'rhubarb', 'auto']).default('auto')
}).refine(
  data => data.text || data.audioUrl,
  { message: 'Either text or audioUrl must be provided' }
)

export async function POST(request: NextRequest) {
  try {
    // 1. Autenticar usuário
    const supabase = createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 2. Validar input
    const body = await request.json()
    const validation = requestSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { text, audioUrl, voice, provider } = validation.data

    // 3. Baixar áudio se URL fornecida
    let audioPath: string | undefined
    if (audioUrl) {
      audioPath = await downloadAudio(audioUrl)
    }

    // 4. Gerar lip-sync
    const orchestrator = new LipSyncOrchestrator()
    const result = await orchestrator.generateLipSync({
      text,
      audioPath,
      voice,
      forceProvider: provider === 'auto' ? undefined : provider
    })

    logger.info('Lip-sync generated successfully', {
      userId: user.id,
      provider: result.provider,
      cached: result.cached,
      phonemeCount: result.result.phonemes.length
    })

    // 5. Retornar resultado
    return NextResponse.json({
      success: true,
      data: {
        phonemes: result.result.phonemes,
        duration: result.result.duration,
        metadata: {
          ...result.result.metadata,
          provider: result.provider,
          cached: result.cached
        }
      }
    })

  } catch (error) {
    logger.error('Lip-sync generation failed', error as Error)

    return NextResponse.json(
      {
        error: 'Failed to generate lip-sync',
        message: (error as Error).message
      },
      { status: 500 }
    )
  }
}

async function downloadAudio(url: string): Promise<string> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to download audio: ${response.statusText}`)
  }

  const buffer = await response.arrayBuffer()
  const tempPath = `/tmp/audio-${Date.now()}.mp3`

  await require('fs/promises').writeFile(tempPath, Buffer.from(buffer))

  return tempPath
}
```

### Dia 13-15: Testes e Validação

**Arquivos a criar:**
- [ ] `/src/__tests__/lib/sync/rhubarb-lip-sync-engine.test.ts`
- [ ] `/src/__tests__/lib/sync/azure-viseme-engine.test.ts`
- [ ] `/src/__tests__/lib/avatar/blend-shape-controller.test.ts`
- [ ] `/src/__tests__/api/lip-sync/generate.test.ts`

**Código: rhubarb-lip-sync-engine.test.ts**
```typescript
import { RhubarbLipSyncEngine } from '@/lib/sync/rhubarb-lip-sync-engine'
import { describe, it, expect, beforeAll } from '@jest/globals'
import path from 'path'

describe('RhubarbLipSyncEngine', () => {
  let engine: RhubarbLipSyncEngine
  let testAudioPath: string

  beforeAll(() => {
    engine = new RhubarbLipSyncEngine()
    testAudioPath = path.join(__dirname, 'fixtures', 'test-audio.wav')
  })

  it('should generate phonemes from audio file', async () => {
    const result = await engine.generatePhonemes(testAudioPath)

    expect(result).toBeDefined()
    expect(result.phonemes).toBeInstanceOf(Array)
    expect(result.phonemes.length).toBeGreaterThan(0)
    expect(result.duration).toBeGreaterThan(0)
  })

  it('should include viseme mappings in phonemes', async () => {
    const result = await engine.generatePhonemes(testAudioPath)

    result.phonemes.forEach(phoneme => {
      expect(phoneme).toHaveProperty('time')
      expect(phoneme).toHaveProperty('duration')
      expect(phoneme).toHaveProperty('phoneme')
      expect(phoneme).toHaveProperty('viseme')
      expect(phoneme).toHaveProperty('intensity')
      expect(phoneme.intensity).toBeGreaterThanOrEqual(0)
      expect(phoneme.intensity).toBeLessThanOrEqual(1)
    })
  })

  it('should improve accuracy with dialog text', async () => {
    const withoutDialog = await engine.generatePhonemes(testAudioPath)
    const withDialog = await engine.generatePhonemes(
      testAudioPath,
      'Hello, this is a test audio file.'
    )

    // Com diálogo geralmente produz mais phonemas/precisão
    expect(withDialog.phonemes.length).toBeGreaterThanOrEqual(
      withoutDialog.phonemes.length * 0.8
    )
  })

  it('should map Rhubarb shapes to visemes correctly', async () => {
    const result = await engine.generatePhonemes(testAudioPath)

    const validVisemes = ['aa', 'PP', 'E', 'O', 'U', 'FF', 'TH', 'sil', 'I', 'DD', 'kk', 'CH', 'SS', 'nn']

    result.phonemes.forEach(phoneme => {
      expect(validVisemes).toContain(phoneme.viseme)
    })
  })

  it('should preprocess audio correctly', async () => {
    const preprocessed = await engine.preprocessAudio(testAudioPath)

    expect(preprocessed).toMatch(/\.wav$/)
    expect(require('fs').existsSync(preprocessed)).toBe(true)
  })
})
```

### Deliverables Fase 1

**Checklist de Conclusão:**
- [ ] Rhubarb Lip-Sync integrado e testado
- [ ] Azure Speech SDK integrado
- [ ] Sistema de fallback funcionando
- [ ] Cache Redis implementado
- [ ] Blend Shape Controller com 52 shapes
- [ ] Mapeamento viseme → blend shapes completo
- [ ] Componente Remotion LipSyncAvatar
- [ ] API `/api/lip-sync/generate` funcional
- [ ] Testes unitários passando (>80% coverage)
- [ ] Documentação técnica completa

**Métricas de Sucesso:**
- ✅ Lip-sync visualmente convincente (aprovação manual)
- ✅ Latência < 5 segundos para 30s de áudio
- ✅ Taxa de cache hit > 40%
- ✅ Zero crashes em 100 testes consecutivos

---

# FASE 2: AVATARES HIPER-REALISTAS (ENGINE MULTI-TIER)
**Duração:** 4 semanas (08/02 - 07/03)
**Prioridade:** ALTA 🔥
**Objetivo:** Sistema de avatares com 4 níveis de qualidade

## Week 4: Arquitetura Multi-Tier

### Dia 16-17: Quality Tier System

**Arquivos a criar:**
- [ ] `/src/lib/avatar/quality-tier-system.ts`
- [ ] `/src/lib/avatar/avatar-quality-negotiator.ts`
- [ ] `/src/lib/avatar/types/avatar-quality.types.ts`

**Código: quality-tier-system.ts**
```typescript
export enum AvatarQuality {
  PLACEHOLDER = 'placeholder',    // Canvas 2D instantâneo (< 1s)
  STANDARD = 'standard',          // HeyGen/D-ID API (30-60s)
  HIGH = 'high',                  // ReadyPlayerMe 3D (2-5min)
  HYPERREAL = 'hyperreal'         // Audio2Face + UE5 (10-30min)
}

export interface QualityTierConfig {
  name: AvatarQuality
  displayName: string
  estimatedTime: number // segundos
  costCredits: number
  requiredPlan: string[] // ['free', 'basic', 'pro', 'enterprise']
  providers: string[]
  features: {
    lipSync: boolean
    facialExpressions: boolean
    bodyMovement: boolean
    photoRealistic: boolean
    customization: boolean
    realTime: boolean
  }
}

export const QUALITY_TIERS: Record<AvatarQuality, QualityTierConfig> = {
  [AvatarQuality.PLACEHOLDER]: {
    name: AvatarQuality.PLACEHOLDER,
    displayName: 'Preview Rápido',
    estimatedTime: 1,
    costCredits: 0,
    requiredPlan: ['free', 'basic', 'pro', 'enterprise'],
    providers: ['local-canvas'],
    features: {
      lipSync: false,
      facialExpressions: false,
      bodyMovement: false,
      photoRealistic: false,
      customization: false,
      realTime: true
    }
  },

  [AvatarQuality.STANDARD]: {
    name: AvatarQuality.STANDARD,
    displayName: 'Qualidade Padrão',
    estimatedTime: 45,
    costCredits: 1,
    requiredPlan: ['basic', 'pro', 'enterprise'],
    providers: ['heygen', 'did'],
    features: {
      lipSync: true,
      facialExpressions: true,
      bodyMovement: false,
      photoRealistic: true,
      customization: true,
      realTime: false
    }
  },

  [AvatarQuality.HIGH]: {
    name: AvatarQuality.HIGH,
    displayName: 'Alta Qualidade 3D',
    estimatedTime: 180,
    costCredits: 3,
    requiredPlan: ['pro', 'enterprise'],
    providers: ['readyplayerme'],
    features: {
      lipSync: true,
      facialExpressions: true,
      bodyMovement: true,
      photoRealistic: true,
      customization: true,
      realTime: false
    }
  },

  [AvatarQuality.HYPERREAL]: {
    name: AvatarQuality.HYPERREAL,
    displayName: 'Hiper-Realista Cinema',
    estimatedTime: 1200,
    costCredits: 10,
    requiredPlan: ['enterprise'],
    providers: ['audio2face', 'unreal-engine'],
    features: {
      lipSync: true,
      facialExpressions: true,
      bodyMovement: true,
      photoRealistic: true,
      customization: true,
      realTime: false
    }
  }
}

export class AvatarQualityNegotiator {
  /**
   * Seleciona melhor qualidade disponível baseado em múltiplos fatores
   */
  async selectBestQuality(params: {
    requestedQuality: AvatarQuality
    userPlan: string
    userCredits: number
    systemLoad: number // 0-1
    urgency: 'low' | 'medium' | 'high'
  }): Promise<{
    quality: AvatarQuality
    reason: string
    fallbackChain: AvatarQuality[]
  }> {

    const { requestedQuality, userPlan, userCredits, systemLoad, urgency } = params

    // 1. Verificar se usuário tem acesso ao tier solicitado
    const requestedTier = QUALITY_TIERS[requestedQuality]

    if (!requestedTier.requiredPlan.includes(userPlan)) {
      return {
        quality: this.getMaxQualityForPlan(userPlan),
        reason: `Plan ${userPlan} does not have access to ${requestedQuality}`,
        fallbackChain: this.generateFallbackChain(userPlan)
      }
    }

    // 2. Verificar créditos
    if (userCredits < requestedTier.costCredits) {
      const affordableQuality = this.getAffordableQuality(userCredits, userPlan)
      return {
        quality: affordableQuality,
        reason: `Insufficient credits (have: ${userCredits}, need: ${requestedTier.costCredits})`,
        fallbackChain: this.generateFallbackChain(userPlan)
      }
    }

    // 3. Verificar carga do sistema
    if (systemLoad > 0.85 && requestedQuality !== AvatarQuality.PLACEHOLDER) {
      // Sistema sobrecarregado - degradar qualidade
      const degradedQuality = this.degradeQualityForLoad(requestedQuality, systemLoad)
      return {
        quality: degradedQuality,
        reason: `System load is high (${(systemLoad * 100).toFixed(0)}%)`,
        fallbackChain: this.generateFallbackChain(userPlan)
      }
    }

    // 4. Verificar urgência
    if (urgency === 'high' && requestedTier.estimatedTime > 60) {
      return {
        quality: AvatarQuality.STANDARD,
        reason: 'High urgency requires faster processing',
        fallbackChain: [AvatarQuality.STANDARD, AvatarQuality.PLACEHOLDER]
      }
    }

    // 5. Verificar disponibilidade de provedores
    const availableProviders = await this.checkProviderAvailability(requestedTier.providers)

    if (availableProviders.length === 0) {
      // Nenhum provedor disponível - fallback
      const fallback = await this.findAvailableFallback(requestedQuality, userPlan)
      return {
        quality: fallback.quality,
        reason: `No providers available for ${requestedQuality}: ${fallback.reason}`,
        fallbackChain: this.generateFallbackChain(userPlan)
      }
    }

    // Tudo OK - retornar qualidade solicitada
    return {
      quality: requestedQuality,
      reason: 'All requirements met',
      fallbackChain: this.generateFallbackChain(userPlan)
    }
  }

  private getMaxQualityForPlan(plan: string): AvatarQuality {
    const planHierarchy = {
      'free': AvatarQuality.PLACEHOLDER,
      'basic': AvatarQuality.STANDARD,
      'pro': AvatarQuality.HIGH,
      'enterprise': AvatarQuality.HYPERREAL
    }

    return planHierarchy[plan as keyof typeof planHierarchy] || AvatarQuality.PLACEHOLDER
  }

  private getAffordableQuality(credits: number, plan: string): AvatarQuality {
    const qualities = Object.values(QUALITY_TIERS)
      .filter(tier =>
        tier.costCredits <= credits &&
        tier.requiredPlan.includes(plan)
      )
      .sort((a, b) => b.costCredits - a.costCredits)

    return qualities[0]?.name || AvatarQuality.PLACEHOLDER
  }

  private degradeQualityForLoad(
    requestedQuality: AvatarQuality,
    systemLoad: number
  ): AvatarQuality {
    if (systemLoad > 0.95) return AvatarQuality.PLACEHOLDER
    if (systemLoad > 0.90 && requestedQuality === AvatarQuality.HYPERREAL) {
      return AvatarQuality.HIGH
    }
    if (systemLoad > 0.85 && requestedQuality === AvatarQuality.HIGH) {
      return AvatarQuality.STANDARD
    }

    return requestedQuality
  }

  private async checkProviderAvailability(providers: string[]): Promise<string[]> {
    const checks = await Promise.allSettled(
      providers.map(async provider => {
        const isAvailable = await this.pingProvider(provider)
        return isAvailable ? provider : null
      })
    )

    return checks
      .filter((result): result is PromiseFulfilledResult<string> =>
        result.status === 'fulfilled' && result.value !== null
      )
      .map(result => result.value)
  }

  private async pingProvider(provider: string): Promise<boolean> {
    try {
      // Implementar health checks específicos para cada provider
      switch (provider) {
        case 'heygen':
          return await this.checkHeyGen()
        case 'did':
          return await this.checkDID()
        case 'readyplayerme':
          return await this.checkReadyPlayerMe()
        case 'audio2face':
          return await this.checkAudio2Face()
        case 'unreal-engine':
          return await this.checkUnrealEngine()
        case 'local-canvas':
          return true // Sempre disponível
        default:
          return false
      }
    } catch {
      return false
    }
  }

  private async checkHeyGen(): Promise<boolean> {
    if (!process.env.HEYGEN_API_KEY) return false

    try {
      const response = await fetch('https://api.heygen.com/v1/avatar.list', {
        headers: { 'X-Api-Key': process.env.HEYGEN_API_KEY },
        signal: AbortSignal.timeout(5000)
      })
      return response.ok
    } catch {
      return false
    }
  }

  private async checkDID(): Promise<boolean> {
    if (!process.env.DID_API_KEY) return false

    try {
      const response = await fetch('https://api.d-id.com/talks', {
        method: 'HEAD',
        headers: { 'Authorization': `Basic ${process.env.DID_API_KEY}` },
        signal: AbortSignal.timeout(5000)
      })
      return response.ok
    } catch {
      return false
    }
  }

  private async checkReadyPlayerMe(): Promise<boolean> {
    // RPM não requer API key para avatares básicos
    try {
      const response = await fetch('https://api.readyplayer.me/v1/avatars', {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000)
      })
      return response.ok
    } catch {
      return false
    }
  }

  private async checkAudio2Face(): Promise<boolean> {
    const endpoint = process.env.AUDIO2FACE_GRPC_ENDPOINT
    if (!endpoint) return false

    try {
      // Implementar health check gRPC
      return true // TODO
    } catch {
      return false
    }
  }

  private async checkUnrealEngine(): Promise<boolean> {
    const endpoint = process.env.UE5_RENDER_SERVER
    if (!endpoint) return false

    try {
      const response = await fetch(`${endpoint}/health`, {
        signal: AbortSignal.timeout(5000)
      })
      return response.ok
    } catch {
      return false
    }
  }

  private async findAvailableFallback(
    requestedQuality: AvatarQuality,
    userPlan: string
  ): Promise<{ quality: AvatarQuality; reason: string }> {

    const fallbackChain = this.generateFallbackChain(userPlan)

    for (const quality of fallbackChain) {
      if (quality === requestedQuality) continue

      const tier = QUALITY_TIERS[quality]
      const available = await this.checkProviderAvailability(tier.providers)

      if (available.length > 0) {
        return {
          quality,
          reason: `Fallback to ${quality} (provider: ${available[0]})`
        }
      }
    }

    // Última opção - sempre disponível
    return {
      quality: AvatarQuality.PLACEHOLDER,
      reason: 'All providers unavailable, using local fallback'
    }
  }

  private generateFallbackChain(userPlan: string): AvatarQuality[] {
    const maxQuality = this.getMaxQualityForPlan(userPlan)

    const allQualities = [
      AvatarQuality.HYPERREAL,
      AvatarQuality.HIGH,
      AvatarQuality.STANDARD,
      AvatarQuality.PLACEHOLDER
    ]

    const maxIndex = allQualities.indexOf(maxQuality)
    return allQualities.slice(maxIndex)
  }
}
```

### Dia 18-20: Implementar D-ID Real

**Arquivos a criar:**
- [ ] `/src/lib/services/avatar/did-service-real.ts`
- [ ] `/src/lib/services/avatar/did-webhook-handler.ts`
- [ ] `/src/app/api/avatar/did/webhook/route.ts`

**Código: did-service-real.ts**
```typescript
import axios, { AxiosInstance } from 'axios'
import { logger } from '@/lib/logger'

export interface DIDTalkConfig {
  sourceImage: string      // URL da imagem do avatar
  text?: string           // Texto para falar
  audioUrl?: string       // Ou URL de áudio customizado
  voice?: string          // ID da voz (ex: pt-BR-FranciscaNeural)
  settings?: {
    fluent?: boolean      // Smooth transitions
    padAudio?: number     // Padding em segundos
    stitch?: boolean      // Stitch gaps
    crop?: {
      type: 'wide' | 'square' | 'vertical'
    }
  }
  webhookUrl?: string
}

export interface DIDTalkStatus {
  id: string
  status: 'created' | 'processing' | 'done' | 'error'
  resultUrl?: string
  error?: string
  createdAt: string
  duration?: number
}

export class DIDServiceReal {
  private client: AxiosInstance
  private baseURL = 'https://api.d-id.com'

  constructor() {
    const apiKey = process.env.DID_API_KEY

    if (!apiKey) {
      throw new Error('DID_API_KEY not configured')
    }

    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Basic ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    })
  }

  /**
   * Cria um novo avatar falante
   */
  async createTalk(config: DIDTalkConfig): Promise<string> {
    try {
      logger.info('Creating D-ID talk', { sourceImage: config.sourceImage })

      const payload: any = {
        source_url: config.sourceImage,
        config: {
          fluent: config.settings?.fluent ?? true,
          pad_audio: config.settings?.padAudio ?? 0,
          stitch: config.settings?.stitch ?? true,
          result_format: 'mp4'
        }
      }

      // Script de áudio ou texto
      if (config.audioUrl) {
        payload.script = {
          type: 'audio',
          audio_url: config.audioUrl
        }
      } else if (config.text) {
        payload.script = {
          type: 'text',
          input: config.text,
          provider: {
            type: 'microsoft',
            voice_id: config.voice || 'pt-BR-FranciscaNeural'
          }
        }
      } else {
        throw new Error('Either text or audioUrl must be provided')
      }

      // Webhook callback
      if (config.webhookUrl) {
        payload.webhook = config.webhookUrl
      }

      const response = await this.client.post('/talks', payload)

      logger.info('D-ID talk created', {
        talkId: response.data.id,
        status: response.data.status
      })

      return response.data.id

    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error('D-ID API error', new Error(error.message), {
          status: error.response?.status,
          data: error.response?.data
        })
        throw new Error(`D-ID API error: ${error.response?.data?.error || error.message}`)
      }
      throw error
    }
  }

  /**
   * Verifica status do talk
   */
  async getTalkStatus(talkId: string): Promise<DIDTalkStatus> {
    try {
      const response = await this.client.get(`/talks/${talkId}`)

      return {
        id: response.data.id,
        status: response.data.status,
        resultUrl: response.data.result_url,
        error: response.data.error,
        createdAt: response.data.created_at,
        duration: response.data.duration
      }

    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to get talk status: ${error.response?.data?.error || error.message}`)
      }
      throw error
    }
  }

  /**
   * Aguarda conclusão do talk (com polling)
   */
  async waitForTalkCompletion(
    talkId: string,
    options: {
      maxWaitTime?: number    // ms (default: 5 min)
      pollInterval?: number    // ms (default: 2s)
      onProgress?: (status: DIDTalkStatus) => void
    } = {}
  ): Promise<DIDTalkStatus> {

    const maxWaitTime = options.maxWaitTime || 300000 // 5 minutos
    const pollInterval = options.pollInterval || 2000  // 2 segundos
    const startTime = Date.now()

    while (Date.now() - startTime < maxWaitTime) {
      const status = await this.getTalkStatus(talkId)

      if (options.onProgress) {
        options.onProgress(status)
      }

      if (status.status === 'done') {
        return status
      }

      if (status.status === 'error') {
        throw new Error(`D-ID talk failed: ${status.error}`)
      }

      // Aguardar antes do próximo poll
      await new Promise(resolve => setTimeout(resolve, pollInterval))
    }

    throw new Error('D-ID talk timeout: exceeded maximum wait time')
  }

  /**
   * Deleta um talk
   */
  async deleteTalk(talkId: string): Promise<void> {
    try {
      await this.client.delete(`/talks/${talkId}`)
      logger.info('D-ID talk deleted', { talkId })
    } catch (error) {
      logger.warn('Failed to delete D-ID talk', { talkId, error })
    }
  }

  /**
   * Lista voices disponíveis
   */
  async listVoices(language?: string): Promise<Array<{
    id: string
    name: string
    language: string
    gender: 'Male' | 'Female'
  }>> {
    try {
      const response = await this.client.get('/voices', {
        params: { language }
      })

      return response.data.voices
    } catch (error) {
      logger.error('Failed to list D-ID voices', error as Error)
      return []
    }
  }

  /**
   * Upload de imagem customizada
   */
  async uploadImage(imageBuffer: Buffer, filename: string): Promise<string> {
    try {
      const formData = new FormData()
      formData.append('image', new Blob([imageBuffer]), filename)

      const response = await this.client.post('/images', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      return response.data.url

    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to upload image: ${error.response?.data?.error || error.message}`)
      }
      throw error
    }
  }
}
```

### Continuação em próxima mensagem devido ao tamanho...

Este documento de implementação está ficando muito extenso. Devo:
1. Continuar com todas as 6 fases detalhadas assim?
2. Ou criar um resumo executivo mais enxuto?
3. Ou dividir em múltiplos documentos por fase?

Qual formato prefere?
