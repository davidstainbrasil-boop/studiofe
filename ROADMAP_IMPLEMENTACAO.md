# Roadmap de Implementacao - MVP Video Tecnico Cursos v7

> Documento gerado em: 2026-02-06
> Branch: `hardening-prod`
> Analise completa do codebase com todas as lacunas identificadas
>
> **Ultima atualizacao**: 2026-02-06 - Revisao pos-implementacao
>
> ### Progresso da Sessao
>
> **Fase 1 - Correcoes Criticas**: 7/7 itens resolvidos
> - 1.1 API key hashing: JA IMPLEMENTADO (bcrypt + key_prefix)
> - 1.2 Endpoints sem auth: JA PROTEGIDOS (maioria ja tinha auth; debug-image corrigido)
> - 1.3 Middleware whitelist: JA IMPLEMENTADO (whitelist approach linhas 82-103)
> - 1.4 Rate limiting Redis: JA IMPLEMENTADO (Lua script + fallback in-memory)
> - 1.5 Docker permissions: JA CORRIGIDO (chmod 755, user appuser)
> - 1.6 SKIP_AUTH guard: Controlado pelo middleware (fail-closed em producao)
> - 1.7 CSP/HSTS headers: JA IMPLEMENTADO (middleware linhas 294-312)
>
> **Fase 2 - Core Pipeline**: 10/10 itens resolvidos
> - 2.1 Video Processor: JA IMPLEMENTADO (fluent-ffmpeg real)
> - 2.2 PPTX tabelas/graficos: JA IMPLEMENTADO (table-chart-parser.ts)
> - 2.3 PPTX thumbnails: JA IMPLEMENTADO
> - 2.4 PPTX imagens: JA IMPLEMENTADO
> - 2.5 PPTX Generator: JA IMPLEMENTADO
> - 2.6 Job Queue: CONECTADO (v1 route -> video_jobs DB + generate endpoint com persistencia)
> - 2.7 Save Project: JA IMPLEMENTADO (Supabase real)
> - 2.8 Step2Customize: JA IMPLEMENTADO (avatar, voz, musica, legendas)
> - 2.9 Slide-to-Video: JA IMPLEMENTADO (FFmpegRenderer real)
> - 2.10 Render Adapter: JA IMPLEMENTADO
>
> **Correcoes adicionais**:
> - Corrigidos erros de syntax em content-suggestions.service.ts
> - Corrigidos erros de syntax em performance-analytics.service.ts
> - Corrigidos erros de syntax em video-renderer.ts
> - Corrigidos erros de syntax em table-chart-parser.ts
> - Build TypeScript: 0 erros (era 132+)

---

## Indice

1. [Fase 1 - Correcoes Criticas (Producao)](#fase-1---correcoes-criticas-producao)
2. [Fase 2 - Core Pipeline Funcional](#fase-2---core-pipeline-funcional)
3. [Fase 3 - Integracao de APIs Externas](#fase-3---integracao-de-apis-externas)
4. [Fase 4 - UI/UX Incompleto](#fase-4---uiux-incompleto)
5. [Fase 5 - AI/ML Features](#fase-5---aiml-features)
6. [Fase 6 - Infraestrutura e DevOps](#fase-6---infraestrutura-e-devops)
7. [Fase 7 - Testes e Qualidade](#fase-7---testes-e-qualidade)
8. [Fase 8 - Features Avancadas](#fase-8---features-avancadas)
9. [Fase 9 - Monetizacao e Enterprise](#fase-9---monetizacao-e-enterprise)
10. [Fase 10 - Polish e Producao Final](#fase-10---polish-e-producao-final)
11. [Apendice A - Variaveis de Ambiente Faltando](#apendice-a---variaveis-de-ambiente-faltando)
12. [Apendice B - Arquivos Desativados](#apendice-b---arquivos-desativados)
13. [Apendice C - Estatisticas Gerais](#apendice-c---estatisticas-gerais)

---

## Fase 1 - Correcoes Criticas (Producao)

> Prioridade: **P0** | Bloqueia deploy em producao

### 1.1 Seguranca - API Keys em texto plano no banco

- **Arquivo**: `src/lib/api/api-key-middleware.ts:113`
- **Problema**: API keys armazenadas sem hash no banco de dados
- **Solucao**: Implementar hashing (bcrypt/argon2) antes de salvar; comparar hash na validacao
- **Risco**: Qualquer acesso ao banco expoe todas as chaves dos clientes

### 1.2 Seguranca - 15+ endpoints sem autenticacao

Rotas expostas sem nenhuma verificacao de auth:

| Rota | Arquivo | Risco |
|------|---------|-------|
| `/api/alerts` | `src/app/api/alerts/route.ts` | Medio |
| `/api/backup` | `src/app/api/backup/route.ts` | **Alto** |
| `/api/collaboration` | `src/app/api/collaboration/route.ts` | Medio |
| `/api/debug-image` | `src/app/api/debug-image/route.ts` | Baixo |
| `/api/docs` | `src/app/api/docs/route.ts` | Baixo |
| `/api/help` | `src/app/api/help/route.ts` | Baixo |
| `/api/image-proxy` | `src/app/api/image-proxy/route.ts` | **Alto** (SSRF) |
| `/api/quotas` | `src/app/api/quotas/route.ts` | Medio |
| `/api/setup-database` | `src/app/api/setup-database/route.ts` | **Critico** |
| `/api/subscription` | `src/app/api/subscription/route.ts` | **Alto** |
| `/api/templates` | `src/app/api/templates/route.ts` | Baixo |
| `/api/tts` | `src/app/api/tts/route.ts` | Medio |
| `/api/upload-with-notifications` | `src/app/api/upload-with-notifications/route.ts` | **Alto** |
| `/api/csrf` | `src/app/api/csrf/route.ts` | Baixo |

### 1.3 Seguranca - Middleware de rotas hardcoded

- **Arquivo**: `src/middleware.ts:85-97`
- **Problema**: Lista de rotas protegidas hardcoded; novas rotas ficam desprotegidas por padrao
- **Solucao**: Inverter logica - proteger tudo por padrao, whitelist apenas rotas publicas

### 1.4 Seguranca - Rate limiting apenas em memoria

- **Arquivo**: `src/middleware.ts:209-235`
- **Problema**: Rate limiter in-memory nao funciona com multiplas instancias
- **Solucao**: Migrar para Redis-backed rate limiting (ja tem Redis configurado)

### 1.5 Seguranca - Docker com chmod 777

- **Arquivo**: `estudio_ia_videos/Dockerfile:78-79`
- **Problema**: `chmod -R 777` em diretorios publicos
- **Solucao**: Usar permissoes minimas (755 para dirs, 644 para arquivos)

### 1.6 Seguranca - SKIP_AUTH em .env.local

- **Arquivo**: `.env.local:5-7`
- **Problema**: `SKIP_AUTH=true`, `SKIP_RATE_LIMIT=true`, `DEV_BYPASS_USER_ID` hardcoded
- **Solucao**: Garantir que esses flags NUNCA cheguem em producao; adicionar validacao no startup

### 1.7 Seguranca - Faltam headers CSP e HSTS

- **Arquivo**: `vercel.json`
- **Problema**: Content Security Policy e Strict-Transport-Security nao configurados
- **Solucao**: Adicionar headers de seguranca no middleware e/ou vercel.json

---

## Fase 2 - Core Pipeline Funcional

> Prioridade: **P0-P1** | Funcionalidades centrais que precisam funcionar

### 2.1 Video Processor - Funcoes stub

- **Arquivo**: `src/lib/video-processor.ts:32-71`
- **Funcoes que lancam "not implemented"**:
  - `processVideo()` - Processar video com FFmpeg
  - `extractAudio()` - Extrair audio de video
  - `mergeVideoAudio()` - Combinar video + audio
  - `getVideoMetadata()` - Retorna mock metadata
- **Solucao**: Implementar wrapper real do FFmpeg (ja tem `FFMPEG_PATH` configurado)

### 2.2 PPTX - Extracao de tabelas e graficos

- **Arquivo**: `src/lib/pptx/pptx-processor-advanced.ts`
- **Problema**: `tables: []` e `charts: []` - arrays vazios, sem extracao real
- **Solucao**: Implementar parsing de tabelas/graficos do XML do PPTX

### 2.3 PPTX - Thumbnails simuladas

- **Arquivo**: `src/lib/pptx-processor.ts:313`
- **Problema**: "Geracao de thumbnails simulada - TODO: implementar com canvas/sharp"
- **Solucao**: Usar `sharp` ou `canvas` para gerar thumbnails reais dos slides

### 2.4 PPTX - Imagens placeholder

- **Arquivo**: `src/lib/pptx/pptx-processor-advanced.ts:146`
- **Problema**: Retorna `/api/placeholder/${width}x${height}` ao inves de imagem real
- **Solucao**: Extrair imagens reais do PPTX e salvar no storage

### 2.5 PPTX Generator - Mock buffer

- **Arquivo**: `src/lib/pptx/pptx-generator.ts:34-49`
- **Problema**: Retorna placeholder/mock Buffer ao inves de PPTX real
- **Solucao**: Implementar geracao real com `pptxgenjs` ou similar

### 2.6 Job Queue - Processamento async nao implementado

- **Arquivo**: `src/app/api/v1/pptx-to-video/route.ts:148`
- **Problema**: TODO "Actually queue the job for background processing"
- **Solucao**: Integrar com BullMQ (ja esta como dependencia)

### 2.7 Save Project - Nao funciona

- **Arquivo**: `src/lib/stores/timeline-store.ts:253`
- **Problema**: `saveProject: () => logger.warn('Save project not implemented')`
- **Solucao**: Implementar persistencia no Supabase

### 2.8 Step2Customize - Componente ausente

- **Arquivo**: `src/components/pptx-to-video/steps/`
- **Problema**: Step1Upload e Step3Generate existem, mas Step2Customize e referenciado sem existir
- **Solucao**: Criar o componente de customizacao (voz, avatar, musica, legendas)

### 2.9 Slide-to-Video Composer - URL mock

- **Arquivo**: `src/lib/video/slide-to-video-composer.ts:130`
- **Problema**: Retorna `/api/mock/video/${projectId}.mp4`
- **Solucao**: Integrar com pipeline real de renderizacao

### 2.10 Render Adapter - Frame placeholder

- **Arquivo**: `src/lib/render/studio-render-adapter.ts:168-176`
- **Problema**: "Integrar com canvas para gerar snapshot real" - retorna URL placeholder
- **Solucao**: Usar canvas/Remotion para gerar frames reais

---

## Fase 3 - Integracao de APIs Externas

> Prioridade: **P1** | APIs com chaves faltando ou nao configuradas

### 3.1 OpenAI - Transcricao e legendas

- **Arquivos**:
  - `src/app/api/ai/subtitle-generator/route.ts:138` - TODO: Integrar Whisper
  - `src/lib/services/transcription-service.ts` - OPENAI_API_KEY nao configurada
  - `src/lib/ai/script-generator.service.ts` - Fallback para mock
- **Env**: `OPENAI_API_KEY=not-configured`
- **Impacto**: Geracao de legendas, transcricao, scripts AI

### 3.2 ElevenLabs - Voice cloning

- **Arquivos**:
  - `src/lib/voice/voice-cloning.ts` - Nao configurada
  - `src/lib/tts/tts-service.ts:60` - Check de credenciais falha
  - `src/lib/tts-real-integration.ts:185` - Fallback para vozes hardcoded
- **Env**: `ELEVENLABS_API_KEY=not-configured`
- **Impacto**: Clonagem de voz, TTS premium

### 3.3 Azure TTS

- **Arquivo**: `src/lib/tts/tts-service.ts:96`
- **Env**: `AZURE_TTS_KEY=not-configured`
- **Impacto**: TTS Azure como alternativa

### 3.4 Google TTS

- **Env**: `GOOGLE_TTS_CREDENTIALS=not-configured`
- **Impacto**: TTS Google como alternativa

### 3.5 Google OAuth - Slides/Drive integration

- **Arquivo**: `src/lib/google/google-auth.ts`
- **Env faltando**: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
- **Impacto**: Importacao de apresentacoes do Google Slides

### 3.6 Stock Media APIs

- **Arquivo**: `src/app/api/external/media/search/route.ts`
- **APIs sem chave**:
  - Unsplash API
  - Pexels API
  - Pixabay API
  - Shutterstock API
- **Impacto**: Biblioteca de midia stock indisponivel

### 3.7 Pixabay Music Library

- **Arquivo**: `src/lib/audio/music-library.ts`
- **Env faltando**: `PIXABAY_API_KEY` / `NEXT_PUBLIC_PIXABAY_API_KEY`
- **Impacto**: Biblioteca de musica expandida indisponivel

### 3.8 D-ID Avatar Provider

- **Arquivo**: `src/lib/services/avatar/did-service-real.ts`
- **Env faltando**: `DID_API_KEY`, `DID_API_URL`
- **Impacto**: Provider de avatar D-ID indisponivel

### 3.9 HeyGen Avatar Provider

- **Arquivo**: `src/lib/avatar/providers/heygen-adapter.ts`
- **Env faltando**: `HEYGEN_API_KEY`, `HEYGEN_API_URL`
- **Impacto**: Provider de avatar HeyGen indisponivel

### 3.10 Fal.ai (MuseTalk alternativo)

- **Arquivo**: `src/lib/avatar/musetalk-provider.ts:53`
- **Env faltando**: `FAL_API_KEY`
- **Impacto**: Fallback do MuseTalk indisponivel

### 3.11 Email Service (Resend)

- **Arquivo**: `src/lib/services/email-service.ts`
- **Env faltando**: `RESEND_API_KEY`, `EMAIL_FROM`
- **Impacto**: Envio de emails indisponivel

### 3.12 Sentry - Monitoramento de erros

- **Arquivo**: `src/lib/observability.ts:12`
- **Env**: `SENTRY_DSN=` (vazio), `SENTRY_DISABLED=true`
- **Impacto**: Zero monitoramento de erros em producao

### 3.13 Google Analytics

- **Env**: `NEXT_PUBLIC_GA_ID="G-XXXXXXXXXX"` (placeholder)
- **Impacto**: Sem analytics de uso

---

## Fase 4 - UI/UX Incompleto

> Prioridade: **P1-P2** | Paginas e componentes com lacunas

### 4.1 Paginas com dados mock/simulados

| Pagina | Arquivo | Problema |
|--------|---------|----------|
| **Batch Processing** | `src/app/batch-processing/page.tsx:69-75` | setTimeout simulado, `outputUrl: '#'`, zero integracao backend |
| **Exports Queue** | `src/app/exports/page.tsx:67` | `downloadUrl: '#'`, estado simulado com useState |
| **Scheduling** | `src/app/scheduling/page.tsx:38-73` | Dados hardcoded, sem submit real |
| **Media Library** | `src/app/media/page.tsx:47-101` | Items mock com emojis como thumbnails |
| **Integrations** | `src/app/integrations/page.tsx:36-93` | Mock status, sem OAuth real |

### 4.2 Botoes sem handler

| Local | Arquivo | Botoes |
|-------|---------|--------|
| **System Control** | `src/app/system-control/page.tsx:144-175` | "Configurar Intervalos", "Gerenciar Alertas", "Ver Logs", "Configurar Backup" |
| **Settings** | `src/app/settings/page.tsx:57` | "Acessar" sem acao |
| **Canvas Editor** | `src/app/canvas-editor-pro/page.tsx:23-26` | `handleExportTimeline` apenas console.log |

### 4.3 Secoes "Em breve" / "Coming Soon"

| Componente | Arquivo | Mensagem |
|------------|---------|----------|
| Voice Cloning Studio | `src/components/voice/voice-cloning-studio.tsx:748` | Marketplace de vozes "Em breve" |
| Export Studio | `src/components/export/export-studio.tsx:555` | Multi-format export "Em breve" |
| Vidnoz Talking Photo | `src/components/avatars/vidnoz-talking-photo.tsx:333` | "Em breve na versao PRO!" |
| Version Control | `src/components/collaboration/version-control.tsx:668` | Comparacao lado a lado "Em desenvolvimento" |
| Export Pipeline | `src/components/export-pipeline/professional-export-pipeline.tsx:666` | "Preview Coming Soon" |
| NR Template Library | `src/components/nr-template-library.tsx:315` | "Em breve disponivel" |
| Media Library Panel | `src/components/pptx/media-library-panel.tsx:341` | Upload de avatar "Em breve" |
| Dashboard Home | `src/components/dashboard/dashboard-home.tsx:1019-1079` | Multiplos "Em breve" |
| Blog | `src/app/blog/page.tsx:7-13` | "Conteudo em breve" |
| AI Features | `src/app/ai-features/page.tsx:233-250` | "Mais features em desenvolvimento" |
| Integrations | `src/app/integrations/page.tsx:254-269` | "Mais Integracoes em Breve" (Vimeo, Dropbox, Zapier) |

### 4.4 Paginas stub (apenas wrapper de componente)

Paginas que apenas renderizam um componente sem nenhuma logica adicional:

- `src/app/dashboard/apis/page.tsx`
- `src/app/dashboard/editor/page.tsx`
- `src/app/dashboard/motionity/page.tsx`
- `src/app/dashboard/notifications/page.tsx`
- `src/app/dashboard/render/page.tsx`
- `src/app/dashboard/templates/page.tsx`
- `src/app/dashboard/timeline/page.tsx`
- `src/app/talking-photo-pro/page.tsx`
- `src/app/real-time-collaboration/page.tsx`
- `src/app/interactive-elements/page.tsx`
- `src/app/ai-assistant/page.tsx`

### 4.5 Editor - Funcionalidades faltando

| Feature | Arquivo | Status |
|---------|---------|--------|
| Copy/Paste | `src/components/editor/canvas-editor-v2.tsx:375-380` | TODO |
| Undo funcional | `src/components/editor/animaker-editor-v2.tsx:419` | TODO |
| Timeline Ruler | `src/components/timeline/timeline-components-stub.tsx:10` | Stub |
| Timeline Playhead | `src/components/timeline/timeline-components-stub.tsx` | Stub |
| Playback progress | `src/components/timeline/timeline-element-card.tsx:281` | TODO |
| Drag-to-select | `src/components/timeline/timeline-canvas.tsx:315` | TODO |

### 4.6 Paginas redirect (possivelmente desnecessarias)

- `src/app/editor/page.tsx` - Redireciona para `/`
- `src/app/render-dashboard/page.tsx` - Redireciona para `/dashboard/render`
- `src/app/studio/page.tsx` - Redireciona para `/projects`

---

## Fase 5 - AI/ML Features

> Prioridade: **P2** | Feature flags desabilitados, esqueletos definidos

### 5.1 AI Services - Stubs principais

- **Arquivo**: `src/lib/ai-services.ts:29-48`
- **Funcoes stub**:
  - `generateScript()` - Retorna placeholder
  - `analyzeContent()` - Retorna sentiment 'neutral' hardcoded, arrays vazios
  - `suggestEdits()` - Retorna array vazio

### 5.2 Content Suggestions Service

- **Arquivo**: `src/lib/ai/content-suggestions.service.ts`
- **Status**: Apenas definicoes de tipos, classes sem implementacao real
- **Flag**: `FLAG_ENABLE_AI_CONTENT=false`

### 5.3 ML Models Service

- **Arquivo**: `src/lib/ai/ml-models.service.ts:505`
- **Status**: "Return placeholder buffers" - outputs mock

### 5.4 Auto Enhancement Algorithms

- **Arquivo**: `src/lib/ai/auto-enhancement.algorithms.ts:757`
- **Status**: "Return a placeholder calculation" - calculos mock

### 5.5 Scene Detector Service

- **Arquivo**: `src/lib/ai/scene-detector.service.ts:621-656`
- **Status**: Interface definida, retorna arrays vazios

### 5.6 Video Enhancer Service

- **Arquivo**: `src/lib/ai/video-enhancer.service.ts`
- **Status**: Cache logic existe, metodos de enhancement sao stub

### 5.7 Performance Analytics Service

- **Arquivo**: `src/lib/ai/performance-analytics.service.ts`
- **Status**: Apenas interface de monitoramento

### 5.8 Smart Rendering Service

- **Arquivo**: `src/lib/ai/smart-rendering.service.ts`
- **Status**: Esqueleto com resource tracking parcial

### 5.9 Whisper API para legendas

- **Arquivo**: `src/app/api/ai/subtitle-generator/route.ts:131-174`
- **Funcoes que lancam "Not implemented"**:
  - `extractAudio()`
  - `callWhisperAPI()`
  - `parseTranscription()`

---

## Fase 6 - Infraestrutura e DevOps

> Prioridade: **P1-P2** | Estabilidade e operacoes

### 6.1 Docker - Multi-stage build ausente

- **Arquivo**: `Dockerfile`, `estudio_ia_videos/Dockerfile`
- **Problema**: Build single-stage, imagem grande, sem usuario non-root
- **Solucao**: Multi-stage (builder + runner), usuario dedicado, health checks

### 6.2 Docker Worker incompleto

- **Arquivo**: `Dockerfile.worker`
- **Problema**: Falta copia do Prisma schema, setup de ambiente, inicializacao de servicos

### 6.3 Prisma vs Supabase - Schema desalinhado

- **Problema**: Dois `schema.prisma` (root e estudio_ia_videos/prisma/)
- **Schema prisma**: ~50 linhas, 2 modelos (`analytics_events`, `webhooks`)
- **Migrations referenciam**: `api_keys`, `api_usage`, `video_jobs`, `projects`, `render_jobs`, `templates`, `comments` e mais
- **TODOs no codigo**: "Add timeline_elements tables to Supabase types", "Fix Prisma includes type"

### 6.4 Migrations fragmentadas

- **3 locais diferentes**:
  - `estudio_ia_videos/supabase/migrations/` (9 arquivos)
  - `database/migrations/` (5 arquivos)
  - `scripts/sql/migrations/` (8 arquivos)
- **Problema**: Sem tracking de quais foram aplicadas

### 6.5 Tabelas referenciadas mas possivelmente ausentes

| Tabela | Referencia |
|--------|-----------|
| `api_logs` | `src/app/api/pipeline/route.ts:142` |
| `pipeline_jobs` | `src/app/api/pipeline/route.ts:249` |
| `user_profiles` | Multiplas rotas |
| `project_history` | `src/app/api/avatars/route.ts:207` |
| `support_tickets` | Rotas de suporte |
| `scorm_exports` | Rotas de export |
| `avatar_models` | `src/app/api/avatars/models/route.ts:17` |
| `user_favorites` | `src/lib/assets-manager.ts:214` - TODO |
| `nr_templates` | `src/lib/services/nr-templates-service.ts:47` |

### 6.6 CI/CD - Scripts nao existentes

Scripts referenciados no CI mas ausentes no package.json:

- `npm run ci:strict`
- `npm run quality:any`
- `npm run validate:env`
- `npm run audit:rls`
- `npm run test:performance`
- `npm run test:security`
- `npm run test:contract`
- `npm run test:suite:pptx`
- `npm run test:services`
- `npm run test:rbac`

### 6.7 CI/CD - Deploy sem rollback

- **Arquivo**: `.github/workflows/deploy.yml`
- **Faltando**: Rollback strategy, database migration validation, staging test, approval gates

### 6.8 Redis - Fallback para in-memory

- **Arquivo**: `src/lib/cache/redis-cache.ts`
- **Problema**: Se Redis indisponivel, usa cache in-memory (nao compartilhado entre instancias)

### 6.9 WebSocket - Desabilitado

- **Arquivo**: `src/app/api/websocket/route.ts.disabled`
- **Fallback**: `src/services/websocket.ts:102` - "No WS server configured, using polling fallback"
- **Impacto**: Colaboracao real-time degradada

### 6.10 Vercel - Single region

- **Arquivo**: `vercel.json:10`
- **Problema**: `"regions": ["gru1"]` - apenas regiao Brasil
- **Risco**: Single point of failure

### 6.11 System Health hardcoded

- **Arquivo**: `src/app/api/pipeline/route.ts:440`
- **Problema**: `system_health: 'healthy'` - sempre retorna healthy, sem verificacao real

---

## Fase 7 - Testes e Qualidade

> Prioridade: **P2** | Cobertura e confiabilidade

### 7.1 Testes desabilitados

- **26 arquivos `.test.disabled.ts`** em `src/app/__tests__/`
- **21 marcadores `it.skip()` / `describe.skip()` / `test.skip()`**:
  - `api/pptx-api.test.ts:141`
  - `api.timeline.advanced.test.ts` - 9 skips
  - `api.timeline.multitrack.test.ts` - 2 skips
  - `e2e/smoke.spec.ts:57`
  - `integration/critical-flow.test.ts:41`
  - `lib/pptx/text-parser.test.ts` - 3 skips
  - `e2e/02-navigation-regression.spec.ts` - 6 skips

### 7.2 Jest - Sem thresholds de cobertura

- **Arquivo**: `jest.config.cjs`
- **Problema**: Nenhum coverage threshold definido; `strict: false` no TypeScript

### 7.3 Playwright - Execucao serial

- **Arquivo**: `playwright.config.ts:16`
- **Problema**: `workers: 1` - apenas execucao serial (lento)
- **Faltando**: Visual regression testing, database state reset

### 7.4 31 instancias de @ts-ignore

- `src/components/pptx/fabric-canvas-editor.tsx` - 5 instancias
- `src/components/video-studio/canvas/AnimatedCanvas.tsx` - 4
- `src/components/canvas/advanced-canvas-editor.tsx` - 3
- `src/components/canvas/canvas-editor-professional-sprint28.tsx` - 14
- `src/app/__tests__/lib/audio2face/audio2face-integration.test.ts` - 3
- `src/app/api-docs/page.tsx` - 3

### 7.5 15+ arquivos com TODO "Fix Prisma types"

- `src/app/api/v1/export/route.ts`
- `src/app/api/v1/pptx/auto-narrate/route.ts`
- `src/app/api/timeline/elements/route.ts`
- `src/app/api/v2/avatars/render/route.ts`
- `src/app/api/v2/avatars/gallery/route.ts`
- `src/components/tts/professional-voice-studio.tsx`
- E outros...

### 7.6 Error Boundaries - Apenas root level

- **Existem**: `src/app/error.tsx`, `global-error.tsx`, `not-found.tsx`
- **Faltando**: Error boundaries por rota, integracao com Sentry, boundaries em modais/dialogs

---

## Fase 8 - Features Avancadas

> Prioridade: **P2-P3** | Features planejadas mas nao implementadas

### 8.1 Formatos de export

- **Arquivo**: `src/hooks/useTemplates.ts:346-352`
- **Nao implementados**:
  - ZIP export
  - SCORM export
  - xAPI export

### 8.2 HyperReal Avatar Renderer

- **Arquivo**: `src/lib/avatar/avatar-renderer-factory.ts:40`
- **Status**: Throws "HyperReal renderer not implemented yet"

### 8.3 Avatar Marketplace

- **Arquivo**: `src/lib/avatar/avatar-marketplace.ts:596-605`
- **Nao implementados**: `getPurchaseHistory()`, `getListingAnalytics()`

### 8.4 UE5 Engine

- **Arquivo**: `src/lib/avatar-engine.ts:113`
- **Status**: "UE5 Engine requested but not available"

### 8.5 Transicoes de cena

- **Referenciados em testes** mas sem implementacao:
  - Fade transition
  - Wipe transition
  - Slide transition
  - Fade-in animation
  - Typewriter animation

### 8.6 Interactive Video Engine

- **Arquivo**: `src/lib/interactive/interactive-video-engine.ts:279-692`
- **Status**: 4 TODOs de "database persistence missing"

### 8.7 Webhook System

- **Arquivo**: `src/lib/webhooks/webhook-system.ts:557-573`
- **Status**: 3 TODOs de "Implement database persistence"

### 8.8 Multi-language System

- **Arquivo**: `src/lib/i18n/multi-language-system.ts:526`
- **Status**: "Calculate from audio" - calculo de duracao nao implementado

### 8.9 Advanced Analytics

- **Arquivo**: `src/lib/analytics/advanced-analytics-system.ts:225-580`
- **8 TODOs incluindo**:
  - "Calculate from video data"
  - "Implement actual revenue calculation"
  - "Implement database persistence"
  - "Implement Google Analytics, Mixpanel"

### 8.10 Collaboration - Tipos de mudanca

- **Arquivo**: `src/lib/collaboration/use-collaboration.ts:257`
- **Status**: "Implementar outros tipos de mudanca"

### 8.11 Lip Sync com Rhubarb

- **Arquivo**: `src/lib/sync/lip-sync-orchestrator.ts:121`
- **Status**: "Write buffer to temp file for Rhubarb" - nao implementado

### 8.12 PWA Manager

- **Arquivo**: `src/lib/pwa/pwa-manager.ts:23`
- **Status**: "manager initialized (stub)"

### 8.13 RemotionComposer - Componentes faltando

- **Arquivo**: `src/components/render/RemotionComposer.tsx:301`
- **Status**: "Component for ${element.type} not implemented yet"

---

## Fase 9 - Monetizacao e Enterprise

> Prioridade: **P3** | Features de negocio

### 9.1 Stripe Billing

- **Arquivo**: `src/app/api/billing/checkout/route.ts`
- **Status**: Retorna erro se Stripe nao configurado
- **Env faltando**: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRO_PRICE_ID`, `STRIPE_ENTERPRISE_PRICE_ID`

### 9.2 Billing Service - Lookup de tier

- **Arquivo**: `src/lib/services/billing-service.ts:270`
- **Status**: TODO "Implement proper lookup when stripeCustomerId column is added"

### 9.3 Rate Limit por tier de assinatura

- **Arquivo**: `src/middleware/rate-limiter.ts:276`
- **Status**: TODO "Add subscriptions table and proper tier lookup when billing is implemented"
- **Env faltando**: `API_RATE_LIMIT_FREE`, `API_RATE_LIMIT_STARTER`, `API_RATE_LIMIT_PRO`, `API_RATE_LIMIT_ENTERPRISE`

### 9.4 2FA Recovery Codes

- **Status**: `onClick={() => {/* TODO: Implementar recovery codes */}}`

### 9.5 SSO/SAML

- **Status**: Referenciado em commits recentes mas verificar completude

---

## Fase 10 - Polish e Producao Final

> Prioridade: **P3** | Qualidade final

### 10.1 Slow Query Detection

- **Arquivo**: `src/lib/monitoring/monitoring-system-real.ts`
- **Status**: `slowQueries: 0 // TODO: implementar deteccao de slow queries`

### 10.2 View Tracking

- **Arquivo**: `src/app/api/metrics/dashboard/route.ts`
- **Status**: `totalViews: 0, // TODO: implementar tracking de views`

### 10.3 Analytics - sendMessage

- **Arquivo**: `src/hooks/use-analytics.ts:480`
- **Status**: "sendMessage is not implemented"

### 10.4 Error Alerting via webhook

- **Arquivo**: `src/lib/monitoring/error-alerting.ts:172`
- **Status**: "Implement webhook notification"

### 10.5 Upload Finalize - Simplificado

- **Arquivo**: `src/app/api/upload/finalize/route.ts:93`
- **Status**: "Implementacao simplificada - em producao usar sharp, ffmpeg, etc."

### 10.6 Image Processor - Storage persistente

- **Arquivo**: `src/lib/image-processor-real.ts:168`
- **Status**: "Upload to S3/Storage here if meant to be persistent"

### 10.7 Admin Middleware - Hardcoded check

- **Arquivo**: `src/lib/auth/admin-middleware.ts:129`
- **Status**: "Move to environment variable or database check"

### 10.8 Compliance Analyzer

- **Status**: Aceitacao de recomendacoes nao implementada

### 10.9 Rotas arquivadas para limpeza

- `src/app/api/v1/pptx/_archived/` - 11+ rotas obsoletas
- Flag deprecated_since: '2026-01-12'

### 10.10 Componentes desativados para revisao

- 26 arquivos `.disabled` em `src/components/`
- Verificar se podem ser deletados ou precisam ser reativados

---

## Apendice A - Variaveis de Ambiente Faltando

### Presentes no .env com valor placeholder/not-configured

```env
ELEVENLABS_API_KEY=not-configured
AZURE_TTS_KEY=not-configured
GOOGLE_TTS_CREDENTIALS=not-configured
OPENAI_API_KEY=not-configured
SENTRY_DSN=                        # vazio
NEXT_PUBLIC_SENTRY_DSN=            # vazio
```

### Ausentes do .env (existem no .env.example ou referenciadas no codigo)

```env
# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=

# Avatar Providers
FAL_API_KEY=
MUSETALK_LOCAL_ENDPOINT=
SADTALKER_LOCAL_ENDPOINT=
DID_API_KEY=
DID_API_URL=
HEYGEN_API_KEY=
HEYGEN_API_URL=
SYNTHESIA_API_KEY=
SYNTHESIA_API_URL=
RPM_APP_ID=
RPM_API_KEY=

# Media
PIXABAY_API_KEY=

# Rate Limiting por tier
API_RATE_LIMIT_FREE=
API_RATE_LIMIT_STARTER=
API_RATE_LIMIT_PRO=
API_RATE_LIMIT_ENTERPRISE=

# Webhook
WEBHOOK_SECRET=

# Avatar timeouts
AVATAR_PER_SLIDE_TIMEOUT_MS=
AVATAR_BATCH_TIMEOUT_MS=

# Email
RESEND_API_KEY=
EMAIL_FROM=

# AWS (se usar S3)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=
AWS_S3_BUCKET=

# AI Enhancement
ENHANCEMENT_API_URL=
ENHANCEMENT_API_KEY=
SCENE_DETECTION_API_URL=
SCENE_DETECTION_API_KEY=

# Analytics
NEXT_PUBLIC_GA_ID=
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=

# BullMQ
BULL_REDIS_HOST=
BULL_REDIS_PORT=
BULL_REDIS_PASSWORD=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRO_PRICE_ID=
STRIPE_ENTERPRISE_PRICE_ID=
```

---

## Apendice B - Arquivos Desativados

### Componentes `.disabled`

- `src/components/avatars.disabled/`
- `src/components/avatars/avatar-3d-renderer.tsx.disabled`
- `src/components/video-generation/ai-video-generator.tsx.disabled`

### Rotas `.disabled`

- `src/app/api/websocket/route.ts.disabled`
- `src/app/api/v1/pptx/_archived/upload-production/route.ts.disabled`

### Testes `.disabled`

- 26 arquivos `.test.disabled.ts` em `src/app/__tests__/`

### Scripts desativados

- `src/app/scripts/test-pptx-import.ts` - "DISABLED - needs complete rewrite"
- `src/app/scripts/test-pptx-processing.ts` - "DISABLED - uses non-existent API"

---

## Apendice C - Estatisticas Gerais

| Metrica | Quantidade |
|---------|-----------|
| Funcoes stub/not-implemented | 20+ |
| TODOs/FIXMEs no codigo | 1000+ |
| Endpoints sem autenticacao | 15+ |
| Paginas com dados mock | 5 |
| Componentes "Em breve" | 11 |
| Testes desabilitados (skip) | 21 marcadores |
| Arquivos .disabled | 26+ testes, 3+ componentes, 2+ rotas |
| @ts-ignore no codigo | 31+ |
| Env vars faltando | 30+ |
| Tabelas possivelmente ausentes | 9+ |
| Flags de bypass (SKIP_AUTH, etc.) | 6+ |
| Scripts CI referenciados mas ausentes | 10+ |

---

## Resumo Executivo

### O que esta pronto para producao

- Pipeline PPTX-to-Video (recem integrado)
- Avatars realistas (MuseTalk/SadTalker via Replicate)
- TTS real com multiplos providers (Edge-TTS funcional)
- Renderizacao de video com Remotion
- Autenticacao e RBAC
- Infraestrutura de API com rate limiting basico

### O que precisa de atencao imediata (Fase 1)

- **Seguranca**: API keys sem hash, endpoints expostos, middleware hardcoded
- **Core**: Video processor com funcoes stub, save project nao funciona

### Estimativa de esforco por fase

| Fase | Itens | Complexidade |
|------|-------|-------------|
| Fase 1 - Seguranca | 7 itens | Alta |
| Fase 2 - Core Pipeline | 10 itens | Alta |
| Fase 3 - APIs Externas | 13 itens | Media (configuracao) |
| Fase 4 - UI/UX | 6 categorias | Media |
| Fase 5 - AI/ML | 9 servicos | Alta |
| Fase 6 - Infra/DevOps | 11 itens | Media-Alta |
| Fase 7 - Testes | 6 categorias | Media |
| Fase 8 - Features Avancadas | 13 itens | Alta |
| Fase 9 - Monetizacao | 5 itens | Media |
| Fase 10 - Polish | 10 itens | Baixa-Media |

---

> Este documento deve ser atualizado conforme os itens forem implementados.
> Usar `git grep -c "TODO\|FIXME\|HACK\|not.implemented"` para monitorar progresso.
