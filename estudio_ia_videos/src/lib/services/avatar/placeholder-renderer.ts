import { AvatarGenerationParams, AvatarGenerationResult, IAvatarRenderer } from '@/lib/avatar/avatar-renderer-factory'
import { logger } from '@/lib/logger'

export class PlaceholderAvatarRenderer implements IAvatarRenderer {
  async generate(params: AvatarGenerationParams): Promise<AvatarGenerationResult> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Placeholder renderer is disabled in production');
    }
    logger.info('Generating Placeholder Avatar', { userId: params.userId })

    // Placeholder generation is instant (or near instant)
    // It might just return a static image URL wrapped as a "video" or a simple CSS animation definition
    
    return {
      jobId: `placeholder-${Date.now()}`,
      status: 'completed',
      videoUrl: params.sourceImageUrl || 'https://assets.example.com/default-avatar.png',
      cost: 0
    }
  }

  async checkStatus(jobId: string): Promise<AvatarGenerationResult> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Placeholder renderer is disabled in production');
    }
    return {
      jobId,
      status: 'completed',
      cost: 0
    }
  }

  async validateConfig(params: AvatarGenerationParams): Promise<boolean> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Placeholder renderer is disabled in production');
    }
    // Placeholder is very permissive
    return true
  }
}
