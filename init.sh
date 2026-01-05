#!/bin/bash
# ============================================================================
# MVP Video TécnicoCursos v7 - Init Script
# Script de inicialização rápida do ambiente de desenvolvimento
# ============================================================================

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  MVP Video TécnicoCursos v7 - Init${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

# ----------------------------------------------------------------------------
# 1. Verificar diretório
# ----------------------------------------------------------------------------
echo -e "${YELLOW}[1/7] Verificando diretório...${NC}"
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Erro: Execute este script na raiz do projeto${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Diretório correto: $(pwd)${NC}"

# ----------------------------------------------------------------------------
# 2. Verificar Node.js
# ----------------------------------------------------------------------------
echo -e "${YELLOW}[2/7] Verificando Node.js...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Erro: Node.js não encontrado${NC}"
    exit 1
fi
NODE_VERSION=$(node -v)
echo -e "${GREEN}✓ Node.js: $NODE_VERSION${NC}"

# ----------------------------------------------------------------------------
# 3. Verificar dependências
# ----------------------------------------------------------------------------
echo -e "${YELLOW}[3/7] Verificando dependências...${NC}"
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}⚠ Instalando dependências...${NC}"
    npm install
fi
echo -e "${GREEN}✓ Dependências instaladas${NC}"

# ----------------------------------------------------------------------------
# 4. Verificar variáveis de ambiente
# ----------------------------------------------------------------------------
echo -e "${YELLOW}[4/7] Verificando .env...${NC}"
if [ ! -f ".env" ] && [ ! -f ".env.local" ]; then
    echo -e "${RED}❌ Erro: Arquivo .env não encontrado${NC}"
    echo -e "${YELLOW}Copie .env.production.example para .env e configure${NC}"
    exit 1
fi

# Validar variáveis críticas
ENV_FILE=".env.local"
[ ! -f "$ENV_FILE" ] && ENV_FILE=".env"

REQUIRED_VARS=("NEXT_PUBLIC_SUPABASE_URL" "NEXT_PUBLIC_SUPABASE_ANON_KEY" "SUPABASE_SERVICE_ROLE_KEY")
MISSING_VARS=()

for VAR in "${REQUIRED_VARS[@]}"; do
    if ! grep -q "^${VAR}=" "$ENV_FILE" 2>/dev/null; then
        MISSING_VARS+=("$VAR")
    fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    echo -e "${YELLOW}⚠ Variáveis ausentes em $ENV_FILE: ${MISSING_VARS[*]}${NC}"
else
    echo -e "${GREEN}✓ Variáveis críticas configuradas${NC}"
fi

# ----------------------------------------------------------------------------
# 5. Verificar Redis (Docker)
# ----------------------------------------------------------------------------
echo -e "${YELLOW}[5/7] Verificando Redis...${NC}"
if command -v docker &> /dev/null; then
    REDIS_RUNNING=$(docker ps --filter "name=redis" --format "{{.Names}}" 2>/dev/null || true)
    if [ -z "$REDIS_RUNNING" ]; then
        echo -e "${YELLOW}⚠ Iniciando Redis via Docker...${NC}"
        npm run redis:start 2>/dev/null || echo -e "${YELLOW}⚠ Redis não iniciado (opcional para dev)${NC}"
    else
        echo -e "${GREEN}✓ Redis já está rodando${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Docker não encontrado (Redis opcional para dev)${NC}"
fi

# ----------------------------------------------------------------------------
# 6. Type Check
# ----------------------------------------------------------------------------
echo -e "${YELLOW}[6/7] Verificando tipos TypeScript...${NC}"
npm run type-check 2>/dev/null && echo -e "${GREEN}✓ TypeScript OK${NC}" || echo -e "${YELLOW}⚠ Erros de tipo encontrados${NC}"

# ----------------------------------------------------------------------------
# 7. Mostrar status do projeto
# ----------------------------------------------------------------------------
echo ""
echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  Status do Projeto${NC}"
echo -e "${BLUE}============================================${NC}"

# Git status resumido
echo -e "${YELLOW}Git Branch:${NC}"
git branch --show-current 2>/dev/null || echo "N/A"

echo ""
echo -e "${YELLOW}Últimos 5 commits:${NC}"
git log --oneline -5 2>/dev/null || echo "N/A"

echo ""
echo -e "${YELLOW}Features pendentes (feature-list.json):${NC}"
if [ -f "feature-list.json" ]; then
    PASSING=$(grep -o '"passes": true' feature-list.json | wc -l)
    FAILING=$(grep -o '"passes": false' feature-list.json | wc -l)
    echo -e "  ✅ Passing: $PASSING"
    echo -e "  ❌ Failing: $FAILING"
else
    echo "  N/A - feature-list.json não encontrado"
fi

echo ""
echo -e "${BLUE}============================================${NC}"
echo -e "${GREEN}✓ Ambiente pronto para desenvolvimento!${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""
echo -e "Comandos úteis:"
echo -e "  ${YELLOW}npm run app:dev${NC}          - Iniciar servidor Next.js"
echo -e "  ${YELLOW}npm test${NC}                 - Rodar testes Jest"
echo -e "  ${YELLOW}npm run health${NC}           - Health check do sistema"
echo -e "  ${YELLOW}npm run type-check${NC}       - Verificar tipos TypeScript"
echo -e "  ${YELLOW}npm run audit:any${NC}        - Auditar uso de 'any'"
echo -e "  ${YELLOW}npm run redis:start${NC}      - Iniciar Redis (Docker)"
echo -e "  ${YELLOW}npm run setup:supabase${NC}   - Setup completo do banco"
echo ""
echo -e "Para iniciar o servidor de desenvolvimento:"
echo -e "  ${GREEN}cd estudio_ia_videos/app && npm run dev${NC}"
echo -e "ou"
echo -e "  ${GREEN}npm run app:dev${NC}"
echo ""
