# Blueprint de Arquitetura — MVP Vídeos TécnicoCursos v7

> **Fonte de verdade (app)**: `estudio_ia_videos/`  
> **App Router (Next.js)**: `estudio_ia_videos/app/`  
> **Objetivo**: modularizar por domínios, eliminar acoplamento com `../lib` (raiz) e tornar dependências previsíveis.

---

## 1) Diagrama lógico (alto nível)

```text
[Browser/UI]
   |
   v
[Next App Router: pages/layouts/components]
   |
   v
[Next API Routes (/app/api/*)]
   |
   v
[Application Services (use-cases/orquestração)]
   |
   +--> [Domain (schemas/types/regras)]
   |
   +--> [Infra Adapters]
          |       |        |        |
          v       v        v        v
      Supabase   Redis    FFmpeg   Providers (TTS/Avatar/etc)
```

---

## 2) Camadas (com responsabilidades)

1. **Presentation (UI + Routing)**
   1. Páginas, layouts, componentes.
   2. API routes (controle de request/response e auth).

2. **Application (Casos de uso)**
   1. Coordena fluxos: criar job, reenfileirar, calcular stats, etc.
   2. Regras de orquestração (sem detalhes de DB/Redis/FFmpeg direto).

3. **Domain (núcleo de regras)**
   1. Tipos, invariantes, validações e contratos (Zod quando faz sentido).
   2. Não pode depender de infraestrutura.

4. **Infrastructure (adapters)**
   1. Supabase client (server/client), Redis/BullMQ, FFmpeg.
   2. Integrações externas (ElevenLabs, HeyGen).

5. **Observability (transversal)**
   1. Logger.
   2. Métricas.
   3. Auditoria/telemetria.

---

## 3) Estrutura de pastas recomendada (alvo)

> Migração incremental: manter `estudio_ia_videos/app/lib/*` no curto prazo, mas evoluir para `estudio_ia_videos/src/*`.

```text
estudio_ia_videos/
  app/                 # Next.js App Router (routes + pages + api)
  src/                 # Código de aplicação (fora de rotas)
    modules/
      pptx/
      render/
      video-jobs/
      auth-rbac/
      analytics/
      storage/
    infra/
      supabase/
      redis/
      ffmpeg/
      providers/
    core/
      config/
      errors/
      logger/
      validation/
    shared/
      types/
      utils/
      constants/
  tests/
```

---

## 4) Módulos (bounded contexts) e “owners”

> Owner aqui é o “lugar canônico” do código do domínio. Rotas importam do owner; owners não importam rotas.

1. **video-jobs** (`estudio_ia_videos/app/lib/video-jobs/*`)
   1. Contratos Zod (query/body)
   2. Parsers/compat de payload
   3. Métricas simples (rate-limit hits, errors)

2. **render** (`estudio_ia_videos/app/lib/render/*`)
   1. Job manager
   2. Worker/BullMQ
   3. FFmpeg executor

3. **pptx** (`estudio_ia_videos/app/lib/pptx/*`)
   1. Upload + parser real (JSZip)
   2. Extrações e persistência

4. **auth/rbac** (`estudio_ia_videos/app/lib/auth/*` e/ou `rbac.ts`)
   1. Sessão
   2. Verificação de permissões

5. **storage** (`estudio_ia_videos/app/lib/storage/*`)
   1. Upload/list/remove
   2. Signed URLs

---

## 5) Regras de dependência (enforcement)

1. `app/api/**` pode importar de:
   1. `@lib/**` (domínio + app services)
   2. `@/lib/**` (enquanto coexistir, mas **preferir** `@lib/**` para domínios bem definidos)

2. `@lib/<modulo>/**`:
   1. Pode importar apenas de:
      1. `@lib/<modulo>/**` (mesmo módulo)
      2. `@lib/shared/**` (quando existir)
      3. `@/lib/logger` / observability (se necessário)
   2. Não pode importar de `app/api/**`.

3. Client-side (`'use client'`):
   1. **Proibido** importar infra (Supabase server/service role, Redis, FFmpeg, filesystem).

---

## 6) Checklist de validação final (arquitetura)

1. **Imports proibidos**
   1. Nenhum `../lib` a partir de `estudio_ia_videos/app/**`.
   2. Nenhum `~lib/*`.

2. **Aliases consistentes**
   1. `@lib/*` aponta para `estudio_ia_videos/app/lib/*`.
   2. `@/*` aponta para `estudio_ia_videos/app/*`.

3. **Gates**
   1. `npm run lint` passa.
   2. `npm test` passa.
   3. `npm run test:contract:video-jobs` passa.

4. **Documentação mínima**
   1. Este blueprint.
   2. Regras (RULES.md).
   3. Decisões (DECISIONS.md).
