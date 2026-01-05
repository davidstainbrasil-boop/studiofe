#!/bin/bash
# ============================================================================
# Pre-Commit Quality Check Script
# Executa verificações de qualidade antes de permitir commit
# ============================================================================

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔍 Executando verificações de qualidade pré-commit...${NC}"
echo ""

ERRORS=0
WARNINGS=0

# ----------------------------------------------------------------------------
# 1. Type Check
# ----------------------------------------------------------------------------
echo -e "${YELLOW}[1/5] TypeScript Type Check...${NC}"
if npm run type-check 2>/dev/null; then
    echo -e "${GREEN}✓ Tipos OK${NC}"
else
    echo -e "${RED}✗ Erros de tipo encontrados${NC}"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# ----------------------------------------------------------------------------
# 2. Lint Check
# ----------------------------------------------------------------------------
echo -e "${YELLOW}[2/5] ESLint Check...${NC}"
if npm run lint 2>/dev/null; then
    echo -e "${GREEN}✓ Lint OK${NC}"
else
    echo -e "${RED}✗ Problemas de lint encontrados${NC}"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# ----------------------------------------------------------------------------
# 3. Audit 'any' Types
# ----------------------------------------------------------------------------
echo -e "${YELLOW}[3/5] Auditoria de tipos 'any'...${NC}"
ANY_COUNT=$(npm run audit:any 2>/dev/null | grep -o '"anyCount": [0-9]*' | grep -o '[0-9]*' || echo "0")
if [ "$ANY_COUNT" -gt 500 ]; then
    echo -e "${RED}✗ Muitos tipos 'any' encontrados: $ANY_COUNT${NC}"
    WARNINGS=$((WARNINGS + 1))
elif [ "$ANY_COUNT" -gt 0 ]; then
    echo -e "${YELLOW}⚠ Tipos 'any' encontrados: $ANY_COUNT${NC}"
    WARNINGS=$((WARNINGS + 1))
else
    echo -e "${GREEN}✓ Nenhum tipo 'any' encontrado${NC}"
fi
echo ""

# ----------------------------------------------------------------------------
# 4. Verificar arquivos sensíveis
# ----------------------------------------------------------------------------
echo -e "${YELLOW}[4/5] Verificando arquivos sensíveis...${NC}"
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM)

SENSITIVE_PATTERNS=("\.env" "password" "secret" "api_key" "private_key")
SENSITIVE_FOUND=0

for pattern in "${SENSITIVE_PATTERNS[@]}"; do
    if echo "$STAGED_FILES" | grep -q "$pattern"; then
        echo -e "${RED}⚠ Arquivo sensível detectado com padrão: $pattern${NC}"
        SENSITIVE_FOUND=1
    fi
done

if [ $SENSITIVE_FOUND -eq 0 ]; then
    echo -e "${GREEN}✓ Nenhum arquivo sensível no commit${NC}"
else
    echo -e "${YELLOW}⚠ Revise os arquivos antes de commitar${NC}"
    WARNINGS=$((WARNINGS + 1))
fi
echo ""

# ----------------------------------------------------------------------------
# 5. Unit Tests (staged files only)
# ----------------------------------------------------------------------------
echo -e "${YELLOW}[5/5] Rodando testes de arquivos modificados...${NC}"

# Extrair arquivos .ts/.tsx modificados (exceto .d.ts)
TEST_FILES=""
for file in $STAGED_FILES; do
    if [[ $file =~ \.(ts|tsx)$ ]] && [[ ! $file =~ \.d\.ts$ ]]; then
        # Buscar arquivo de teste correspondente
        TEST_FILE="${file%.tsx}.test.tsx"
        TEST_FILE="${TEST_FILE%.ts}.test.ts"
        if [ -f "$TEST_FILE" ]; then
            TEST_FILES="$TEST_FILES $TEST_FILE"
        fi
    fi
done

if [ -n "$TEST_FILES" ]; then
    if npm test -- $TEST_FILES 2>/dev/null; then
        echo -e "${GREEN}✓ Testes passaram${NC}"
    else
        echo -e "${RED}✗ Alguns testes falharam${NC}"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo -e "${YELLOW}⚠ Nenhum teste específico encontrado para arquivos modificados${NC}"
fi
echo ""

# ----------------------------------------------------------------------------
# Resultado Final
# ----------------------------------------------------------------------------
echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  Resultado das Verificações${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

if [ $ERRORS -gt 0 ]; then
    echo -e "${RED}❌ $ERRORS erro(s) crítico(s) encontrado(s)${NC}"
    echo -e "${RED}Commit bloqueado. Corrija os erros antes de commitar.${NC}"
    exit 1
elif [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}⚠ $WARNINGS aviso(s) encontrado(s)${NC}"
    echo -e "${YELLOW}Revise antes de prosseguir.${NC}"
    echo ""
    read -p "Deseja continuar com o commit? (s/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        echo -e "${RED}Commit cancelado pelo usuário${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✅ Todas as verificações passaram!${NC}"
echo -e "${GREEN}Prosseguindo com o commit...${NC}"
echo ""

exit 0
