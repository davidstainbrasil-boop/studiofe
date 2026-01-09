#!/bin/bash
# =============================================================================
# test-full-pipeline.sh - Teste E2E do Pipeline de Render de Vídeo
# =============================================================================
# Executa o fluxo completo: criar job → processar → gerar MP4
# 
# Uso: ./scripts/test-full-pipeline.sh
# =============================================================================

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 ========================================${NC}"
echo -e "${BLUE}   TESTE E2E - Pipeline de Vídeo MVP${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Configurações
APP_URL="${APP_URL:-http://localhost:3000}"
TEST_USER_ID="${TEST_USER_ID:-00000000-0000-0000-0000-000000000001}"
TEST_PROJECT_ID="${TEST_PROJECT_ID:-test-project-$(date +%s)}"
MAX_WAIT_SECONDS=120
POLL_INTERVAL=5

# -----------------------------------------------------------------------------
# 1. Verificar Pré-requisitos
# -----------------------------------------------------------------------------
echo -e "${YELLOW}📋 Verificando pré-requisitos...${NC}"

# Verificar FFmpeg
if command -v ffmpeg &> /dev/null; then
    echo -e "   ${GREEN}✅ FFmpeg instalado${NC}"
else
    echo -e "   ${RED}❌ FFmpeg não encontrado${NC}"
    exit 1
fi

# Verificar Redis
if redis-cli ping &> /dev/null; then
    echo -e "   ${GREEN}✅ Redis rodando${NC}"
else
    echo -e "   ${YELLOW}⚠️ Redis não está rodando (usando modo mock)${NC}"
fi

# Verificar App
if curl -s "$APP_URL/api/health" > /dev/null 2>&1; then
    echo -e "   ${GREEN}✅ App rodando em $APP_URL${NC}"
else
    echo -e "   ${RED}❌ App não está rodando em $APP_URL${NC}"
    echo -e "   ${YELLOW}   Execute: cd estudio_ia_videos && npm run dev${NC}"
    exit 1
fi

echo ""

# -----------------------------------------------------------------------------
# 2. Criar Job de Renderização
# -----------------------------------------------------------------------------
echo -e "${YELLOW}🎬 Criando job de renderização...${NC}"

PAYLOAD=$(cat <<EOF
{
  "projectId": "$TEST_PROJECT_ID",
  "slides": [
    {
      "id": "slide-1",
      "imageUrl": "",
      "duration": 3,
      "transition": "fade",
      "transitionDuration": 0.5,
      "title": "Slide de Teste 1",
      "content": "Este é o primeiro slide do teste"
    },
    {
      "id": "slide-2",
      "imageUrl": "",
      "duration": 3,
      "transition": "fade",
      "transitionDuration": 0.5,
      "title": "Slide de Teste 2",
      "content": "Este é o segundo slide do teste"
    }
  ],
  "config": {
    "width": 1280,
    "height": 720,
    "fps": 30,
    "quality": "medium",
    "format": "mp4",
    "codec": "h264",
    "test": true
  }
}
EOF
)

RESPONSE=$(curl -s -X POST "$APP_URL/api/render/start" \
  -H "Content-Type: application/json" \
  -H "x-user-id: $TEST_USER_ID" \
  -d "$PAYLOAD")

# Extrair jobId
JOB_ID=$(echo "$RESPONSE" | grep -o '"jobId":"[^"]*"' | cut -d'"' -f4)

if [ -z "$JOB_ID" ]; then
    echo -e "   ${RED}❌ Falha ao criar job${NC}"
    echo -e "   Response: $RESPONSE"
    exit 1
fi

echo -e "   ${GREEN}✅ Job criado: $JOB_ID${NC}"
echo ""

# -----------------------------------------------------------------------------
# 3. Aguardar Processamento
# -----------------------------------------------------------------------------
echo -e "${YELLOW}⏳ Aguardando processamento (max ${MAX_WAIT_SECONDS}s)...${NC}"

START_TIME=$(date +%s)
STATUS="pending"

while [ "$STATUS" != "completed" ] && [ "$STATUS" != "failed" ]; do
    ELAPSED=$(($(date +%s) - START_TIME))
    
    if [ $ELAPSED -gt $MAX_WAIT_SECONDS ]; then
        echo -e "   ${RED}❌ Timeout após ${MAX_WAIT_SECONDS}s${NC}"
        exit 1
    fi
    
    # Verificar status
    STATUS_RESPONSE=$(curl -s "$APP_URL/api/render/status?jobId=$JOB_ID" 2>/dev/null || echo '{"status":"pending"}')
    STATUS=$(echo "$STATUS_RESPONSE" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
    PROGRESS=$(echo "$STATUS_RESPONSE" | grep -o '"progress":[0-9]*' | cut -d':' -f2)
    
    if [ -z "$STATUS" ]; then
        STATUS="pending"
    fi
    
    echo -e "   [${ELAPSED}s] Status: ${BLUE}$STATUS${NC} | Progress: ${PROGRESS:-0}%"
    
    if [ "$STATUS" == "failed" ]; then
        ERROR=$(echo "$STATUS_RESPONSE" | grep -o '"error":"[^"]*"' | cut -d'"' -f4)
        echo -e "   ${RED}❌ Render falhou: $ERROR${NC}"
        exit 1
    fi
    
    if [ "$STATUS" != "completed" ]; then
        sleep $POLL_INTERVAL
    fi
done

echo ""

# -----------------------------------------------------------------------------
# 4. Obter URL do Vídeo
# -----------------------------------------------------------------------------
echo -e "${YELLOW}📥 Obtendo URL do vídeo...${NC}"

FINAL_RESPONSE=$(curl -s "$APP_URL/api/render/status?jobId=$JOB_ID")
VIDEO_URL=$(echo "$FINAL_RESPONSE" | grep -o '"outputUrl":"[^"]*"' | cut -d'"' -f4)

if [ -z "$VIDEO_URL" ]; then
    # Tentar output_url (snake_case)
    VIDEO_URL=$(echo "$FINAL_RESPONSE" | grep -o '"output_url":"[^"]*"' | cut -d'"' -f4)
fi

if [ -z "$VIDEO_URL" ]; then
    echo -e "   ${RED}❌ URL do vídeo não encontrada${NC}"
    echo -e "   Response: $FINAL_RESPONSE"
    exit 1
fi

echo -e "   ${GREEN}✅ URL: $VIDEO_URL${NC}"
echo ""

# -----------------------------------------------------------------------------
# 5. Download e Validação
# -----------------------------------------------------------------------------
echo -e "${YELLOW}🔍 Baixando e validando vídeo...${NC}"

OUTPUT_FILE="/tmp/test-mvp-video-$(date +%s).mp4"

if curl -s -o "$OUTPUT_FILE" "$VIDEO_URL"; then
    echo -e "   ${GREEN}✅ Download concluído: $OUTPUT_FILE${NC}"
else
    echo -e "   ${RED}❌ Falha no download${NC}"
    exit 1
fi

# Verificar tamanho
FILE_SIZE=$(stat -c%s "$OUTPUT_FILE" 2>/dev/null || stat -f%z "$OUTPUT_FILE" 2>/dev/null)
echo -e "   📦 Tamanho: ${FILE_SIZE} bytes"

if [ "$FILE_SIZE" -lt 1000 ]; then
    echo -e "   ${RED}❌ Arquivo muito pequeno (provavelmente corrompido)${NC}"
    exit 1
fi

# Verificar com ffprobe
if command -v ffprobe &> /dev/null; then
    DURATION=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$OUTPUT_FILE" 2>/dev/null)
    CODEC=$(ffprobe -v error -select_streams v:0 -show_entries stream=codec_name -of default=noprint_wrappers=1:nokey=1 "$OUTPUT_FILE" 2>/dev/null)
    
    echo -e "   🎬 Duração: ${DURATION}s"
    echo -e "   🎞️ Codec: $CODEC"
    
    if [ -z "$DURATION" ] || [ "$DURATION" == "N/A" ]; then
        echo -e "   ${RED}❌ Vídeo inválido (sem duração)${NC}"
        exit 1
    fi
fi

echo ""

# -----------------------------------------------------------------------------
# 6. Resultado Final
# -----------------------------------------------------------------------------
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   ✅ TESTE CONCLUÍDO COM SUCESSO!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "   Job ID:    $JOB_ID"
echo -e "   Vídeo:     $OUTPUT_FILE"
echo -e "   URL:       $VIDEO_URL"
echo ""
echo -e "${BLUE}🎉 O pipeline de vídeo está funcionando!${NC}"

exit 0
