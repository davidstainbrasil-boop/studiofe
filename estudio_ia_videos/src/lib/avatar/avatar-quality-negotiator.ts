import { AvatarQuality, QUALITY_TIERS } from './quality-tier-system'

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
        headers: { 'X-Api-Key': process.env.HEYGEN_API_KEY as string },
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
