#!/bin/bash

# Script de Início Rápido - MVP Video TécnicoCursos v7
# ======================================================

set -e

echo "🚀 MVP Video TécnicoCursos v7 - Início Rápido"
echo "=============================================="
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para verificar se um comando existe
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Função para verificar status de serviço
check_service() {
    local service_name=$1
    local check_command=$2
    
    echo -n "Verificando $service_name... "
    if eval "$check_command" >/dev/null 2>&1; then
        echo -e "${GREEN}✓${NC}"
        return 0
    else
        echo -e "${RED}✗${NC}"
        return 1
    fi
}

echo "📋 Verificando pré-requisitos..."
echo ""

# Verificar Node.js
if check_service "Node.js" "node --version"; then
    NODE_VERSION=$(node --version)
    echo "   Versão: $NODE_VERSION"
else
    echo -e "${RED}❌ Node.js não encontrado!${NC}"
    exit 1
fi

# Verificar npm
if check_service "npm" "npm --version"; then
    NPM_VERSION=$(npm --version)
    echo "   Versão: $NPM_VERSION"
else
    echo -e "${RED}❌ npm não encontrado!${NC}"
    exit 1
fi

# Verificar Docker
if check_service "Docker" "docker --version"; then
    DOCKER_VERSION=$(docker --version)
    echo "   $DOCKER_VERSION"
else
    echo -e "${YELLOW}⚠️  Docker não encontrado (opcional)${NC}"
fi

# Verificar FFmpeg
if check_service "FFmpeg" "ffmpeg -version"; then
    FFMPEG_VERSION=$(ffmpeg -version | head -n1)
    echo "   $FFMPEG_VERSION"
else
    echo -e "${YELLOW}⚠️  FFmpeg não encontrado (necessário para renderização)${NC}"
fi

echo ""
echo "🐳 Verificando serviços Docker..."
echo ""

# Verificar Redis
if docker ps | grep -q redis; then
    echo -e "${GREEN}✓${NC} Redis está rodando"
    REDIS_CONTAINER=$(docker ps | grep redis | awk '{print $NF}')
    echo "   Container: $REDIS_CONTAINER"
else
    echo -e "${YELLOW}⚠️  Redis não está rodando${NC}"
    echo -n "   Deseja iniciar o Redis agora? (s/N): "
    read -r response
    if [[ "$response" =~ ^([sS][iI]?[mM]?|[yY][eE]?[sS]?)$ ]]; then
        echo "   Iniciando Redis..."
        docker compose up -d redis
        echo -e "   ${GREEN}✓${NC} Redis iniciado"
    fi
fi

echo ""
echo "📁 Verificando arquivos de configuração..."
echo ""

# Verificar .env.local
if [ -f "estudio_ia_videos/.env.local" ]; then
    echo -e "${GREEN}✓${NC} Arquivo .env.local existe"
    
    # Verificar se está configurado
    if grep -q "sua_anon_key_aqui" estudio_ia_videos/.env.local; then
        echo -e "${YELLOW}⚠️  ATENÇÃO: Credenciais do Supabase ainda não configuradas!${NC}"
        echo ""
        echo "   Para configurar, execute:"
        echo -e "   ${BLUE}nano estudio_ia_videos/.env.local${NC}"
        echo ""
        echo "   Você precisa substituir:"
        echo "   - NEXT_PUBLIC_SUPABASE_ANON_KEY"
        echo "   - SUPABASE_SERVICE_ROLE_KEY"
        echo "   - SENHA nas DATABASE_URLs"
        echo ""
    else
        echo -e "${GREEN}✓${NC} Credenciais parecem estar configuradas"
    fi
else
    echo -e "${RED}✗${NC} Arquivo .env.local não encontrado"
    echo "   Execute: cp estudio_ia_videos/.env.local.example estudio_ia_videos/.env.local"
fi

echo ""
echo "🎯 Próximos passos:"
echo ""
echo "1. ${BLUE}Configurar credenciais do Supabase${NC} (se ainda não fez)"
echo "   nano estudio_ia_videos/.env.local"
echo ""
echo "2. ${BLUE}Configurar banco de dados${NC}"
echo "   npm run setup:supabase"
echo ""
echo "3. ${BLUE}Iniciar aplicação em modo desenvolvimento${NC}"
echo "   cd estudio_ia_videos && npm run dev"
echo ""
echo "4. ${BLUE}Acessar aplicação${NC}"
echo "   http://localhost:3000"
echo ""

echo "📚 Documentação adicional:"
echo "   - README.md"
echo "   - AMBIENTE_CONFIGURADO.md (em /root)"
echo "   - estudio_ia_videos/CREDENCIAIS_SUPABASE_NECESSARIAS.md"
echo ""

# Verificar se já tem credenciais configuradas
if ! grep -q "sua_anon_key_aqui" estudio_ia_videos/.env.local 2>/dev/null; then
    echo "🚀 ${GREEN}Ambiente parece estar pronto!${NC}"
    echo ""
    echo "Deseja iniciar a aplicação agora? (s/N): "
    read -r response
    if [[ "$response" =~ ^([sS][iI]?[mM]?|[yY][eE]?[sS]?)$ ]]; then
        echo ""
        echo "Iniciando aplicação..."
        cd estudio_ia_videos
        npm run dev
    fi
else
    echo -e "${YELLOW}Configure as credenciais do Supabase primeiro!${NC}"
fi

echo ""
echo "=============================================="
echo "✨ Script concluído!"
echo "=============================================="

