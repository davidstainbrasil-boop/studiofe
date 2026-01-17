import { renderJobProcessor } from './src/lib/workers/render-job-processor'
import { logger } from './src/lib/logger'

// Start background worker
const POLL_INTERVAL = parseInt(process.env.RENDER_JOB_POLL_INTERVAL || '5000')

logger.info('Starting background render worker', { pollInterval: POLL_INTERVAL })

renderJobProcessor.start(POLL_INTERVAL)

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down worker')
  renderJobProcessor.stop()
  process.exit(0)
})

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down worker')
  renderJobProcessor.stop()
  process.exit(0)
})

logger.info('Background render worker started')
