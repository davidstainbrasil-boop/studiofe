# Regras de Arquitetura (enforcement)

## 1) Regras de importação (hard rules)

1. ❌ **Proibido** em `estudio_ia_videos/app/**`:
   1. Importar `../lib` (raiz do repo) por qualquer alias.
   2. Usar alias `~lib/*`.

2. ❌ **Proibido no client** (`'use client'`):
   1. Infra (Supabase server/service role, Redis, BullMQ, FFmpeg, filesystem).

3. ✅ **Permitido**
   1. Dentro do mesmo módulo.
   2. Rotas API importarem de `@lib/**`.

---

## 2) Convenções de alias TypeScript

### 2.1 Aliases canônicos (estudio)

1. `@/*` → `estudio_ia_videos/app/*`
2. `@lib/*` → `estudio_ia_videos/app/lib/*`

### 2.2 Aliases de legado (somente se necessário)

1. `@shared-lib/*` → `estudio_ia_videos/lib/*`
2. `@shared-components/*` → `estudio_ia_videos/components/*`

> Objetivo: evitar “fallback ambíguo” em `paths` (um import resolve sempre para um local previsível).

---

## 3) Como criar um novo módulo (padrão)

1. Criar pasta: `estudio_ia_videos/app/lib/<modulo>/`.
2. Subpastas mínimas:
   1. `validation/` (Zod + contratos)
   2. `handlers/` (parsers/compat)
   3. `services/` (use-cases)
   4. `infra/` (adapters, se existir)
3. Rotas em `app/api/**` importam de `@lib/<modulo>/*`.

---

## 4) Regras de erros e logging

1. ✅ Logger: usar o logger central (`@/lib/logger` ou `@/lib/services`, conforme padrão local).
2. ❌ Proibido `console.log` em produção.
3. Erros devem ser:
   1. Registrados com contexto.
   2. Transformados em respostas com `code` + `message` (contrato estável).

---

## 5) Gates de qualidade (obrigatórios)

1. `npm run lint` deve passar (sem warnings).
2. `npm test` deve passar.
3. `npm run test:contract:video-jobs` deve passar.

> Sem isso, a mudança é considerada inválida (mesmo “funcionando localmente”).
