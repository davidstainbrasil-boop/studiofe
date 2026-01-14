#!/bin/bash
# Quick validation of auth system files

echo "🔍 Validando Sistema de Autenticação..."
echo ""

FILES=(
  "src/components/auth/enhanced-auth-form.tsx"
  "src/components/auth/forgot-password-form.tsx"
  "src/components/auth/reset-password-form.tsx"
  "src/components/auth/two-factor-auth.tsx"
  "src/components/auth/security-settings.tsx"
  "src/app/login/page.tsx"
  "src/app/register/page.tsx"
  "src/app/auth/forgot-password/page.tsx"
  "src/app/auth/reset-password/page.tsx"
  "src/app/settings/security/page.tsx"
  "AUTH_SYSTEM.md"
  "DEMO_AUTH.md"
  "CHANGELOG_AUTH.md"
  "IMPLEMENTATION_SUMMARY_AUTH.md"
)

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

MISSING=0

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo -e "${GREEN}✅${NC} $file"
  else
    echo -e "${RED}❌${NC} $file"
    ((MISSING++))
  fi
done

echo ""
if [ $MISSING -eq 0 ]; then
  echo -e "${GREEN}✅ Todos os arquivos presentes!${NC}"
  echo ""
  echo "Para testar:"
  echo "  npm run dev"
  echo "  Acesse: http://localhost:3000/login"
else
  echo -e "${RED}❌ $MISSING arquivo(s) faltando${NC}"
  exit 1
fi
