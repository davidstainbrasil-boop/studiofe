import { AvatarQuality } from './quality-tier-system'
import { PlaceholderAvatarRenderer } from '@/lib/services/avatar/placeholder-renderer'
import { DIDServiceReal } from '@/lib/services/avatar/did-service-real'
import { ReadyPlayerMeService } from '@/lib/services/avatar/ready-player-me-service'

export interface AvatarGenerationParams {
  userId: string
  text?: string
  audioUrl?: string
  sourceImageUrl?: string
  voiceId?: string
  quality: AvatarQuality
  metadata?: Record<string, any>
}

export interface AvatarGenerationResult {
  jobId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  videoUrl?: string
  error?: string
  cost: number
}

export interface IAvatarRenderer {
  generate(params: AvatarGenerationParams): Promise<AvatarGenerationResult>
  checkStatus(jobId: string): Promise<AvatarGenerationResult>
  validateConfig(params: AvatarGenerationParams): Promise<boolean>
}

export class AvatarRendererFactory {
  getRenderer(quality: AvatarQuality): IAvatarRenderer {
    switch (quality) {
      case AvatarQuality.PLACEHOLDER:
        return new PlaceholderAvatarRenderer()
      case AvatarQuality.STANDARD:
        return new DIDAvatarRendererAdapter()
      case AvatarQuality.HIGH:
        return new ReadyPlayerMeRendererAdapter()
      case AvatarQuality.HYPERREAL:
        throw new Error('HyperReal renderer not implemented yet')
      default:
        throw new Error(`Renderer for quality ${quality} not supported`)
    }
  }
}

// Adapters to match IAvatarRenderer interface

class DIDAvatarRendererAdapter implements IAvatarRenderer {
    private service = new DIDServiceReal()

    async generate(params: AvatarGenerationParams): Promise<AvatarGenerationResult> {
      if (!params.sourceImageUrl) throw new Error('Source image required for D-ID')
      
      const didId = await this.service.createTalk({
          sourceImage: params.sourceImageUrl,
          text: params.text,
          audioUrl: params.audioUrl,
          voice: params.voiceId
      })

      return {
        jobId: didId,
        status: 'pending',
        cost: 1
      }
    }

    async checkStatus(jobId: string): Promise<AvatarGenerationResult> {
        const result = await this.service.getTalkStatus(jobId)
        return {
            jobId,
            status: result.status === 'done' ? 'completed' : result.status === 'error' ? 'failed' : 'processing',
            videoUrl: result.resultUrl,
            error: result.error,
            cost: 1
        }
    }

    async validateConfig(params: AvatarGenerationParams): Promise<boolean> {
        return !!params.sourceImageUrl
    }
}

class ReadyPlayerMeRendererAdapter implements IAvatarRenderer {
    private service = new ReadyPlayerMeService()

    async generate(params: AvatarGenerationParams): Promise<AvatarGenerationResult> {
        const jobId = await this.service.createVideo(params)
        return {
            jobId,
            status: 'processing',
            cost: 3
        }
    }
    
    async checkStatus(jobId: string): Promise<AvatarGenerationResult> {
        return this.service.getStatus(jobId)
    }

    async validateConfig(params: AvatarGenerationParams): Promise<boolean> {
        return !!params.sourceImageUrl
    }
}
