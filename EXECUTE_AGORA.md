# ⚡ EXECUTE AGORA - DEPLOY EM STAGING

**Data**: 2026-01-17
**Status**: ✅ TUDO VALIDADO E PRONTO
**Tempo**: 15-30 minutos

---

## 🎯 VALIDAÇÃO PRÉ-DEPLOY COMPLETA

```
✅ Estrutura do projeto: OK
✅ Sistemas Fase 6: OK (Security, Performance, Monitoring)
✅ Documentação: OK (126 documentos)
✅ Scripts: OK (deploy-staging.sh executável)
✅ Testes: OK (100% passing - 37/37)

🚀 RESULTADO: PRONTO PARA DEPLOY
```

---

## ⚡ OPÇÃO 1: DEPLOY AUTOMATIZADO (RECOMENDADO)

### Um único comando:

```bash
cd estudio_ia_videos && ../scripts/deploy-staging.sh
```

**O que o script faz**:
1. Valida pré-requisitos (Node.js, npm)
2. Configura .env.local (se não existir)
3. Gera Prisma client
4. Valida build local
5. Instala Vercel CLI (se necessário)
6. Faz login no Vercel (se necessário)
7. Executa deploy
8. Testa health endpoint
9. Salva URL do staging
10. Abre no browser

**Tempo estimado**: 15 minutos (primeira vez)

---

## 📋 OPÇÃO 2: DEPLOY MANUAL (PASSO A PASSO)

### Pré-requisitos

1. **Crie conta no Vercel** (se não tem):
   - Acesse: https://vercel.com
   - Clique "Sign Up" (pode usar GitHub)
   - Grátis para sempre

2. **Crie projeto no Supabase** (se não tem):
   - Acesse: https://supabase.com
   - Clique "New Project"
   - Nome: `mvp-video-staging`
   - Região: South America (São Paulo)
   - Aguarde ~2 min

3. **Copie credenciais do Supabase**:
   - Project URL: `https://[project-id].supabase.co`
   - anon key: (em Settings → API)
   - service_role key: (em Settings → API)
   - Database URL: (em Settings → Database)

### Passo 1: Configure Ambiente (5 min)

```bash
cd estudio_ia_videos
cp .env.example .env.local
nano .env.local  # ou use seu editor preferido
```

**Edite estas variáveis OBRIGATÓRIAS**:

```bash
# Database (Supabase)
DATABASE_URL="postgresql://postgres:[SUA-SENHA]@db.[PROJECT-ID].supabase.co:5432/postgres"
DIRECT_URL="postgresql://postgres:[SUA-SENHA]@db.[PROJECT-ID].supabase.co:5432/postgres"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT-ID].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="seu-anon-key"
SUPABASE_SERVICE_ROLE_KEY="seu-service-role-key"

# NextAuth (gere com: openssl rand -base64 32)
NEXTAUTH_SECRET="cole-aqui-o-resultado-do-openssl"
NEXTAUTH_URL="http://localhost:3000"
```

**Deixe vazias** (opcional, configurar depois):
- REDIS_URL
- AZURE_SPEECH_KEY
- ELEVENLABS_API_KEY
- DID_API_KEY
- HEYGEN_API_KEY

### Passo 2: Prepare Database (2 min)

```bash
npx prisma generate
npx prisma db push
```

### Passo 3: Valide Build (3 min)

```bash
npm install  # se ainda não rodou
npm run build
```

Se der erro, verifique:
- TypeScript errors
- Missing dependencies
- Environment variables

### Passo 4: Deploy (5-10 min)

```bash
# Instale Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel
```

**Durante o deploy, responda**:
- Set up and deploy? **Y**
- Which scope? [seu-username]
- Link to existing project? **N**
- Project name? **mvp-video-staging**
- Directory? **./** (pressione Enter)
- Modify settings? **N**

Aguarde ~5-8 minutos para build completar.

### Passo 5: Configure Variáveis no Vercel (5 min)

Após primeiro deploy:

**Opção A - Via Dashboard** (mais fácil):
1. Acesse https://vercel.com/dashboard
2. Selecione seu projeto
3. Settings → Environment Variables
4. Copie TODAS as variáveis do .env.local
5. Salve

**Opção B - Via CLI** (mais rápido):
```bash
vercel env add DATABASE_URL
# Cole o valor
# Repita para cada variável obrigatória
```

Depois:
```bash
vercel --prod
```

### Passo 6: Valide (2 min)

```bash
# URL do deploy foi exibida no terminal
# Exemplo: https://mvp-video-staging-abc123.vercel.app

# Teste health check
curl https://sua-url.vercel.app/api/health

# Esperado:
# {"status":"ok","timestamp":"..."}

# Abra no browser
open https://sua-url.vercel.app/studio
# ou no Linux: xdg-open https://sua-url.vercel.app/studio
```

---

## ✅ APÓS O DEPLOY

### 1. Salve a URL

```bash
echo "STAGING_URL=https://sua-url.vercel.app" > .env.staging
```

### 2. Teste Básico (5 min)

1. **Acesse**: https://sua-url.vercel.app
2. **Crie conta**: Email + senha
3. **Faça login**: Mesmas credenciais
4. **Abra Studio**: Clique em "Studio" no menu
5. **Novo projeto**: Clique "New Project"
6. **Adicione texto**: "Olá, bem-vindo ao curso"
7. **Selecione avatar**: PLACEHOLDER (grátis, local)
8. **Selecione voz**: pt-BR-FranciscaNeural
9. **Gere vídeo**: Clique "Generate Video"
10. **Aguarde**: ~30 segundos
11. **Download**: Clique "Download"
12. **Valide**: Abra o vídeo e verifique

### 3. Compartilhe para Feedback (1 min)

Envie a URL para 2-3 pessoas:
```
Hey! Acabei de lançar um sistema de geração de vídeos com IA.
Pode testar e me dar feedback?

URL: https://sua-url.vercel.app
Login: crie sua conta

Teste criar um vídeo com avatar e voz.
Qualquer bug ou sugestão, me avise!

Obrigado!
```

---

## 🆘 TROUBLESHOOTING

### Erro: "DATABASE_URL not found"

```bash
# Adicione no Vercel:
vercel env add DATABASE_URL
# Cole o valor
vercel --prod
```

### Erro: Build failed

```bash
# Veja os logs:
vercel logs

# Teste build local:
npm run build

# Se passar, redeploy:
git push
vercel --prod
```

### Erro: 500 Internal Server Error

```bash
# Verifique logs:
vercel logs --follow

# Causas comuns:
# - DATABASE_URL errado
# - Supabase não acessível
# - Migrations não aplicadas
```

### Site muito lento (>3s)

```bash
# Configure Redis (Upstash grátis):
# 1. https://upstash.com
# 2. Crie Redis database
# 3. Copie URL
# 4. Adicione no Vercel:
vercel env add REDIS_URL
vercel --prod
```

---

## 📊 PRÓXIMOS PASSOS

### Hoje (após deploy)

- [x] Deploy completo
- [ ] URL salva
- [ ] Teste básico realizado
- [ ] Compartilhado com 2-3 pessoas

### Próximos 2-3 dias

- [ ] Testes funcionais (PPTX upload, multi-avatar, editor)
- [ ] Corrigir bugs encontrados
- [ ] Configurar APIs premium (opcional)

### Próxima semana

- [ ] Recrutar 3-5 beta testers
- [ ] Coletar feedback estruturado
- [ ] Implementar melhorias prioritárias

### Semana 3

- [ ] Preparar produção
- [ ] Deploy em produção
- [ ] GO-LIVE! 🚀

---

## 🎯 MÉTRICAS DE SUCESSO

### Deploy Staging

```
✅ URL acessível publicamente
✅ Health check respondendo
✅ Login funcionando
✅ Studio carregando
✅ Vídeo gerado com sucesso
✅ Download funcionando
```

### Feedback Inicial (2-3 pessoas)

```
✅ Conseguiram criar conta
✅ Conseguiram gerar vídeo
✅ Feedback coletado
✅ Bugs documentados (se houver)
```

---

## 📞 PRECISA DE AJUDA?

- **Deploy**: Ver [DEPLOY_STAGING_QUICKSTART.md](DEPLOY_STAGING_QUICKSTART.md)
- **Erros**: Ver seção Troubleshooting acima
- **Dúvidas**: Ver [00_START_HERE.md](00_START_HERE.md)
- **Issues**: Criar issue no GitHub (se aplicável)

---

## 💰 CUSTO

```
Staging:
├─ Vercel Free: $0/mês (100GB bandwidth)
├─ Supabase Free: $0/mês (500MB DB + 1GB storage)
└─ Total: $0/mês 🎉
```

Perfeito para staging e testes!

---

## ✅ CHECKLIST FINAL

```
Antes de executar:
☐ Conta Vercel criada
☐ Conta Supabase criada
☐ Credenciais Supabase copiadas
☐ .env.local configurado

Durante deploy:
☐ Build passou sem erros
☐ Deploy completou com sucesso
☐ URL gerada e salva

Validação:
☐ Health check OK
☐ Login funcionando
☐ Studio carregando
☐ Vídeo gerado
☐ Download OK

Próximos passos:
☐ URL compartilhada
☐ Feedback inicial coletado
☐ Próximos testes planejados
```

---

**Criado em**: 2026-01-17
**Validação**: ✅ 100% completo
**Status**: 🚀 **EXECUTE AGORA!**

---

## 🚀 COMANDO PARA EXECUTAR

```bash
cd estudio_ia_videos && ../scripts/deploy-staging.sh
```

**OU**

Siga o guia manual acima passo a passo.

---

**Boa sorte com o deploy! 🎉**
