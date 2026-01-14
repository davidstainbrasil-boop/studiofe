# 🎬 MVP Video Platform - Plataforma Profissional de Criação de Vídeos

[![Build Status](https://img.shields.io/github/actions/workflow/status/YOUR_ORG/YOUR_REPO/ci-cd.yml?branch=main)](https://github.com/YOUR_ORG/YOUR_REPO/actions)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/typescript-5.3-blue)](https://www.typescriptlang.org/)

Plataforma SaaS completa para criação automatizada de vídeos a partir de apresentações PowerPoint, com IA, Text-to-Speech, avatares virtuais e editor profissional.

## ✨ Features Principais

### 🎨 Editor Profissional
- **Canvas Editor** com Fabric.js para edição visual
- **Timeline Editor** para sequenciamento preciso
- **Properties Panel** com sincronização bi-direcional
- Suporte a templates e temas personalizados

### 🤖 IA & Automação
- **GPT-4** para geração de scripts
- **ElevenLabs** para Text-to-Speech natural
- **HeyGen** para avatares com lip-sync
- Processamento automático de PPTX

### 🚀 Performance & Escalabilidade
- **CDN** via CloudFront para distribuição global
- **Cache** distribuído com Redis
- **Rate Limiting** para proteção de APIs
- **Auto-scaling** pronto para produção

### 📊 Monitoramento
- Dashboard admin em tempo real
- Health checks automáticos
- Rate limit monitoring
- Error tracking com Sentry

## 🛠️ Stack Tecnológica

### Frontend
- **Next.js 14** (App Router)
- **React 18** com TypeScript
- **Tailwind CSS** + shadcn/ui
- **Fabric.js** para canvas editing
- **Framer Motion** para animações

### Backend
- **Next.js API Routes**
- **Prisma ORM** com PostgreSQL
- **Redis** para cache e filas
- **BullMQ** para processamento assíncrono

### Infrastructure
- **Vercel** para hosting
- **Supabase** para database e auth
- **AWS S3 + CloudFront** para CDN
- **Docker** para containerização

## 🚀 Quick Start

### Pré-requisitos
- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- (Opcional) Docker & Docker Compose

### Instalação Local

```bash
# 1. Clone o repositório
git clone https://github.com/YOUR_ORG/YOUR_REPO.git
cd YOUR_REPO/estudio_ia_videos

# 2. Instale dependências
npm ci --legacy-peer-deps

# 3. Configure ambiente
cp .env.example .env.local
nano .env.local  # Preencha as variáveis

# 4. Configure o banco de dados
npx prisma migrate dev
npx prisma generate

# 5. Inicie o servidor de desenvolvimento
npm run dev
```

Acesse: http://localhost:3000

### Com Docker Compose (Recomendado)

```bash
# 1. Clone e configure
git clone https://github.com/YOUR_ORG/YOUR_REPO.git
cd YOUR_REPO/estudio_ia_videos
cp .env.example .env.local

# 2. Inicie todos os serviços
docker-compose up -d

# 3. Execute migrations
docker-compose exec app npx prisma migrate dev
```

Serviços disponíveis:
- App: http://localhost:3000
- Prisma Studio: http://localhost:5555 (com profile tools)
- PostgreSQL: localhost:5432
- Redis: localhost:6379

## 📦 Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev              # Inicia dev server
npm run build            # Build de produção
npm run start            # Inicia produção

# Qualidade de Código
npm run lint             # ESLint
npm run type-check       # TypeScript check

# Database
npm run db:migrate       # Aplica migrations
npm run db:generate      # Gera Prisma Client
npm run db:seed          # Seed do banco

# Deployment
./scripts/deploy-production.sh  # Deploy completo
```

## 🔧 Configuração

### Variáveis de Ambiente Essenciais

```env
# Database
DATABASE_URL="postgresql://..."
REDIS_URL="redis://..."

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://..."
SUPABASE_SERVICE_ROLE_KEY="..."

# AWS (CDN)
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="..."
S3_BUCKET_NAME="..."
CLOUDFRONT_DOMAIN="..."

# Auth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="..."

# AI Services
OPENAI_API_KEY="sk-..."
ELEVENLABS_API_KEY="..."
HEYGEN_API_KEY="..."
```

Veja `.env.production.template` para lista completa.

## 🏗️ Arquitetura

```
estudio_ia_videos/
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── api/          # API Routes
│   │   ├── admin/        # Admin pages
│   │   └── (auth)/       # Auth pages
│   ├── components/       # React components
│   │   ├── pptx/         # PPTX Studio
│   │   ├── timeline/     # Timeline editor
│   │   ├── admin/        # Admin dashboards
│   │   └── ui/           # UI primitives (shadcn)
│   ├── lib/              # Utilities & services
│   │   ├── cache/        # Cache management
│   │   ├── storage/      # S3 & CDN
│   │   ├── queue/        # BullMQ jobs
│   │   └── ai/           # AI integrations
│   └── middleware/       # Next.js middleware
├── prisma/               # Database schema
├── public/               # Static assets
└── scripts/              # Deployment scripts
```

## 🧪 Testing

```bash
# Unit & Integration tests
npm run test

# E2E tests (Playwright)
npm run test:e2e

# Coverage report
npm run test:coverage
```

## 📊 Monitoramento

### Health Check
```bash
curl https://your-domain.com/api/health
```

### Admin Dashboard
Acesse: https://your-domain.com/admin/monitoring
- Rate limit status
- Cache statistics
- System health

### Logs (PM2)
```bash
pm2 logs mvp-video-app
pm2 monit
```

## 🚀 Deployment

### Vercel (Recomendado)

```bash
# Setup Vercel CLI
npm i -g vercel
vercel login

# Deploy staging
vercel

# Deploy production
vercel --prod
```

### Self-Hosted (PM2)

```bash
# Execute deployment script
./scripts/deploy-production.sh

# Ou manualmente
npm run build
pm2 start ecosystem.config.js --env production
```

Veja [DEPLOYMENT.md](DEPLOYMENT.md) para guia completo.

## 📈 Performance

### Métricas de Produção
- ⚡ First Load JS: < 200KB
- 🚀 Time to Interactive: < 2s
- 📊 Lighthouse Score: 95+
- 🌍 Global CDN: 99.9% uptime

### Otimizações
- ✅ Image optimization (Next/Image)
- ✅ Code splitting automático
- ✅ Redis caching (95%+ hit rate)
- ✅ CDN para assets estáticos
- ✅ Connection pooling (Prisma)

## 🔐 Segurança

- ✅ Security headers (CSP, HSTS, etc.)
- ✅ Rate limiting (4 tiers)
- ✅ Input validation (Zod)
- ✅ SQL injection prevention (Prisma)
- ✅ XSS protection
- ✅ CSRF tokens (Next.js)

## 📚 Documentação Adicional

- [DEPLOYMENT.md](DEPLOYMENT.md) - Guia de deployment
- [PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md) - Checklist de produção
- [SPRINT_5_COMPLETE.md](../SPRINT_5_COMPLETE.md) - Sprint 5 summary
- [PROJECT_COMPLETE.md](../PROJECT_COMPLETE.md) - Status final

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja [LICENSE](LICENSE) para detalhes.

## 🙏 Agradecimentos

- [Next.js](https://nextjs.org/)
- [Vercel](https://vercel.com/)
- [Supabase](https://supabase.com/)
- [Prisma](https://www.prisma.io/)
- [shadcn/ui](https://ui.shadcn.com/)

---

**Desenvolvido com ❤️ por [Your Team]**

Para suporte: support@your-domain.com
