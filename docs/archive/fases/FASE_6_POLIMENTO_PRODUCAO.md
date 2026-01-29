# FASE 6: POLIMENTO & PRODUÇÃO (LANÇAMENTO)
**Duração:** 2 semanas (10/05 - 23/05)
**Prioridade:** CRÍTICA ⚠️
**Objetivo:** Preparar para produção com alta disponibilidade

---

## 📊 Visão Geral da Fase

### Objetivos Finais
1. ✅ **Performance otimizada** (todas as métricas no verde)
2. ✅ **Monitoring completo** (Grafana + Sentry + logs)
3. ✅ **Security hardening** (pen test + audit)
4. ✅ **Documentação completa** (API + user guides)
5. ✅ **CI/CD pipeline** (deploy automático)
6. ✅ **Load testing** (suportar 100+ usuários simultâneos)

### Métricas de Produção
- 🎯 Uptime: 99.9%
- 🚀 Response time: <200ms (p95)
- 💾 Memory usage: <80%
- 🔒 Zero vulnerabilidades críticas
- 📚 100% endpoints documentados

---

## Week 12: Performance & Monitoring

### Dia 45-47: Otimização de Performance

**Arquivos:**
- [ ] `/src/lib/cache/aggressive-cache.ts`
- [ ] `/src/lib/performance/database-optimization.ts`
- [ ] `/src/lib/performance/cdn-integration.ts`
- [ ] `/src/middleware/compression.ts`
- [ ] `/src/middleware/rate-limit-advanced.ts`

**Código: aggressive-cache.ts**
```typescript
import { Redis } from 'ioredis'
import { logger } from '@/lib/logger'
import { createHash } from 'crypto'

export interface CacheOptions {
  ttl?: number // segundos
  tags?: string[]
  namespace?: string
  compress?: boolean
}

export class AggressiveCache {
  private redis: Redis
  private localCache: Map<string, { data: any; expires: number }>

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL!)
    this.localCache = new Map()

    // Limpar cache local a cada 5 minutos
    setInterval(() => this.cleanLocalCache(), 300000)
  }

  /**
   * Cache com múltiplas camadas (local + Redis)
   */
  async get<T>(key: string, options?: CacheOptions): Promise<T | null> {
    const fullKey = this.buildKey(key, options?.namespace)

    // 1. Verificar cache local (in-memory)
    const localValue = this.getFromLocal(fullKey)
    if (localValue !== null) {
      logger.debug('Cache hit (local)', { key: fullKey })
      return localValue as T
    }

    // 2. Verificar Redis
    try {
      const redisValue = await this.redis.get(fullKey)
      if (redisValue) {
        const parsed = JSON.parse(redisValue)

        // Salvar no cache local
        this.saveToLocal(fullKey, parsed, options?.ttl || 300)

        logger.debug('Cache hit (Redis)', { key: fullKey })
        return parsed as T
      }
    } catch (error) {
      logger.warn('Redis get failed', { key: fullKey, error })
    }

    logger.debug('Cache miss', { key: fullKey })
    return null
  }

  /**
   * Salva no cache com TTL
   */
  async set(
    key: string,
    value: any,
    options?: CacheOptions
  ): Promise<void> {
    const fullKey = this.buildKey(key, options?.namespace)
    const ttl = options?.ttl || 3600 // 1 hora default

    const serialized = JSON.stringify(value)

    // Salvar no Redis
    try {
      await this.redis.setex(fullKey, ttl, serialized)

      // Salvar tags para invalidação
      if (options?.tags) {
        await Promise.all(
          options.tags.map(tag =>
            this.redis.sadd(`tag:${tag}`, fullKey)
          )
        )
      }
    } catch (error) {
      logger.warn('Redis set failed', { key: fullKey, error })
    }

    // Salvar no cache local
    this.saveToLocal(fullKey, value, ttl)
  }

  /**
   * Invalida por key
   */
  async invalidate(key: string, namespace?: string): Promise<void> {
    const fullKey = this.buildKey(key, namespace)

    this.localCache.delete(fullKey)

    try {
      await this.redis.del(fullKey)
    } catch (error) {
      logger.warn('Redis delete failed', { key: fullKey, error })
    }
  }

  /**
   * Invalida por tag
   */
  async invalidateByTag(tag: string): Promise<void> {
    try {
      const keys = await this.redis.smembers(`tag:${tag}`)

      if (keys.length > 0) {
        await Promise.all([
          this.redis.del(...keys),
          this.redis.del(`tag:${tag}`)
        ])

        // Limpar local cache também
        keys.forEach(key => this.localCache.delete(key))
      }

      logger.info('Cache invalidated by tag', { tag, keyCount: keys.length })
    } catch (error) {
      logger.warn('Tag invalidation failed', { tag, error })
    }
  }

  /**
   * Cache wrapper para funções
   */
  async wrap<T>(
    key: string,
    fn: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T> {
    const cached = await this.get<T>(key, options)
    if (cached !== null) {
      return cached
    }

    const result = await fn()
    await this.set(key, result, options)

    return result
  }

  /**
   * Cache de render (chunks)
   */
  async cacheRenderChunk(
    compositionHash: string,
    chunkIndex: number,
    videoBuffer: Buffer
  ): Promise<void> {
    const key = `render:${compositionHash}:chunk:${chunkIndex}`

    try {
      // Salvar binário direto no Redis
      await this.redis.setex(
        key,
        86400 * 7, // 7 dias
        videoBuffer
      )
    } catch (error) {
      logger.warn('Failed to cache render chunk', { key, error })
    }
  }

  async getCachedRenderChunk(
    compositionHash: string,
    chunkIndex: number
  ): Promise<Buffer | null> {
    const key = `render:${compositionHash}:chunk:${chunkIndex}`

    try {
      const buffer = await this.redis.getBuffer(key)
      return buffer
    } catch (error) {
      logger.warn('Failed to get cached render chunk', { key, error })
      return null
    }
  }

  /**
   * Hash de composição para cache de render
   */
  calculateCompositionHash(timeline: any): string {
    const stringified = JSON.stringify(timeline)
    return createHash('sha256').update(stringified).digest('hex')
  }

  private buildKey(key: string, namespace?: string): string {
    return namespace ? `${namespace}:${key}` : key
  }

  private getFromLocal(key: string): any | null {
    const cached = this.localCache.get(key)
    if (!cached) return null

    if (Date.now() > cached.expires) {
      this.localCache.delete(key)
      return null
    }

    return cached.data
  }

  private saveToLocal(key: string, data: any, ttl: number): void {
    this.localCache.set(key, {
      data,
      expires: Date.now() + ttl * 1000
    })
  }

  private cleanLocalCache(): void {
    const now = Date.now()
    let cleaned = 0

    for (const [key, value] of this.localCache.entries()) {
      if (now > value.expires) {
        this.localCache.delete(key)
        cleaned++
      }
    }

    if (cleaned > 0) {
      logger.debug('Local cache cleaned', { keysRemoved: cleaned })
    }
  }

  /**
   * Estatísticas de cache
   */
  async getStats(): Promise<{
    localSize: number
    redisSize: number
    hitRate: number
  }> {
    const localSize = this.localCache.size

    let redisSize = 0
    try {
      const info = await this.redis.info('keyspace')
      const match = info.match(/keys=(\d+)/)
      redisSize = match ? parseInt(match[1]) : 0
    } catch {
      redisSize = -1
    }

    // TODO: calcular hit rate real com métricas

    return {
      localSize,
      redisSize,
      hitRate: 0.65 // Placeholder
    }
  }
}
```

**Código: database-optimization.ts**
```typescript
import { PrismaClient } from '@prisma/client'
import { logger } from '@/lib/logger'

export class DatabaseOptimization {
  private prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  /**
   * Adiciona índices faltantes
   */
  async createMissingIndexes(): Promise<void> {
    const indexes = [
      // Projects
      `CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status)`,
      `CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at DESC)`,

      // Render Jobs
      `CREATE INDEX IF NOT EXISTS idx_render_jobs_user_id ON render_jobs(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_render_jobs_status ON render_jobs(status)`,
      `CREATE INDEX IF NOT EXISTS idx_render_jobs_project_id ON render_jobs(project_id)`,
      `CREATE INDEX IF NOT EXISTS idx_render_jobs_created_at ON render_jobs(created_at DESC)`,

      // Analytics
      `CREATE INDEX IF NOT EXISTS idx_project_analytics_project_id ON project_analytics(project_id)`,
      `CREATE INDEX IF NOT EXISTS idx_project_analytics_event_type ON project_analytics(event_type)`,
      `CREATE INDEX IF NOT EXISTS idx_project_analytics_created_at ON project_analytics(created_at DESC)`,

      // Composite indexes
      `CREATE INDEX IF NOT EXISTS idx_projects_user_status ON projects(user_id, status)`,
      `CREATE INDEX IF NOT EXISTS idx_render_jobs_user_status ON render_jobs(user_id, status)`
    ]

    for (const sql of indexes) {
      try {
        await this.prisma.$executeRawUnsafe(sql)
        logger.info('Index created', { sql: sql.substring(0, 100) })
      } catch (error) {
        logger.warn('Index creation failed (may already exist)', { error })
      }
    }
  }

  /**
   * Otimiza queries lentas
   */
  async analyzeSlowQueries(): Promise<void> {
    // Ativar log de queries lentas no PostgreSQL
    await this.prisma.$executeRaw`
      ALTER DATABASE ${process.env.DATABASE_NAME}
      SET log_min_duration_statement = 1000
    `

    logger.info('Slow query logging enabled (>1s)')
  }

  /**
   * Vacuum e analyze
   */
  async performMaintenance(): Promise<void> {
    const tables = [
      'projects',
      'render_jobs',
      'project_analytics',
      'users'
    ]

    for (const table of tables) {
      try {
        await this.prisma.$executeRawUnsafe(`VACUUM ANALYZE ${table}`)
        logger.info('Table maintenance complete', { table })
      } catch (error) {
        logger.warn('Table maintenance failed', { table, error })
      }
    }
  }

  /**
   * Limpar dados antigos
   */
  async cleanupOldData(): Promise<void> {
    const retention = {
      render_jobs: 90, // dias
      project_analytics: 365,
      audit_log_entries: 180
    }

    // Limpar render jobs antigos e concluídos
    const { count: jobsDeleted } = await this.prisma.render_jobs.deleteMany({
      where: {
        status: 'completed',
        completed_at: {
          lt: new Date(Date.now() - retention.render_jobs * 86400000)
        }
      }
    })

    logger.info('Old render jobs cleaned', { count: jobsDeleted })

    // Limpar analytics antigas
    const { count: analyticsDeleted } = await this.prisma.project_analytics.deleteMany({
      where: {
        created_at: {
          lt: new Date(Date.now() - retention.project_analytics * 86400000)
        }
      }
    })

    logger.info('Old analytics cleaned', { count: analyticsDeleted })
  }
}
```

### Dia 48-49: Monitoring & Observability

**Arquivos:**
- [ ] `/docker/grafana/dashboards/main-dashboard.json`
- [ ] `/docker/prometheus/prometheus.yml`
- [ ] `/src/lib/monitoring/metrics-collector.ts`
- [ ] `/src/instrumentation.ts` (já existe, melhorar)

**Código: metrics-collector.ts**
```typescript
import { register, Counter, Histogram, Gauge } from 'prom-client'
import { logger } from '@/lib/logger'

class MetricsCollector {
  // Contadores
  public httpRequestsTotal = new Counter({
    name: 'http_requests_total',
    help: 'Total HTTP requests',
    labelNames: ['method', 'route', 'status']
  })

  public renderJobsTotal = new Counter({
    name: 'render_jobs_total',
    help: 'Total render jobs',
    labelNames: ['provider', 'quality', 'status']
  })

  public cacheHits = new Counter({
    name: 'cache_hits_total',
    help: 'Total cache hits',
    labelNames: ['cache_type']
  })

  public cacheMisses = new Counter({
    name: 'cache_misses_total',
    help: 'Total cache misses',
    labelNames: ['cache_type']
  })

  // Histogramas (latência)
  public httpRequestDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration',
    labelNames: ['method', 'route', 'status'],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
  })

  public renderJobDuration = new Histogram({
    name: 'render_job_duration_seconds',
    help: 'Render job duration',
    labelNames: ['provider', 'quality'],
    buckets: [10, 30, 60, 120, 300, 600, 1200, 1800, 3600]
  })

  public databaseQueryDuration = new Histogram({
    name: 'database_query_duration_seconds',
    help: 'Database query duration',
    labelNames: ['operation', 'table'],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5]
  })

  // Gauges (valores atuais)
  public activeRenderJobs = new Gauge({
    name: 'active_render_jobs',
    help: 'Number of active render jobs',
    labelNames: ['provider']
  })

  public workerPoolSize = new Gauge({
    name: 'worker_pool_size',
    help: 'Number of render workers',
    labelNames: ['status']
  })

  public databaseConnections = new Gauge({
    name: 'database_connections',
    help: 'Number of database connections',
    labelNames: ['state']
  })

  public memoryUsage = new Gauge({
    name: 'process_memory_bytes',
    help: 'Process memory usage',
    labelNames: ['type']
  })

  /**
   * Coleta métricas do sistema
   */
  async collectSystemMetrics(): Promise<void> {
    const memUsage = process.memoryUsage()

    this.memoryUsage.set({ type: 'rss' }, memUsage.rss)
    this.memoryUsage.set({ type: 'heapTotal' }, memUsage.heapTotal)
    this.memoryUsage.set({ type: 'heapUsed' }, memUsage.heapUsed)
    this.memoryUsage.set({ type: 'external' }, memUsage.external)
  }

  /**
   * Exporta métricas para Prometheus
   */
  async getMetrics(): Promise<string> {
    await this.collectSystemMetrics()
    return register.metrics()
  }

  /**
   * Reseta todas as métricas
   */
  reset(): void {
    register.clear()
  }
}

export const metricsCollector = new MetricsCollector()

// Coletar métricas a cada 15s
setInterval(() => {
  metricsCollector.collectSystemMetrics().catch(error => {
    logger.error('Failed to collect system metrics', error)
  })
}, 15000)
```

## Week 13: Security & Documentation

### Dia 50-51: Security Hardening

**Checklist de Segurança:**
```markdown
## Security Audit Checklist

### Authentication & Authorization
- [ ] Rate limiting em todas as APIs
- [ ] JWT tokens com expiração curta (15min)
- [ ] Refresh tokens armazenados com segurança
- [ ] 2FA disponível para usuários
- [ ] Password hashing com bcrypt (cost factor 12+)
- [ ] Prevenção de brute force login

### API Security
- [ ] CORS configurado corretamente
- [ ] CSRF protection em forms
- [ ] Input validation em todos os endpoints
- [ ] SQL injection prevention (uso de Prisma)
- [ ] XSS prevention (sanitização de HTML)
- [ ] Cabeçalhos de segurança (CSP, HSTS, etc)

### Data Protection
- [ ] Criptografia de dados sensíveis em repouso
- [ ] TLS 1.3 para todas as conexões
- [ ] Secrets em variáveis de ambiente (nunca no código)
- [ ] Backup automático do banco (diário)
- [ ] Logs não contêm informações sensíveis

### File Upload
- [ ] Validação de tipo MIME
- [ ] Limite de tamanho de arquivo
- [ ] Scanning de malware (ClamAV)
- [ ] Isolamento de arquivos (storage separado)
- [ ] Nomes de arquivo sanitizados

### Infrastructure
- [ ] Firewall configurado
- [ ] Acesso SSH apenas com chave
- [ ] Fail2ban instalado
- [ ] Logs centralizados
- [ ] Monitoring de intrusões

### Dependencies
- [ ] npm audit sem vulnerabilidades HIGH/CRITICAL
- [ ] Dependências atualizadas
- [ ] Renovate bot configurado
- [ ] Lock files commitados
```

### Dia 52: Documentação Final

**Arquivos a criar:**
- [ ] `/docs/API_REFERENCE.md`
- [ ] `/docs/USER_GUIDE.md`
- [ ] `/docs/DEPLOYMENT_GUIDE.md`
- [ ] `/docs/TROUBLESHOOTING.md`
- [ ] `/docs/CHANGELOG.md`

**README.md atualizado:**
```markdown
# 🎬 Estúdio IA de Vídeos - Plataforma Profissional

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.0.0-green.svg)](CHANGELOG.md)
[![Uptime](https://img.shields.io/badge/uptime-99.9%25-brightgreen.svg)](https://status.estudioiavideos.com)

Plataforma completa para criação de vídeos de treinamento técnico com avatares hiper-realistas e IA.

## ✨ Features

- 🎭 **Avatares Hiper-Realistas** - 4 níveis de qualidade (Placeholder → Hyperreal)
- 🎬 **Editor Profissional** - Timeline avançada com keyframes e transições
- 🤖 **AI Director** - Sugestões inteligentes de edição
- 🚀 **Renderização Distribuída** - 4x mais rápido com workers paralelos
- 👥 **Colaboração Real-Time** - Edição simultânea estilo Google Docs
- 🎤 **Lip-Sync Profissional** - Rhubarb + Azure Speech SDK
- 📊 **Analytics Avançado** - Métricas detalhadas de engajamento

## 🚀 Quick Start

```bash
# Clonar repositório
git clone https://github.com/seu-usuario/estudio-ia-videos.git
cd estudio-ia-videos

# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env.local

# Iniciar banco de dados
docker-compose up -d postgres redis

# Migrar banco
npx prisma migrate deploy

# Iniciar desenvolvimento
npm run dev
```

Acesse: http://localhost:3000

## 📚 Documentação

- [📖 User Guide](docs/USER_GUIDE.md) - Manual do usuário
- [🔧 API Reference](docs/API_REFERENCE.md) - Documentação da API
- [🚀 Deployment Guide](docs/DEPLOYMENT_GUIDE.md) - Guia de deploy
- [🐛 Troubleshooting](docs/TROUBLESHOOTING.md) - Resolução de problemas

## 🏗️ Arquitetura

```
├── src/
│   ├── app/                 # Next.js App Router
│   ├── components/          # React components
│   ├── lib/                 # Core libraries
│   │   ├── avatar/         # Avatar systems
│   │   ├── render/         # Video rendering
│   │   ├── sync/           # Lip-sync engines
│   │   └── timeline/       # Timeline engine
│   └── workers/            # Background workers
├── prisma/                 # Database schema
├── docker/                 # Docker configs
└── docs/                   # Documentation
```

## 🔑 Variáveis de Ambiente

```env
# Database
DATABASE_URL="postgresql://..."
REDIS_URL="redis://..."

# Authentication
NEXT_PUBLIC_SUPABASE_URL=""
SUPABASE_SERVICE_KEY=""

# AI Services
OPENAI_API_KEY=""
AZURE_SPEECH_KEY=""

# Avatar Providers
HEYGEN_API_KEY=""
DID_API_KEY=""

# Render Servers
AUDIO2FACE_GRPC_ENDPOINT=""
UE5_RENDER_SERVER=""
```

## 📊 Performance

- ⚡ Response time: <200ms (p95)
- 🚀 Render speed: 4x real-time com 4 workers
- 💾 Cache hit rate: >60%
- 🎯 Uptime: 99.9%

## 🤝 Contribuindo

Veja [CONTRIBUTING.md](CONTRIBUTING.md) para guidelines.

## 📝 License

MIT License - veja [LICENSE](LICENSE) para detalhes.

## 👥 Team

- **Tech Lead:** [Seu Nome](https://github.com/seu-usuario)
- **Backend:** [Nome](https://github.com/usuario)
- **Frontend:** [Nome](https://github.com/usuario)

## 🙏 Agradecimentos

- [Remotion](https://remotion.dev) - Video rendering
- [Rhubarb Lip-Sync](https://github.com/DanielSWolf/rhubarb-lip-sync)
- [HeyGen](https://heygen.com) & [D-ID](https://d-id.com) - Avatar APIs
```

---

## Deliverables Fase 6 (FINAL)

**Checklist de Lançamento:**
- [ ] Performance otimizada (todas as métricas no verde)
- [ ] Monitoring completo (Grafana + Prometheus + Sentry)
- [ ] Security audit passou (zero vulnerabilidades críticas)
- [ ] Documentação 100% completa
- [ ] Load testing com 100+ usuários simultâneos
- [ ] CI/CD pipeline funcionando
- [ ] Backup automático configurado
- [ ] Status page público (status.dominio.com)
- [ ] Support system configurado
- [ ] Marketing materials prontos

**Métricas Finais de Sucesso:**
- ✅ Uptime: 99.9% (medido por 30 dias)
- ✅ Response time: <200ms p95, <500ms p99
- ✅ Render time: <1x duração do vídeo (avg)
- ✅ Cache hit rate: >60%
- ✅ Error rate: <0.1%
- ✅ User satisfaction: >4.5/5
- ✅ Zero critical bugs por 7 dias

**Go Live Date:** 24/05/2026 🚀

---

## 🎉 PROJETO COMPLETO!

**Total de Linhas de Código Escritas:** ~50.000
**APIs Implementadas:** 80+
**Features Entregues:** 45+
**Tempo Total:** 18 semanas (4.5 meses)

### Stack Final
- Next.js 14 + TypeScript
- Remotion + FFmpeg
- PostgreSQL + Prisma
- Redis + BullMQ
- Supabase Auth
- OpenAI GPT-4
- Azure Speech SDK
- Rhubarb Lip-Sync
- HeyGen + D-ID + ReadyPlayerMe
- Audio2Face + Unreal Engine 5

**Pronto para escalar e dominar o mercado!** 🚀
