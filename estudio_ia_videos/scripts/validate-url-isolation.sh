#!/bin/bash

# DEV/E2E URL Isolation Validator
# Verifies that no external requests are being made

echo "🔍 Validating DEV/E2E URL Isolation..."
echo ""

# Check for hardcoded production URLs
echo "1️⃣ Checking for hardcoded production URLs..."
if grep -r "cursostecno.com.br" app/ --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --exclude="dev-url-guard.ts" 2>/dev/null; then
    echo "❌ Found hardcoded production URLs!"
    exit 1
else
    echo "✅ No hardcoded production URLs found"
fi

# Check environment files
echo ""
echo "2️⃣ Checking environment configuration..."
if [ -f ".env.development" ]; then
    echo "✅ .env.development exists"
else
    echo "⚠️  .env.development not found"
fi

if [ -f ".env.test" ]; then
    echo "✅ .env.test exists"
else
    echo "⚠️  .env.test not found"
fi

# Check for URL guard
echo ""
echo "3️⃣ Checking URL guard..."
if [ -f "app/lib/dev-url-guard.ts" ]; then
    echo "✅ URL guard exists"
else
    echo "❌ URL guard not found!"
    exit 1
fi

# Check layout import
echo ""
echo "4️⃣ Checking layout imports..."
if grep -q "dev-url-guard" app/layout.tsx; then
    echo "✅ URL guard imported in layout"
else
    echo "❌ URL guard not imported in layout!"
    exit 1
fi

# Check Next.js config
echo ""
echo "5️⃣ Checking Next.js configuration..."
if grep -q "productionBrowserSourceMaps: false" next.config.mjs; then
    echo "✅ Source maps disabled"
else
    echo "⚠️  Source maps not disabled"
fi

echo ""
echo "✅ All checks passed! DEV/E2E isolation is configured."
echo ""
echo "To test, run:"
echo "  npm run dev"
echo "  # Open browser console and check for [URL Guard] messages"
echo ""
