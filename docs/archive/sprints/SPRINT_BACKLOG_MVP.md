# 🚀 Sprint Backlog - MVP Funcional (1 Semana)

**Objetivo:** Fazer o sistema gerar um arquivo MP4 funcional de ponta a ponta  
**Tech Lead:** AI  
**Data:** 06 de Janeiro de 2026  
**Duração:** 5 dias úteis

---

## 📊 Diagnóstico Atual

### ✅ O que está funcionando:
- FFmpeg instalado e funcional (`/usr/bin/ffmpeg`)
- Supabase configurado com credenciais válidas
- API `/api/render/start` existe e valida requests
- Pipeline de vídeo implementado (`video-render-pipeline.ts`)
- Worker existe (`scripts/render-worker.js`)
- Frame Generator implementado
- Job Manager funcional (Prisma + Supabase)

### ❌ Bloqueadores Identificados:
1. **Redis NÃO está rodando** → Fila BullMQ opera em modo MOCK
2. **Worker NÃO está executando** → Jobs ficam `pending` eternamente
3. **Sem processo que consome a fila** → Pipeline nunca é acionado
4. **ElevenLabs API Key ausente** → TTS pode falhar
5. **Bucket 'videos' pode não existir** no Supabase Storage

---

## 📋 Sprint Backlog - Tarefas Essenciais

| # | Tarefa | O que fazer no código | Definition of Done (DoD) |
|---|--------|----------------------|--------------------------|
| **1** | **Iniciar Redis** | Executar `docker run -d --name redis -p 6379:6379 redis:7-alpine` ou configurar Upstash | `redis-cli ping` retorna `PONG` |
| **2** | **Configurar REDIS_URL** | No `.env.local`, adicionar `REDIS_URL=redis://localhost:6379` (ou URL Upstash) | Queue não entra em modo MOCK |
| **3** | **Criar Bucket 'videos'** | No Supabase Dashboard → Storage → Criar bucket `videos` (público) | Upload de teste retorna URL pública |
| **4** | **Iniciar Worker de Render** | Terminal separado: `cd scripts && node render-worker.js` | Log mostra "Worker iniciado, aguardando jobs..." |
| **5** | **Criar Projeto de Teste** | Inserir via Supabase: `INSERT INTO projects (id, user_id, name) VALUES (uuid, uuid, 'Test')` | Projeto existe no banco |
| **6** | **Criar Slides de Teste** | Inserir via Supabase: slides com `project_id`, `content`, `duration` | 2+ slides vinculados ao projeto |
| **7** | **Testar Endpoint /api/render/start** | `curl -X POST localhost:3000/api/render/start -H "x-user-id: UUID" -d '{"projectId":"...", "slides":[...]}'` | Resposta `{"success":true, "jobId":"..."}` |
| **8** | **Verificar Job Processing** | Checar tabela `render_jobs` no Supabase | Status muda de `pending` → `processing` → `completed` |
| **9** | **Validar Vídeo Gerado** | Download do `output_url` do job completed | Arquivo `.mp4` abre e reproduz corretamente |
| **10** | **Criar Script de Teste E2E** | `scripts/test-full-pipeline.sh` que executa todo o fluxo | Script retorna exit code 0 e gera MP4 |

---

## 🔧 Detalhamento Técnico

### Tarefa 1: Iniciar Redis
```bash
# Opção A: Docker local
docker run -d --name redis-mvp -p 6379:6379 redis:7-alpine

# Opção B: Usar Upstash (cloud)
# Criar conta em https://upstash.com e copiar REDIS_URL
```

### Tarefa 2: Configurar REDIS_URL
```bash
# estudio_ia_videos/app/.env.local
REDIS_URL=redis://localhost:6379
# OU para Upstash:
# REDIS_URL=rediss://default:TOKEN@HOST.upstash.io:6379
```

### Tarefa 3: Criar Bucket 'videos'
1. Acessar Supabase Dashboard
2. Storage → New Bucket
3. Nome: `videos`
4. Public: ✅ Ativado
5. Salvar

### Tarefa 4: Iniciar Worker
```bash
cd /root/_MVP_Video_TecnicoCursos_v7/scripts
node render-worker.js
```

**O worker faz:**
- Poll na tabela `render_jobs` (status=`pending`)
- Processa cada job com FFmpeg
- Atualiza status e `output_url`
- Dispara webhooks

### Tarefa 5 & 6: Criar Dados de Teste
```sql
-- Executar no Supabase SQL Editor

-- 1. Criar projeto de teste
INSERT INTO projects (id, user_id, name, status, created_at, updated_at)
VALUES (
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  'ffffffff-gggg-hhhh-iiii-jjjjjjjjjjjj', -- seu user_id real
  'Projeto MVP Teste',
  'active',
  NOW(),
  NOW()
);

-- 2. Criar slides
INSERT INTO slides (id, project_id, order_index, title, content, duration, background_color, created_at, updated_at)
VALUES 
  (gen_random_uuid(), 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 0, 'Slide 1', 'Bem-vindo ao teste do MVP', 5, '#1a1a2e', NOW(), NOW()),
  (gen_random_uuid(), 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 1, 'Slide 2', 'Este é o segundo slide de teste', 5, '#16213e', NOW(), NOW()),
  (gen_random_uuid(), 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 2, 'Slide 3', 'Fim da apresentação de teste', 5, '#0f3460', NOW(), NOW());
```

### Tarefa 7: Testar Endpoint
```bash
curl -X POST http://localhost:3000/api/render/start \
  -H "Content-Type: application/json" \
  -H "x-user-id: ffffffff-gggg-hhhh-iiii-jjjjjjjjjjjj" \
  -d '{
    "projectId": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    "slides": [
      {"id": "1", "imageUrl": "", "duration": 5, "transition": "fade", "transitionDuration": 0.5},
      {"id": "2", "imageUrl": "", "duration": 5, "transition": "fade", "transitionDuration": 0.5},
      {"id": "3", "imageUrl": "", "duration": 5, "transition": "fade", "transitionDuration": 0.5}
    ],
    "config": {
      "width": 1280,
      "height": 720,
      "fps": 30,
      "quality": "medium",
      "format": "mp4",
      "codec": "h264"
    }
  }'
```

### Tarefa 8: Monitorar Job
```sql
-- Verificar status do job
SELECT id, status, progress, output_url, error_message, created_at, completed_at
FROM render_jobs
WHERE project_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
ORDER BY created_at DESC
LIMIT 1;
```

### Tarefa 9: Download e Validação
```bash
# Após job completed, pegar output_url e fazer download
wget "URL_DO_VIDEO" -O teste-mvp.mp4

# Verificar se é válido
ffprobe teste-mvp.mp4
```

### Tarefa 10: Script de Teste Completo
```bash
#!/bin/bash
# scripts/test-full-pipeline.sh

set -e

echo "🚀 Iniciando teste E2E do pipeline..."

# 1. Verificar Redis
redis-cli ping || { echo "❌ Redis não está rodando"; exit 1; }

# 2. Verificar FFmpeg
ffmpeg -version > /dev/null || { echo "❌ FFmpeg não encontrado"; exit 1; }

# 3. Iniciar app (se não estiver rodando)
curl -s http://localhost:3000/api/health > /dev/null || { echo "❌ App não está rodando"; exit 1; }

# 4. Criar job de teste
RESPONSE=$(curl -s -X POST http://localhost:3000/api/render/start \
  -H "Content-Type: application/json" \
  -H "x-user-id: test-user-id" \
  -d '{"projectId":"test-project","slides":[{"id":"1","duration":3}],"config":{"test":true}}')

JOB_ID=$(echo $RESPONSE | jq -r '.jobId')
echo "✅ Job criado: $JOB_ID"

# 5. Aguardar conclusão (max 60s)
for i in {1..12}; do
  sleep 5
  STATUS=$(curl -s "http://localhost:3000/api/render/status?jobId=$JOB_ID" | jq -r '.status')
  echo "   Status: $STATUS"
  
  if [ "$STATUS" = "completed" ]; then
    echo "✅ Vídeo gerado com sucesso!"
    exit 0
  elif [ "$STATUS" = "failed" ]; then
    echo "❌ Render falhou"
    exit 1
  fi
done

echo "❌ Timeout aguardando render"
exit 1
```

---

## 📅 Cronograma Sugerido

| Dia | Tarefas | Tempo Est. |
|-----|---------|------------|
| **Seg** | 1, 2, 3 (Infra) | 2-3h |
| **Ter** | 4, 5, 6 (Setup dados) | 2-3h |
| **Qua** | 7, 8 (Testar fluxo) | 3-4h |
| **Qui** | Debug e correções | 4-6h |
| **Sex** | 9, 10 (Validação final) | 2-3h |

---

## ⚠️ Fallbacks se Algo Falhar

### Se ElevenLabs falhar (TTS):
O worker já tem fallback para **EdgeTTS** (gratuito):
```javascript
// render-worker.js linha ~200
// Usa EdgeTTS automaticamente se ElevenLabs falhar
```

### Se HeyGen falhar (Avatar):
O pipeline gera vídeo **sem avatar** (apenas slides com background):
```typescript
// video-render-pipeline.ts linha ~130
// Se não for HeyGen, usa createSlideVideo() simples
```

### Se Redis falhar:
O sistema já tem modo **MOCK**:
```typescript
// render-queue.ts linha ~80
// Retorna mock queue e depende do Worker de Postgres
```

---

## ✅ Checklist Final

- [ ] Redis rodando (`redis-cli ping` = PONG)
- [ ] `REDIS_URL` configurado no `.env.local`
- [ ] Bucket `videos` criado no Supabase Storage
- [ ] Worker `render-worker.js` executando
- [ ] Projeto de teste criado no banco
- [ ] Slides de teste criados
- [ ] `POST /api/render/start` retorna `success: true`
- [ ] Job muda status para `completed`
- [ ] `output_url` contém URL válida
- [ ] Download do MP4 funciona
- [ ] Vídeo reproduz corretamente

---

## 🎯 Definição de MVP Completo

O MVP está **PRONTO** quando:
1. Usuário pode criar projeto via API ou UI
2. Usuário pode adicionar slides
3. Usuário pode iniciar renderização
4. Sistema processa e gera arquivo MP4
5. Usuário pode baixar o vídeo final

**Meta:** Gerar pelo menos 1 vídeo MP4 válido até sexta-feira.

---

*Sprint criado em 06/01/2026 | Tech Lead: AI*
