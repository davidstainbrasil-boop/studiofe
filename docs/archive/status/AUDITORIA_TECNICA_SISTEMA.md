# 🔍 AUDITORIA TÉCNICA DO SISTEMA
## MVP Vídeos TécnicoCursos v7

**Data da Auditoria:** 14 de Janeiro de 2026  
**Auditor:** Análise automatizada do código-fonte  
**Escopo:** Todos os módulos em `estudio_ia_videos/src/`

---

## 1. VISÃO GERAL REAL DO SISTEMA

### ✅ O QUE FUNCIONA HOJE

| Funcionalidade | Status | Evidência |
|----------------|--------|-----------|
| Upload de PPTX para Supabase Storage | **REAL** | `lib/storage/pptx-uploader.ts` - Faz upload real com validação |
| Parsing básico de PPTX (JSZip) | **REAL** | `lib/pptx/pptx-processor.ts` - Extrai slides e notas |
| Autenticação Supabase | **REAL** | `lib/supabase/server.ts`, `client.ts` - SSR completo |
| Fila BullMQ/Redis | **REAL** | `lib/queue/render-queue.ts` - Queue configurado |
| Sistema de logging | **REAL** | `lib/logger.ts` - Com integração Sentry |
| Rate limiting distribuído | **REAL** | `middleware/rate-limiter.ts` - Redis-backed |
| Cache Redis | **REAL** | `lib/cache/redis-cache.ts` - Com fallback |
| Circuit Breaker | **REAL** | `lib/resilience/circuit-breaker.ts` - Implementado |
| Retry com backoff | **REAL** | `lib/resilience/retry.ts` - Exponential backoff |
| Webhooks | **REAL** | `lib/webhooks-system-real.ts` - Prisma-backed |
| RBAC básico | **REAL** | `lib/rbac.ts` - Roles: admin, editor, viewer |
| Health check | **REAL** | `api/health/route.ts` - DB + Redis check |
| Prisma ORM | **REAL** | `lib/prisma.ts` - Schema com 40+ tabelas |
| ElevenLabs TTS | **PARCIAL** | `lib/elevenlabs-service.ts` - API real com fallback mock |

### ⚠️ O QUE NÃO FUNCIONA / É MOCK

| Funcionalidade | Status | Problema |
|----------------|--------|----------|
| TTS Service genérico | **MOCK** | `lib/tts/tts-service.ts:46-47` - "TODO: Replace with real TTS API" |
| TTS Engine Manager | **MOCK** | `lib/tts/engine-manager.ts:72,89` - "Placeholder implementation" |
| Azure TTS | **MOCK** | `lib/tts/providers/azure.ts:33` - "Mock implementation" |
| API /api/tts/generate | **MOCK** | Inline TTSEngineManager simula síntese |
| Render Worker em produção | **PARCIAL** | Worker existe mas precisa edge-tts instalado |
| FFmpeg execution | **PARCIAL** | `lib/render/ffmpeg-executor.ts` - Precisa FFmpeg no PATH |
| Thumbnails de slide | **MOCK** | `lib/pptx/pptx-processor-advanced.ts:137` - Retorna placeholder |

### 🔄 FLUXO TEÓRICO (Não totalmente integrado)

| Fluxo | Estado |
|-------|--------|
| PPTX → Parse → Editor → TTS → Render → Storage | **PARCIAL** - Falta integração end-to-end |
| Avatar 3D com lip-sync | **MOCK** - Apenas interfaces definidas |
| Colaboração real-time | **MOCK** - WebSocket config existe, lógica incompleta |
| Multi-tenancy | **MOCK** - Schema existe, implementação parcial |

---

## 2. WORKFLOW EXECUTÁVEL (PASSO A PASSO)

### 2.1 Fluxo de Upload PPTX

```
[ENTRADA]
  POST /api/pptx/upload
  → Arquivo .pptx (FormData)
  
[PROCESSAMENTO - SERVER]
  1. rate-limiter.ts → Verifica limite por tier (Redis)
  2. pptx-uploader.ts → Valida tipo/tamanho
  3. Supabase Storage → Upload para bucket 'uploads'
  
[SAÍDA]
  { storagePath, fileName, fileSize, fileType }

[ONDE QUEBRA]
  ❌ Se REDIS_URL não configurado → Rate limit falha silenciosamente
  ❌ Se Supabase não configurado → Erro 500
  ❌ Se MOCK_STORAGE=true → Upload simulado, não real
```

### 2.2 Fluxo de Renderização

```
[ENTRADA]
  POST /api/render/start
  → { projectId, slides[], config }

[PROCESSAMENTO - SERVER]
  1. Autenticação (Supabase ou x-user-id header)
  2. Rate limit (tier-based)
  3. JobManager.createJob() → INSERT render_jobs (Prisma)
  4. addVideoJob() → BullMQ.add() (Redis)

[PROCESSAMENTO - WORKER] (scripts/render-worker-bull.ts)
  5. Worker.process() → Pega job da fila
  6. generateAudio() → edge-tts CLI
  7. FFmpeg → Renderiza vídeo
  8. uploadToStorage() → Supabase 'videos' bucket
  9. triggerWebhooks() → Notifica

[SAÍDA]
  { jobId, status: 'queued' }

[ONDE QUEBRA]
  ❌ Worker NÃO roda automaticamente - precisa `npm run worker:bull`
  ❌ edge-tts não instalado → TTS falha
  ❌ FFmpeg não no PATH → Render falha
  ❌ Redis offline → Job não entra na fila
  ❌ Sem SUPABASE_SERVICE_ROLE_KEY → Upload de vídeo falha
```

### 2.3 Fluxo de TTS

```
[ENTRADA]
  POST /api/tts/generate
  → { text, voice, engine }

[PROCESSAMENTO - SERVER]
  1. TTSEngineManager.synthesize() → MOCK SIMULADO
  
[SAÍDA]
  { jobId, audioUrl: "/api/audio/generated/xxx.mp3", duration }

[PROBLEMA CRÍTICO]
  ⛔ audioUrl retornado NÃO existe de verdade
  ⛔ Nenhum arquivo MP3 é criado
  ⛔ É apenas simulação com setTimeout(1500ms)

[ALTERNATIVA REAL]
  ElevenLabsService.generateSpeech() → REAL se ELEVENLABS_API_KEY configurada
```

---

## 3. MÓDULOS

### 3.1 PPTX Processing

| Componente | Arquivo | Status |
|------------|---------|--------|
| PptxProcessor | `lib/pptx/pptx-processor.ts` | **REAL** |
| PptxUploader | `lib/storage/pptx-uploader.ts` | **REAL** |
| PPTXParser | `lib/pptx/pptx-parser.ts` | **REAL** |
| PPTXTextParser | `lib/pptx/parsers/text-parser.ts` | **REAL** |
| PPTXImageParser | `lib/pptx/parsers/image-parser.ts` | **REAL** |
| PPTXNotesParser | `lib/pptx/parsers/notes-parser.ts` | **REAL** |
| processAdvancedPPTX | `lib/pptx/pptx-processor-advanced.ts` | **PARCIAL** - Thumbnails são mock |

**Dependências:** JSZip, Supabase Storage, fast-xml-parser

**Responsabilidade:** Download PPTX do storage, extração de slides, texto, imagens e notas.

### 3.2 Render Pipeline

| Componente | Arquivo | Status |
|------------|---------|--------|
| JobManager | `lib/render/job-manager.ts` | **REAL** |
| FFmpegExecutor | `lib/render/ffmpeg-executor.ts` | **REAL** (precisa FFmpeg instalado) |
| render-queue | `lib/queue/render-queue.ts` | **REAL** |
| render-worker-bull | `scripts/render-worker-bull.ts` | **REAL** (standalone script) |

**Dependências:** BullMQ, Redis, FFmpeg, Prisma, Supabase Storage

**Responsabilidade:** Criar jobs, enfileirar, processar com FFmpeg, upload de resultado.

### 3.3 TTS (Text-to-Speech)

| Componente | Arquivo | Status |
|------------|---------|--------|
| tts-service | `lib/tts/tts-service.ts` | **MOCK** |
| engine-manager | `lib/tts/engine-manager.ts` | **MOCK** |
| ElevenLabsService | `lib/elevenlabs-service.ts` | **REAL** (com fallback mock) |
| edge-tts (worker) | `scripts/render-worker-bull.ts:81-105` | **REAL** (CLI externo) |
| azure provider | `lib/tts/providers/azure.ts` | **MOCK** |

**Dependências:** ElevenLabs API, Azure Speech SDK, edge-tts CLI

**Responsabilidade:** Converter texto em áudio.

### 3.4 Autenticação e RBAC

| Componente | Arquivo | Status |
|------------|---------|--------|
| Supabase Server Client | `lib/supabase/server.ts` | **REAL** |
| Supabase Browser Client | `lib/supabase/client.ts` | **REAL** |
| RBAC | `lib/rbac.ts` | **REAL** |

**Dependências:** @supabase/ssr, cookies

**Responsabilidade:** Autenticação SSR, controle de permissões.

### 3.5 Cache e Rate Limiting

| Componente | Arquivo | Status |
|------------|---------|--------|
| Redis Cache | `lib/cache/redis-cache.ts` | **REAL** |
| Rate Limiter | `middleware/rate-limiter.ts` | **REAL** |

**Dependências:** ioredis, rate-limiter-flexible

**Responsabilidade:** Cache distribuído, proteção contra abuso.

### 3.6 State Management

| Componente | Arquivo | Status |
|------------|---------|--------|
| editor-store | `lib/stores/editor-store.ts` | **REAL** |
| timeline-store | `lib/stores/timeline-store.ts` | **REAL** |
| unified-project-store | `lib/stores/unified-project-store.ts` | **REAL** |

**Dependências:** Zustand, immer

**Responsabilidade:** Estado do editor, slides, timeline.

### 3.7 Resiliência

| Componente | Arquivo | Status |
|------------|---------|--------|
| CircuitBreaker | `lib/resilience/circuit-breaker.ts` | **REAL** |
| Retry | `lib/resilience/retry.ts` | **REAL** |

**Dependências:** Nenhuma externa

**Responsabilidade:** Prevenir falhas em cascata, retry automático.

---

## 4. FILAS / JOBS / ASSÍNCRONO

### 4.1 Filas Existentes

| Fila | Nome | Arquivo | Status |
|------|------|---------|--------|
| Render Jobs | `render-jobs` | `lib/queue/render-queue.ts` | **REAL** |

### 4.2 Criação de Job

```typescript
// Local: lib/queue/render-queue.ts:104-130
export async function addVideoJob(jobData: any): Promise<string> {
  const job = await videoQueue.add('render-video', jobData, {
    jobId: jobData.jobId,
    priority: jobData.priority || 10
  });
  return job.id?.toString() || '';
}
```

### 4.3 Consumo de Job

```typescript
// Local: scripts/render-worker-bull.ts
const worker = new Worker('render-jobs', async (job: Job<RenderTaskPayload>) => {
  // 1. Atualiza status para 'processing'
  // 2. Gera áudio via edge-tts
  // 3. Renderiza com FFmpeg
  // 4. Upload para Supabase
  // 5. Atualiza status para 'completed'
  // 6. Dispara webhooks
});
```

### 4.4 Workers Reais

| Worker | Como executar | Status |
|--------|---------------|--------|
| BullMQ Worker | `npm run worker:bull` ou `tsx scripts/render-worker-bull.ts` | **REAL** (precisa ser iniciado manualmente) |

### 4.5 Pontos de Falha

| Ponto | Consequência | Mitigação |
|-------|--------------|-----------|
| Redis offline | Jobs não enfileiram | Health check detecta |
| Worker não rodando | Jobs ficam em `queued` indefinidamente | **NÃO HÁ** - precisa monitoramento manual |
| edge-tts não instalado | TTS falha, cria arquivo dummy | Fallback com mock |
| FFmpeg não instalado | Render falha | **NÃO HÁ** - erro 500 |

---

## 5. APIs

### 5.1 APIs de Produção (REAL)

| Método | Path | Arquivo | Validação | Side-effects | Produção? |
|--------|------|---------|-----------|--------------|-----------|
| GET | `/api/health` | `api/health/route.ts` | N/A | DB query, Redis ping | **SIM** |
| POST | `/api/pptx/upload` | `api/pptx/upload/route.ts` | Tipo/tamanho | Storage upload | **SIM** |
| POST | `/api/render/start` | `api/render/start/route.ts` | Parcial | DB insert, BullMQ add | **SIM** (com ressalvas) |
| GET | `/api/render/jobs` | Implícito no start | N/A | DB query | **SIM** |
| POST | `/api/v1/video-jobs` | `api/v1/video-jobs/route.ts` | Zod | DB ou Mock | **PARCIAL** |
| GET | `/api/v1/video-jobs` | `api/v1/video-jobs/route.ts` | Zod | DB ou Mock | **PARCIAL** |

### 5.2 APIs com MOCK

| Método | Path | Arquivo | Problema |
|--------|------|---------|----------|
| POST | `/api/tts/generate` | `api/tts/generate/route.ts` | TTSEngineManager é mock inline - não gera áudio real |

### 5.3 Detalhamento de API Críticas

#### POST /api/render/start

```typescript
// Validação: PARCIAL
// - Não usa Zod para body completo
// - Define interfaces locais (RenderConfig, RenderSlide)
// - Aceita x-user-id header para bypass de auth

// Side-effects:
// 1. INSERT em render_jobs (Prisma)
// 2. ADD em BullMQ queue

// Problemas:
// - Se BullMQ falhar, job fica no DB mas não na fila
// - Não há rollback se enqueue falhar
```

#### POST /api/v1/video-jobs

```typescript
// Validação: Zod (parseVideoJobInput)
// Side-effects:
// - Mock mode: insertMockJob() - em memória
// - Real mode: Supabase insert

// Problemas:
// - USE_MOCK_RENDER_JOBS=true ou sem Supabase → Mock mode ativo
// - Mock jobs não persistem entre restarts
```

---

## 6. PONTOS CRÍTICOS

### 6.1 Impedimentos para Produção

| ID | Problema | Severidade | Arquivo |
|----|----------|------------|---------|
| **P1** | TTS genérico é MOCK | **CRÍTICO** | `lib/tts/tts-service.ts` |
| **P2** | Worker não inicia automaticamente | **ALTO** | `scripts/render-worker-bull.ts` |
| **P3** | FFmpeg precisa estar instalado | **ALTO** | `lib/render/ffmpeg-executor.ts` |
| **P4** | edge-tts CLI externo | **MÉDIO** | `scripts/render-worker-bull.ts` |
| **P5** | Sem retry se BullMQ.add() falhar | **MÉDIO** | `api/render/start/route.ts` |
| **P6** | API TTS retorna URL inexistente | **CRÍTICO** | `api/tts/generate/route.ts` |

### 6.2 Risco de Corrupção de Dados

| Cenário | Risco | Local |
|---------|-------|-------|
| Job criado no DB mas não enfileirado | Job fica `pending` para sempre | `api/render/start/route.ts` |
| Worker falha no meio do render | Job fica `processing` para sempre | `scripts/render-worker-bull.ts` |
| Upload de vídeo falha após render | Vídeo perdido, job marcado `failed` | `scripts/render-worker-bull.ts` |

### 6.3 Falta de Retry/Rollback

| Operação | Tem retry? | Tem rollback? |
|----------|------------|---------------|
| Upload PPTX | **NÃO** | **NÃO** |
| Criar job no DB | **NÃO** | **NÃO** |
| Adicionar à fila | **SIM** (BullMQ built-in) | **NÃO** |
| Renderização | **SIM** (3 attempts) | **NÃO** |
| Upload de vídeo | **NÃO** | **NÃO** |
| TTS ElevenLabs | **SIM** (circuit breaker) | **NÃO** |

---

## 7. CHECKLIST DE PRODUÇÃO

### 7.1 Obrigatório ANTES de Produção

- [ ] **CRÍTICO:** Substituir mock de TTS por implementação real
  - Arquivo: `lib/tts/tts-service.ts`
  - Linha: 46-47
  
- [ ] **CRÍTICO:** API /api/tts/generate precisa gerar áudio de verdade
  - Arquivo: `api/tts/generate/route.ts`
  - Problema: TTSEngineManager inline é mock
  
- [ ] **ALTO:** Configurar worker como serviço (PM2/systemd)
  - Worker: `scripts/render-worker-bull.ts`
  - Comando: `npm run worker:bull`

- [ ] **ALTO:** Instalar FFmpeg no servidor de produção
  - Verificar: `ffmpeg -version`

- [ ] **ALTO:** Instalar edge-tts ou configurar TTS alternativo
  - Verificar: `edge-tts --help`

- [ ] **MÉDIO:** Adicionar transação ao criar job + enfileirar
  - Arquivo: `api/render/start/route.ts`
  - Motivo: Evitar jobs órfãos no DB

### 7.2 Obrigatório para Escalar

- [ ] Configurar múltiplas instâncias de worker
- [ ] Implementar dead letter queue para jobs falhados
- [ ] Adicionar monitoramento de fila (Bull Board já existe)
- [ ] Configurar alertas para jobs stuck em `processing`
- [ ] Implementar cleanup de jobs antigos

### 7.3 Riscos Altos

| Risco | Probabilidade | Impacto | Mitigação Recomendada |
|-------|---------------|---------|----------------------|
| Worker não iniciado | Alta | Todos os jobs falham | PM2 + healthcheck |
| Redis sem persistência | Média | Jobs perdidos em restart | Configurar AOF |
| ElevenLabs rate limit | Alta | TTS falha em pico | Cache agressivo + fallback |
| FFmpeg crash | Média | Render falha | Retry + logging detalhado |

---

## 8. RESUMO EXECUTIVO

### Status Geral: ⚠️ PARCIALMENTE FUNCIONAL

| Área | Status |
|------|--------|
| **Upload PPTX** | ✅ Funcional |
| **Parsing PPTX** | ✅ Funcional |
| **Autenticação** | ✅ Funcional |
| **Fila de Jobs** | ✅ Funcional (infra) |
| **Worker de Render** | ⚠️ Precisa start manual + deps |
| **TTS Genérico** | ❌ MOCK |
| **TTS ElevenLabs** | ✅ Funcional (com API key) |
| **FFmpeg Render** | ⚠️ Precisa FFmpeg instalado |
| **API TTS** | ❌ Retorna dados fake |

### Próximos Passos Críticos

1. **Substituir mock de TTS** - Sem isso, nenhum vídeo terá áudio real
2. **Automatizar start do worker** - PM2 ou similar
3. **Garantir FFmpeg no ambiente** - Docker ou instalação manual
4. **Testar fluxo end-to-end** - Upload → Parse → TTS → Render → Download

---

> **AVISO:** Este documento foi gerado com base na análise direta do código-fonte.
> Funcionalidades não encontradas no código NÃO foram assumidas.
> Última atualização: 14/01/2026

