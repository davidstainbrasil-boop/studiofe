# 📚 Documentação Completa do Sistema - MVP Vídeos TécnicoCursos v7

> **Data de Geração:** 14 de Janeiro de 2026  
> **Versão do Sistema:** 1.0.0  
> **Status:** Production-Ready

---

## 📋 Índice

1. [Visão Geral](#1-visão-geral)
2. [Arquitetura do Sistema](#2-arquitetura-do-sistema)
3. [Estrutura de Pastas](#3-estrutura-de-pastas)
4. [Stack Tecnológica](#4-stack-tecnológica)
5. [Módulos Principais](#5-módulos-principais)
6. [Fluxo de Trabalho (Workflow)](#6-fluxo-de-trabalho-workflow)
7. [APIs e Endpoints](#7-apis-e-endpoints)
8. [Dependências Externas](#8-dependências-externas)
9. [Configuração e Ambiente](#9-configuração-e-ambiente)
10. [Comandos Essenciais](#10-comandos-essenciais)
11. [Padrões de Código](#11-padrões-de-código)
12. [Banco de Dados](#12-banco-de-dados)
13. [Testes](#13-testes)
14. [Deploy e Produção](#14-deploy-e-produção)

---

## 1. Visão Geral

O **MVP Vídeos TécnicoCursos v7** é um sistema completo de produção de vídeos técnicos para Normas Regulamentadoras (NR). O sistema permite a criação de vídeos a partir de apresentações PowerPoint (PPTX), com narração automática via TTS, avatares 3D e processamento via FFmpeg.

### Propósito Principal
- Upload e processamento de arquivos PPTX
- Conversão de slides em vídeos com narração
- Geração automática de áudio via Text-to-Speech (TTS)
- Renderização de vídeos com FFmpeg
- Gerenciamento de filas de processamento com BullMQ/Redis

### Pipeline de Alto Nível

```
PPTX Upload → JSZip Parse → Zustand State → Editor Visual → BullMQ Queue → FFmpeg → Supabase Storage
```

---

## 2. Arquitetura do Sistema

### 2.1 Diagrama de Camadas

```
┌─────────────────────────────────────────────────────────────────┐
│                      PRESENTATION LAYER                         │
│  [Browser/UI] → [Next.js Pages/Layouts/Components]              │
├─────────────────────────────────────────────────────────────────┤
│                      API LAYER (70+ Routes)                     │
│  [Next API Routes: /app/api/*]                                  │
├─────────────────────────────────────────────────────────────────┤
│                    APPLICATION SERVICES                          │
│  [Use-cases / Orquestração de fluxos]                           │
├─────────────────────────────────────────────────────────────────┤
│                      DOMAIN LAYER                                │
│  [Schemas/Types/Regras de Negócio/Validações Zod]               │
├─────────────────────────────────────────────────────────────────┤
│                   INFRASTRUCTURE ADAPTERS                        │
│  ┌──────────┐  ┌───────┐  ┌────────┐  ┌─────────────────────┐  │
│  │ Supabase │  │ Redis │  │ FFmpeg │  │ Providers TTS/Avatar│  │
│  │ (DB+Auth │  │BullMQ │  │ Render │  │ (ElevenLabs, HeyGen)│  │
│  │+Storage) │  │ Queue │  │ Engine │  │                     │  │
│  └──────────┘  └───────┘  └────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Camadas e Responsabilidades

| Camada | Responsabilidade |
|--------|------------------|
| **Presentation** | Páginas, layouts, componentes React, interação com usuário |
| **API Routes** | Controle de request/response, autenticação, validação |
| **Application** | Coordena fluxos (criar job, reenfileirar, calcular stats) |
| **Domain** | Tipos, invariantes, validações, contratos Zod |
| **Infrastructure** | Adapters para Supabase, Redis, FFmpeg, integrações externas |
| **Observability** | Logger, métricas, auditoria, telemetria |

---

## 3. Estrutura de Pastas

### 3.1 Estrutura Principal (Monorepo)

```
/root/_MVP_Video_TecnicoCursos_v7/
├── estudio_ia_videos/          # 🎯 APLICAÇÃO PRINCIPAL (Next.js)
│   ├── src/
│   │   ├── app/                # Next.js App Router (routes + pages)
│   │   ├── lib/                # Lógica de negócio (domínios + services)
│   │   ├── components/         # Componentes React (100+)
│   │   ├── hooks/              # Custom hooks React
│   │   ├── types/              # Definições de tipos TypeScript
│   │   └── middleware/         # Middlewares de autenticação
│   ├── prisma/                 # Schema do Prisma ORM
│   └── public/                 # Assets estáticos
├── scripts/                    # Scripts de automação (150+)
├── docs/                       # Documentação técnica
│   ├── architecture/           # Blueprint, Rules, Decisions
│   ├── api/                    # Documentação de APIs
│   └── guides/                 # Guias de uso
├── database-*.sql              # Schemas SQL versionados
└── docker-compose.yml          # Configuração Docker
```

### 3.2 Estrutura de `src/lib/` (Módulos de Negócio)

```
estudio_ia_videos/src/lib/
├── queue/                  # Filas de processamento (BullMQ)
│   ├── render-queue.ts     # Fila de renderização
│   └── video-processing.queue.ts
├── render/                 # Pipeline de renderização
│   ├── job-manager.ts      # Gerenciador de jobs
│   ├── ffmpeg-executor.ts  # Execução do FFmpeg
│   └── frame-generator.ts  # Geração de frames
├── pptx/                   # Processamento de PPTX
│   ├── pptx-processor.ts   # Processador principal
│   ├── parsers/            # 8 parsers especializados
│   ├── notes-parser.ts     # Extração de notas
│   └── layout-parser.ts    # Parser de layouts
├── stores/                 # Estado global (Zustand)
│   ├── editor-store.ts     # Estado do editor
│   ├── timeline-store.ts   # Estado da timeline
│   └── unified-project-store.ts
├── supabase/               # Clientes Supabase
│   ├── client.ts           # Cliente browser
│   ├── server.ts           # Cliente server-side
│   └── storage.ts          # Gerenciamento de storage
├── tts/                    # Text-to-Speech
│   ├── tts-service.ts      # Serviço principal
│   ├── engine-manager.ts   # Gerenciador de engines
│   └── providers/          # Provedores (ElevenLabs, Azure)
├── auth/                   # Autenticação e RBAC
├── cache/                  # Sistema de cache
├── analytics/              # Analytics e métricas
├── avatar/                 # Sistema de avatares 3D
└── video-jobs/             # Gerenciamento de jobs de vídeo
```

### 3.3 Estrutura de APIs (`src/app/api/`)

```
estudio_ia_videos/src/app/api/
├── render/                 # Pipeline de vídeo
│   ├── start/              # Iniciar renderização
│   ├── jobs/               # Listar/gerenciar jobs
│   ├── progress/           # Progresso de renderização
│   ├── cancel/             # Cancelar job
│   └── stats/              # Estatísticas
├── pptx/                   # Upload e parsing de PPTX
│   ├── upload/             # Upload de arquivos
│   └── process/            # Processamento
├── tts/                    # Text-to-Speech
│   ├── generate/           # Geração de áudio
│   └── voices/             # Listagem de vozes
├── analytics/              # Métricas e analytics
├── auth/                   # Autenticação Supabase
├── video-jobs/             # Jobs de vídeo (v1)
├── avatar/                 # Sistema de avatares
├── storage/                # Gerenciamento de storage
├── health/                 # Health check
└── webhooks/               # Webhooks externos
```

---

## 4. Stack Tecnológica

### 4.1 Frontend

| Tecnologia | Versão | Propósito |
|------------|--------|-----------|
| **Next.js** | 14.0.4 | Framework React com App Router |
| **React** | 18.2.0 | UI Library |
| **TypeScript** | 5.3.3 | Type safety |
| **Tailwind CSS** | 3.4.0 | Estilização |
| **Zustand** | 5.0.9 | Gerenciamento de estado |
| **Radix UI** | Vários | Componentes acessíveis |
| **Framer Motion** | 10.18.0 | Animações |
| **Three.js** | 0.182.0 | Gráficos 3D |
| **Fabric.js** | 7.0.0 | Canvas editor |
| **Konva** | 9.3.22 | Canvas 2D |

### 4.2 Backend

| Tecnologia | Versão | Propósito |
|------------|--------|-----------|
| **Node.js** | ≥18.0.0 | Runtime |
| **Supabase** | 2.75.0 | Database + Auth + Storage |
| **Prisma** | 5.22.0 | ORM |
| **BullMQ** | 5.64.1 | Filas de processamento |
| **Redis/IORedis** | 5.8.2 | Cache e filas |
| **Zod** | 3.25.76 | Validação de schemas |

### 4.3 Processamento de Vídeo/Áudio

| Tecnologia | Propósito |
|------------|-----------|
| **FFmpeg** | Renderização de vídeo |
| **Remotion** | Composição de vídeo programática |
| **Sharp** | Processamento de imagens |
| **WaveSurfer.js** | Visualização de áudio |
| **JSZip** | Extração de PPTX |

### 4.4 Integrações Externas (TTS/Avatar)

| Serviço | Propósito |
|---------|-----------|
| **ElevenLabs** | Text-to-Speech premium |
| **Azure Speech** | TTS Microsoft |
| **Edge TTS** | TTS gratuito |
| **HeyGen** | Avatares de vídeo |
| **OpenAI** | Geração de conteúdo AI |

### 4.5 DevOps e Qualidade

| Ferramenta | Propósito |
|------------|-----------|
| **Docker** | Containerização |
| **PM2** | Process manager |
| **Jest** | Testes unitários |
| **Playwright** | Testes E2E |
| **ESLint** | Linting |
| **Prettier** | Formatação |
| **Husky** | Git hooks |
| **Sentry** | Monitoramento de erros |
| **Lighthouse** | Performance auditing |

---

## 5. Módulos Principais

### 5.1 Módulo PPTX (`lib/pptx/`)

**Responsabilidade:** Processamento e parsing de arquivos PowerPoint.

```
Fluxo: Upload PPTX → JSZip Extract → Parse XML → Extrair Slides/Notas → Persistir no DB
```

**Componentes:**
- `pptx-processor.ts` - Processador principal
- `pptx-parser.ts` - Parser de estrutura
- `notes-parser.ts` - Extração de notas do apresentador
- `layout-parser.ts` - Parser de layouts e masters
- `parsers/` - 8 parsers especializados (text, image, animation, etc.)

### 5.2 Módulo Render (`lib/render/`)

**Responsabilidade:** Pipeline de renderização de vídeos.

```
Fluxo: Job Request → BullMQ Queue → Worker → FFmpeg → Output → Supabase Storage
```

**Componentes:**
- `job-manager.ts` - Gerenciamento de jobs de render
- `ffmpeg-executor.ts` - Execução de comandos FFmpeg
- `frame-generator.ts` - Geração de frames individuais
- `render-utils.ts` - Utilitários de renderização

**Status de Job:** `pending` → `queued` → `processing` → `completed` | `failed` | `cancelled`

### 5.3 Módulo Queue (`lib/queue/`)

**Responsabilidade:** Gerenciamento de filas com BullMQ/Redis.

**Componentes:**
- `render-queue.ts` - Fila de renderização
- `video-processing.queue.ts` - Fila de processamento de vídeo

### 5.4 Módulo TTS (`lib/tts/`)

**Responsabilidade:** Conversão de texto em áudio narrado.

**Provedores suportados:**
- ElevenLabs (premium, vozes realistas)
- Azure Speech (Microsoft, multilíngue)
- Edge TTS (gratuito, básico)
- Vozes brasileiras regionais

**Componentes:**
- `tts-service.ts` - Serviço unificado
- `engine-manager.ts` - Gerenciador de engines
- `providers/` - Implementações por provedor

### 5.5 Módulo Stores (`lib/stores/`)

**Responsabilidade:** Gerenciamento de estado global com Zustand.

**Stores principais:**
- `editor-store.ts` - Estado do editor de vídeo
- `timeline-store.ts` - Estado da timeline
- `unified-project-store.ts` - Projeto unificado
- `websocket-store.ts` - Conexões WebSocket

**Padrão usado:**
```typescript
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

export const useEditorStore = create<EditorState>()(
  devtools(immer((set, get) => ({ /* ... */ })))
);
```

### 5.6 Módulo Auth (`lib/auth/` + `lib/supabase/`)

**Responsabilidade:** Autenticação e controle de acesso (RBAC).

**Componentes:**
- `client.ts` - Cliente Supabase browser
- `server.ts` - Cliente Supabase server (com service_role)
- `auth.ts` - Helpers de autenticação
- `rbac.ts` - Role-Based Access Control

### 5.7 Módulo Avatar (`lib/avatar/`)

**Responsabilidade:** Sistema de avatares 3D e talking photos.

**Engines suportados:**
- HeyGen
- Vidnoz
- Local rendering

---

## 6. Fluxo de Trabalho (Workflow)

### 6.1 Fluxo Completo de Produção de Vídeo

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. UPLOAD                                                       │
│    User uploads PPTX → POST /api/pptx/upload                    │
└─────────────────────────────────┬───────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. PARSING                                                      │
│    JSZip extracts → XML parsed → Slides/Notes extracted         │
│    → Data stored in Supabase (projects, slides tables)          │
└─────────────────────────────────┬───────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. EDITOR                                                       │
│    Zustand stores → Visual Editor → User edits slides/timeline  │
│    → TTS generation for narration                               │
└─────────────────────────────────┬───────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. RENDER REQUEST                                               │
│    POST /api/render/start → Creates render_job in DB            │
│    → Job added to BullMQ queue                                  │
└─────────────────────────────────┬───────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. PROCESSING                                                   │
│    BullMQ Worker picks job → FFmpeg processes frames            │
│    → Audio merged → Video encoded                               │
└─────────────────────────────────┬───────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────┐
│ 6. STORAGE & DELIVERY                                           │
│    Video uploaded to Supabase Storage (bucket: 'videos')        │
│    → Signed URL generated → User notified                       │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Fluxo de Estado de Jobs

```
[pending] → [queued] → [processing] → [completed]
                ↓              ↓
            [failed]     [cancelled]
```

---

## 7. APIs e Endpoints

### 7.1 APIs Principais

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/health` | GET | Health check do sistema |
| `/api/pptx/upload` | POST | Upload de arquivo PPTX |
| `/api/pptx/process` | POST | Processar PPTX |
| `/api/render/start` | POST | Iniciar renderização |
| `/api/render/jobs` | GET | Listar jobs de render |
| `/api/render/progress/:id` | GET | Progresso do job |
| `/api/render/cancel/:id` | POST | Cancelar job |
| `/api/render/stats` | GET | Estatísticas de render |
| `/api/tts/generate` | POST | Gerar áudio TTS |
| `/api/tts/voices` | GET | Listar vozes disponíveis |
| `/api/video-jobs` | GET/POST | CRUD de video jobs |
| `/api/auth/*` | Vários | Autenticação Supabase |
| `/api/storage/*` | Vários | Gerenciamento de arquivos |

### 7.2 Padrão de API Route

```typescript
// Padrão obrigatório: Validação Zod → Rate Limit → Auth → Core Logic → Response
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { globalRateLimiter } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  // 1. Rate limiting
  const rateLimitResult = globalRateLimiter.check(ip);
  if (!rateLimitResult.success) {
    return NextResponse.json({ error: 'Rate limit' }, { status: 429 });
  }
  
  // 2. Validação com Zod
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  
  // 3. Lógica de negócio
  // 4. Response estruturado
}
```

---

## 8. Dependências Externas

### 8.1 Serviços Obrigatórios

| Serviço | Propósito | Variável de Ambiente |
|---------|-----------|---------------------|
| **Supabase** | Database + Auth + Storage | `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| **Redis** | Cache + Filas BullMQ | `REDIS_URL` |
| **FFmpeg** | Renderização de vídeo | Binário instalado |

### 8.2 Serviços Opcionais

| Serviço | Propósito | Variável de Ambiente |
|---------|-----------|---------------------|
| **ElevenLabs** | TTS Premium | `ELEVENLABS_API_KEY` |
| **Azure Speech** | TTS Microsoft | `AZURE_SPEECH_KEY` |
| **OpenAI** | AI/GPT | `OPENAI_API_KEY` |
| **HeyGen** | Avatares | `HEYGEN_API_KEY` |
| **Sentry** | Error tracking | `SENTRY_DSN` |
| **AWS S3** | Storage alternativo | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` |

### 8.3 Infraestrutura Docker

```yaml
services:
  app:          # Next.js Application (porta 3000)
  postgres:     # PostgreSQL 15 (porta 5432)
  redis:        # Redis 7 (porta 6379)
```

---

## 9. Configuração e Ambiente

### 9.1 Variáveis de Ambiente Mínimas

```bash
# .env.local

# Supabase (OBRIGATÓRIO)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...      # APENAS server-side!

# Database
DIRECT_DATABASE_URL=postgresql://...

# Redis (OBRIGATÓRIO para render)
REDIS_URL=redis://localhost:6379

# TTS (opcional)
ELEVENLABS_API_KEY=...
AZURE_SPEECH_KEY=...
```

### 9.2 Validação de Ambiente

```bash
npm run validate:env    # Valida variáveis essenciais
npm run health          # Health check completo (0-100)
```

---

## 10. Comandos Essenciais

### 10.1 Setup Inicial

```bash
# Da raiz do projeto
npm install                   # Instalar dependências
npm run setup:supabase        # Setup do banco de dados
npm run validate:env          # Validar variáveis de ambiente
```

### 10.2 Desenvolvimento

```bash
npm run app:dev               # Next.js (porta 3000)
npm run redis:start           # Docker Redis (obrigatório para render)
```

### 10.3 Testes

```bash
npm test                              # Jest todos os testes
npm test -- --testPathPattern="render" # Jest específico
npm run test:contract:video-jobs      # Contract tests API (12 suites)
npm run test:e2e:playwright           # E2E Playwright (40 testes)
```

### 10.4 Qualidade

```bash
npm run type-check            # TypeScript strict
npm run lint                  # ESLint
npm run audit:any             # Encontra usos de `any`
npm run health                # Score 0-100 do sistema
```

### 10.5 Build e Deploy

```bash
npm run app:build             # Build de produção
npm run predeploy             # Validações pré-deploy
```

---

## 11. Padrões de Código

### 11.1 TypeScript Estrito

- **NUNCA** use `any` ou `// @ts-ignore` sem justificativa
- Defina interfaces em `types/` ou inline com nomes descritivos
- Use aliases de import: `@/lib/...`, `@lib/...`

### 11.2 Logging

```typescript
// ✅ Correto
import { logger } from '@/lib/logger';
logger.info('Operação concluída', { context: 'dados' });
logger.error('Falha na operação', { error });

// ❌ Incorreto - NUNCA em produção
console.log('...');
```

### 11.3 Aliases de Import

| Alias | Caminho |
|-------|---------|
| `@/*` | `estudio_ia_videos/src/*` |
| `@lib/*` | `estudio_ia_videos/src/lib/*` |

### 11.4 Regras de Dependência

- `src/app/api/**` pode importar de `@lib/**`
- `@lib/<modulo>/**` não pode importar de `src/app/api/**`
- Client-side (`'use client'`) não pode importar infra (Supabase server, Redis, FFmpeg)

---

## 12. Banco de Dados

### 12.1 Tabelas Principais

| Tabela | Descrição |
|--------|-----------|
| `users` | Usuários do sistema |
| `projects` | Projetos de vídeo |
| `slides` | Slides dos projetos |
| `render_jobs` | Jobs de renderização |
| `nr_courses` | Cursos de NR |
| `roles` | Papéis RBAC |
| `permissions` | Permissões RBAC |

### 12.2 Row Level Security (RLS)

```sql
-- Dados privados
CREATE POLICY "Users can view own data" 
  ON users FOR SELECT 
  USING (auth.uid() = id);

-- Conteúdo público
CREATE POLICY "Public courses" 
  ON nr_courses FOR SELECT 
  USING (true);

-- Admin only
CREATE POLICY "Admin access" 
  ON admin_table FOR ALL 
  USING (is_admin());
```

### 12.3 Schemas Versionados

```
database-schema.sql          # Schema principal
database-rls-policies.sql    # Políticas RLS
database-rbac-complete.sql   # RBAC completo
database-nr-templates.sql    # Templates NR
```

---

## 13. Testes

### 13.1 Estrutura de Testes

```
estudio_ia_videos/src/app/__tests__/    # Testes espelhando lib/
scripts/test-contract-video-jobs*.js    # 12 arquivos de contract tests
estudio_ia_videos/src/app/e2e/          # Playwright E2E (40 testes)
```

### 13.2 Tipos de Teste

| Tipo | Framework | Localização |
|------|-----------|-------------|
| **Unit** | Jest | `__tests__/lib/` |
| **Contract** | Node.js | `scripts/test-contract-*.js` |
| **E2E** | Playwright | `e2e/` |
| **Performance** | Lighthouse | `scripts/performance/` |

---

## 14. Deploy e Produção

### 14.1 Checklist de Deploy

1. ✅ `npm run validate:env:production`
2. ✅ `npm run health` (score ≥ 80)
3. ✅ `npm run type-check`
4. ✅ `npm run test`
5. ✅ `npm run app:build`

### 14.2 Ambientes

| Ambiente | Propósito |
|----------|-----------|
| `development` | Local development |
| `staging` | Testes pré-produção |
| `production` | Produção |

### 14.3 Monitoramento

- **Sentry** - Error tracking
- **Health endpoint** - `/api/health`
- **Logs** - `@/lib/logger` com integração Sentry

---

## 📎 Anexos e Referências

### Documentação Adicional

- [docs/architecture/BLUEPRINT.md](docs/architecture/BLUEPRINT.md) - Blueprint de arquitetura
- [docs/architecture/RULES.md](docs/architecture/RULES.md) - Regras de desenvolvimento
- [docs/architecture/DECISIONS.md](docs/architecture/DECISIONS.md) - Decisões arquiteturais
- [AGENTS.md](AGENTS.md) - Instruções para agentes AI
- [PRD.md](PRD.md) - Product Requirements Document

### Links Úteis

- **Supabase Dashboard:** https://app.supabase.io
- **Vercel (Deploy):** https://vercel.com
- **BullMQ Docs:** https://docs.bullmq.io

---

> **Documento gerado automaticamente em:** 14/01/2026  
> **Sistema:** MVP Vídeos TécnicoCursos v7  
> **Versão:** 1.0.0

