#!/usr/bin/env tsx
/**
 * Video Render Worker Startup Script - Fase 4
 * Inicia workers distribuídos para processar jobs de rendering
 */

import { videoQueueManager } from '../src/lib/queue/video-queue-manager'
import { createVideoWorker } from '../src/lib/workers/distributed-video-worker'
import os from 'os'

// ============================================================================
// CONFIGURATION
// ============================================================================

const WORKER_COUNT = parseInt(process.env.WORKER_COUNT || String(os.cpus().length))
const CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY || '2')

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║           🎬 VIDEO RENDER WORKER - FASE 4 🎬                 ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝

📊 Configuration:
   Workers:      ${WORKER_COUNT}
   Concurrency:  ${CONCURRENCY} jobs per worker
   CPU Cores:    ${os.cpus().length}
   Memory:       ${Math.round(os.totalmem() / 1024 / 1024 / 1024)}GB
   Platform:     ${os.platform()} ${os.arch()}

🚀 Starting workers...
`)

// ============================================================================
// START WORKERS
// ============================================================================

async function startWorkers() {
  const workers = []

  for (let i = 0; i < WORKER_COUNT; i++) {
    const workerName = `worker-${i + 1}`
    const videoWorker = createVideoWorker(workerName)

    // Register worker with queue manager
    const worker = videoQueueManager.registerWorker(
      workerName,
      CONCURRENCY,
      async (job) => {
        console.log(`[${workerName}] Processing job ${job.id}`)
        return await videoWorker.process(job)
      }
    )

    workers.push(worker)

    console.log(`✅ ${workerName} started (concurrency: ${CONCURRENCY})`)
  }

  console.log(`
✅ All ${WORKER_COUNT} workers started successfully!

📊 Monitoring:
   - Queue metrics: http://localhost:3000/api/admin/queue/metrics
   - Worker status: http://localhost:3000/api/admin/workers/status

⌨️  Press Ctrl+C to stop all workers
`)

  // Monitor queue metrics
  setInterval(async () => {
    const metrics = await videoQueueManager.getMetrics()

    console.log(`
📊 Queue Metrics (${new Date().toLocaleTimeString()}):
   Waiting:   ${metrics.waiting}
   Active:    ${metrics.active}
   Completed: ${metrics.completed}
   Failed:    ${metrics.failed}
`)
  }, 30000) // Every 30 seconds

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('\n⏹️  Received SIGTERM, shutting down gracefully...')
    await shutdown()
  })

  process.on('SIGINT', async () => {
    console.log('\n⏹️  Received SIGINT, shutting down gracefully...')
    await shutdown()
  })

  async function shutdown() {
    console.log('🛑 Stopping workers...')

    await videoQueueManager.stopWorkers()
    await videoQueueManager.close()

    console.log('✅ All workers stopped')
    process.exit(0)
  }
}

// ============================================================================
// HEALTH CHECK
// ============================================================================

async function healthCheck() {
  try {
    const metrics = await videoQueueManager.getMetrics()
    console.log('✅ Health check passed')
    console.log('   Queue:', metrics)
    return true
  } catch (error) {
    console.error('❌ Health check failed:', error)
    return false
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  // Perform health check
  const healthy = await healthCheck()

  if (!healthy) {
    console.error('❌ System not healthy, exiting')
    process.exit(1)
  }

  // Start workers
  await startWorkers()
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  })
}

export { startWorkers, healthCheck }
