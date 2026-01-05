# 📋 PRD - Product Requirements Document
## MVP Vídeos TécnicoCursos v7

**Versão:** 1.0.0  
**Data de Criação:** 05 de Janeiro de 2026  
**Status:** FONTE ÚNICA DA VERDADE  
**Tipo:** Documento Executável por IA

---

## 📌 INSTRUÇÕES PARA AGENTES AI

> **LEIA ANTES DE QUALQUER AÇÃO**
>
> Este documento é a **FONTE ÚNICA DA VERDADE** do projeto.
> 
> **Regras Absolutas:**
> 1. Sempre leia este PRD completo antes de qualquer implementação
> 2. **NUNCA** pule tarefas - execute na ordem definida
> 3. **NUNCA** refatore módulos já concluídos sem abrir nova task
> 4. Marque checkboxes `[x]` conforme implementa
> 5. **SEMPRE** retome do último checkbox marcado `[ ]`
> 6. Commits devem referenciar o ID da task (ex: `feat(core): core-001 - Editor visual`)
> 7. Após cada tarefa, execute testes relacionados
> 8. Documente decisões importantes em comentários no código

---

## 1. VISÃO GERAL DO PRODUTO

### 1.1 Descrição

O **MVP Vídeos TécnicoCursos v7** é uma plataforma completa para **geração automatizada de vídeos técnicos** a partir de apresentações PowerPoint (PPTX). O sistema utiliza inteligência artificial para processar slides, extrair conteúdo, gerar narrações (TTS), avatares AI e renderizar vídeos profissionais com conformidade para cursos de **Normas Regulamentadoras (NR)**.

### 1.2 Objetivo Principal

Permitir que instrutores de segurança do trabalho criem vídeos técnicos profissionais de forma automatizada, reduzindo o tempo de produção de **dias para minutos** e mantendo conformidade com as NRs brasileiras.

### 1.3 Problema que Resolve

| Problema Atual | Solução |
|----------------|---------|
| Produção manual de vídeos NR leva 3-5 dias | Automatização reduz para 15-30 minutos |
| Necessidade de equipamento de gravação caro | Avatares AI e TTS eliminam necessidade |
| Falta de padronização nos cursos NR | Templates pré-aprovados garantem conformidade |
| Atualizações de NR requerem regravar tudo | Edição visual permite atualização rápida |
| Custos elevados de produção (~R$5.000/vídeo) | Redução para ~R$50-200/vídeo |

### 1.4 Usuários-Alvo

1. **Instrutores NR** - Criam conteúdo técnico para treinamentos
2. **Empresas de SST** - Produzem cursos em escala
3. **RH Corporativo** - Gerenciam treinamentos obrigatórios
4. **Consultorias de Segurança** - Oferecem serviços de e-learning

---

## 2. STACK TÉCNICA PADRÃO

### 2.1 Frontend

| Tecnologia | Versão | Propósito |
|------------|--------|-----------|
| **Next.js** | 14.x | Framework React (App Router) |
| **React** | 18.x | Biblioteca UI |
| **TypeScript** | 5.x | Tipagem estática obrigatória |
| **Tailwind CSS** | 3.x | Estilização utility-first |
| **Radix UI** | 1.x | Componentes acessíveis |
| **Zustand** | 4.x | Gerenciamento de estado |
| **React Hook Form** | 7.x | Formulários |
| **Zod** | 3.x | Validação de schemas |

### 2.2 Backend

| Tecnologia | Versão | Propósito |
|------------|--------|-----------|
| **Next.js API Routes** | 14.x | Endpoints REST (70+ rotas) |
| **Node.js** | 20.x | Runtime server-side |
| **BullMQ** | 5.x | Fila de processamento assíncrono |
| **Prisma** | 5.x | ORM (opcional, para queries complexas) |
| **Zod** | 3.x | Validação de requests |
| **Winston/Pino** | - | Logger estruturado |

### 2.3 Banco de Dados & Storage

| Tecnologia | Propósito |
|------------|-----------|
| **Supabase (PostgreSQL)** | Database principal com RLS |
| **Supabase Auth** | Autenticação e sessões |
| **Supabase Storage** | Armazenamento de arquivos (4 buckets) |
| **Redis** | Cache e filas BullMQ |

### 2.4 Processamento & Render

| Tecnologia | Propósito |
|------------|-----------|
| **JSZip** | Parse de arquivos PPTX |
| **Canvas API** | Geração de frames |
| **FFmpeg** | Encoding de vídeo (H.264/H.265/VP9) |
| **ElevenLabs API** | Text-to-Speech |
| **HeyGen API** | Avatares AI com lip-sync |

### 2.5 Infraestrutura & DevOps

| Tecnologia | Propósito |
|------------|-----------|
| **Docker** | Containerização |
| **Docker Compose** | Orquestração local |
| **GitHub Actions** | CI/CD (6 suites paralelas) |
| **Vercel/AWS** | Deploy (staging/production) |
| **Sentry** | Monitoramento de erros |

### 2.6 Testing

| Tecnologia | Propósito |
|------------|-----------|
| **Jest** | Unit e integration tests |
| **Playwright** | E2E tests |
| **Supertest** | API tests |
| **MSW** | Mock de APIs |

### 2.7 Padrões Obrigatórios

```typescript
// ✅ OBRIGATÓRIO em todo o projeto:

// 1. TypeScript Strict Mode
// tsconfig.json: "strict": true

// 2. ESLint com regras rigorosas
// eslint.config.mjs configurado

// 3. Imports com alias
import { logger } from '@/lib/logger';      // ✅ Correto
import { logger } from '../../../logger';   // ❌ Proibido

// 4. Tipagem explícita (NUNCA use any)
interface RenderJob {
  id: string;
  status: JobStatus;
  progress: number;
}

// 5. Validação com Zod em todas as APIs
const schema = z.object({
  projectId: z.string().uuid(),
  config: RenderConfigSchema,
});

// 6. Logger estruturado (NUNCA console.log em prod)
logger.info('Job iniciado', { jobId, userId });

// 7. Error handling explícito
try {
  await processJob(job);
} catch (error) {
  logger.error('Falha no job', { error, jobId });
  throw new AppError('RENDER_FAILED', error);
}
```

---

## 3. ARQUITETURA GERAL

### 3.1 Visão de Alto Nível

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENTE (Browser)                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │   Upload    │  │   Editor    │  │  Dashboard  │  │   Admin     │   │
│  │   PPTX      │  │   Visual    │  │   Render    │  │   Panel     │   │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘   │
└─────────┼────────────────┼────────────────┼────────────────┼───────────┘
          │                │                │                │
          ▼                ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        NEXT.JS API ROUTES (70+)                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │ /api/pptx   │  │ /api/render │  │ /api/auth   │  │ /api/admin  │   │
│  │   upload    │  │   start     │  │   login     │  │   stats     │   │
│  │   parse     │  │   progress  │  │   logout    │  │   users     │   │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘   │
└─────────┼────────────────┼────────────────┼────────────────┼───────────┘
          │                │                │                │
          ▼                ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          CAMADA DE SERVIÇOS                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │ PPTX Parser │  │ Job Manager │  │   RBAC      │  │  Analytics  │   │
│  │ (8 parsers) │  │  (BullMQ)   │  │  Service    │  │   Service   │   │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘   │
└─────────┼────────────────┼────────────────┼────────────────┼───────────┘
          │                │                │                │
          ▼                ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         INFRAESTRUTURA                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │  Supabase   │  │    Redis    │  │  Supabase   │  │   FFmpeg    │   │
│  │  Postgres   │  │   (Queue)   │  │   Storage   │  │   Worker    │   │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Estrutura de Pastas (Monorepo)

```
_MVP_Video_TecnicoCursos_v7/
│
├── estudio_ia_videos/app/        # 🎯 APLICAÇÃO PRINCIPAL NEXT.JS
│   │
│   ├── api/                      # 70+ rotas API REST
│   │   ├── render/              # Pipeline de renderização
│   │   │   ├── start/route.ts   # POST - Iniciar job
│   │   │   ├── jobs/route.ts    # GET - Listar jobs
│   │   │   ├── progress/route.ts # GET/SSE - Progresso real-time
│   │   │   ├── cancel/route.ts  # POST - Cancelar job
│   │   │   └── stats/route.ts   # GET - Estatísticas
│   │   │
│   │   ├── pptx/                # Processamento PPTX
│   │   │   ├── upload/route.ts  # POST - Upload arquivo
│   │   │   └── parse/route.ts   # POST - Parse slides
│   │   │
│   │   ├── auth/                # Autenticação
│   │   │   ├── login/route.ts   # POST - Login
│   │   │   ├── logout/route.ts  # POST - Logout
│   │   │   └── register/route.ts # POST - Registro
│   │   │
│   │   ├── admin/               # Painel administrativo
│   │   ├── analytics/           # Métricas e estatísticas
│   │   ├── tts/                 # Text-to-Speech
│   │   ├── avatar/              # Avatares AI
│   │   ├── webhooks/            # Sistema de webhooks
│   │   ├── health/              # Health check
│   │   └── user/                # LGPD/GDPR (export, delete)
│   │
│   ├── lib/                     # 🧠 LÓGICA DE NEGÓCIO
│   │   ├── stores/              # Zustand stores
│   │   │   ├── editor-store.ts  # Estado do editor
│   │   │   ├── unified-project-store.ts
│   │   │   └── timeline-store.ts
│   │   │
│   │   ├── queue/               # BullMQ
│   │   │   ├── render-queue.ts  # Fila de render
│   │   │   └── types.ts         # Tipos estritamente tipados
│   │   │
│   │   ├── pptx/                # Parsers PPTX (8 módulos)
│   │   │   ├── text-parser.ts
│   │   │   ├── image-parser.ts
│   │   │   ├── layout-parser.ts
│   │   │   ├── notes-parser.ts
│   │   │   ├── theme-parser.ts
│   │   │   ├── animation-parser.ts
│   │   │   ├── table-parser.ts
│   │   │   └── shape-parser.ts
│   │   │
│   │   ├── render/              # Renderização
│   │   │   ├── job-manager.ts
│   │   │   ├── ffmpeg-executor.ts
│   │   │   ├── frame-generator.ts
│   │   │   └── video-uploader.ts
│   │   │
│   │   ├── auth/                # RBAC & Auth
│   │   │   ├── rbac.ts
│   │   │   └── permissions.ts
│   │   │
│   │   ├── supabase/            # Clientes Supabase
│   │   │   ├── client.ts        # Client-side (anon key)
│   │   │   └── server.ts        # Server-side (service role)
│   │   │
│   │   ├── logger.ts            # Logger centralizado
│   │   ├── rate-limit.ts        # Rate limiting
│   │   └── utils.ts             # Utilitários
│   │
│   ├── components/              # Componentes React
│   ├── hooks/                   # Custom hooks
│   ├── __tests__/               # Jest (espelha lib/)
│   ├── e2e/                     # Playwright (40 testes)
│   └── types/                   # TypeScript types globais
│
├── scripts/                     # 🔧 AUTOMAÇÃO
│   ├── setup-supabase-auto.ts   # Setup DB completo
│   ├── health-check.ts          # Score 0-100
│   ├── test-contract-*.js       # 12 contract tests
│   ├── audit-any.ts             # Auditoria de `any`
│   └── validate-env.ts          # Validação de ambiente
│
├── database-*.sql               # 📄 SCHEMAS SQL (versionados)
│   ├── database-schema.sql      # Tabelas principais
│   ├── database-rls-policies.sql # RLS policies
│   ├── database-rbac-complete.sql # RBAC completo
│   └── database-seed-test-users.sql # Seed de teste
│
├── docker-compose.yml           # 🐳 INFRAESTRUTURA
├── Dockerfile                   # Build da aplicação
├── Dockerfile.worker            # Build do worker
│
├── PRD.md                       # 📋 ESTE DOCUMENTO (FONTE DA VERDADE)
├── feature-list.json            # Features com status
├── package.json                 # Dependencies e scripts
├── tsconfig.json                # TypeScript config
└── eslint.config.mjs            # ESLint config
```

### 3.3 Fluxo de Dados Principal

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        FLUXO: UPLOAD → VÍDEO                             │
└──────────────────────────────────────────────────────────────────────────┘

1️⃣ UPLOAD PPTX
   User → POST /api/pptx/upload → Supabase Storage (bucket: assets)
                                      │
                                      ▼
2️⃣ PARSE PPTX
   POST /api/pptx/parse → JSZip → 8 Parsers → DB (slides table)
   │
   ├─ text-parser.ts      → Extrai textos formatados
   ├─ image-parser.ts     → Extrai imagens → Supabase Storage
   ├─ layout-parser.ts    → Detecta 12+ tipos de layout
   ├─ notes-parser.ts     → Extrai notas do apresentador
   ├─ theme-parser.ts     → Extrai tema e cores
   ├─ animation-parser.ts → Extrai animações
   ├─ table-parser.ts     → Extrai tabelas
   └─ shape-parser.ts     → Extrai formas/diagramas
                                      │
                                      ▼
3️⃣ EDITOR VISUAL
   Zustand Store ◄──► React Components ◄──► Canvas API
   │
   ├─ Drag & drop slides
   ├─ Edição de texto
   ├─ Configuração de TTS
   └─ Seleção de avatar
                                      │
                                      ▼
4️⃣ INICIAR RENDER
   POST /api/render/start → render_jobs (DB) → BullMQ (Redis)
                                      │
                                      ▼
5️⃣ WORKER PROCESSA
   BullMQ Worker → Frame Generator → FFmpeg → MP4
   │
   ├─ Gera frames (Canvas → PNG)
   ├─ Processa TTS (ElevenLabs)
   ├─ Processa Avatar (HeyGen)
   ├─ Combina com FFmpeg (H.264)
   └─ Upload para Supabase Storage (bucket: videos)
                                      │
                                      ▼
6️⃣ PROGRESSO REAL-TIME
   GET /api/render/progress (SSE) → Updates a cada 1s
                                      │
                                      ▼
7️⃣ DOWNLOAD
   GET (signed URL) → Supabase Storage → User download MP4
```

---

## 4. MÓDULOS DO SISTEMA

### 4.1 Módulo: PPTX Processing

| Atributo | Descrição |
|----------|-----------|
| **Nome** | PPTX Processing Module |
| **Responsabilidade** | Upload, parse e extração de conteúdo de arquivos PPTX |
| **Localização** | `estudio_ia_videos/app/lib/pptx/` |
| **Dependências** | JSZip, Supabase Storage |
| **Entradas** | Arquivo PPTX (max 50MB) |
| **Saídas** | Slides estruturados (texto, imagens, layouts, notas) |

**Componentes:**
- `text-parser.ts` - Extração de texto e formatação
- `image-parser.ts` - Extração de imagens e mídias
- `layout-parser.ts` - Detecção de 12+ tipos de layout
- `notes-parser.ts` - Notas do apresentador
- `theme-parser.ts` - Temas e estilos
- `animation-parser.ts` - Animações e transições
- `table-parser.ts` - Tabelas e dados
- `shape-parser.ts` - Formas e diagramas

---

### 4.2 Módulo: Render Pipeline

| Atributo | Descrição |
|----------|-----------|
| **Nome** | Render Pipeline Module |
| **Responsabilidade** | Gerar vídeos MP4 a partir de slides processados |
| **Localização** | `estudio_ia_videos/app/lib/render/` |
| **Dependências** | BullMQ, Redis, FFmpeg, Canvas, Supabase Storage |
| **Entradas** | Project ID com slides configurados |
| **Saídas** | Vídeo MP4 (H.264) no Supabase Storage |

**Componentes:**
- `job-manager.ts` - Gerenciamento de jobs
- `frame-generator.ts` - Geração de frames via Canvas
- `ffmpeg-executor.ts` - Encoding de vídeo
- `video-uploader.ts` - Upload para storage

**Status do Job:**
```
pending → queued → processing → completed | failed | cancelled
```

---

### 4.3 Módulo: Auth & RBAC

| Atributo | Descrição |
|----------|-----------|
| **Nome** | Authentication & RBAC Module |
| **Responsabilidade** | Autenticação, autorização e controle de acesso |
| **Localização** | `estudio_ia_videos/app/lib/auth/` |
| **Dependências** | Supabase Auth, PostgreSQL RLS |
| **Entradas** | Credenciais do usuário, tokens JWT |
| **Saídas** | Sessão autenticada, permissões verificadas |

**Roles:**
| Role | Permissões |
|------|------------|
| `admin` | Acesso total ao sistema |
| `editor` | Criar, editar e renderizar projetos |
| `viewer` | Apenas visualização |
| `instructor` | Gerenciar cursos NR |

**Permissions (14 tipos):**
- `create_project`, `edit_project`, `delete_project`
- `render_video`, `download_video`
- `manage_users`, `view_analytics`, etc.

---

### 4.4 Módulo: TTS (Text-to-Speech)

| Atributo | Descrição |
|----------|-----------|
| **Nome** | TTS Module |
| **Responsabilidade** | Gerar narração de áudio a partir de texto |
| **Localização** | `estudio_ia_videos/app/lib/tts/` |
| **Dependências** | ElevenLabs API |
| **Entradas** | Texto das notas do apresentador |
| **Saídas** | Arquivos de áudio MP3/WAV |

---

### 4.5 Módulo: Avatar AI

| Atributo | Descrição |
|----------|-----------|
| **Nome** | Avatar AI Module |
| **Responsabilidade** | Gerar avatares com lip-sync |
| **Localização** | `estudio_ia_videos/app/lib/avatar/` |
| **Dependências** | HeyGen API |
| **Entradas** | Áudio TTS, seleção de avatar |
| **Saídas** | Vídeo do avatar com lip-sync |

---

### 4.6 Módulo: Analytics

| Atributo | Descrição |
|----------|-----------|
| **Nome** | Analytics Module |
| **Responsabilidade** | Métricas e estatísticas do sistema |
| **Localização** | `estudio_ia_videos/app/lib/analytics/` |
| **Dependências** | Supabase, Redis (cache) |
| **Entradas** | Eventos do sistema |
| **Saídas** | Dashboards e relatórios |

---

### 4.7 Módulo: Storage

| Atributo | Descrição |
|----------|-----------|
| **Nome** | Storage Module |
| **Responsabilidade** | Gerenciar arquivos no Supabase Storage |
| **Localização** | `estudio_ia_videos/app/lib/storage/` |
| **Dependências** | Supabase Storage |

**Buckets:**
| Bucket | Propósito | RLS |
|--------|-----------|-----|
| `assets` | Imagens PPTX, logos | Por usuário |
| `videos` | Vídeos renderizados | Por usuário |
| `avatars` | Avatares AI | Por usuário |
| `exports` | Exports LGPD | Por usuário |

---

## 5. MILESTONES

### Milestone 0: Setup Inicial
**Duração Estimada:** 1 dia  
**Pré-requisitos:** Nenhum

- [x] Clonar repositório e instalar dependências
- [x] Configurar variáveis de ambiente (.env.local)
- [x] Configurar Supabase (projeto + credenciais)
- [x] Configurar Redis (local via Docker)
- [x] Validar ambiente (`npm run validate:env`)
- [x] Executar health check (`npm run health`)

---

### Milestone 1: Database & Auth Foundation
**Duração Estimada:** 2 dias  
**Pré-requisitos:** Milestone 0 completo

- [x] Criar schema do banco (`database-schema.sql`)
- [x] Aplicar migrations (`npm run setup:supabase`)
- [x] Configurar RLS policies (`database-rls-policies.sql`)
- [x] Implementar RBAC (`database-rbac-complete.sql`)
- [x] Criar Supabase Auth integration
- [x] Implementar login/logout/register
- [x] Criar middleware de autenticação
- [x] Criar hooks useAuth, usePermission, useRole
- [x] Testes de auth (unit + e2e)

---

### Milestone 2: PPTX Processing
**Duração Estimada:** 3 dias  
**Pré-requisitos:** Milestone 1 completo

- [x] Implementar upload de PPTX (`/api/pptx/upload`)
- [x] Implementar text-parser.ts
- [x] Implementar image-parser.ts
- [x] Implementar layout-parser.ts
- [x] Implementar notes-parser.ts
- [x] Implementar theme-parser.ts
- [x] Implementar animation-parser.ts
- [x] Implementar table-parser.ts
- [x] Implementar shape-parser.ts
- [x] Integrar parsers no endpoint `/api/pptx/parse`
- [x] Testes de parsing (38 testes PPTX)

---

### Milestone 3: Editor Visual
**Duração Estimada:** 3 dias  
**Pré-requisitos:** Milestone 2 completo

- [x] Criar editor-store.ts (Zustand)
- [x] Implementar canvas de visualização
- [x] Implementar edição de texto inline
- [x] Implementar navegação entre slides
- [x] Implementar preview de slides
- [x] Implementar auto-save
- [x] Implementar timeline básica
- [x] Testes do editor

---

### Milestone 4: Render Pipeline
**Duração Estimada:** 4 dias  
**Pré-requisitos:** Milestone 3 completo

- [x] Configurar BullMQ com Redis
- [x] Implementar job-manager.ts
- [x] Implementar frame-generator.ts (Canvas)
- [x] Implementar ffmpeg-executor.ts
- [x] Implementar video-uploader.ts
- [x] Criar endpoint `/api/render/start`
- [x] Criar endpoint `/api/render/jobs`
- [x] Criar endpoint `/api/render/progress` (SSE)
- [x] Criar endpoint `/api/render/cancel`
- [x] Implementar retry automático
- [x] Implementar cleanup de temporários
- [x] Testes do pipeline (contract tests)

---

### Milestone 5: TTS & Avatar Integration
**Duração Estimada:** 2 dias  
**Pré-requisitos:** Milestone 4 completo

- [x] Integrar ElevenLabs API
- [x] Implementar geração de áudio TTS
- [x] Implementar cache de áudios
- [x] Integrar HeyGen API
- [x] Implementar seleção de avatar
- [x] Implementar lip-sync
- [x] Sincronizar áudio com vídeo
- [x] Testes de TTS e Avatar

---

### Milestone 6: APIs & Webhooks
**Duração Estimada:** 2 dias  
**Pré-requisitos:** Milestone 5 completo

- [x] Implementar rate limiting
- [x] Implementar health check endpoint
- [x] Implementar webhooks para eventos de render
- [x] Implementar System Info API
- [x] Implementar Usage Statistics API
- [x] Implementar LGPD endpoints (export, delete)
- [x] Documentar APIs (OpenAPI/Swagger)
- [x] Contract tests (12 suites)

---

### Milestone 7: Testing & QA
**Duração Estimada:** 2 dias  
**Pré-requisitos:** Milestone 6 completo

- [x] Completar unit tests (Jest)
- [x] Completar contract tests
- [x] Implementar E2E RBAC tests (25)
- [x] Implementar E2E Video Flow tests (15)
- [x] Atingir 80%+ coverage statements
- [x] Atingir 90%+ coverage functions
- [x] CI/CD com 6 suites paralelas
- [x] Smoke tests críticos

---

### Milestone 8: Templates NR
**Duração Estimada:** 1 dia  
**Pré-requisitos:** Milestone 4 completo

- [x] Criar estrutura de templates NR
- [x] Implementar template NR-12
- [x] Implementar template NR-35
- [x] Implementar template NR-10
- [x] Galeria de templates no UI
- [x] Documentar templates

---

### Milestone 9: Infra & DevOps
**Duração Estimada:** 1 dia  
**Pré-requisitos:** Milestone 7 completo

- [x] Docker compose funcional
- [x] Dockerfile para aplicação
- [x] Dockerfile para worker
- [x] Scripts de automação
- [x] Health check script
- [x] Documentação de deploy

---

### Milestone 10: Deploy & Go-Live (FUTURO)
**Duração Estimada:** 2 semanas  
**Pré-requisitos:** Milestone 9 completo

- [ ] Deploy em staging (Vercel/AWS)
- [ ] Configurar variáveis de produção
- [ ] Aplicar migrations em staging
- [ ] Executar E2E em staging
- [ ] Performance testing (Lighthouse, K6)
- [ ] Security audit (OWASP ZAP)
- [ ] Deploy em produção
- [ ] Configurar CDN
- [ ] Configurar backups automáticos
- [ ] Monitoramento 24/7 (Sentry, DataDog)
- [ ] Go-Live com primeiros 100 usuários

---

## 6. TAREFAS DETALHADAS

### 6.1 Setup & Configuração

#### SETUP-001: Configurar Ambiente Local
**Status:** ✅ Completo  
**Prioridade:** P0 - Crítico

- [x] Clonar repositório
- [x] Executar `npm install`
- [x] Copiar `.env.local.example` para `.env.local`
- [x] Preencher variáveis obrigatórias
- [x] Executar `npm run validate:env`

#### SETUP-002: Configurar Supabase
**Status:** ✅ Completo  
**Prioridade:** P0 - Crítico

- [x] Criar projeto no Supabase Dashboard
- [x] Obter `SUPABASE_URL` e `ANON_KEY`
- [x] Obter `SERVICE_ROLE_KEY` (manter secreto!)
- [x] Obter `DIRECT_DATABASE_URL`
- [x] Executar `npm run setup:supabase`

#### SETUP-003: Configurar Redis
**Status:** ✅ Completo  
**Prioridade:** P0 - Crítico

- [x] Instalar Docker Desktop
- [x] Executar `npm run redis:start`
- [x] Verificar conexão: `npm run redis:logs`

---

### 6.2 Database

#### DB-001: Schema Principal
**Status:** ✅ Completo  
**Arquivo:** `database-schema.sql`

- [x] Tabela `users`
- [x] Tabela `projects`
- [x] Tabela `slides`
- [x] Tabela `render_jobs`
- [x] Tabela `nr_courses`
- [x] Índices de performance
- [x] Triggers (updated_at)

#### DB-002: RLS Policies
**Status:** ✅ Completo  
**Arquivo:** `database-rls-policies.sql`

- [x] Policy: Users veem apenas seus dados
- [x] Policy: Projects isolados por user_id
- [x] Policy: Slides vinculados ao projeto do usuário
- [x] Policy: Jobs vinculados ao usuário
- [x] Funções auxiliares (is_admin, can_edit_project)

#### DB-003: RBAC
**Status:** ✅ Completo  
**Arquivo:** `database-rbac-complete.sql`

- [x] Tabela `roles`
- [x] Tabela `permissions`
- [x] Tabela `role_permissions`
- [x] Tabela `user_roles`
- [x] Seed de roles padrão
- [x] Seed de permissions

---

### 6.3 Autenticação

#### AUTH-001: Login Flow
**Status:** ✅ Completo  
**Arquivo:** `estudio_ia_videos/app/api/auth/login/route.ts`

- [x] POST /api/auth/login
- [x] Validação com Zod
- [x] Supabase Auth signInWithPassword
- [x] Retornar sessão e user

#### AUTH-002: Logout Flow
**Status:** ✅ Completo  
**Arquivo:** `estudio_ia_videos/app/api/auth/logout/route.ts`

- [x] POST /api/auth/logout
- [x] Invalidar sessão
- [x] Limpar cookies

#### AUTH-003: Register Flow
**Status:** ✅ Completo  
**Arquivo:** `estudio_ia_videos/app/api/auth/register/route.ts`

- [x] POST /api/auth/register
- [x] Validação de dados
- [x] Criar usuário no Supabase Auth
- [x] Atribuir role padrão (viewer)

#### AUTH-004: RBAC Middleware
**Status:** ✅ Completo  
**Arquivo:** `estudio_ia_videos/app/lib/auth/rbac.ts`

- [x] Verificar autenticação
- [x] Verificar role do usuário
- [x] Verificar permissions específicas
- [x] Retornar 403 se não autorizado

#### AUTH-005: Hooks de Auth
**Status:** ✅ Completo  
**Arquivo:** `estudio_ia_videos/app/hooks/`

- [x] useAuth() - estado de autenticação
- [x] usePermission(permission) - verificar permissão
- [x] useRole() - obter role atual
- [x] useIsAdmin() - verificar se é admin

---

### 6.4 PPTX Processing

#### PPTX-001: Upload Endpoint
**Status:** ✅ Completo  
**Arquivo:** `estudio_ia_videos/app/api/pptx/upload/route.ts`

- [x] POST /api/pptx/upload
- [x] Validar tipo MIME (application/vnd.openxmlformats...)
- [x] Limite de 50MB
- [x] Upload para Supabase Storage (bucket: assets)
- [x] Retornar URL do arquivo

#### PPTX-002: Text Parser
**Status:** ✅ Completo  
**Arquivo:** `estudio_ia_videos/app/lib/pptx/text-parser.ts`

- [x] Extrair textos de cada slide
- [x] Preservar formatação (bold, italic, etc.)
- [x] Extrair hierarquia de parágrafos
- [x] Mapear fontes e tamanhos

#### PPTX-003: Image Parser
**Status:** ✅ Completo  
**Arquivo:** `estudio_ia_videos/app/lib/pptx/image-parser.ts`

- [x] Extrair imagens de slides
- [x] Detectar formatos (PNG, JPEG, etc.)
- [x] Upload para Supabase Storage
- [x] Retornar URLs das imagens

#### PPTX-004: Layout Parser
**Status:** ✅ Completo  
**Arquivo:** `estudio_ia_videos/app/lib/pptx/layout-parser.ts`

- [x] Detectar tipo de layout (título, conteúdo, etc.)
- [x] Mapear posições de elementos
- [x] Suportar 12+ tipos de layout

#### PPTX-005: Notes Parser
**Status:** ✅ Completo  
**Arquivo:** `estudio_ia_videos/app/lib/pptx/notes-parser.ts`

- [x] Extrair notas do apresentador
- [x] Associar nota ao slide correto
- [x] Preservar formatação

#### PPTX-006: Theme Parser
**Status:** ✅ Completo  
**Arquivo:** `estudio_ia_videos/app/lib/pptx/theme-parser.ts`

- [x] Extrair cores do tema
- [x] Extrair fontes do tema
- [x] Mapear para CSS

#### PPTX-007: Animation Parser
**Status:** ✅ Completo  
**Arquivo:** `estudio_ia_videos/app/lib/pptx/animation-parser.ts`

- [x] Extrair animações de entrada
- [x] Extrair animações de saída
- [x] Extrair transições de slides

#### PPTX-008: Table Parser
**Status:** ✅ Completo  
**Arquivo:** `estudio_ia_videos/app/lib/pptx/table-parser.ts`

- [x] Extrair estrutura de tabelas
- [x] Extrair dados das células
- [x] Preservar formatação

#### PPTX-009: Shape Parser
**Status:** ✅ Completo  
**Arquivo:** `estudio_ia_videos/app/lib/pptx/shape-parser.ts`

- [x] Extrair formas básicas
- [x] Extrair diagramas SmartArt
- [x] Mapear para SVG/Canvas

---

### 6.5 Render Pipeline

#### RENDER-001: Job Manager
**Status:** ✅ Completo  
**Arquivo:** `estudio_ia_videos/app/lib/render/job-manager.ts`

- [x] Criar job no banco (render_jobs)
- [x] Adicionar job à fila BullMQ
- [x] Atualizar status do job
- [x] Gerenciar retry automático

#### RENDER-002: Frame Generator
**Status:** ✅ Completo  
**Arquivo:** `estudio_ia_videos/app/lib/render/frame-generator.ts`

- [x] Criar canvas com dimensões corretas
- [x] Renderizar slide no canvas
- [x] Exportar frame como PNG
- [x] Gerar todos os frames do vídeo

#### RENDER-003: FFmpeg Executor
**Status:** ✅ Completo  
**Arquivo:** `estudio_ia_videos/app/lib/render/ffmpeg-executor.ts`

- [x] Combinar frames em vídeo
- [x] Adicionar áudio (TTS)
- [x] Encoding H.264 (padrão)
- [x] Suporte a H.265 e VP9
- [x] Configurações de qualidade

#### RENDER-004: Video Uploader
**Status:** ✅ Completo  
**Arquivo:** `estudio_ia_videos/app/lib/render/video-uploader.ts`

- [x] Upload para Supabase Storage (bucket: videos)
- [x] Gerar signed URL
- [x] Atualizar job com URL do vídeo
- [x] Cleanup de arquivos temporários

#### RENDER-005: Start Endpoint
**Status:** ✅ Completo  
**Arquivo:** `estudio_ia_videos/app/api/render/start/route.ts`

- [x] POST /api/render/start
- [x] Validação com Zod
- [x] Rate limiting (10 req/min)
- [x] Criar job e adicionar à fila
- [x] Retornar jobId

#### RENDER-006: Jobs List Endpoint
**Status:** ✅ Completo  
**Arquivo:** `estudio_ia_videos/app/api/render/jobs/route.ts`

- [x] GET /api/render/jobs
- [x] Paginação
- [x] Filtros (status, userId, dateRange)
- [x] Cache com Redis (30s TTL)

#### RENDER-007: Progress Endpoint (SSE)
**Status:** ✅ Completo  
**Arquivo:** `estudio_ia_videos/app/api/render/progress/route.ts`

- [x] GET /api/render/progress (Server-Sent Events)
- [x] Updates a cada 1 segundo
- [x] Enviar porcentagem, stage, ETA
- [x] Reconexão automática

#### RENDER-008: Cancel Endpoint
**Status:** ✅ Completo  
**Arquivo:** `estudio_ia_videos/app/api/render/cancel/route.ts`

- [x] POST /api/render/cancel
- [x] Cancelar job na fila
- [x] Atualizar status para cancelled
- [x] Cleanup de recursos

---

### 6.6 TTS Integration

#### TTS-001: ElevenLabs Service
**Status:** ✅ Completo  
**Arquivo:** `estudio_ia_videos/app/lib/tts/elevenlabs-service.ts`

- [x] Configurar API key
- [x] Selecionar voz
- [x] Gerar áudio a partir de texto
- [x] Cache de áudios gerados

#### TTS-002: TTS Endpoint
**Status:** ✅ Completo  
**Arquivo:** `estudio_ia_videos/app/api/tts/generate/route.ts`

- [x] POST /api/tts/generate
- [x] Receber texto e configurações
- [x] Gerar áudio
- [x] Retornar URL do áudio

---

### 6.7 Avatar Integration

#### AVATAR-001: HeyGen Service
**Status:** ✅ Completo  
**Arquivo:** `estudio_ia_videos/app/lib/avatar/heygen-service.ts`

- [x] Configurar API key
- [x] Listar avatares disponíveis
- [x] Gerar vídeo com avatar
- [x] Lip-sync com áudio TTS

#### AVATAR-002: Avatar Endpoint
**Status:** ✅ Completo  
**Arquivo:** `estudio_ia_videos/app/api/avatar/generate/route.ts`

- [x] POST /api/avatar/generate
- [x] Receber avatar ID e áudio URL
- [x] Gerar vídeo com lip-sync
- [x] Retornar URL do vídeo

---

### 6.8 APIs Complementares

#### API-001: Health Check
**Status:** ✅ Completo  
**Arquivo:** `estudio_ia_videos/app/api/health/route.ts`

- [x] GET /api/health
- [x] Verificar DB connection
- [x] Verificar Redis connection
- [x] Verificar Supabase Storage
- [x] Retornar status estruturado

#### API-002: Rate Limiting
**Status:** ✅ Completo  
**Arquivo:** `estudio_ia_videos/app/lib/rate-limit.ts`

- [x] Sliding window com Redis
- [x] Headers X-RateLimit-*
- [x] Configuração por rota
- [x] 9 rotas protegidas

#### API-003: Webhooks
**Status:** ✅ Completo  
**Arquivo:** `estudio_ia_videos/app/api/webhooks/render/route.ts`

- [x] POST /api/webhooks/render
- [x] Eventos: completed, failed, progress
- [x] Retry automático
- [x] Validação de signature

#### API-004: System Info
**Status:** ✅ Completo  
**Arquivo:** `estudio_ia_videos/app/api/system/`

- [x] GET /api/system/version
- [x] GET /api/system/info (admin only)
- [x] Cache headers corretos

#### API-005: Analytics
**Status:** ✅ Completo  
**Arquivo:** `estudio_ia_videos/app/api/analytics/`

- [x] GET /api/analytics/usage-stats
- [x] Suporte a períodos (7d, 30d, 90d)
- [x] Contagem de projetos, renders, usuários

#### API-006: LGPD Compliance
**Status:** ✅ Completo  
**Arquivos:** `estudio_ia_videos/app/api/user/`

- [x] POST /api/user/export-data
- [x] DELETE /api/user/delete-account
- [x] Formatos: JSON, CSV
- [x] Confirmação explícita

---

### 6.9 Testing

#### TEST-001: Unit Tests
**Status:** ✅ Completo  
**Diretório:** `estudio_ia_videos/app/__tests__/`

- [x] Testes de lib/pptx (38 testes)
- [x] Testes de lib/render
- [x] Testes de lib/auth
- [x] Testes de lib/queue
- [x] Coverage > 80%

#### TEST-002: Contract Tests
**Status:** ✅ Completo  
**Diretório:** `scripts/test-contract-*.js`

- [x] 12 suites de contract tests
- [x] Validação de schemas
- [x] Edge cases
- [x] Error handling

#### TEST-003: E2E Tests
**Status:** ✅ Completo  
**Diretório:** `estudio_ia_videos/app/e2e/`

- [x] 25 testes RBAC
- [x] 15 testes Video Flow
- [x] Playwright configurado
- [x] Screenshots automáticos

---

### 6.10 Infraestrutura

#### INFRA-001: Docker
**Status:** ✅ Completo

- [x] docker-compose.yml
- [x] Dockerfile (aplicação)
- [x] Dockerfile.worker
- [x] Redis service

#### INFRA-002: Scripts de Automação
**Status:** ✅ Completo

- [x] setup-supabase-auto.ts
- [x] health-check.ts
- [x] audit-any.ts
- [x] validate-env.ts

---

## 7. CHECKPOINT SYSTEM

### 7.1 O Que Define Uma Tarefa Concluída

Uma tarefa é considerada **CONCLUÍDA** (`[x]`) quando:

1. ✅ **Código implementado** e commitado
2. ✅ **Testes passando** (se aplicável)
3. ✅ **Sem erros de TypeScript** (`npm run type-check`)
4. ✅ **Sem erros de ESLint** (`npm run lint`)
5. ✅ **Sem usos de `any`** não justificados (`npm run audit:any`)
6. ✅ **Funcionalidade verificável** manualmente ou via teste

### 7.2 O Que Define Um Milestone Finalizado

Um milestone é considerado **FINALIZADO** quando:

1. ✅ **Todas as tarefas** do milestone estão marcadas `[x]`
2. ✅ **Todos os testes** relacionados passando
3. ✅ **Health check** retorna score ≥ 70
4. ✅ **Sem bloqueadores** para o próximo milestone
5. ✅ **Documentação** atualizada (se necessário)

### 7.3 Instrução para IA

```
╔════════════════════════════════════════════════════════════════════════╗
║  🤖 INSTRUÇÃO CRÍTICA PARA IA IMPLEMENTADORA                          ║
║                                                                        ║
║  A IA deve SEMPRE retomar a partir do último checkbox NÃO marcado.    ║
║                                                                        ║
║  Fluxo obrigatório:                                                   ║
║  1. Ler PRD.md completo                                               ║
║  2. Identificar última tarefa marcada [x]                             ║
║  3. Iniciar pela próxima tarefa [ ]                                   ║
║  4. Implementar tarefa                                                ║
║  5. Rodar testes relevantes                                           ║
║  6. Marcar tarefa como [x] no PRD.md                                  ║
║  7. Commit com referência à task                                      ║
║  8. Repetir até completar milestone                                   ║
║                                                                        ║
║  NUNCA pule tarefas. NUNCA refatore sem nova task.                    ║
╚════════════════════════════════════════════════════════════════════════╝
```

### 7.4 Exemplo de Retomada

```markdown
# Estado atual do PRD:
- [x] Implementar upload de PPTX
- [x] Implementar text-parser.ts
- [x] Implementar image-parser.ts
- [ ] Implementar layout-parser.ts    ← IA DEVE COMEÇAR AQUI
- [ ] Implementar notes-parser.ts
```

---

## 8. REGRAS PARA A IA IMPLEMENTADORA

### 8.1 Antes de Qualquer Ação

```bash
# 1. Ler PRD.md
cat PRD.md

# 2. Verificar health do sistema
npm run health

# 3. Identificar checkpoint atual
grep -n "\[ \]" PRD.md | head -5
```

### 8.2 Durante Implementação

1. **Uma tarefa por vez** - Não paralelizar tarefas dependentes
2. **Commits atômicos** - Um commit por tarefa
3. **Mensagens de commit** - Formato: `feat(módulo): TASK-ID - descrição`
4. **Testes primeiro** - Se possível, TDD
5. **TypeScript estrito** - Nunca usar `any` sem justificativa
6. **Logger** - Usar `logger` de `@/lib/logger`, nunca `console.log`

### 8.3 Após Cada Tarefa

```bash
# 1. Type check
npm run type-check

# 2. Lint
npm run lint

# 3. Audit any
npm run audit:any

# 4. Testes relacionados
npm test -- --testPathPattern="nome-do-módulo"

# 5. Health check
npm run health

# 6. Commit
git add .
git commit -m "feat(módulo): TASK-ID - descrição"
```

### 8.4 Proibições Absolutas

| ❌ PROIBIDO | ✅ FAZER ISSO |
|-------------|---------------|
| Pular tarefas | Executar em ordem |
| Usar `any` | Definir interface explícita |
| `console.log` em prod | `logger.info/warn/error` |
| Refatorar sem task | Criar nova task primeiro |
| Ignorar erros TS | Corrigir todos os erros |
| Commits gigantes | Commits atômicos |
| Esquecer testes | Rodar testes após cada task |

### 8.5 Quando Encontrar Bloqueadores

Se encontrar um bloqueador:

1. **Documentar** o bloqueador no código com `// BLOCKER:`
2. **Não tentar workarounds** sem aprovação
3. **Criar issue** descrevendo o problema
4. **Prosseguir** para próxima tarefa não-dependente
5. **Retornar** ao bloqueador quando resolvido

---

## 9. CRITÉRIOS DE CONCLUSÃO DO PROJETO

### 9.1 Critérios Técnicos

| Critério | Meta | Status |
|----------|------|--------|
| Todos os milestones completos | 10/10 | 9/10 (M10 futuro) |
| Coverage de statements | ≥ 80% | ✅ 89% |
| Coverage de functions | ≥ 90% | ✅ 100% |
| Zero erros TypeScript | 0 | ✅ 0 |
| Zero erros ESLint | 0 | ✅ 0 |
| Zero `any` não justificados | 0 | ✅ 0 |
| Health score | ≥ 70 | ✅ 82 |
| Testes E2E passando | 40/40 | ✅ 40/40 |
| Contract tests passando | 12/12 | ✅ 12/12 |

### 9.2 Critérios Funcionais

| Feature | Status |
|---------|--------|
| Upload e parse de PPTX | ✅ |
| Editor visual funcional | ✅ |
| Renderização de vídeo | ✅ |
| TTS integrado | ✅ |
| Avatar AI integrado | ✅ |
| RBAC funcionando | ✅ |
| RLS funcionando | ✅ |
| Rate limiting ativo | ✅ |
| Health check disponível | ✅ |
| LGPD compliance | ✅ |

### 9.3 Critérios de Deploy

| Critério | Status |
|----------|--------|
| Docker compose funcional | ✅ |
| Variáveis de ambiente documentadas | ✅ |
| Scripts de setup automatizados | ✅ |
| Documentação completa | ✅ |
| CI/CD configurado | ✅ |
| Monitoring configurado | ✅ |

### 9.4 Definição de "Pronto"

O sistema é considerado **PRONTO PARA PRODUÇÃO** quando:

1. ✅ Todos os critérios técnicos atendidos
2. ✅ Todos os critérios funcionais atendidos
3. ✅ Todos os critérios de deploy atendidos
4. ⏳ Deploy em staging validado
5. ⏳ Deploy em produção executado

**Status Atual:** READY_PENDING_DEPLOY (Milestones 0-9 completos)

---

## 10. REFERÊNCIA RÁPIDA

### 10.1 Comandos Essenciais

```bash
# Setup
npm install
npm run setup:supabase
npm run validate:env

# Desenvolvimento
npm run app:dev          # Next.js na porta 3000
npm run redis:start      # Redis via Docker

# Qualidade
npm run type-check       # TypeScript
npm run lint             # ESLint
npm run audit:any        # Auditoria de `any`
npm run health           # Score 0-100

# Testes
npm test                 # Jest
npm run test:contract:video-jobs  # Contract tests
npm run test:e2e:playwright       # E2E Playwright
```

### 10.2 Arquivos Críticos

| Arquivo | Propósito |
|---------|-----------|
| `PRD.md` | Este documento (FONTE DA VERDADE) |
| `feature-list.json` | Features com status passes/fails |
| `.env.local` | Variáveis de ambiente (NÃO commitar) |
| `database-schema.sql` | Schema do banco |
| `database-rls-policies.sql` | Políticas RLS |

### 10.3 Diretórios Principais

| Diretório | Propósito |
|-----------|-----------|
| `estudio_ia_videos/app/api/` | 70+ rotas API |
| `estudio_ia_videos/app/lib/` | Lógica de negócio |
| `estudio_ia_videos/app/__tests__/` | Testes Jest |
| `estudio_ia_videos/app/e2e/` | Testes Playwright |
| `scripts/` | Automação |

---

## 11. CHANGELOG DO PRD

| Data | Versão | Alteração |
|------|--------|-----------|
| 2026-01-05 | 1.0.0 | Criação inicial do PRD completo |

---

## 12. ANEXOS

### Anexo A: Variáveis de Ambiente Obrigatórias

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
DIRECT_DATABASE_URL=postgresql://...

# Redis
REDIS_URL=redis://localhost:6379

# Integrações (opcional para dev)
ELEVENLABS_API_KEY=sk_...
HEYGEN_API_KEY=...

# Monitoring (opcional para dev)
SENTRY_DSN=https://...
```

### Anexo B: Status das Features (feature-list.json)

```json
{
  "summary": {
    "total": 36,
    "passing": 36,
    "failing": 0,
    "categories": {
      "core": { "total": 4, "passing": 4 },
      "pptx": { "total": 4, "passing": 4 },
      "render": { "total": 6, "passing": 6 },
      "auth": { "total": 7, "passing": 7 },
      "api": { "total": 7, "passing": 7 },
      "database": { "total": 3, "passing": 3 },
      "testing": { "total": 3, "passing": 3 },
      "infra": { "total": 2, "passing": 2 }
    }
  }
}
```

### Anexo C: Health Score Atual

```
Total Score: 82/100

Categories:
- Database: 100/100
- Redis: 95/100
- API: 85/100
- Storage: 90/100
- Tests: 95/100
- Docs: 100/100
```

---

**FIM DO DOCUMENTO PRD**

*Este documento é a FONTE ÚNICA DA VERDADE do projeto MVP Vídeos TécnicoCursos v7.*  
*Última atualização: 05 de Janeiro de 2026*  
*Versão: 1.0.0*
