# FASE 4: RENDERIZAÇÃO DISTRIBUÍDA (ESCALABILIDADE)
**Duração:** 3 semanas (05/04 - 25/04)
**Prioridade:** ALTA 🔥
**Objetivo:** Sistema de render paralelo e distribuído para escalar

---

## 📊 Visão Geral da Fase

### Problema Atual
- ❌ Renderização **single-thread** (não escala)
- ❌ Render de 10min de vídeo leva **10+ minutos**
- ❌ Sistema trava durante render
- ❌ Sem recuperação de jobs travados
- ❌ Memória explode em vídeos longos

### Objetivos
1. ✅ **Worker Pool** com 4+ workers paralelos
2. ✅ **Chunk-based rendering** (dividir vídeo em partes)
3. ✅ **FFmpeg concatenation** otimizada
4. ✅ **GPU acceleration** quando disponível
5. ✅ **Stuck job detection** e recovery
6. ✅ **Render streaming** (não carregar tudo em memória)
7. ✅ **Cache inteligente** de chunks renderizados

### Ganhos Esperados
- 🚀 **4x mais rápido** com 4 workers
- 💾 **70% menos memória** com streaming
- 🔧 **99% uptime** com recovery automático
- 💰 **50% economia** com cache de chunks

---

## Week 9: Worker Pool Architecture

### Dia 36-38: Distributed Render Pool

**Arquivos:**
- [ ] `/src/lib/render/distributed-render-pool.ts`
- [ ] `/src/lib/render/render-worker.ts`
- [ ] `/src/lib/render/chunk-manager.ts`
- [ ] `/src/workers/video-render-worker.js`

**Código: distributed-render-pool.ts**
```typescript
import { Worker } from 'worker_threads'
import { Queue } from 'bullmq'
import { Redis } from 'ioredis'
import { logger } from '@/lib/logger'
import { RenderChunk, RenderJob } from './types'
import path from 'path'

export interface WorkerStatus {
  id: string
  pid: number
  status: 'idle' | 'busy' | 'error'
  currentChunk?: string
  chunksCompleted: number
  startedAt: Date
  lastHeartbeat: Date
}

export class DistributedRenderPool {
  private workers: Map<string, Worker> = new Map()
  private workerStatuses: Map<string, WorkerStatus> = new Map()
  private queue: Queue
  private redis: Redis
  private workerCount: number

  constructor(workerCount: number = 4) {
    this.workerCount = workerCount
    this.redis = new Redis(process.env.REDIS_URL!)

    this.queue = new Queue('render-chunks', {
      connection: this.redis,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        },
        removeOnComplete: false,
        removeOnFail: false
      }
    })
  }

  /**
   * Inicializa pool de workers
   */
  async initialize(): Promise<void> {
    logger.info('Initializing render worker pool', { workerCount: this.workerCount })

    for (let i = 0; i < this.workerCount; i++) {
      await this.spawnWorker(i)
    }

    // Health check interval
    setInterval(() => this.healthCheck(), 10000)
  }

  /**
   * Cria um worker
   */
  private async spawnWorker(id: number): Promise<void> {
    const workerId = `worker-${id}`
    const workerPath = path.join(__dirname, '../../workers/video-render-worker.js')

    const worker = new Worker(workerPath, {
      workerData: {
        workerId,
        redisUrl: process.env.REDIS_URL
      }
    })

    // Event handlers
    worker.on('message', (message) => {
      this.handleWorkerMessage(workerId, message)
    })

    worker.on('error', (error) => {
      logger.error(`Worker ${workerId} error`, error)
      this.handleWorkerError(workerId, error)
    })

    worker.on('exit', (code) => {
      logger.warn(`Worker ${workerId} exited with code ${code}`)
      this.handleWorkerExit(workerId, code)
    })

    this.workers.set(workerId, worker)
    this.workerStatuses.set(workerId, {
      id: workerId,
      pid: worker.threadId,
      status: 'idle',
      chunksCompleted: 0,
      startedAt: new Date(),
      lastHeartbeat: new Date()
    })

    logger.info(`Worker ${workerId} spawned`, { pid: worker.threadId })
  }

  /**
   * Renderiza vídeo distribuído
   */
  async renderVideo(job: RenderJob): Promise<string> {
    try {
      logger.info('Starting distributed render', {
        jobId: job.id,
        duration: job.duration,
        workers: this.workerCount
      })

      // 1. Dividir em chunks
      const chunks = this.createChunks(job)

      logger.info('Video split into chunks', {
        jobId: job.id,
        chunkCount: chunks.length,
        avgChunkDuration: job.duration / chunks.length
      })

      // 2. Enfileirar chunks
      const chunkJobs = await Promise.all(
        chunks.map((chunk, index) =>
          this.queue.add(
            `chunk-${job.id}-${index}`,
            {
              ...chunk,
              jobId: job.id,
              chunkIndex: index,
              totalChunks: chunks.length
            },
            {
              priority: job.priority === 'urgent' ? 1 : 10
            }
          )
        )
      )

      // 3. Aguardar conclusão de todos os chunks
      const renderedChunks = await Promise.all(
        chunkJobs.map(job => job.waitUntilFinished())
      )

      logger.info('All chunks rendered', {
        jobId: job.id,
        renderedCount: renderedChunks.length
      })

      // 4. Concatenar chunks
      const finalVideo = await this.concatenateChunks(
        renderedChunks.map(r => r.outputPath),
        job.id
      )

      logger.info('Video concatenation complete', {
        jobId: job.id,
        outputPath: finalVideo
      })

      // 5. Limpar chunks temporários
      await this.cleanupChunks(renderedChunks.map(r => r.outputPath))

      return finalVideo

    } catch (error) {
      logger.error('Distributed render failed', error as Error, {
        jobId: job.id
      })
      throw error
    }
  }

  /**
   * Divide vídeo em chunks para processamento paralelo
   */
  private createChunks(job: RenderJob): RenderChunk[] {
    const chunkDuration = 10 // segundos por chunk
    const chunkCount = Math.ceil(job.duration / chunkDuration)
    const chunks: RenderChunk[] = []

    for (let i = 0; i < chunkCount; i++) {
      const startTime = i * chunkDuration
      const endTime = Math.min((i + 1) * chunkDuration, job.duration)

      chunks.push({
        id: `${job.id}-chunk-${i}`,
        jobId: job.id,
        index: i,
        startTime,
        endTime,
        duration: endTime - startTime,
        timeline: this.sliceTimeline(job.timeline, startTime, endTime),
        settings: job.settings
      })
    }

    return chunks
  }

  /**
   * Extrai elementos da timeline para um intervalo de tempo
   */
  private sliceTimeline(timeline: any, startTime: number, endTime: number): any {
    return {
      ...timeline,
      elements: timeline.elements.filter((el: any) => {
        const elementStart = el.startTime
        const elementEnd = el.startTime + el.duration

        // Elemento sobrepõe ao chunk
        return elementEnd > startTime && elementStart < endTime
      }).map((el: any) => ({
        ...el,
        // Ajustar tempos relativos ao chunk
        startTime: Math.max(0, el.startTime - startTime),
        duration: Math.min(
          el.duration,
          endTime - Math.max(el.startTime, startTime)
        )
      }))
    }
  }

  /**
   * Concatena chunks renderizados usando FFmpeg
   */
  private async concatenateChunks(
    chunkPaths: string[],
    jobId: string
  ): Promise<string> {
    const ffmpeg = require('fluent-ffmpeg')
    const outputPath = `/tmp/final-${jobId}.mp4`
    const concatListPath = `/tmp/concat-${jobId}.txt`

    // Criar arquivo de lista para FFmpeg
    const listContent = chunkPaths
      .map(path => `file '${path}'`)
      .join('\n')

    await require('fs/promises').writeFile(concatListPath, listContent)

    return new Promise((resolve, reject) => {
      ffmpeg()
        .input(concatListPath)
        .inputOptions(['-f concat', '-safe 0'])
        .outputOptions([
          '-c copy',           // Copy streams (sem re-encode)
          '-movflags +faststart' // Web streaming optimization
        ])
        .output(outputPath)
        .on('start', (cmd) => {
          logger.info('FFmpeg concat started', { command: cmd })
        })
        .on('progress', (progress) => {
          logger.info('FFmpeg concat progress', {
            percent: progress.percent,
            frames: progress.frames
          })
        })
        .on('end', () => {
          logger.info('FFmpeg concat completed', { outputPath })
          resolve(outputPath)
        })
        .on('error', (error) => {
          logger.error('FFmpeg concat failed', error)
          reject(error)
        })
        .run()
    })
  }

  /**
   * Limpa arquivos temporários de chunks
   */
  private async cleanupChunks(chunkPaths: string[]): Promise<void> {
    await Promise.all(
      chunkPaths.map(path =>
        require('fs/promises').unlink(path).catch(() => {})
      )
    )
  }

  /**
   * Health check dos workers
   */
  private async healthCheck(): Promise<void> {
    const now = new Date()

    for (const [workerId, status] of this.workerStatuses.entries()) {
      const timeSinceHeartbeat = now.getTime() - status.lastHeartbeat.getTime()

      // Worker não responde há mais de 30s
      if (timeSinceHeartbeat > 30000) {
        logger.warn(`Worker ${workerId} unresponsive, restarting`, {
          timeSinceHeartbeat: timeSinceHeartbeat / 1000
        })

        await this.restartWorker(workerId)
      }
    }
  }

  /**
   * Reinicia worker problemático
   */
  private async restartWorker(workerId: string): Promise<void> {
    const worker = this.workers.get(workerId)

    if (worker) {
      await worker.terminate()
      this.workers.delete(workerId)
      this.workerStatuses.delete(workerId)
    }

    // Recriar worker
    const workerId_num = parseInt(workerId.split('-')[1])
    await this.spawnWorker(workerId_num)
  }

  private handleWorkerMessage(workerId: string, message: any): void {
    const status = this.workerStatuses.get(workerId)
    if (!status) return

    switch (message.type) {
      case 'heartbeat':
        status.lastHeartbeat = new Date()
        break

      case 'chunk_start':
        status.status = 'busy'
        status.currentChunk = message.chunkId
        break

      case 'chunk_complete':
        status.status = 'idle'
        status.currentChunk = undefined
        status.chunksCompleted++
        break

      case 'error':
        status.status = 'error'
        logger.error(`Worker ${workerId} reported error`, new Error(message.error))
        break
    }
  }

  private handleWorkerError(workerId: string, error: Error): void {
    const status = this.workerStatuses.get(workerId)
    if (status) {
      status.status = 'error'
    }
  }

  private async handleWorkerExit(workerId: string, code: number): void {
    this.workers.delete(workerId)
    this.workerStatuses.delete(workerId)

    // Reiniciar se não foi encerramento intencional
    if (code !== 0) {
      const workerId_num = parseInt(workerId.split('-')[1])
      await this.spawnWorker(workerId_num)
    }
  }

  /**
   * Status do pool
   */
  getPoolStatus(): {
    totalWorkers: number
    idleWorkers: number
    busyWorkers: number
    errorWorkers: number
    workers: WorkerStatus[]
  } {
    const statuses = Array.from(this.workerStatuses.values())

    return {
      totalWorkers: statuses.length,
      idleWorkers: statuses.filter(w => w.status === 'idle').length,
      busyWorkers: statuses.filter(w => w.status === 'busy').length,
      errorWorkers: statuses.filter(w => w.status === 'error').length,
      workers: statuses
    }
  }

  /**
   * Encerra pool gracefully
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down render worker pool')

    await Promise.all(
      Array.from(this.workers.values()).map(worker =>
        worker.terminate()
      )
    )

    await this.queue.close()
    await this.redis.quit()
  }
}
```

Continuo com FASE 5 e 6...
