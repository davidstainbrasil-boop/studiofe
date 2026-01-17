# 🚀 FASE 4: QUICK START - Rendering Distribuído

**Tempo para começar**: 5 minutos
**Data**: 2026-01-17

---

## ⚡ Início Rápido

### 1. Configure Redis

```bash
# Opção 1: Local (desenvolvimento)
brew install redis
brew services start redis

# Opção 2: Docker
docker run -d -p 6379:6379 redis:latest

# Opção 3: Redis Cloud (produção)
# https://redis.com/try-free/
# Depois: export REDIS_URL=redis://username:password@host:port
```

### 2. Configure Variáveis de Ambiente

```bash
# .env
REDIS_URL=redis://localhost:6379
WORKER_COUNT=4           # Número de workers (default: CPU cores)
WORKER_CONCURRENCY=2     # Jobs simultâneos por worker
```

### 3. Start Workers

```bash
# Desenvolvimento
npm run worker:start

# Ou com configuração customizada
WORKER_COUNT=8 WORKER_CONCURRENCY=3 npm run worker:start

# Produção (PM2)
pm2 start workers/video-render-worker.ts --name video-workers
```

### 4. Verificar Status

```bash
# Abrir dashboard
open http://localhost:3000/admin/queue-monitor

# Ou via API
curl http://localhost:3000/api/admin/queue/metrics
```

**Pronto!** O sistema de rendering distribuído está rodando.

---

## 🎯 Uso Básico

### Criar um Job

```typescript
import { videoQueueManager } from '@/lib/queue/video-queue-manager'

// Avatar rendering
const job = await videoQueueManager.addJob({
  jobId: `job-${Date.now()}`,
  userId: 'user-123',
  type: 'avatar',
  input: {
    text: 'Olá, bem-vindo ao sistema',
    avatarConfig: {
      avatarId: 'avatar-1',
      emotion: 'happy'
    }
  },
  options: {
    quality: 'standard',  // draft | standard | high | ultra
    resolution: '1080p',  // 720p | 1080p | 4k
    fps: 30,              // 24 | 30 | 60
    codec: 'h264'         // h264 | h265 | vp9
  },
  priority: 5             // 1-10 (10 = highest)
})

console.log(`Job criado: ${job.id}`)
```

### Verificar Status do Job

```typescript
const status = await videoQueueManager.getJobStatus('job-123')

console.log(status)
// {
//   status: 'active',
//   progress: {
//     stage: 'rendering',
//     progress: 65,
//     currentTask: 'Rendering frames'
//   }
// }
```

### Cancelar Job

```typescript
await videoQueueManager.cancelJob('job-123')
// Créditos são devolvidos automaticamente
```

### Retry Job Falho

```typescript
await videoQueueManager.retryJob('job-123')
```

### Obter Métricas da Fila

```typescript
const metrics = await videoQueueManager.getMetrics()

console.log(metrics)
// {
//   waiting: 5,
//   active: 2,
//   completed: 100,
//   failed: 3,
//   delayed: 1,
//   paused: 0
// }
```

---

## 📊 Dashboard de Monitoramento

### Acessar Dashboard

```
http://localhost:3000/admin/queue-monitor
```

### Features do Dashboard

- **Auto-refresh**: Atualiza a cada 5 segundos automaticamente
- **6 Metric Cards**: waiting, active, completed, failed, delayed, workers
- **Worker Status**: Status, memória, CPU, jobs processados
- **Active Jobs**: Progress bars em tempo real, botão de cancelar
- **Recent Jobs**: Completed e failed com botão de retry
- **Controls**: Manual refresh, toggle auto-refresh

### Usar Dashboard em Componente

```tsx
import QueueMonitorDashboard from '@/components/admin/QueueMonitorDashboard'

export default function AdminPage() {
  return (
    <div className="container mx-auto p-6">
      <QueueMonitorDashboard />
    </div>
  )
}
```

---

## 🎨 Exemplos de Uso

### Exemplo 1: Avatar com Lip-Sync

```typescript
// Integração Phase 1 (Lip-Sync) + Phase 2 (Avatares)
const job = await videoQueueManager.addJob({
  jobId: 'avatar-job-1',
  userId: 'user-123',
  type: 'avatar',
  input: {
    text: 'Bem-vindo ao curso de programação. Hoje vamos aprender sobre React.',
    avatarConfig: {
      avatarId: 'avatar-professional',
      emotion: 'neutral',
      quality: 'STANDARD'  // Phase 2 quality tier
    }
  },
  options: {
    quality: 'standard',
    resolution: '1080p',
    fps: 30,
    codec: 'h264',
    bitrate: '5000k'
  },
  priority: 8  // High priority
})
```

### Exemplo 2: Timeline com Múltiplas Tracks

```typescript
// Integração Phase 3 (Timeline)
const job = await videoQueueManager.addJob({
  jobId: 'timeline-job-1',
  userId: 'user-123',
  type: 'timeline',
  input: {
    timelineState: {
      tracks: [
        {
          id: 'track-video',
          type: 'video',
          items: [
            {
              id: 'video-1',
              start: 0,
              duration: 10,
              transitionIn: { type: 'fade', duration: 1.0 },
              keyframes: [
                { time: 0, property: 'opacity', value: 0 },
                { time: 1, property: 'opacity', value: 1 }
              ]
            }
          ]
        },
        {
          id: 'track-avatar',
          type: 'avatar',
          items: [
            {
              id: 'avatar-1',
              start: 10,
              duration: 15,
              content: {
                avatarId: 'avatar-1',
                lipSyncData: {/* Phase 1 data */}
              }
            }
          ]
        }
      ]
    }
  },
  options: {
    quality: 'high',
    resolution: '1080p',
    fps: 30,
    codec: 'h264'
  },
  priority: 10  // Highest priority
})
```

### Exemplo 3: Batch Processing

```typescript
// Criar múltiplos jobs em batch
const texts = [
  'Módulo 1: Introdução',
  'Módulo 2: Conceitos Básicos',
  'Módulo 3: Prática'
]

const jobs = await Promise.all(
  texts.map((text, index) =>
    videoQueueManager.addJob({
      jobId: `batch-job-${index}`,
      userId: 'user-123',
      type: 'avatar',
      input: {
        text,
        avatarConfig: { avatarId: 'avatar-1' }
      },
      options: {
        quality: 'draft',  // 0 créditos para preview
        resolution: '720p',
        fps: 24,
        codec: 'h264'
      },
      priority: 5
    })
  )
)

console.log(`${jobs.length} jobs criados`)
```

### Exemplo 4: Monitoring com Polling

```typescript
// Poll job status até completar
async function waitForJob(jobId: string): Promise<void> {
  while (true) {
    const status = await videoQueueManager.getJobStatus(jobId)

    console.log(`[${status.progress.stage}] ${status.progress.progress}%`)

    if (status.status === 'completed') {
      console.log('Job completed!', status.result)
      break
    }

    if (status.status === 'failed') {
      console.error('Job failed:', status.progress.error)
      break
    }

    await new Promise(resolve => setTimeout(resolve, 2000))  // Poll every 2s
  }
}

await waitForJob('job-123')
```

---

## 🔧 Configurações Avançadas

### Worker Configuration

```typescript
// workers/video-render-worker.ts
const WORKER_COUNT = parseInt(process.env.WORKER_COUNT || String(os.cpus().length))
const CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY || '2')

// Custom worker
const customWorker = createVideoWorker('custom-worker-1')
videoQueueManager.registerWorker(
  'custom-worker-1',
  4,  // High concurrency
  async (job) => await customWorker.process(job)
)
```

### Custom Retry Logic

```typescript
// Add job with custom retry
await videoQueueManager.addJob(data, {
  attempts: 5,           // More attempts
  backoff: {
    type: 'exponential',
    delay: 10000         // Longer initial delay
  }
})
```

### Priority Queue

```typescript
// High priority (process first)
await videoQueueManager.addJob(data, { priority: 10 })

// Low priority (process last)
await videoQueueManager.addJob(data, { priority: 1 })
```

### Delayed Jobs

```typescript
// Process after 1 minute
await videoQueueManager.addJob(data, {
  delay: 60000  // 60 seconds
})
```

---

## 📊 Quality Tiers e Créditos

| Quality | Créditos | Resolução Recomendada | Uso |
|---------|----------|----------------------|-----|
| **draft** | 0 | 720p @ 24fps | Preview rápido |
| **standard** | 1 | 1080p @ 30fps | Produção normal |
| **high** | 3 | 1080p @ 60fps | Alta qualidade |
| **ultra** | 10 | 4k @ 60fps | Máxima qualidade |

```typescript
// Draft (0 créditos) - Preview
await videoQueueManager.addJob({
  ...data,
  options: { quality: 'draft', resolution: '720p', fps: 24 }
})

// Ultra (10 créditos) - Produção final
await videoQueueManager.addJob({
  ...data,
  options: { quality: 'ultra', resolution: '4k', fps: 60 }
})
```

---

## 🎯 Progress Stages

| Stage | Progress % | Descrição |
|-------|-----------|-----------|
| **queued** | 0% | Job na fila esperando |
| **processing** | 0-40% | Gerando animação (Phase 1+2) |
| **rendering** | 40-80% | Rendering frames |
| **encoding** | 80-90% | Encoding vídeo (FFmpeg) |
| **uploading** | 90-100% | Upload para storage |
| **completed** | 100% | Finalizado com sucesso |
| **failed** | 0% | Falhou (ver error) |

```typescript
// Monitor progress
const status = await videoQueueManager.getJobStatus(jobId)

console.log(`Stage: ${status.progress.stage}`)
console.log(`Progress: ${status.progress.progress}%`)
console.log(`Task: ${status.progress.currentTask}`)
console.log(`ETA: ${status.progress.eta}s`)
```

---

## 🧪 Testar

```bash
# Executar teste de integração
node test-fase4-integration.mjs

# Resultado esperado:
# ✅ 37 testes passaram
# 📈 Taxa de sucesso: 100.0%
```

---

## 🚨 Troubleshooting

### Workers não iniciam

```bash
# Verificar Redis
redis-cli ping
# Deve retornar: PONG

# Verificar conexão
telnet localhost 6379

# Ver logs dos workers
tail -f logs/worker-out.log
```

### Jobs ficam stuck

```bash
# Ver jobs stuck
curl http://localhost:3000/api/admin/queue/metrics

# Limpar jobs antigos
await videoQueueManager.clean(3600000, 100, 'completed')
await videoQueueManager.clean(86400000, 100, 'failed')
```

### Memory issues

```bash
# Reduzir concurrency
WORKER_CONCURRENCY=1 npm run worker:start

# Ou aumentar memória no PM2
pm2 start workers/video-render-worker.ts --max-memory-restart 4G
```

### Rate limit errors

```typescript
// Jobs estão sendo processados muito rápido
// BullMQ limiter está configurado para max 10 jobs/segundo
// Para aumentar, edite video-queue-manager.ts:
{
  limiter: {
    max: 20,           // Aumentar para 20
    duration: 1000
  }
}
```

---

## 📚 Documentação Completa

Para detalhes técnicos completos, veja:
- [FASE4_IMPLEMENTATION_COMPLETE.md](./FASE4_IMPLEMENTATION_COMPLETE.md)

---

## 🎯 Exemplos de API

### Via cURL

```bash
# Criar job
curl -X POST http://localhost:3000/api/admin/queue/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "type": "avatar",
    "userId": "user-123",
    "input": {
      "text": "Hello world",
      "avatarConfig": { "avatarId": "avatar-1" }
    },
    "options": {
      "quality": "standard",
      "resolution": "1080p",
      "fps": 30,
      "codec": "h264"
    }
  }'

# Ver métricas
curl http://localhost:3000/api/admin/queue/metrics

# Cancelar job
curl -X DELETE "http://localhost:3000/api/admin/queue/jobs?jobId=job-123"

# Retry job
curl -X PUT "http://localhost:3000/api/admin/queue/jobs?jobId=job-123"
```

---

## 🚀 Próximos Passos

Depois de dominar a Fase 4, explore:

1. **Fase 5**: Integrações Premium (UE5, MetaHuman, Audio2Face)
2. **Fase 6**: Polimento para Produção (testes e2e, docs finais)

---

**Status**: 🟢 Production-Ready
**Desenvolvido**: 2026-01-17

_Comece agora criando seu primeiro job de rendering!_
