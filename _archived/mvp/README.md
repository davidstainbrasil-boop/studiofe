# MVP Dashboard TécnicoCursos

Dashboard completo para gestão de projetos de vídeos técnicos NR.

**Stack:** Next.js 14, TypeScript, Supabase Auth, Prisma + PostgreSQL, shadcn/ui, Zustand, SWR, Docker.

---

## Início Rápido

### 1. Pré-requisitos

- Node.js 20+
- PostgreSQL 16+ (ou Docker)
- Conta Supabase (para autenticação)

### 2. Setup

```bash
# Clone e instale
cd mvp
npm install

# Configure variáveis de ambiente
cp .env.example .env.local
# Edite .env.local com suas credenciais (veja seção abaixo)

# Crie as tabelas no banco
npx prisma db push

# Popule com dados iniciais (roles, permissões, dados demo)
npm run db:seed

# Inicie o servidor de desenvolvimento
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

### 3. Variáveis de Ambiente (.env.local)

```bash
# === Supabase ===
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# === Database ===
DATABASE_URL=postgresql://postgres:senha@localhost:5432/mvp_tecnicocursos
DIRECT_DATABASE_URL=postgresql://postgres:senha@localhost:5432/mvp_tecnicocursos

# === Redis (opcional — para rate limit distribuído) ===
REDIS_URL=redis://localhost:6379

# === App ===
APP_URL=http://localhost:3000
NODE_ENV=development
```

**Como obter as chaves Supabase:**

1. Acesse [supabase.com/dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto → Settings → API
3. Copie `URL`, `anon public` e `service_role` (secret!)

---

## Comandos

| Comando | Descrição |
| ------- | --------- |
| `npm run dev` | Servidor de desenvolvimento (porta 3000) |
| `npm run build` | Build de produção |
| `npm start` | Inicia a build de produção |
| `npm test` | Executa testes Jest |
| `npm run test:watch` | Testes em modo watch |
| `npm run test:coverage` | Testes com cobertura |
| `npm run type-check` | Verificação TypeScript |
| `npm run lint` | ESLint |
| `npm run db:push` | Aplica schema ao banco (sem migration) |
| `npm run db:migrate` | Cria e aplica migrations |
| `npm run db:seed` | Popula banco com dados iniciais |
| `npm run db:studio` | Interface visual do Prisma para o banco |

---

## Estrutura

```text
mvp/
├── prisma/
│   ├── schema.prisma        # 16 modelos, 4 enums
│   └── seed.ts              # Seed: roles, permissões, dados demo
├── src/
│   ├── app/
│   │   ├── api/             # 10 API routes
│   │   │   ├── health/      # Health check
│   │   │   ├── auth/        # callback + signout
│   │   │   ├── me/          # Perfil do usuário
│   │   │   ├── projects/    # CRUD + colaboradores
│   │   │   ├── analytics/   # Métricas do dashboard
│   │   │   └── admin/       # Users + Roles (admin only)
│   │   ├── dashboard/       # 7 páginas + layouts
│   │   │   ├── page.tsx           # Home (métricas)
│   │   │   ├── projects/         # Lista + detalhe
│   │   │   ├── analytics/        # Gráficos e stats
│   │   │   ├── settings/         # Perfil do usuário
│   │   │   └── admin/            # Users + Roles
│   │   ├── login/           # Página de login
│   │   ├── global-error.tsx # Error boundary global
│   │   └── not-found.tsx    # 404 customizado
│   ├── components/
│   │   ├── dashboard/       # Sidebar + Header
│   │   └── ui/              # 12 componentes shadcn
│   ├── hooks/               # SWR hooks (projects, metrics)
│   ├── lib/
│   │   ├── auth/            # Session helper (Supabase)
│   │   ├── stores/          # Zustand (project-store)
│   │   ├── supabase/        # Client, server, middleware
│   │   ├── logger.ts        # Logger estruturado
│   │   ├── prisma.ts        # Singleton PrismaClient
│   │   ├── rate-limit.ts    # Rate limiter in-memory
│   │   └── utils.ts         # cn, formatDate, formatRelativeTime
│   ├── types/               # Tipos compartilhados
│   ├── middleware.ts         # Auth protection + security headers
│   └── __tests__/           # Testes unitários
├── Dockerfile               # Multi-stage (node:20-alpine)
├── docker-compose.yml       # App + Postgres + Redis
└── package.json
```

---

## Deploy com Docker

```bash
# Build e inicia todos os serviços
docker-compose up -d

# Verifica os logs
docker-compose logs -f app

# Aplica schema ao banco do container
docker-compose exec app npx prisma db push

# Popula dados iniciais
docker-compose exec app npx tsx prisma/seed.ts
```

O app roda na porta **3000**, PostgreSQL na **5432**, Redis na **6379**.

---

## API Routes

| Rota | Métodos | Descrição |
| ---- | ------- | --------- |
| `/api/health` | GET | Health check + latência DB |
| `/api/auth/callback` | GET | Callback OAuth Supabase |
| `/api/auth/signout` | GET | Logout + limpa cookies |
| `/api/me` | GET | Perfil do usuário autenticado |
| `/api/projects` | GET, POST | Lista (paginação/filtro) + criar |
| `/api/projects/[id]` | GET, PUT, DELETE | Detalhe, atualizar, deletar |
| `/api/projects/[id]/collaborators` | GET, POST, DELETE | Gestão de equipe |
| `/api/analytics/dashboard` | GET | Métricas + gráficos |
| `/api/admin/users` | GET | Lista de usuários (admin) |
| `/api/admin/roles` | GET, POST | Gestão de roles/permissões |

Todas as rotas (exceto health e auth) requerem autenticação via Supabase.

---

## Autenticação

O sistema usa **Supabase Auth puro** (sem NextAuth):

1. Usuário faz login na página `/login`
2. Supabase gerencia sessão via cookies (`sb-*`)
3. Middleware protege todas as rotas `/dashboard/*`
4. API routes verificam auth via `getServerAuth()`

**Para criar o primeiro usuário:**

1. Acesse o Supabase Dashboard → Authentication → Users
2. Crie um usuário com email/senha
3. Execute `npm run db:seed` (cria user no Prisma + role admin)
4. Faça login em `/login`

---

## Decisões Técnicas

| Decisão | Motivo |
| ------- | ------ |
| Supabase-only auth | Elimina dual-layer (era Supabase + NextAuth) |
| 10 API routes | Foco no essencial (era 398 rotas) |
| 16 modelos Prisma | Trimmed de 30+ modelos desnecessários |
| In-memory rate limit | Simples para single-instance; Redis ready |
| `force-dynamic` em todas as rotas | Previne erros de build com env vars |
| shadcn/ui (new-york) | Componentes acessíveis + fáceis de customizar |
| Zustand + SWR | Estado local + data fetching com cache |

---

## Testes

```bash
# Rodar todos os testes
npm test

# Testes específicos
npm test -- --testPathPattern="rate-limit"

# Com cobertura
npm run test:coverage
```

**Cobertura atual:**

- `lib/rate-limit.ts` — checkRateLimit, limites, buckets separados
- `lib/logger.ts` — Singleton, info/warn/error
- `lib/utils.ts` — cn, formatDate, formatRelativeTime
- `lib/stores/project-store.ts` — Zustand actions: filters, dialogs, selection

---

## Licença

Projeto privado — TécnicoCursos.
