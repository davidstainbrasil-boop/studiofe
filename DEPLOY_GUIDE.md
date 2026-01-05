# 🚀 Guia de Deploy - MVP Vídeos TécnicoCursos v7

**Versão:** 1.0.0  
**Data:** 05 de Janeiro de 2026  
**Status:** Production-Ready  

---

## 📋 Índice

1. [Pré-requisitos](#pré-requisitos)
2. [Configuração Supabase](#configuração-supabase)
3. [Configuração Vercel](#configuração-vercel)
4. [Variáveis de Ambiente](#variáveis-de-ambiente)
5. [Deploy Staging](#deploy-staging)
6. [Deploy Production](#deploy-production)
7. [Verificação Pós-Deploy](#verificação-pós-deploy)
8. [Rollback](#rollback)
9. [Troubleshooting](#troubleshooting)

---

## 1. Pré-requisitos

### ✅ Checklist Antes do Deploy

- [ ] Código em produção testado (build completo sem erros)
- [ ] Testes E2E passando (40/40 testes)
- [ ] Testes unitários passando (105 testes)
- [ ] Type-check sem erros
- [ ] Health score ≥ 70
- [ ] Repositório commitado e pushed
- [ ] Branch `main` atualizada

### 🛠️ Ferramentas Necessárias

| Ferramenta | Versão | Link |
|------------|--------|------|
| Node.js | 20.x+ | https://nodejs.org |
| npm | 10.x+ | Incluído com Node.js |
| Git | 2.x+ | https://git-scm.com |
| Vercel CLI | latest | `npm i -g vercel` |

### 📦 Contas Necessárias

- [ ] Conta Vercel (free tier funciona)
- [ ] Conta Supabase (free tier funciona)
- [ ] Conta GitHub (repositório já configurado)
- [ ] (Opcional) Conta ElevenLabs para TTS
- [ ] (Opcional) Conta HeyGen para avatares

---

## 2. Configuração Supabase

### 2.1 Criar Novo Projeto

1. Acesse https://supabase.com/dashboard
2. Click em "New Project"
3. Configure:
   - **Name:** `mvp-video-tecnico-production`
   - **Database Password:** Gere uma senha forte
   - **Region:** `South America (São Paulo)` (recomendado para Brasil)
   - **Pricing Plan:** Free (ou Pro para produção)

4. Aguarde ~2 minutos para o projeto ser provisionado

### 2.2 Obter Credenciais

No Dashboard do projeto, vá em **Settings > API**:

```bash
# Copie estes valores:
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT_ID].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ... (Public anon key)
SUPABASE_SERVICE_ROLE_KEY=eyJ... (Secret! Service role key)
```

No **Settings > Database**, copie a Connection String:

```bash
DATABASE_URL=postgresql://postgres.[PROJECT_ID]:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres
```

### 2.3 Aplicar Schema

**Opção A - Via Dashboard (Recomendado para primeira vez):**

1. Vá em **SQL Editor** no Supabase Dashboard
2. Click em "New Query"
3. Cole o conteúdo de `database-schema.sql`
4. Execute (▶️ Run)
5. Repita para `database-rls-policies.sql`
6. Repita para `database-rbac-complete.sql`

**Opção B - Via Script Local:**

```bash
# Configure as variáveis de ambiente primeiro
export NEXT_PUBLIC_SUPABASE_URL="https://..."
export SUPABASE_SERVICE_ROLE_KEY="eyJ..."

# Execute o setup
npm run setup:supabase
```

### 2.4 Configurar Storage Buckets

No Dashboard, vá em **Storage**:

1. Crie os buckets:
   - `pptx-uploads` (private)
   - `videos` (public)
   - `audio` (private)
   - `temp` (private, TTL 24h)

2. Configure as policies de acesso:

```sql
-- RLS Policies para buckets (executar no SQL Editor)

-- Bucket: videos (public read)
CREATE POLICY "Public videos read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'videos');

-- Bucket: pptx-uploads (authenticated users)
CREATE POLICY "Authenticated users upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'pptx-uploads' 
    AND auth.role() = 'authenticated'
  );
```

---

## 3. Configuração Vercel

### 3.1 Instalar Vercel CLI

```bash
npm install -g vercel
vercel login
```

### 3.2 Conectar Repositório

```bash
cd /root/_MVP_Video_TecnicoCursos_v7
vercel
```

Siga o wizard:
- **Set up and deploy?** Yes
- **Which scope?** Sua conta
- **Link to existing project?** No
- **Project name:** `mvp-video-tecnico`
- **Directory:** `./estudio_ia_videos`
- **Override settings?** No

### 3.3 Configurar Variáveis de Ambiente

```bash
# No diretório do projeto
cd estudio_ia_videos

# Adicionar variáveis de produção
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add DATABASE_URL
vercel env add REDIS_URL
vercel env add NEXTAUTH_SECRET
vercel env add NEXTAUTH_URL
```

Para cada variável, você será solicitado a:
1. Colar o valor
2. Escolher ambientes: `Production`, `Preview`, `Development`

**⚠️ IMPORTANTE:** 
- `SUPABASE_SERVICE_ROLE_KEY` é **SECRETA**
- `DATABASE_URL` deve usar **connection pooler** do Supabase (porta 6543)
- `NEXTAUTH_SECRET` deve ser gerado com: `openssl rand -base64 32`
- `NEXTAUTH_URL` deve ser: `https://[SEU-DOMINIO].vercel.app`

### 3.4 Configurar Redis (Upstash)

Vercel recomenda Upstash Redis:

1. Acesse https://upstash.com
2. Crie database Redis
3. Copie credenciais:

```bash
vercel env add REDIS_URL
# Valor: redis://default:[PASSWORD]@[HOST]:[PORT]

vercel env add UPSTASH_REDIS_REST_URL
vercel env add UPSTASH_REDIS_REST_TOKEN
```

---

## 4. Variáveis de Ambiente

### 4.1 Variáveis Obrigatórias

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ... # SECRETO!
DATABASE_URL=postgresql://...

# Redis
REDIS_URL=redis://...

# NextAuth
NEXTAUTH_SECRET=... # openssl rand -base64 32
NEXTAUTH_URL=https://seu-dominio.vercel.app

# Node
NODE_ENV=production
```

### 4.2 Variáveis Opcionais (Recomendadas)

```bash
# Text-to-Speech (ElevenLabs)
ELEVENLABS_API_KEY=sk_... # Para TTS realista

# Avatares AI (HeyGen)
HEYGEN_API_KEY=... # Para avatares com lip-sync

# Monitoring (Sentry)
SENTRY_DSN=https://...
NEXT_PUBLIC_SENTRY_DSN=https://...

# Analytics
NEXT_PUBLIC_POSTHOG_KEY=...
NEXT_PUBLIC_POSTHOG_HOST=...
```

---

## 5. Deploy Staging

### 5.1 Criar Branch de Staging

```bash
git checkout -b staging
git push -u origin staging
```

### 5.2 Deploy Staging na Vercel

```bash
vercel --prod=false
```

Ou no Dashboard Vercel:
1. Settings > Git
2. Configure `staging` branch para auto-deploy em Preview

### 5.3 Testar Staging

```bash
# URL será algo como: mvp-video-tecnico-git-staging-[user].vercel.app

# Teste endpoints críticos
curl https://[STAGING_URL]/api/health
curl https://[STAGING_URL]/api/system/info

# Execute E2E tests contra staging
PLAYWRIGHT_BASE_URL=https://[STAGING_URL] npm run test:e2e:playwright
```

### 5.4 Verificar Logs

```bash
vercel logs [DEPLOYMENT_URL]
```

---

## 6. Deploy Production

### 6.1 Preparar Branch Main

```bash
git checkout main
git merge staging
git push origin main
```

### 6.2 Deploy via Vercel CLI

```bash
vercel --prod
```

Ou via Dashboard:
- Commits em `main` fazem auto-deploy para production

### 6.3 Verificar Deploy

```bash
# Aguarde build completar (~3-5 minutos)
vercel logs --follow

# Teste production
curl https://[PRODUCTION_URL]/api/health
```

---

## 7. Verificação Pós-Deploy

### 7.1 Checklist de Verificação

- [ ] Health endpoint retorna 200
- [ ] Dashboard carrega sem erros
- [ ] Login funciona
- [ ] Upload de PPTX funciona
- [ ] Editor visual abre
- [ ] Render de vídeo funciona (teste básico)
- [ ] Logs no Vercel sem errors críticos
- [ ] Database conectada (verificar RLS)

### 7.2 Script de Validação

```bash
#!/bin/bash
URL="https://seu-dominio.vercel.app"

echo "🔍 Testando production..."

# Health check
if curl -f "$URL/api/health" > /dev/null 2>&1; then
  echo "✅ Health endpoint OK"
else
  echo "❌ Health endpoint failed"
  exit 1
fi

# System info
if curl -f "$URL/api/system/info" > /dev/null 2>&1; then
  echo "✅ System info OK"
else
  echo "❌ System info failed"
  exit 1
fi

echo "✅ Todos os testes passaram!"
```

### 7.3 Monitoramento

Configure alertas no Vercel:
1. Settings > Notifications
2. Habilite:
   - Deployment failures
   - High error rate
   - Bandwidth alerts

---

## 8. Rollback

### 8.1 Rollback via Vercel Dashboard

1. Vá em **Deployments**
2. Encontre a última versão estável
3. Click nos 3 pontos (⋯) > **Promote to Production**

### 8.2 Rollback via CLI

```bash
# Listar deployments
vercel ls

# Promover deployment específico
vercel promote [DEPLOYMENT_URL]
```

### 8.3 Rollback de Database

```bash
# Se aplicou migrations com erro, restaure backup
# (Configure backups automáticos no Supabase Pro)

# Ou execute SQL de reversão
psql $DATABASE_URL < rollback-migration.sql
```

---

## 9. Troubleshooting

### 9.1 Build Failures

**Erro:** `Module not found`
```bash
# Verifique dependências
npm ci
npm run build

# Se falhar localmente, corrija antes de deploy
```

**Erro:** `Type errors`
```bash
npm run type-check
# Corrija todos os erros TypeScript
```

### 9.2 Runtime Errors

**Erro:** `Connection to database failed`
```bash
# Verifique DATABASE_URL
# Deve usar connection pooler (porta 6543)
# Formato: postgresql://postgres.[PROJECT]:[PASS]@aws-0-us-west-1.pooler.supabase.com:6543/postgres
```

**Erro:** `Redis connection failed`
```bash
# Verifique REDIS_URL
# Teste localmente:
redis-cli -u $REDIS_URL ping
```

### 9.3 Permissões RLS

**Erro:** `new row violates row-level security policy`
```bash
# Verifique policies no Supabase Dashboard
# SQL Editor > RLS Policies
# Desabilite RLS temporariamente para debug (NÃO em produção!)
```

### 9.4 Performance Issues

**Problema:** Slow response times
```bash
# Verifique Vercel Analytics
# Dashboard > Analytics > Performance

# Otimize queries com índices:
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_slides_project_id ON slides(project_id);
```

### 9.5 Logs e Debug

```bash
# Logs em tempo real
vercel logs --follow

# Logs de deployment específico
vercel logs [DEPLOYMENT_URL]

# Logs do Supabase
# Dashboard > Logs > Postgres Logs
```

---

## 10. Comandos Rápidos

```bash
# Deploy staging
vercel

# Deploy production
vercel --prod

# Ver logs
vercel logs --follow

# Listar deployments
vercel ls

# Configurar variável
vercel env add VARIABLE_NAME

# Rollback
vercel promote [DEPLOYMENT_URL]

# Limpar cache
vercel dev --clean
```

---

## 11. Checklist Final

### Antes do Go-Live

- [ ] Todos os testes passando
- [ ] Build limpo sem warnings críticos
- [ ] Variáveis de ambiente configuradas
- [ ] Database schema aplicado
- [ ] RLS policies ativas
- [ ] Storage buckets criados
- [ ] Redis configurado
- [ ] Monitoring ativo (Sentry, Vercel Analytics)
- [ ] Backups configurados
- [ ] DNS configurado (se custom domain)
- [ ] SSL ativo (automático na Vercel)

### Após Go-Live

- [ ] Health check passando
- [ ] Primeiros 10 usuários testaram
- [ ] Logs sem errors críticos
- [ ] Performance aceitável (< 3s TTFB)
- [ ] Documentação atualizada
- [ ] Equipe notificada
- [ ] Rollback plan testado

---

## 12. Contatos e Suporte

**Documentação Técnica:** [PRD.md](./PRD.md)  
**Repositório:** https://github.com/cursostecno7-boop/cursostecno  

**Suporte Vercel:** https://vercel.com/support  
**Suporte Supabase:** https://supabase.com/support  

---

**Última Atualização:** 05/01/2026  
**Versão do Guia:** 1.0.0  
**Status:** Production-Ready ✅
