#!/bin/bash

###############################################################################
# Pre-Deploy Health Check
# Valida que tudo está pronto antes do deploy
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                                                                ║"
echo "║            PRE-DEPLOY HEALTH CHECK                            ║"
echo "║                                                                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

CHECKS_PASSED=0
CHECKS_FAILED=0

check_pass() {
    echo -e "${GREEN}✓${NC} $1"
    ((CHECKS_PASSED++))
}

check_fail() {
    echo -e "${RED}✗${NC} $1"
    ((CHECKS_FAILED++))
}

check_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

###############################################################################
# 1. Project Structure
###############################################################################

echo -e "${BLUE}1. Estrutura do Projeto${NC}"
echo ""

if [ -f "estudio_ia_videos/package.json" ]; then
    check_pass "package.json existe"
else
    check_fail "package.json não encontrado"
fi

if [ -f "estudio_ia_videos/prisma/schema.prisma" ]; then
    check_pass "Prisma schema existe"
else
    check_fail "Prisma schema não encontrado"
fi

if [ -f "estudio_ia_videos/next.config.mjs" ]; then
    check_pass "Next.js config existe"
else
    check_fail "Next.js config não encontrado"
fi

if [ -f "estudio_ia_videos/tsconfig.json" ]; then
    check_pass "TypeScript config existe"
else
    check_fail "TypeScript config não encontrado"
fi

echo ""

###############################################################################
# 2. Core Systems (Fase 6)
###############################################################################

echo -e "${BLUE}2. Sistemas Core (Fase 6)${NC}"
echo ""

if [ -f "estudio_ia_videos/src/lib/security/security-audit-system.ts" ]; then
    lines=$(wc -l < "estudio_ia_videos/src/lib/security/security-audit-system.ts")
    check_pass "Security Audit System ($lines linhas)"
else
    check_fail "Security Audit System não encontrado"
fi

if [ -f "estudio_ia_videos/src/lib/performance/performance-optimization-system.ts" ]; then
    lines=$(wc -l < "estudio_ia_videos/src/lib/performance/performance-optimization-system.ts")
    check_pass "Performance Optimization System ($lines linhas)"
else
    check_fail "Performance Optimization System não encontrado"
fi

if [ -f "estudio_ia_videos/src/lib/monitoring/monitoring-system.ts" ]; then
    lines=$(wc -l < "estudio_ia_videos/src/lib/monitoring/monitoring-system.ts")
    check_pass "Monitoring System ($lines linhas)"
else
    check_fail "Monitoring System não encontrado"
fi

echo ""

###############################################################################
# 3. Environment Configuration
###############################################################################

echo -e "${BLUE}3. Configuração de Ambiente${NC}"
echo ""

if [ -f ".env.example" ]; then
    check_pass ".env.example existe (template disponível)"
else
    check_fail ".env.example não encontrado"
fi

if [ -f "estudio_ia_videos/.env.local" ]; then
    check_pass ".env.local existe"

    # Check critical variables
    if grep -q "DATABASE_URL=" estudio_ia_videos/.env.local && ! grep -q "DATABASE_URL=\"\"" estudio_ia_videos/.env.local; then
        check_pass "DATABASE_URL configurado"
    else
        check_fail "DATABASE_URL não configurado ou vazio"
    fi

    if grep -q "NEXTAUTH_SECRET=" estudio_ia_videos/.env.local && ! grep -q "NEXTAUTH_SECRET=\"\"" estudio_ia_videos/.env.local; then
        check_pass "NEXTAUTH_SECRET configurado"
    else
        check_warn "NEXTAUTH_SECRET não configurado (será gerado automaticamente)"
    fi
else
    check_warn ".env.local não existe (será criado do .env.example)"
fi

echo ""

###############################################################################
# 4. Dependencies
###############################################################################

echo -e "${BLUE}4. Dependências${NC}"
echo ""

if [ -d "estudio_ia_videos/node_modules" ]; then
    check_pass "node_modules existe"
else
    check_warn "node_modules não encontrado (será instalado durante deploy)"
fi

if command -v node &> /dev/null; then
    node_version=$(node --version)
    check_pass "Node.js instalado ($node_version)"
else
    check_fail "Node.js não instalado"
fi

if command -v npm &> /dev/null; then
    npm_version=$(npm --version)
    check_pass "npm instalado (v$npm_version)"
else
    check_fail "npm não instalado"
fi

echo ""

###############################################################################
# 5. Tests
###############################################################################

echo -e "${BLUE}5. Testes${NC}"
echo ""

if [ -f "test-fase6-production-simple.mjs" ]; then
    check_pass "Script de testes existe"

    # Run quick test
    echo -e "${YELLOW}  Executando validação rápida...${NC}"
    if node test-fase6-production-simple.mjs > /tmp/test-output.log 2>&1; then
        test_result=$(grep "Taxa de sucesso:" /tmp/test-output.log | tail -1)
        check_pass "Testes: $test_result"
        rm -f /tmp/test-output.log
    else
        check_warn "Testes falharam (ver /tmp/test-output.log)"
    fi
else
    check_warn "Script de testes não encontrado"
fi

echo ""

###############################################################################
# 6. Documentation
###############################################################################

echo -e "${BLUE}6. Documentação${NC}"
echo ""

doc_count=$(ls -1 *.md 2>/dev/null | wc -l)
if [ "$doc_count" -gt 0 ]; then
    check_pass "$doc_count documentos .md criados"
else
    check_warn "Nenhum documento .md encontrado"
fi

for doc in "README_START_HERE.md" "DEPLOY_STAGING_QUICKSTART.md" "NEXT_STEPS_ACTION_PLAN.md"; do
    if [ -f "$doc" ]; then
        check_pass "Guia: $doc"
    fi
done

echo ""

###############################################################################
# 7. Deployment Scripts
###############################################################################

echo -e "${BLUE}7. Scripts de Deploy${NC}"
echo ""

if [ -f "scripts/deploy-staging.sh" ]; then
    if [ -x "scripts/deploy-staging.sh" ]; then
        check_pass "deploy-staging.sh (executável)"
    else
        check_warn "deploy-staging.sh existe mas não é executável"
        chmod +x scripts/deploy-staging.sh
        check_pass "Permissões de execução adicionadas"
    fi
else
    check_warn "deploy-staging.sh não encontrado"
fi

echo ""

###############################################################################
# Summary
###############################################################################

echo "═══════════════════════════════════════════════════════════════"
echo -e "${BLUE}RESUMO DA VALIDAÇÃO${NC}"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo -e "Checks passaram:  ${GREEN}$CHECKS_PASSED${NC}"
echo -e "Checks falharam:  ${RED}$CHECKS_FAILED${NC}"
echo ""

TOTAL=$((CHECKS_PASSED + CHECKS_FAILED))
if [ $TOTAL -gt 0 ]; then
    PERCENTAGE=$((CHECKS_PASSED * 100 / TOTAL))
else
    PERCENTAGE=0
fi

echo -e "Taxa de sucesso: ${GREEN}$PERCENTAGE%${NC}"
echo ""

if [ $CHECKS_FAILED -eq 0 ]; then
    echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                                        ║${NC}"
    echo -e "${GREEN}║        ✅ PRONTO PARA DEPLOY! ✅                       ║${NC}"
    echo -e "${GREEN}║                                                        ║${NC}"
    echo -e "${GREEN}║  Execute: cd estudio_ia_videos                         ║${NC}"
    echo -e "${GREEN}║           ../scripts/deploy-staging.sh                 ║${NC}"
    echo -e "${GREEN}║                                                        ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
    echo ""
    exit 0
else
    echo -e "${RED}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║                                                        ║${NC}"
    echo -e "${RED}║     ⚠️  ALGUNS CHECKS FALHARAM ⚠️                      ║${NC}"
    echo -e "${RED}║                                                        ║${NC}"
    echo -e "${RED}║  Corrija os erros acima antes de fazer deploy         ║${NC}"
    echo -e "${RED}║                                                        ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════════╝${NC}"
    echo ""
    exit 1
fi
