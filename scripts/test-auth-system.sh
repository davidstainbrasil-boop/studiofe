#!/bin/bash
# 🧪 Test Auth System - Validação Rápida

echo "═══════════════════════════════════════════════════════"
echo "🔐 MVP Vídeos - Validação Sistema de Autenticação"
echo "═══════════════════════════════════════════════════════"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track results
PASSED=0
FAILED=0

# Test function
test_endpoint() {
  local name=$1
  local url=$2
  local expected=$3
  
  echo -n "Testing $name... "
  response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null)
  
  if [ "$response" = "$expected" ]; then
    echo -e "${GREEN}✅ PASS${NC} (HTTP $response)"
    ((PASSED++))
  else
    echo -e "${RED}❌ FAIL${NC} (Expected $expected, Got $response)"
    ((FAILED++))
  fi
}

# Check if server is running
echo "🔍 Checking if Next.js server is running..."
if ! pgrep -f "next-server" > /dev/null; then
  echo -e "${RED}❌ Server not running!${NC}"
  echo "Run: cd estudio_ia_videos && npm run dev"
  exit 1
fi
echo -e "${GREEN}✅ Server is running${NC}"
echo ""

# Wait for server to be ready
echo "⏳ Waiting for server to be ready..."
sleep 2
echo ""

# Test endpoints
echo "🧪 Testing Authentication Endpoints:"
echo "-----------------------------------"

test_endpoint "Login Page       " "http://localhost:3000/login" "200"
test_endpoint "Register Page    " "http://localhost:3000/register" "200"
test_endpoint "Forgot Password  " "http://localhost:3000/auth/forgot-password" "200"
test_endpoint "Reset Password   " "http://localhost:3000/auth/reset-password" "200"
test_endpoint "Security Settings" "http://localhost:3000/settings/security" "307"

echo ""
echo "📦 Testing Static Assets:"
echo "-------------------------"

# Check if auth components exist
echo -n "EnhancedAuthForm... "
if [ -f "estudio_ia_videos/src/components/auth/enhanced-auth-form.tsx" ]; then
  echo -e "${GREEN}✅ EXISTS${NC}"
  ((PASSED++))
else
  echo -e "${RED}❌ MISSING${NC}"
  ((FAILED++))
fi

echo -n "TwoFactorAuth...    "
if [ -f "estudio_ia_videos/src/components/auth/two-factor-auth.tsx" ]; then
  echo -e "${GREEN}✅ EXISTS${NC}"
  ((PASSED++))
else
  echo -e "${RED}❌ MISSING${NC}"
  ((FAILED++))
fi

echo -n "SecuritySettings... "
if [ -f "estudio_ia_videos/src/components/auth/security-settings.tsx" ]; then
  echo -e "${GREEN}✅ EXISTS${NC}"
  ((PASSED++))
else
  echo -e "${RED}❌ MISSING${NC}"
  ((FAILED++))
fi

echo ""
echo "📚 Testing Documentation:"
echo "-------------------------"

echo -n "AUTH_SYSTEM.md... "
if [ -f "estudio_ia_videos/AUTH_SYSTEM.md" ]; then
  echo -e "${GREEN}✅ EXISTS${NC}"
  ((PASSED++))
else
  echo -e "${RED}❌ MISSING${NC}"
  ((FAILED++))
fi

echo -n "DEMO_AUTH.md...   "
if [ -f "estudio_ia_videos/DEMO_AUTH.md" ]; then
  echo -e "${GREEN}✅ EXISTS${NC}"
  ((PASSED++))
else
  echo -e "${RED}❌ MISSING${NC}"
  ((FAILED++))
fi

echo -n "CHANGELOG_AUTH... "
if [ -f "estudio_ia_videos/CHANGELOG_AUTH.md" ]; then
  echo -e "${GREEN}✅ EXISTS${NC}"
  ((PASSED++))
else
  echo -e "${RED}❌ MISSING${NC}"
  ((FAILED++))
fi

echo ""
echo "═══════════════════════════════════════════════════════"
echo "📊 Results:"
echo "-----------------------------------------------------------"
echo -e "✅ Passed: ${GREEN}$PASSED${NC}"
echo -e "❌ Failed: ${RED}$FAILED${NC}"
TOTAL=$((PASSED + FAILED))
echo "   Total:  $TOTAL"

if [ $FAILED -eq 0 ]; then
  echo ""
  echo -e "${GREEN}🎉 All tests passed!${NC}"
  echo ""
  echo "🚀 Next Steps:"
  echo "   1. Open http://localhost:3000/login in your browser"
  echo "   2. Test login with Quick Login buttons (dev mode)"
  echo "   3. Try registering a new account"
  echo "   4. Enable 2FA at /settings/security"
  echo "   5. Test password recovery flow"
  echo ""
  echo "📖 Read DEMO_AUTH.md for detailed testing guide"
  exit 0
else
  echo ""
  echo -e "${RED}⚠️  Some tests failed!${NC}"
  echo "Check the logs above for details."
  exit 1
fi
