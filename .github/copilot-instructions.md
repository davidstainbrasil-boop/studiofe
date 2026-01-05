# 🎬 MVP Vídeos TécnicoCursos v7 - Instruções AI

Sistema de produção de vídeos técnicos NR a partir de PPTX. **Production-ready**, TypeScript estrito, Supabase + Redis + FFmpeg.

---

## 🏗️ Arquitetura (Big Picture)

```
PPTX Upload → JSZip Parse → Zustand State → Editor Visual → BullMQ Queue → FFmpeg → Supabase Storage
```

**Stack:** Next.js 14 App Router, TypeScript 5, Supabase (Postgres + Auth + Storage), Redis (BullMQ), FFmpeg, Playwright

**Estrutura Monorepo:**
- `/` - Scripts de automação (`scripts/`), schemas SQL (`database-*.sql`), configurações globais
- `estudio_ia_videos/app/` - **Next.js app principal** (SEMPRE trabalhe aqui para código de aplicação)
- `estudio_ia_videos/app/api/` - 70+ rotas API (render, pptx, tts, analytics, auth, etc.)
- `estudio_ia_videos/app/lib/` - Lógica de negócio, stores, serviços, queue, utils

**Camadas de separação:**
```
components/ → hooks/ → lib/stores/ (Zustand) → lib/*-core.ts → api/ → Supabase
```

---

## 📁 Estrutura Chave

```
estudio_ia_videos/app/
├── api/
│   ├── render/           # Pipeline de vídeo (start, jobs, progress, cancel, stats)
│   ├── pptx/             # Upload e parsing de PPTX
│   ├── tts/              # Text-to-Speech (ElevenLabs)
│   ├── analytics/        # Métricas e stats
│   └── auth/             # Autenticação Supabase
├── lib/
│   ├── stores/           # Zustand: editor-store.ts, unified-project-store.ts
│   ├── queue/            # BullMQ: render-queue.ts, types.ts (strict typing)
│   ├── pptx/             # 8 parsers PPTX reais (text, image, layout, notes, animations)
│   ├── render/           # job-manager.ts, FFmpeg executor
│   ├── supabase/         # client.ts, server.ts (NUNCA exponha service_role no client!)
│   └── logger.ts         # Logger centralizado (Sentry em prod)
├── __tests__/            # Jest - ESPELHA estrutura de lib/ e api/
└── e2e/                  # Playwright (40 testes RBAC + Video Flow)

scripts/                  # Automação (executar da RAIZ do projeto)
├── setup-supabase-auto.ts     # Setup DB completo (~15s)
├── health-check.ts            # Score 0-100 sistema
├── test-contract-video-jobs*.js  # 12 arquivos de contract tests API
└── audit-any.ts               # Auditoria de tipos `any`
```

---

## ⚡ Comandos Essenciais

```bash
# === SETUP INICIAL (raiz do projeto) ===
npm install && npm run setup:supabase && npm run validate:env

# === DESENVOLVIMENTO ===
npm run app:dev                    # Next.js porta 3000
npm run redis:start                # Docker Redis (obrigatório para render)

# === TESTES (executar da RAIZ) ===
npm test                           # Jest todos os testes
npm test -- --testPathPattern="render"  # Jest específico
npm run test:contract:video-jobs   # Contract tests API (12 suites)
npm run test:e2e:playwright        # E2E Playwright (40 testes)

# === QUALIDADE (executar ANTES de commit) ===
npm run type-check                 # TypeScript strict
npm run audit:any                  # Encontra usos de `any`
npm run health                     # Score 0-100 do sistema

# === DEBUGGING ===
npm run health                     # Diagnóstico rápido
curl localhost:3000/api/render/jobs?status=processing  # Jobs travados
npm run redis:logs                 # Logs do Redis
```

---

## 🎯 Padrões Obrigatórios

### TypeScript Estrito (Crítico!)
- **NUNCA** use `any` ou `// @ts-ignore` sem justificativa documentada
- Defina interfaces em `types/` ou inline com nomes descritivos
- Use aliases de import: `@/lib/...`, evite `../../`
- Veja [lib/queue/types.ts](estudio_ia_videos/app/lib/queue/types.ts) como exemplo de tipagem estrita

### API Routes Pattern (Next.js App Router)
```ts
// Padrão obrigatório: Validação Zod → Rate Limit → Auth → Core Logic → Response
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { globalRateLimiter } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  // 1. Rate limiting
  const rateLimitResult = globalRateLimiter.check(ip);
  if (!rateLimitResult.success) return NextResponse.json({ error: 'Rate limit' }, { status: 429 });
  
  // 2. Validação com Zod
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });
  
  // 3. Lógica de negócio
  // 4. Response estruturado
}
```

### Zustand Stores (Padrão com immer + devtools)
```ts
// Veja lib/stores/editor-store.ts como referência
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

export const useEditorStore = create<EditorState>()(
  devtools(immer((set, get) => ({ /* ... */ })))
);
```

### Logging (NUNCA use console.log em produção)
```ts
import { logger } from '@/lib/logger';
logger.info('Operação concluída', { context: 'dados' });
logger.error('Falha na operação', { error });  // Integra com Sentry em prod
```

---

## 🗄️ Database (Supabase)

**Tabelas principais:** `users`, `projects`, `slides`, `render_jobs`, `nr_courses`, `roles`, `permissions`

**RLS obrigatório:**
- Dados privados: `auth.uid() = user_id`
- Conteúdo público: `SELECT true` (cursos NR)
- Admin: função `is_admin()`

**Schema changes:** 
1. Edite `database-schema.sql` e/ou `database-rls-policies.sql`
2. Execute `npm run setup:supabase`
3. **NUNCA** crie tabelas via Dashboard sem versionar o SQL

---

## 🎬 Render Pipeline

```
POST /api/render/start → render_job (DB) → BullMQ → Worker → FFmpeg → bucket 'videos'
```

**Status do job:** `pending` → `queued` → `processing` → `completed` | `failed` | `cancelled`

**Tipos em:** [lib/queue/types.ts](estudio_ia_videos/app/lib/queue/types.ts) - `JobStatus`, `RenderConfig`, `RenderSlide`

---

## 🧪 Testes (Estrutura Espelhada)

```
app/__tests__/lib/queue/       ← Testa → app/lib/queue/
app/__tests__/lib/render/      ← Testa → app/lib/render/
app/__tests__/api/             ← Testa → app/api/
```

- **Unit:** Jest em `__tests__/` espelhando a estrutura de `lib/`
- **Contract:** `scripts/test-contract-video-jobs*.js` (12 arquivos)
- **E2E:** Playwright em `app/e2e/` (40 testes RBAC + Video)

---

## ⚠️ Anti-Patterns (Evite!)

| ❌ Não faça | ✅ Faça isso |
|-------------|--------------|
| `console.log` em produção | `logger.info/warn/error` de `@/lib/logger` |
| Lógica de negócio em componentes | Extraia para `lib/` ou custom hooks |
| `SUPABASE_SERVICE_ROLE_KEY` no client | Use apenas em server-side (`lib/supabase/server.ts`) |
| Criar tabelas via Dashboard | Versione em `database-*.sql` + `npm run setup:supabase` |
| Engolir erros em Promises | Sempre trate `.catch` ou try/catch com logging |
| Usar `any` sem justificativa | Defina interfaces explícitas |

---

## 🔧 Environment (.env.local mínimo)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...      # APENAS server-side!
DIRECT_DATABASE_URL=postgresql://...
REDIS_URL=redis://localhost:6379
```

Valide com: `npm run validate:env`

---

## 🔍 Debugging Rápido

```bash
npm run health              # Score 0-100 com diagnóstico
npm run test:contract:video-jobs  # Valida API contracts

# Jobs de render travados
curl localhost:3000/api/render/jobs?status=processing

# Logs Redis
npm run redis:logs
```

---

## 🤖 Workflow para Agentes AI

### Arquivos de Controle (Long-Running Sessions)

| Arquivo | Propósito |
|---------|-----------|
| `feature-list.json` | Lista de features com status (passes: true/false) |
| `claude-progress.txt` | Log de sessões AI - leia ao iniciar |
| `init.sh` | Setup rápido do ambiente |

### Ao Iniciar uma Sessão

```bash
./init.sh                           # Setup completo
cat claude-progress.txt             # Estado atual
cat feature-list.json | jq '.features | map(select(.passes == false))'  # Pendentes
git log --oneline -5                # Commits recentes
npm run health                      # Validar sistema
```

### Regras Críticas

- ⚠️ Trabalhe em **UMA feature por vez** (incremental)
- ⚠️ **NUNCA** remova ou edite descrições em `feature-list.json` (só altere `passes`)
- ⚠️ Sempre deixe código **commitável** (sem erros óbvios)
- ⚠️ Execute testes antes de marcar feature como `passes: true`
- ⚠️ Documente decisões importantes no `claude-progress.txt`

### Ao Finalizar

1. Commitar progresso com mensagem descritiva
2. Atualizar `claude-progress.txt` com resumo
3. Atualizar `feature-list.json` se completou feature
4. Rodar `npm run health` para validar
