import { RhubarbLipSyncEngine } from './rhubarb-lip-sync-engine'
import { AzureVisemeEngine } from './azure-viseme-engine'
import { VisemeCache } from './viseme-cache'
import { logger } from '@/lib/logger'
import { Phoneme, LipSyncResult } from './types/phoneme.types'
import { Buffer } from 'buffer'

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
