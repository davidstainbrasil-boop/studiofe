#!/bin/bash

# Script para testar rotas corrigidas
# Uso: ./404-QUICK-TEST.sh [PORT]

PORT=${1:-3000}
BASE_URL="http://localhost:$PORT"

echo "=========================================="
echo "TESTE RÁPIDO DE ROTAS - 404 FIX"
echo "=========================================="
echo "Base URL: $BASE_URL"
echo ""

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Contador
PASS=0
FAIL=0

# Função de teste
test_route() {
    local route=$1
    local expected_status=$2
    local description=$3
    
    echo -n "Testando $route ... "
    
    # Fazer requisição e pegar status code
    status=$(curl -s -o /dev/null -w "%{http_code}" -L "$BASE_URL$route")
    
    if [ "$status" = "$expected_status" ]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $status) - $description"
        ((PASS++))
    else
        echo -e "${RED}✗ FAIL${NC} (HTTP $status, esperado $expected_status) - $description"
        ((FAIL++))
    fi
}

echo "1. TESTANDO ROTAS PRINCIPAIS"
echo "----------------------------------------"
test_route "/" "200" "Home"
test_route "/dashboard" "200" "Dashboard"
test_route "/projects" "200" "Projetos"
test_route "/pptx" "200" "Upload PPTX"
test_route "/login" "200" "Login"
test_route "/signup" "200" "Cadastro"
test_route "/settings" "200" "Configurações (nova página)"
test_route "/settings/security" "200" "Segurança"

echo ""
echo "2. TESTANDO REDIRECTS (URLs ANTIGAS)"
echo "----------------------------------------"
test_route "/avatar-studio-hyperreal" "200" "Avatar (redirect)"
test_route "/templates-nr-real" "200" "Templates NR (redirect)"
test_route "/behavioral-analytics" "200" "Analytics (redirect)"
test_route "/enterprise" "200" "Enterprise (redirect)"
test_route "/collaboration-v2" "200" "Colaboração (redirect)"
test_route "/security-dashboard" "200" "Security (redirect)"
test_route "/gamification" "200" "Gamification (redirect)"
test_route "/ml-ops" "200" "ML-Ops (redirect)"

echo ""
echo "3. TESTANDO PÁGINAS NOVAS/CORRIGIDAS"
echo "----------------------------------------"
test_route "/avatar-system-real" "200" "Avatar System Real"
test_route "/smart-nr-templates" "200" "Smart NR Templates"
test_route "/asset-library-studio" "200" "Asset Library"
test_route "/dashboard/analytics" "200" "Dashboard Analytics"
test_route "/real-time-collaboration" "200" "Real-time Collaboration"
test_route "/interactive-elements" "200" "Interactive Elements"
test_route "/ai-features" "200" "AI Features"
test_route "/system-control" "200" "System Control"

echo ""
echo "4. TESTANDO 404 (DEVE RETORNAR 404)"
echo "----------------------------------------"
test_route "/rota-inexistente-xyz" "404" "Rota inexistente (deve ser 404)"
test_route "/outro-404-teste" "404" "Outro teste 404"

echo ""
echo "=========================================="
echo "RESUMO DO TESTE"
echo "=========================================="
echo -e "Total de testes: $((PASS + FAIL))"
echo -e "${GREEN}Passou: $PASS${NC}"
echo -e "${RED}Falhou: $FAIL${NC}"

if [ $FAIL -eq 0 ]; then
    echo -e "\n${GREEN}✓ TODOS OS TESTES PASSARAM!${NC}"
    exit 0
else
    echo -e "\n${RED}✗ ALGUNS TESTES FALHARAM${NC}"
    exit 1
fi
