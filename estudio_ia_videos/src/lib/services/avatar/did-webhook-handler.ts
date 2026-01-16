import { logger } from '@/lib/logger'
import { PrismaClient } from '@prisma/client'

// Use a singleton Prisma instance if available or create new one
const prisma = new PrismaClient()

export interface DIDWebhookPayload {
  id: string
  status: 'created' | 'processing' | 'done' | 'error'
  result_url?: string
  error?: any
  metadata?: any
}

export class DIDWebhookHandler {
  /**
   * Process incoming webhook from D-ID
   */
  async handleWebhook(payload: DIDWebhookPayload): Promise<void> {
    logger.info('Received D-ID webhook', { id: payload.id, status: payload.status })

    try {
      // Find the job associated with this D-ID talk ID
      // Note: In a real implementation we would have a 'jobs' table or 'avatar_generations' table
      // For now, we'll log what we would do or update a generic 'job' record if we have one.
      
      // Example DB update:
      /*
      await prisma.avatarGeneration.update({
        where: { providerJobId: payload.id },
        data: {
          status: payload.status === 'done' ? 'completed' : 'failed',
          videoUrl: payload.result_url,
          error: payload.error ? JSON.stringify(payload.error) : null,
          updatedAt: new Date()
        }
      })
      */
     
     if (payload.status === 'done' && payload.result_url) {
        logger.info('Avatar generation completed successfully', { 
            jobId: payload.id, 
            url: payload.result_url 
        })
        // Trigger any follow-up actions here (e.g. notify user via websocket)
     } else if (payload.status === 'error') {
        logger.error('Avatar generation failed', new Error(String(payload.error)), { 
            jobId: payload.id
        })
     }

    } catch (error) {
      logger.error('Failed to process D-ID webhook', error as Error)
      throw error
    }
  }
}
