/**
 * Avatar Render Orchestrator
 * Manages multi-tier avatar rendering system
 * Handles provider selection, fallback, credit management, and job queuing
 */

import { logger } from '@/lib/logger'
import { PlaceholderAdapter } from './providers/placeholder-adapter'
import { DIDAdapter } from './providers/did-adapter'
import { HeyGenAdapter } from './providers/heygen-adapter'
import { RPMAdapter } from './providers/rpm-adapter'
import {
  type BaseAvatarProvider,
  type AvatarQuality,
  type RenderRequest,
  type RenderResult,
  type JobStatus
} from './providers/base-avatar-provider'

export interface OrchestratorConfig {
  enableFallback?: boolean
  maxRetries?: number
  preferredProvider?: string
  userId?: string
}

export interface UserCredits {
  available: number
  used: number
  limit: number
}

export class AvatarRenderOrchestrator {
  private providers: Map<AvatarQuality, BaseAvatarProvider>
  private providerHealth: Map<string, boolean> = new Map()
  private config: OrchestratorConfig

  constructor(config: OrchestratorConfig = {}) {
    this.config = {
      enableFallback: config.enableFallback !== false,
      maxRetries: config.maxRetries || 3,
      ...config
    }

    // Initialize providers
    this.providers = new Map<AvatarQuality, BaseAvatarProvider>()
    this.providers.set('PLACEHOLDER', new PlaceholderAdapter())
    this.providers.set('STANDARD', new DIDAdapter() as BaseAvatarProvider)
    // Can use either D-ID or HeyGen for STANDARD, HeyGen is backup
    // this.providers.set('STANDARD', new HeyGenAdapter() as BaseAvatarProvider)
    this.providers.set('HIGH', new RPMAdapter() as BaseAvatarProvider)

    // Initialize health checks
    this.initializeHealthChecks()
  }

  /**
   * Render avatar with automatic provider selection
   */
  async render(
    request: RenderRequest,
    userCredits?: UserCredits
  ): Promise<RenderResult> {
    const requestedQuality = request.animation.metadata.quality as AvatarQuality
    const startTime = Date.now()

    logger.info('[AvatarRenderOrchestrator] Starting render', {
      quality: requestedQuality,
      duration: request.animation.duration,
      userId: this.config.userId,
      userCredits
    })

    try {
      // Step 1: Select provider
      const provider = await this.selectProvider(requestedQuality, userCredits)

      if (!provider) {
        throw new Error('No available provider for requested quality')
      }

      logger.info('[AvatarRenderOrchestrator] Provider selected', {
        provider: provider.name,
        quality: provider.quality
      })

      // Step 2: Check credits
      const creditsRequired = provider.calculateCredits(request.animation.duration)

      if (userCredits && userCredits.available < creditsRequired) {
        // Try to fallback to cheaper provider
        if (this.config.enableFallback) {
          logger.warn('[AvatarRenderOrchestrator] Insufficient credits, attempting fallback', {
            required: creditsRequired,
            available: userCredits.available
          })

          const fallbackProvider = await this.getFallbackProvider(provider.quality, userCredits)
          if (fallbackProvider) {
            return await this.renderWithProvider(fallbackProvider, request)
          }
        }

        throw new Error(`Insufficient credits: need ${creditsRequired}, have ${userCredits.available}`)
      }

      // Step 3: Render
      return await this.renderWithProvider(provider, request)

    } catch (error) {
      logger.error('[AvatarRenderOrchestrator] Render failed', error as Error)

      // Try fallback on error
      if (this.config.enableFallback) {
        return await this.handleRenderFailure(request, error as Error)
      }

      throw error
    }
  }

  /**
   * Render with specific provider (with retry logic)
   */
  private async renderWithProvider(
    provider: BaseAvatarProvider,
    request: RenderRequest,
    retryCount: number = 0
  ): Promise<RenderResult> {
    try {
      const result = await provider.render(request)

      // Update health status
      this.providerHealth.set(provider.name, true)

      return result

    } catch (error) {
      logger.error('[AvatarRenderOrchestrator] Provider render failed', error instanceof Error ? error : undefined, {
        provider: provider.name,
        errorMessage: (error as Error).message,
        retryCount
      })

      // Update health status
      this.providerHealth.set(provider.name, false)

      // Retry logic
      if (retryCount < (this.config.maxRetries || 3)) {
        logger.info('[AvatarRenderOrchestrator] Retrying render', {
          provider: provider.name,
          attempt: retryCount + 1
        })

        // Exponential backoff
        await this.sleep(Math.pow(2, retryCount) * 1000)

        return await this.renderWithProvider(provider, request, retryCount + 1)
      }

      throw error
    }
  }

  /**
   * Select best provider for quality tier
   */
  private async selectProvider(
    quality: AvatarQuality,
    userCredits?: UserCredits
  ): Promise<BaseAvatarProvider | null> {
    // Get provider for requested quality
    let provider = this.providers.get(quality)

    // Check if provider is healthy
    if (provider) {
      const isHealthy = await this.isProviderHealthy(provider)

      if (!isHealthy && this.config.enableFallback) {
        logger.warn('[AvatarRenderOrchestrator] Provider unhealthy, trying fallback', {
          provider: provider.name
        })
        return await this.getFallbackProvider(quality, userCredits)
      }

      return provider
    }

    // No provider found for quality, try fallback
    if (this.config.enableFallback) {
      return await this.getFallbackProvider(quality, userCredits)
    }

    return null
  }

  /**
   * Get fallback provider
   */
  private async getFallbackProvider(
    requestedQuality: AvatarQuality,
    userCredits?: UserCredits
  ): Promise<BaseAvatarProvider | null> {
    // Fallback order: HIGH -> STANDARD -> PLACEHOLDER
    const fallbackOrder: AvatarQuality[] = ['HIGH', 'STANDARD', 'PLACEHOLDER']
    const startIndex = fallbackOrder.indexOf(requestedQuality)

    // Try lower quality providers
    for (let i = startIndex + 1; i < fallbackOrder.length; i++) {
      const quality = fallbackOrder[i]
      const provider = this.providers.get(quality)

      if (provider) {
        const isHealthy = await this.isProviderHealthy(provider)

        if (isHealthy) {
          // Check if user has credits
          if (userCredits) {
            const creditsNeeded = provider.creditsPerSecond * 30 // Estimate for 30s
            if (creditsNeeded <= userCredits.available) {
              logger.info('[AvatarRenderOrchestrator] Fallback provider selected', {
                original: requestedQuality,
                fallback: quality,
                provider: provider.name
              })
              return provider
            }
          } else {
            return provider
          }
        }
      }
    }

    // Last resort: PLACEHOLDER (always available, no credits)
    return this.providers.get('PLACEHOLDER') || null
  }

  /**
   * Handle render failure with fallback
   */
  private async handleRenderFailure(
    request: RenderRequest,
    error: Error
  ): Promise<RenderResult> {
    logger.warn('[AvatarRenderOrchestrator] Attempting fallback after failure', {
      error: error.message
    })

    const quality = request.animation.metadata.quality as AvatarQuality
    const fallbackProvider = await this.getFallbackProvider(quality)

    if (fallbackProvider) {
      logger.info('[AvatarRenderOrchestrator] Using fallback provider', {
        provider: fallbackProvider.name
      })

      return await this.renderWithProvider(fallbackProvider, request)
    }

    // No fallback available
    return {
      jobId: `failed-${Date.now()}`,
      status: 'failed',
      error: `All providers failed: ${error.message}`,
      metadata: {
        provider: 'none',
        quality: quality,
        creditsUsed: 0
      }
    }
  }

  /**
   * Get job status from any provider
   */
  async getJobStatus(jobId: string): Promise<JobStatus> {
    // Determine provider from jobId prefix
    if (jobId.startsWith('placeholder-')) {
      const provider = this.providers.get('PLACEHOLDER')
      return provider!.getStatus(jobId)
    } else if (jobId.startsWith('rpm-')) {
      const provider = this.providers.get('HIGH')
      return provider!.getStatus(jobId)
    } else {
      // Try STANDARD providers (D-ID/HeyGen)
      const provider = this.providers.get('STANDARD')
      return provider!.getStatus(jobId)
    }
  }

  /**
   * Cancel job
   */
  async cancelJob(jobId: string): Promise<void> {
    // Determine provider and cancel
    if (jobId.startsWith('placeholder-')) {
      const provider = this.providers.get('PLACEHOLDER')
      await provider!.cancel(jobId)
    } else if (jobId.startsWith('rpm-')) {
      const provider = this.providers.get('HIGH')
      await provider!.cancel(jobId)
    } else {
      const provider = this.providers.get('STANDARD')
      await provider!.cancel(jobId)
    }
  }

  /**
   * Check if provider is healthy
   */
  private async isProviderHealthy(provider: BaseAvatarProvider): Promise<boolean> {
    // Check cached health status
    const cachedHealth = this.providerHealth.get(provider.name)
    if (cachedHealth !== undefined) {
      return cachedHealth
    }

    // Perform health check
    try {
      const isHealthy = await provider.healthCheck()
      this.providerHealth.set(provider.name, isHealthy)
      return isHealthy
    } catch (error) {
      logger.error('[AvatarRenderOrchestrator] Health check failed', error instanceof Error ? error : undefined, {
        provider: provider.name,
        errorMessage: (error as Error).message
      })
      this.providerHealth.set(provider.name, false)
      return false
    }
  }

  /**
   * Initialize health checks for all providers
   */
  private async initializeHealthChecks(): Promise<void> {
    logger.info('[AvatarRenderOrchestrator] Initializing health checks')

    for (const [quality, provider] of this.providers) {
      try {
        const isHealthy = await provider.healthCheck()
        this.providerHealth.set(provider.name, isHealthy)

        logger.info('[AvatarRenderOrchestrator] Provider health check', {
          provider: provider.name,
          quality,
          isHealthy
        })
      } catch (error) {
        logger.error('[AvatarRenderOrchestrator] Health check failed', error instanceof Error ? error : undefined, {
          provider: provider.name,
          errorMessage: (error as Error).message
        })
        this.providerHealth.set(provider.name, false)
      }
    }
  }

  /**
   * Get all provider statuses
   */
  getProviderStatuses(): Array<{
    name: string
    quality: AvatarQuality
    isHealthy: boolean
    capabilities: any
  }> {
    const statuses: Array<any> = []

    for (const [quality, provider] of this.providers) {
      statuses.push({
        name: provider.name,
        quality,
        isHealthy: this.providerHealth.get(provider.name) || false,
        capabilities: provider.getCapabilities()
      })
    }

    return statuses
  }

  /**
   * Calculate cost for rendering
   */
  calculateRenderCost(
    duration: number,
    quality: AvatarQuality
  ): {
    credits: number
    estimatedTime: number
    provider: string
  } | null {
    const provider = this.providers.get(quality)

    if (!provider) {
      return null
    }

    return {
      credits: provider.calculateCredits(duration),
      estimatedTime: provider.calculateEstimatedTime(duration),
      provider: provider.name
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
