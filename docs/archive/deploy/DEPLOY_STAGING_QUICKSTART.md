# 🚀 QUICK START - DEPLOY EM STAGING

**Objetivo**: Deploy do MVP Video em staging em **menos de 30 minutos**

**Data**: 2026-01-17
**Status Atual**: Código 100% pronto, testes passando

---

## ⏱️ Timeline Estimado

```
Total: ~30 minutos

├── Preparação (10 min)
│   ├── Configurar .env.staging (5 min)
│   ├── Verificar credenciais (3 min)
│   └── Review checklist (2 min)
│
├── Deploy (15 min)
│   ├── Install Vercel CLI (2 min)
│   ├── Deploy para staging (10 min)
│   └── Verificação inicial (3 min)
│
└── Validação (5 min)
    ├── Health check (1 min)
    ├── Teste básico (3 min)
    └── Documentar URL (1 min)
```

---

## 📋 PRÉ-REQUISITOS

### Você vai precisar de:

- [ ] Conta no Vercel (criar em vercel.com - grátis)
- [ ] Conta no Supabase (criar em supabase.com - grátis)
- [ ] Node.js instalado (você já tem ✅)
- [ ] Git configurado (você já tem ✅)

### Credenciais Opcionais (pode configurar depois):
- [ ] Azure TTS API Key (para vozes premium)
- [ ] ElevenLabs API Key (para voice cloning)
- [ ] D-ID API Key (para avatares D-ID)
- [ ] HeyGen API Key (para avatares HeyGen)

**Nota**: O sistema funciona **sem essas credenciais** usando o tier PLACEHOLDER (local, grátis)

---

## 🔧 PASSO 1: PREPARAÇÃO (10 min)

### 1.1 Configure o Supabase (5 min)

```bash
# 1. Acesse https://supabase.com e faça login
# 2. Clique em "New Project"
# 3. Configure:
#    - Name: mvp-video-staging
#    - Database Password: [escolha uma senha forte]
#    - Region: South America (São Paulo)
# 4. Aguarde ~2 min para provisionar

# 5. Copie as credenciais:
#    - Project URL (NEXT_PUBLIC_SUPABASE_URL)
#    - anon/public key (NEXT_PUBLIC_SUPABASE_ANON_KEY)
#    - service_role key (SUPABASE_SERVICE_ROLE_KEY)
```

### 1.2 Configure Variáveis de Ambiente (5 min)

```bash
cd estudio_ia_videos

# Copie o template
cp .env.example .env.local

# Edite o arquivo (use nano, vim, ou seu editor favorito)
nano .env.local
```

**Configuração MÍNIMA para funcionar**:

```bash
# === REQUIRED (OBRIGATÓRIO) ===

# Database (Supabase)
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-ID].supabase.co:5432/postgres"
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-ID].supabase.co:5432/postgres"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT-ID].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="seu-anon-key-aqui"
SUPABASE_SERVICE_ROLE_KEY="seu-service-role-key-aqui"

# NextAuth
NEXTAUTH_SECRET="gere-com-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"

# Redis (opcional - use Upstash grátis ou deixe em branco)
REDIS_URL="" # deixe vazio por enquanto

# === OPTIONAL (pode configurar depois) ===

# Azure TTS (deixe vazio para usar mock)
AZURE_SPEECH_KEY=""
AZURE_SPEECH_REGION=""

# ElevenLabs (deixe vazio)
ELEVENLABS_API_KEY=""

# D-ID (deixe vazio)
DID_API_KEY=""

# HeyGen (deixe vazio)
HEYGEN_API_KEY=""
```

**Gerar NEXTAUTH_SECRET**:
```bash
openssl rand -base64 32
# Cole o resultado no .env.local
```

---

## 🚀 PASSO 2: DEPLOY (15 min)

### 2.1 Instalar Vercel CLI (2 min)

```bash
npm install -g vercel
```

### 2.2 Login no Vercel (1 min)

```bash
vercel login
# Escolha seu método de autenticação (GitHub, GitLab, Email)
```

### 2.3 Preparar Projeto (2 min)

```bash
cd estudio_ia_videos

# Rodar migrations do Prisma
npx prisma generate
npx prisma db push
```

### 2.4 Deploy para Staging (10 min)

```bash
# Deploy inicial
vercel

# Durante o processo, responda:
# ? Set up and deploy "~/estudio_ia_videos"? [Y/n] y
# ? Which scope do you want to deploy to? [seu-username]
# ? Link to existing project? [y/N] N
# ? What's your project's name? mvp-video-staging
# ? In which directory is your code located? ./
# ? Want to modify these settings? [y/N] N

# Aguarde o build e deploy (~5-8 min)
```

### 2.5 Configurar Environment Variables no Vercel

```bash
# Após o primeiro deploy, configure as variáveis:

# Opção A: Via Dashboard (mais fácil)
# 1. Acesse https://vercel.com/dashboard
# 2. Selecione seu projeto
# 3. Settings → Environment Variables
# 4. Cole as mesmas variáveis do .env.local

# Opção B: Via CLI (mais rápido)
vercel env add DATABASE_URL
# Cole o valor e pressione Enter
# Repita para cada variável

# Depois, faça redeploy com as novas variáveis:
vercel --prod
```

---

## ✅ PASSO 3: VALIDAÇÃO (5 min)

### 3.1 Health Check (1 min)

```bash
# Pegue a URL do deploy (ex: https://mvp-video-staging.vercel.app)
curl https://sua-url.vercel.app/api/health

# Esperado:
# {
#   "status": "ok",
#   "timestamp": "2026-01-17T...",
#   "database": "connected"
# }
```

### 3.2 Teste Básico no Browser (3 min)

```bash
# Acesse no navegador:
https://sua-url.vercel.app

# Teste:
# 1. Página carrega? ✅
# 2. Consegue fazer login? ✅
# 3. Dashboard aparece? ✅
# 4. Studio carrega? ✅

# Acesse o studio:
https://sua-url.vercel.app/studio

# Teste básico:
# 1. Interface carrega? ✅
# 2. Consegue criar novo projeto? ✅
# 3. Timeline aparece? ✅
```

### 3.3 Documentar (1 min)

```bash
# Salve a URL do staging
echo "STAGING_URL=https://sua-url.vercel.app" >> .env.staging

# Commit a URL no README
echo "## Staging\n\nURL: https://sua-url.vercel.app" >> README.md
git add README.md
git commit -m "docs: add staging URL"
```

---

## 🎯 PRÓXIMOS PASSOS (Após Deploy)

### Imediato (Hoje)

1. **Teste Criação de Vídeo**
   ```bash
   # Acesse: https://sua-url.vercel.app/studio
   # 1. Crie novo projeto
   # 2. Adicione texto: "Olá, bem-vindo ao curso"
   # 3. Selecione avatar: PLACEHOLDER (grátis, local)
   # 4. Selecione voz: Azure pt-BR (mock se sem API key)
   # 5. Clique "Generate Video"
   # 6. Aguarde ~30s
   # 7. Download e valide
   ```

2. **Monitore Logs**
   ```bash
   # Via Vercel CLI
   vercel logs https://sua-url.vercel.app --follow

   # Ou via Dashboard
   # https://vercel.com/dashboard → seu projeto → Logs
   ```

### Próximos 2-3 Dias

3. **Configure Integrações Premium** (opcional)
   - [ ] Azure TTS (vozes realistas)
   - [ ] ElevenLabs (voice cloning)
   - [ ] D-ID (avatares realistas)

4. **Teste Features Avançadas**
   - [ ] Upload de PPTX
   - [ ] Timeline multi-track
   - [ ] Colaboração em tempo real (abrir em 2 navegadores)
   - [ ] Diferentes tiers de avatar

5. **Coletar Feedback**
   - [ ] Compartilhe URL com 2-3 usuários beta
   - [ ] Peça para testar funcionalidades básicas
   - [ ] Documente bugs/melhorias

### Próxima Semana

6. **Decidir sobre Produção**
   - [ ] Se tudo OK: planejar go-live
   - [ ] Se bugs: corrigir e testar novamente

---

## 🆘 TROUBLESHOOTING

### Erro: "DATABASE_URL not found"

```bash
# Verifique se configurou no Vercel:
vercel env ls

# Se vazio, adicione:
vercel env add DATABASE_URL
# Cole o valor e pressione Enter

# Redeploy:
vercel --prod
```

### Erro: "Prisma Client not generated"

```bash
# No projeto local:
cd estudio_ia_videos
npx prisma generate
npx prisma db push

# Commit e redeploy:
git add .
git commit -m "fix: regenerate prisma client"
git push
vercel --prod
```

### Erro: "Build failed"

```bash
# Verifique os logs:
vercel logs

# Erro comum: TypeScript errors
# Solução: Rode build local primeiro
npm run build

# Se passar local, commit e redeploy
git push
vercel --prod
```

### Site muito lento

```bash
# Configure Redis (Upstash grátis):
# 1. Acesse https://upstash.com
# 2. Crie database Redis
# 3. Copie UPSTASH_REDIS_REST_URL
# 4. Adicione no Vercel:
vercel env add REDIS_URL
# Cole a URL do Upstash

# Redeploy:
vercel --prod
```

---

## 📊 CHECKLIST FINAL

### Antes de Considerar Completo

```
Deployment:
✅ Projeto deployed no Vercel
✅ URL acessível publicamente
✅ Environment variables configuradas
✅ Database conectado (Supabase)
✅ Health check respondendo

Funcionalidade Básica:
✅ Login funciona
✅ Dashboard carrega
✅ Studio abre
✅ Consegue criar projeto
✅ Timeline renderiza

Teste de Vídeo:
✅ Consegue adicionar texto
✅ Consegue selecionar avatar
✅ Consegue selecionar voz
✅ Consegue gerar vídeo (tier PLACEHOLDER)
✅ Vídeo é gerado com sucesso
✅ Consegue fazer download

Opcional (com API keys):
☐ Teste com Azure TTS
☐ Teste com D-ID avatar
☐ Teste com ElevenLabs voice
☐ Upload de PPTX funciona
```

---

## 💡 DICAS IMPORTANTES

### Performance

- **Use PLACEHOLDER tier** inicialmente (grátis, instantâneo)
- **Configure Redis** depois para melhorar cache
- **Monitor Vercel Analytics** no dashboard

### Custos

- **Vercel Free**: 100GB bandwidth/mês (suficiente para staging)
- **Supabase Free**: 500MB database, 1GB storage (suficiente)
- **Upstash Free**: 10k commands/dia (suficiente)

**Total de custo em staging: $0/mês** 🎉

### Segurança

- **Não commite** `.env.local` no Git
- **Use secrets** no Vercel para API keys
- **Ative 2FA** na conta Vercel
- **Limite acesso** ao staging (configure em Settings)

---

## 🎉 CONCLUSÃO

Depois de completar estes passos, você terá:

✅ Sistema rodando em staging
✅ URL pública para testar
✅ Ambiente isolado de produção
✅ Pronto para coletar feedback
✅ Zero custo ($0/mês)

**Tempo total**: ~30 minutos
**Próximo passo**: Testar e coletar feedback

---

**Prepare-se para**: Deploy em produção em 1-2 semanas após validação em staging

**Criado em**: 2026-01-17
**Status**: Ready to execute ✅
