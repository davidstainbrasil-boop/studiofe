# Tasks: refactor-render-pipeline-canonical

## Pre-requisites
- [ ] Backup dos endpoints atuais (copiar para `_archived/`)
- [ ] Documentar clientes conhecidos dos endpoints legados

---

## Phase 1: Preparação (Sem breaking changes)

- [ ] **T1.1** Criar Zod schema unificado `RenderStartPayload`
  - Arquivo: `lib/validation/render-schemas.ts`
  - Incluir: projectId, slides, config, webhookUrl, idempotencyKey

- [ ] **T1.2** Adicionar header `Deprecation` nos endpoints legados
  - Endpoints: `/api/render/jobs`, `/api/v1/render/*`, `/api/export/mp4`
  - Header: `Deprecation: true`, `Sunset: 2026-03-01`

- [ ] **T1.3** Criar adaptador interno para `/api/export/mp4`
  - Chamar `/api/render/start` internamente em vez de criar job direto

---

## Phase 2: Consolidação

- [ ] **T2.1** Implementar redirects 308 nos endpoints legados
  - `/api/render/jobs` POST → `/api/render/start`
  - `/api/v1/render/video-production` → `/api/render/start`
  - `/api/v1/render/video-production-v2` → `/api/render/start`

- [ ] **T2.2** Desativar `RenderJobProcessor`
  - Arquivo: `lib/workers/render-job-processor.ts`
  - Opção: Envolver `start()` em feature flag `LEGACY_RENDER_PROCESSOR=false`

- [ ] **T2.3** Consolidar `video-queue-manager.ts` funcionalidades
  - Mover funções úteis para `render-queue.ts`
  - Marcar funções duplicadas como `@deprecated`

---

## Phase 3: Limpeza

- [ ] **T3.1** Mover endpoints legados para `_archived/`
- [ ] **T3.2** Atualizar testes de contrato
  - Arquivo: `scripts/test-contract-video-jobs*.js`
- [ ] **T3.3** Atualizar documentação de API
  - Arquivo: `docs/api/render.md`

---

## Phase 4: Validação

- [ ] **T4.1** Executar suite de testes
  ```bash
  npm test -- --testPathPattern="render"
  npm run test:contract:video-jobs
  ```

- [ ] **T4.2** Validar health check
  ```bash
  npm run health
  ```

- [ ] **T4.3** Teste E2E manual
  - Criar projeto → Upload PPTX → Render → Download vídeo

---

## Rollback Plan

Se problemas críticos em produção:
1. Reverter feature flag `LEGACY_RENDER_PROCESSOR=true`
2. Remover redirects 308
3. Restaurar endpoints de `_archived/`
