# Proposal: refactor-render-pipeline-canonical

## Status: DRAFT
## Author: AI Assistant
## Created: 2026-01-30

---

## Why

O sistema possui **7 endpoints diferentes** para iniciar renderização de vídeo:
1. `/api/render/start` (canônico - usa jobManager + BullMQ)
2. `/api/render/route.ts` (usa jobManager)
3. `/api/render/jobs` (cria job direto no Prisma + addVideoJob)
4. `/api/v1/render/video-production` (diferente estrutura)
5. `/api/v1/render/video-production-v2` (variante)
6. `/api/export/mp4` (cria job direto + addVideoJob)
7. `/api/remotion/render` (Remotion específico)

Além disso, existem **2 sistemas de worker** coexistindo:
- `RenderJobProcessor` (polling de DB a cada 5s)
- `DistributedVideoWorker` (BullMQ worker)

### Problemas:
- Jobs podem ser criados por caminhos diferentes com comportamentos inconsistentes
- Idempotency key não é usada em todos os endpoints
- Rate limiting não é uniforme
- Monitoramento fragmentado
- Duplicação de código (~40% entre endpoints)

---

## What

### Objetivo
Consolidar em **um único pipeline canônico**:

```
POST /api/render/start → JobManager.createJob(DB) → addVideoJob(BullMQ) → DistributedVideoWorker → Storage
```

### Mudanças Propostas

1. **Deprecar endpoints redundantes** (com redirects 308):
   - `/api/render/jobs` POST → redirect para `/api/render/start`
   - `/api/v1/render/video-production` → redirect
   - `/api/v1/render/video-production-v2` → redirect
   - `/api/export/mp4` → adaptar para usar `/api/render/start` internamente

2. **Eliminar RenderJobProcessor** (polling):
   - Arquivo: `lib/workers/render-job-processor.ts`
   - Motivo: BullMQ worker já faz o trabalho

3. **Unificar queue managers**:
   - Manter `render-queue.ts` como fonte única
   - Deprecar funcionalidades duplicadas em `video-queue-manager.ts`

4. **Padronizar validações**:
   - Zod schema único para payload de render
   - Idempotency key obrigatória (header ou gerada)
   - Rate limit via `globalRateLimiter`

---

## Impact

### Breaking Changes
- Endpoints v1 retornarão 308 Redirect (clientes precisam seguir)
- `RenderJobProcessor.start()` será no-op

### Benefícios
- ~40% menos código duplicado
- Monitoramento centralizado (uma fila, um dashboard)
- Debugging simplificado (um caminho de execução)
- Idempotency garantida

### Riscos
- Clientes usando endpoints legados precisam atualizar
- Período de transição com redirects

---

## Acceptance Criteria

1. [ ] Todos os render jobs passam por `/api/render/start`
2. [ ] Endpoints legados retornam 308 + header `Deprecation`
3. [ ] `RenderJobProcessor` removido ou desativado
4. [ ] Testes de contrato atualizados
5. [ ] `npm run health` passa sem warnings relacionados a render
6. [ ] Documentação de migração para clientes
