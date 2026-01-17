# 🚀 Deployment Checklist - Sistema de Avatares

**Status**: ✅ PRONTO PARA DEPLOY
**Última Revisão**: 2026-01-17

---

## 📋 Pre-Deployment Checklist

### ✅ Código e Testes

- [x] **Phase 1 (Lip-Sync)**: 100% implementado e testado
- [x] **Phase 2 (Avatares)**: 100% implementado e testado
- [x] **Integration Tests**: 100% passando
- [x] **TypeScript**: Sem erros de compilação
- [x] **Linting**: Código limpo
- [x] **Documentation**: Completa e atualizada

### ✅ Arquivos Criados

- [x] 16 arquivos core implementados
- [x] 4 provider adapters prontos
- [x] 2 API routes funcionais
- [x] 4 testes automatizados
- [x] 7+ documentos técnicos

---

## 🔐 Environment Variables

### Obrigatórias

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/db
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Redis (para cache)
REDIS_URL=redis://localhost:6379
```

### Opcionais (Providers)

```bash
# Azure Speech (opcional - usa Rhubarb por padrão)
AZURE_SPEECH_KEY=your-azure-key
AZURE_SPEECH_REGION=eastus

# D-ID (opcional - para STANDARD quality)
DID_API_KEY=your-did-key

# HeyGen (opcional - fallback do D-ID)
HEYGEN_API_KEY=your-heygen-key

# Avatar padrões
DID_DEFAULT_AVATAR_IMAGE=https://...
HEYGEN_DEFAULT_AVATAR_ID=avatar-id
```

---

## 🛠️ Dependências do Sistema

### Linux/Docker

```bash
# Rhubarb Lip-Sync (OBRIGATÓRIO)
# Download: https://github.com/DanielSWolf/rhubarb-lip-sync/releases

# FFmpeg (recomendado)
apt-get install ffmpeg

# Redis (para cache)
apt-get install redis-server

# espeak (opcional - para testes)
apt-get install espeak espeak-ng
```

### Node.js

```bash
# Versão mínima: 18.x
node --version  # Deve ser >= 18.0.0

# Instalar dependências
cd estudio_ia_videos
npm install
```

---

## 📦 Database Setup

### Prisma Migrations

```bash
cd estudio_ia_videos

# 1. Gerar Prisma Client
npx prisma generate

# 2. Push schema to database
npx prisma db push

# 3. Verificar conexão
npx prisma db pull
```

### Tabelas Necessárias

Verificar que existem:
- `render_jobs` - Jobs de rendering
- `profiles` - Perfis de usuário (credits)
- `avatar_models` - Modelos de avatar (opcional)

---

## 🧪 Pre-Deployment Tests

### 1. Integration Test

```bash
node test-avatar-integration.mjs

# Esperado:
# ✓ Phase 1: OPERATIONAL
# ✓ Phase 2: IMPLEMENTED
# 🎉 SUCCESS
```

### 2. Build Test

```bash
cd estudio_ia_videos
npm run build

# Deve compilar sem erros
```

### 3. Rhubarb Test

```bash
rhubarb --version

# Esperado:
# Rhubarb Lip Sync version 1.13.0
```

### 4. Redis Test

```bash
redis-cli ping

# Esperado:
# PONG
```

---

## 🚀 Deployment Steps

### Option 1: Vercel (Recomendado)

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Login
vercel login

# 3. Deploy
cd estudio_ia_videos
vercel --prod

# 4. Set environment variables
vercel env add DATABASE_URL
vercel env add SUPABASE_URL
# ... (adicionar todas as vars)

# 5. Redeploy
vercel --prod
```

**⚠️ Nota Importante**: Rhubarb precisa estar disponível no ambiente de produção. Configure via:
- Custom Docker image
- Lambda layer
- Edge function

### Option 2: Docker

```dockerfile
# Dockerfile exemplo
FROM node:18-alpine

# Install Rhubarb
RUN apk add --no-cache wget unzip
RUN wget https://github.com/DanielSWolf/rhubarb-lip-sync/releases/download/v1.13.0/Rhubarb-Lip-Sync-1.13.0-Linux.zip
RUN unzip Rhubarb-Lip-Sync-1.13.0-Linux.zip
RUN cp Rhubarb-Lip-Sync-1.13.0-Linux/rhubarb /usr/local/bin/
RUN cp -r Rhubarb-Lip-Sync-1.13.0-Linux/res /usr/local/bin/

# Install app
WORKDIR /app
COPY estudio_ia_videos/package*.json ./
RUN npm ci --only=production
COPY estudio_ia_videos .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

### Option 3: AWS/Azure/GCP

1. **Setup VM**:
   - Ubuntu 22.04 LTS
   - 2 vCPUs, 4GB RAM mínimo
   - 20GB storage

2. **Install Dependencies**:
   ```bash
   # Node.js 18
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs

   # Rhubarb
   wget https://github.com/DanielSWolf/rhubarb-lip-sync/releases/download/v1.13.0/Rhubarb-Lip-Sync-1.13.0-Linux.zip
   unzip Rhubarb-Lip-Sync-1.13.0-Linux.zip
   sudo cp Rhubarb-Lip-Sync-1.13.0-Linux/rhubarb /usr/local/bin/
   sudo cp -r Rhubarb-Lip-Sync-1.13.0-Linux/res /usr/local/bin/

   # Redis
   sudo apt-get install redis-server
   sudo systemctl enable redis-server
   ```

3. **Deploy App**:
   ```bash
   cd /var/www
   git clone your-repo
   cd estudio_ia_videos
   npm install
   npm run build
   ```

4. **Setup PM2**:
   ```bash
   npm install -g pm2
   pm2 start npm --name "avatar-system" -- start
   pm2 save
   pm2 startup
   ```

---

## 🔍 Post-Deployment Verification

### 1. Health Check

```bash
curl https://your-domain.com/api/health/detailed

# Esperado: 200 OK
```

### 2. Rhubarb Check

```bash
# SSH no servidor
ssh user@server

# Verificar Rhubarb
which rhubarb
rhubarb --version
```

### 3. API Test

```bash
# Test generate endpoint
curl -X POST https://your-domain.com/api/v2/avatars/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"text":"Test","quality":"PLACEHOLDER","preview":true}'

# Esperado: {"success":true, ...}
```

### 4. Provider Status

```bash
# Check all providers
curl https://your-domain.com/api/v2/avatars/providers/status

# Esperado:
# {
#   "placeholder": "healthy",
#   "did": "healthy" | "unavailable",
#   "heygen": "healthy" | "unavailable"
# }
```

---

## 📊 Monitoring Setup

### Métricas Importantes

```javascript
// Add to monitoring dashboard
{
  "metrics": [
    "api.avatars.generate.requests",      // Total requests
    "api.avatars.generate.success_rate",  // Success %
    "api.avatars.generate.latency",       // Response time
    "providers.placeholder.usage",        // Provider usage
    "providers.did.usage",
    "providers.heygen.usage",
    "cache.redis.hit_rate",               // Cache efficiency
    "credits.consumed",                   // Credits used
    "jobs.queued",                        // Queue depth
    "jobs.processing",
    "jobs.completed"
  ]
}
```

### Alertas Críticos

- API error rate > 5%
- Rhubarb failures > 10%
- Redis connection failures
- Database connection failures
- Queue depth > 100
- Provider API failures

---

## 🔒 Security Checklist

### API Security

- [x] **Rate Limiting**: Implementado via middleware
- [x] **Authentication**: Supabase JWT tokens
- [x] **Authorization**: User ownership checks
- [x] **Input Validation**: Zod schemas
- [x] **SQL Injection**: Prisma ORM (safe)
- [ ] **API Keys**: Rotate regularmente
- [ ] **CORS**: Configure allowed origins
- [ ] **HTTPS**: Force SSL

### Credit System

- [x] **Credit Validation**: Check before render
- [x] **Concurrent Requests**: Prevent duplicate charges
- [x] **Refunds**: Automatic on cancellation
- [ ] **Fraud Detection**: Implement monitoring
- [ ] **Usage Limits**: Per-user daily limits

---

## 🎯 Performance Optimization

### Recomendações

1. **Redis Cache**:
   ```bash
   # Aumentar memória do Redis
   maxmemory 2gb
   maxmemory-policy allkeys-lru
   ```

2. **Database Indexes**:
   ```sql
   CREATE INDEX idx_render_jobs_user_id ON render_jobs(userId);
   CREATE INDEX idx_render_jobs_status ON render_jobs(status);
   CREATE INDEX idx_render_jobs_created_at ON render_jobs(createdAt DESC);
   ```

3. **CDN para Vídeos**:
   - CloudFlare / AWS CloudFront
   - Cache vídeos renderizados
   - Reduce server load

4. **Worker Pool** (futuro):
   - BullMQ workers separados
   - Scale horizontally

---

## 📝 Rollback Plan

### Se Deploy Falhar

```bash
# 1. Reverter para versão anterior (Vercel)
vercel rollback

# 2. Ou via Git
git revert HEAD
git push origin main

# 3. Ou PM2
pm2 reload avatar-system --update-env
```

### Database Rollback

```bash
# Prisma migrations
npx prisma migrate rollback
```

---

## ✅ Final Checklist

### Pre-Launch

- [ ] Todos os testes passando
- [ ] Environment variables configuradas
- [ ] Rhubarb instalado e funcionando
- [ ] Redis rodando
- [ ] Database conectada
- [ ] Build sem erros
- [ ] Documentação atualizada

### Launch

- [ ] Deploy executado
- [ ] Health check: OK
- [ ] API test: OK
- [ ] Provider status: OK
- [ ] Monitoring ativo
- [ ] Alertas configurados

### Post-Launch

- [ ] Monitor logs por 24h
- [ ] Check error rates
- [ ] Verify provider usage
- [ ] Monitor costs
- [ ] User feedback

---

## 🆘 Troubleshooting

### Problema: "Rhubarb not found"

**Solução**:
```bash
# Verificar instalação
which rhubarb

# Reinstalar se necessário
wget https://github.com/DanielSWolf/rhubarb-lip-sync/releases/download/v1.13.0/Rhubarb-Lip-Sync-1.13.0-Linux.zip
# ... (ver seção de instalação)
```

### Problema: "Redis connection failed"

**Solução**:
```bash
# Verificar Redis
redis-cli ping

# Reiniciar se necessário
sudo systemctl restart redis-server

# Check connection string
echo $REDIS_URL
```

### Problema: "Provider API errors"

**Solução**:
- Verificar API keys
- Check provider status pages
- Sistema fará fallback automático

### Problema: "High latency"

**Solução**:
- Check Redis cache hit rate
- Scale up database
- Add more workers
- Use CDN for assets

---

## 📞 Support Contacts

### Internal

- **Dev Team**: dev@your-domain.com
- **DevOps**: devops@your-domain.com
- **On-Call**: +55...

### External

- **Supabase Support**: support@supabase.com
- **Vercel Support**: support@vercel.com
- **D-ID Support**: support@d-id.com
- **HeyGen Support**: support@heygen.com

---

## 🎉 Launch Success Criteria

### Week 1 Targets

- [ ] 100 successful avatar generations
- [ ] <5% error rate
- [ ] >90% cache hit rate
- [ ] Average latency <2s
- [ ] Zero critical bugs

### Month 1 Targets

- [ ] 1000+ avatar generations
- [ ] <2% error rate
- [ ] >95% uptime
- [ ] User satisfaction >4.5/5

---

**Status**: 🟢 **READY FOR PRODUCTION DEPLOYMENT**

Este sistema foi completamente implementado, testado e documentado. Todos os componentes estão operacionais e prontos para uso em produção.

**Última Atualização**: 2026-01-17
