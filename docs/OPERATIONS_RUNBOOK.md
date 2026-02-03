# 📖 Operations Runbook - MVP Vídeos TécnicoCursos v7

**Versão:** 2.0.0  
**Última Atualização:** Fevereiro 2026

---

## 📋 Índice

1. [Visão Geral do Sistema](#visão-geral-do-sistema)
2. [Endpoints de Saúde](#endpoints-de-saúde)
3. [Monitoramento](#monitoramento)
4. [Alertas e Respostas](#alertas-e-respostas)
5. [Procedimentos Operacionais](#procedimentos-operacionais)
6. [Deploy e CI/CD](#deploy-e-cicd)
7. [Kubernetes Operations](#kubernetes-operations)
8. [Docker Operations](#docker-operations)
9. [Manutenção Programada](#manutenção-programada)
10. [Recuperação de Desastres](#recuperação-de-desastres)
11. [Troubleshooting](#troubleshooting)
12. [Contatos de Escalação](#contatos-de-escalação)

---

## 🏗️ Visão Geral do Sistema

### Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                      CLOUDFLARE CDN                          │
│                  (DDoS Protection + Cache)                   │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                    NGINX (Reverse Proxy)                     │
│              SSL Termination + Rate Limiting                 │
│                    Port 80/443                               │
└──────────────┬──────────────────────┬───────────────────────┘
               │                      │
               ▼                      ▼
┌──────────────────────┐    ┌────────────────────────┐
│   Next.js App (PM2)  │    │  Collab Server (WS)    │
│      Port 3000       │    │      Port 3001          │
│   ├── API Routes     │    │   Socket.io            │
│   └── SSR Pages      │    │   Real-time Sync       │
└──────────┬───────────┘    └────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────┐
│                     BACKEND SERVICES                          │
├──────────────┬───────────────┬────────────────┬──────────────┤
│   Supabase   │    Redis      │  Render Worker │  External    │
│  (Postgres)  │   (BullMQ)    │   (FFmpeg)     │    APIs      │
│   + Auth     │   + Cache     │   + Remotion   │ ElevenLabs   │
│   + Storage  │               │                │ HeyGen       │
└──────────────┴───────────────┴────────────────┴──────────────┘
```

### Componentes Críticos

| Componente | Descrição | SLA | Port |
|------------|-----------|-----|------|
| Next.js App | Frontend + API | 99.9% | 3000 |
| Collaboration Server | WebSocket real-time | 99.5% | 3001 |
| Supabase | Database + Auth + Storage | 99.95% | - |
| Redis | Job queue + Cache | 99.9% | 6379 |
| Render Worker | Video processing | 95% success | - |
| Nginx | Reverse proxy + SSL | 99.99% | 80/443 |

---

## 🏥 Endpoints de Saúde

### Quick Reference

| Endpoint | Propósito | K8s Probe | Intervalo |
|----------|-----------|-----------|-----------|
| `/api/health` | Status geral | - | 30s |
| `/api/health/live` | Liveness | livenessProbe | 15s |
| `/api/health/ready` | Readiness | readinessProbe | 10s |
| `/api/health/startup` | Startup | startupProbe | 5s |
| `/api/health/detailed` | Full diagnostics | - | 5min |

### Detalhes dos Endpoints

#### `/api/health/live` - Liveness Probe
- **Propósito:** Verificar se o processo está vivo
- **Checks:** Heartbeat interno, uso de memória
- **Ação em falha:** K8s reinicia o pod
- **Timeout:** 5s
- **Threshold:** 3 falhas consecutivas

```bash
curl -sf http://localhost:3000/api/health/live
# Response: {"alive":true,"uptime":3600,"memory":{"used":256,"total":512}}
```

#### `/api/health/ready` - Readiness Probe
- **Propósito:** Verificar se pode receber tráfego
- **Checks:** Database, Redis, serviços externos
- **Ação em falha:** Remove pod do load balancer
- **Timeout:** 5s
- **Threshold:** 3 falhas consecutivas

```bash
curl -sf http://localhost:3000/api/health/ready
# Response: {"ready":true,"checks":{"database":true,"redis":true}}
```

#### `/api/health/startup` - Startup Probe
- **Propósito:** Verificar se inicialização completou
- **Checks:** App inicializado, warm-up completo
- **Ação em falha:** Aguarda mais tempo antes de liveness
- **Timeout:** 5s
- **Max attempts:** 30 (total 2.5 min)

```bash
curl -sf http://localhost:3000/api/health/startup
# Response: {"started":true,"startupDuration":12}
```

---

## 📊 Monitoramento

### Métricas Principais

```bash
# Verificar métricas via CLI
curl -s http://localhost:3000/api/metrics/custom | jq .

# Métricas em formato Prometheus
curl http://localhost:3000/api/metrics/custom?format=prometheus
```

**KPIs Críticos:**

| Métrica | Warning | Critical | Ação |
|---------|---------|----------|------|
| API Latency (p95) | > 300ms | > 1000ms | Investigar queries/cache |
| Error Rate | > 1% | > 5% | Verificar logs |
| Render Queue Depth | > 50 | > 100 | Escalar workers |
| Memory Usage | > 70% | > 90% | Reiniciar/escalar |
| Disk Usage | > 70% | > 90% | Limpar/expandir |
| SSL Expiry | < 30 dias | < 7 dias | Renovar cert |

### Dashboard Rápido

```bash
# Script de status rápido
npm run health

# Exemplo de output:
# ✅ Database: healthy (45ms)
# ✅ Redis: healthy (12ms)
# ✅ Storage: healthy (89ms)
# ✅ FFmpeg: available
# ✅ Collab Server: healthy (3ms)
# 
# Overall Score: 95/100
```

### Prometheus Queries Úteis

```promql
# Taxa de erros por endpoint
sum(rate(http_requests_total{status=~"5.."}[5m])) by (path)
  / sum(rate(http_requests_total[5m])) by (path)

# Latência p95
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, path))

# Jobs na fila
mvp_render_queue_depth

# Memory usage
container_memory_usage_bytes{container="mvp-videos-app"}
```

---

## 🚨 Alertas e Respostas

### P1 - Crítico (Resposta: 15min)

#### 🔴 Sistema Offline
**Sintomas:** Health check falhando, 5xx errors
**Procedimento:**
1. Verificar status dos containers: `docker compose ps`
2. Verificar logs: `docker compose logs --tail=100 app`
3. Reiniciar se necessário: `docker compose restart app`
4. Se persistir, verificar Supabase status
5. Comunicar stakeholders

#### 🔴 Database Inacessível
**Sintomas:** Erro "Connection refused" ou timeout
**Procedimento:**
1. Verificar status Supabase: https://status.supabase.com
2. Testar conexão: `npm run test:supabase`
3. Verificar variáveis de ambiente
4. Se Supabase OK, verificar network/firewall

#### 🔴 Taxa de Erro > 5%
**Sintomas:** Muitos 5xx nos logs
**Procedimento:**
1. Identificar endpoint com mais erros
2. Verificar logs: `grep -i error logs/app.log | tail -50`
3. Verificar recursos (CPU/RAM)
4. Considerar rollback se recente deploy

### P2 - Alto (Resposta: 1h)

#### 🟠 Render Queue Congestionada
**Sintomas:** Jobs pendentes > 100, tempo de espera alto
**Procedimento:**
1. Verificar status do worker: `docker compose logs worker`
2. Verificar Redis: `docker compose exec redis redis-cli INFO`
3. Escalar workers se necessário
4. Identificar jobs problemáticos

#### 🟠 Latência Alta (p95 > 1s)
**Sintomas:** Requests lentos, timeouts
**Procedimento:**
1. Identificar endpoints lentos via métricas
2. Verificar queries no Supabase Dashboard
3. Verificar cache hit rate
4. Considerar otimização ou escala

### P3 - Médio (Resposta: 4h)

#### 🟡 Disk Usage > 80%
**Procedimento:**
1. Identificar consumo: `du -sh /* | sort -h`
2. Limpar logs antigos: `find logs/ -mtime +7 -delete`
3. Limpar arquivos temporários
4. Limpar backups antigos

#### 🟡 Certificado SSL Expirando
**Procedimento:**
1. Verificar data: `./scripts/check-ssl.sh`
2. Renovar: `./scripts/renew-ssl.sh`
3. Reiniciar nginx

---

## 🔧 Procedimentos Operacionais

### Deploy de Nova Versão (Docker)

```bash
# 1. Pre-deploy checks
npm run health
npm run test:ci

# 2. Criar backup
npm run backup:full

# 3. Pull latest code
git pull origin main

# 4. Build nova imagem
docker build -f Dockerfile.production -t mvp-videos:new .

# 5. Deploy (blue-green)
docker tag mvp-videos:latest mvp-videos:previous
docker tag mvp-videos:new mvp-videos:latest

# 6. Rolling update
docker compose up -d --no-deps app

# 7. Verify
sleep 10
curl -sf http://localhost:3000/api/health?full=true

# 8. Se falhar, rollback
docker tag mvp-videos:previous mvp-videos:latest
docker compose up -d --no-deps app
```

### Deploy de Nova Versão (PM2)

```bash
# 1. Pull latest code
cd /opt/mvp-videos && git pull origin main

# 2. Install dependencies
cd estudio_ia_videos && npm ci --production

# 3. Build
npm run build

# 4. Reload (zero-downtime)
pm2 reload ecosystem.config.js --env production

# 5. Verify
pm2 status
curl -sf http://localhost:3000/api/health

# 6. Se falhar, rollback
git checkout HEAD~1
npm run build
pm2 reload ecosystem.config.js --env production
```

### Reiniciar Serviços

```bash
# === Docker ===
# Reiniciar app (graceful)
docker compose restart app

# Reiniciar todos
docker compose down && docker compose up -d

# Force restart
docker compose kill && docker compose up -d

# === PM2 ===
# Reload graceful
pm2 reload all

# Restart hard
pm2 restart all

# Restart específico
pm2 restart mvp-video-app
```

### Escalar Workers

```bash
# === Docker ===
docker compose up -d --scale worker=3

# === Kubernetes ===
kubectl scale deployment mvp-videos-worker -n mvp-videos --replicas=3

# === PM2 (app apenas) ===
pm2 scale mvp-video-app +2
```

### Limpar Job Queue

```bash
# Via Redis CLI
docker compose exec redis redis-cli

# Listar queues
KEYS bull:*

# Ver jobs pendentes
LLEN bull:render-queue:waiting

# Limpar queue (CUIDADO!)
DEL bull:render-queue:waiting
DEL bull:render-queue:active

# Limpar jobs falhos
DEL bull:render-queue:failed
```

---

## 🚀 Deploy e CI/CD

### Workflow do GitHub Actions

```
Push → Lint → TypeCheck → Unit Tests → Security Audit → Build Docker → Deploy
```

### Secrets Necessários

| Secret | Descrição |
|--------|-----------|
| `STAGING_HOST` | IP/hostname do servidor staging |
| `STAGING_USER` | Usuário SSH |
| `STAGING_SSH_KEY` | Chave SSH privada |
| `PRODUCTION_HOST` | IP/hostname do servidor produção |
| `PRODUCTION_USER` | Usuário SSH |
| `PRODUCTION_SSH_KEY` | Chave SSH privada |
| `SUPABASE_URL` | URL do Supabase |
| `SUPABASE_ANON_KEY` | Anon key do Supabase |
| `SLACK_WEBHOOK_URL` | Webhook para notificações |
| `SENTRY_AUTH_TOKEN` | Token do Sentry |
| `CODECOV_TOKEN` | Token do Codecov |

### Deploy Manual

```bash
# Via GitHub Actions (manual trigger)
gh workflow run ci-cd.yml -f environment=production

# Ou via SSH direto
ssh deploy@production-server
cd /opt/mvp-videos
git pull origin main
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d --remove-orphans
```

---

## ☸️ Kubernetes Operations

### Deploy

```bash
# Apply all manifests
kubectl apply -f infrastructure/k8s/

# Verificar status
kubectl get all -n mvp-videos

# Ver logs
kubectl logs -f deployment/mvp-videos-app -n mvp-videos

# Shell no pod
kubectl exec -it deployment/mvp-videos-app -n mvp-videos -- sh
```

### Rollback

```bash
# Ver histórico
kubectl rollout history deployment/mvp-videos-app -n mvp-videos

# Rollback para versão anterior
kubectl rollout undo deployment/mvp-videos-app -n mvp-videos

# Rollback para versão específica
kubectl rollout undo deployment/mvp-videos-app -n mvp-videos --to-revision=2
```

### Scaling

```bash
# Manual scale
kubectl scale deployment mvp-videos-app -n mvp-videos --replicas=5

# Ver HPA status
kubectl get hpa -n mvp-videos
```

### Troubleshooting K8s

```bash
# Pod não inicia
kubectl describe pod <pod-name> -n mvp-videos
kubectl logs <pod-name> -n mvp-videos --previous

# Ver eventos
kubectl get events -n mvp-videos --sort-by='.lastTimestamp'

# Verificar recursos
kubectl top pods -n mvp-videos
kubectl top nodes
```

---

## 🐳 Docker Operations

### Comandos Úteis

```bash
# Status de todos os containers
docker compose ps

# Logs em tempo real
docker compose logs -f app worker

# Logs com timestamp
docker compose logs -t --tail=100

# Entrar no container
docker compose exec app sh

# Estatísticas de recursos
docker stats

# Limpar recursos não usados
docker system prune -af
docker volume prune -f
```

### Backup e Restore

```bash
# Backup de volumes
docker run --rm -v mvp-videos_app-data:/data -v $(pwd)/backup:/backup alpine tar cvf /backup/app-data.tar /data

# Restore de volumes
docker run --rm -v mvp-videos_app-data:/data -v $(pwd)/backup:/backup alpine tar xvf /backup/app-data.tar -C /
```

---

## 🗓️ Manutenção Programada

### Diária
- [ ] Verificar health checks
- [ ] Revisar logs de erro
- [ ] Monitorar queue depth
- [ ] Verificar disk usage

### Semanal
- [ ] Executar backup full
- [ ] Revisar métricas de performance
- [ ] Limpar arquivos temporários
- [ ] Verificar atualizações de segurança
- [ ] Renovar SSL se < 30 dias

### Mensal
- [ ] Rodar load tests
- [ ] Revisar e otimizar queries lentas
- [ ] Atualizar dependências
- [ ] Verificar certificados SSL
- [ ] Testar procedimento de restore
- [ ] Revisar capacidade

### Trimestral
- [ ] Revisar e atualizar runbook
- [ ] Teste de disaster recovery completo
- [ ] Auditoria de segurança
- [ ] Capacity planning
- [ ] Revisão de custos

---

## 🔄 Recuperação de Desastres

### RTO (Recovery Time Objective): 2 horas
### RPO (Recovery Point Objective): 1 hora

### Cenário: Perda Total do Servidor

1. **Provisionar novo servidor**
   ```bash
   # Requisitos: 4 vCPU, 8GB RAM, 100GB SSD
   # Ubuntu 22.04 LTS
   ```

2. **Instalar dependências**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs docker.io docker-compose-plugin nginx certbot
   ```

3. **Restaurar código e config**
   ```bash
   git clone https://github.com/tecnicocursos/mvp-videos.git /opt/mvp-videos
   aws s3 cp s3://backups/env/.env.production /opt/mvp-videos/.env
   ```

4. **Setup SSL**
   ```bash
   cd /opt/mvp-videos
   ./scripts/setup-ssl.sh cursostecno.com.br admin@cursostecno.com.br
   ```

5. **Iniciar serviços**
   ```bash
   docker compose -f docker-compose.prod.yml up -d
   pm2 start ecosystem.config.js --env production
   ```

6. **Validar**
   ```bash
   npm run health
   curl -sf https://cursostecno.com.br/api/health
   ```

### Cenário: Corrupção de Database

1. **Parar aplicação**
   ```bash
   docker compose stop app worker
   ```

2. **Restaurar do Supabase backup**
   - Dashboard → Database → Backups → Point-in-time Recovery

3. **Validar integridade**
   ```bash
   npm run test:migrations
   ```

4. **Reiniciar serviços**
   ```bash
   docker compose start app worker
   ```

---

## 🔍 Troubleshooting

### App não inicia

```bash
# Verificar logs
docker compose logs app --tail=100

# Verificar ambiente
docker compose exec app env | grep -E "SUPABASE|REDIS"

# Verificar build
docker compose exec app ls -la /app/.next
```

### WebSocket não conecta

```bash
# Verificar collab server
curl http://localhost:3001/health

# Verificar nginx upstream
nginx -t
cat /etc/nginx/conf.d/app-routes.conf | grep socket.io

# Logs do collab
pm2 logs mvp-video-collab
```

### Render jobs travados

```bash
# Ver jobs ativos
docker compose exec redis redis-cli LRANGE bull:render-queue:active 0 -1

# Mover para failed
docker compose exec redis redis-cli RPOPLPUSH bull:render-queue:active bull:render-queue:failed

# Reiniciar worker
docker compose restart worker
```

### Memory leak

```bash
# Verificar uso
docker stats --no-stream

# Heap dump (Node.js)
docker compose exec app node --expose-gc -e "global.gc()"

# Reiniciar com limite
docker compose up -d --no-deps app
```

---

## 📞 Contatos de Escalação

### Nível 1 - Operações
- **Horário:** 24/7
- **Canal:** #ops-alerts (Slack)
- **Resposta:** 15min para P1

### Nível 2 - Engenharia
- **Horário:** Business hours + on-call
- **Canal:** #engineering (Slack)
- **Escalação:** Após 30min sem resolução L1

### Nível 3 - Arquitetura
- **Horário:** On-call
- **Escalação:** Incidentes de infraestrutura críticos

### Fornecedores

| Serviço | Suporte | SLA |
|---------|---------|-----|
| Supabase | https://supabase.com/dashboard/support | Pro: 24h |
| Vercel | https://vercel.com/support | Pro: 12h |
| ElevenLabs | https://elevenlabs.io/contact | 48h |
| Cloudflare | https://support.cloudflare.com | Pro: 24h |

---

## 📝 Changelog do Runbook

| Data | Versão | Alteração |
|------|--------|-----------|
| Fev 2026 | 2.0.0 | Kubernetes, PM2 cluster, health probes, CI/CD |
| Dez 2025 | 1.0.0 | Versão inicial |

---

*Este runbook deve ser revisado e atualizado trimestralmente ou após incidentes significativos.*
