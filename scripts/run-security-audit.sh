#!/bin/bash

# run-security-audit.sh
# Execute static security checks and dependency audits

echo "🛡️  Starting Security Audit..."
echo "-----------------------------------"

# 1. NPM Audit
echo ""
echo "📦 Running NPM Audit (High+ Critical)..."
# We allow moderate, but fail on high/critical
npm audit --audit-level=high
NPM_EXIT=$?

if [ $NPM_EXIT -eq 0 ]; then
    echo "✅ NPM Audit passed (no high/critical vulnerabilities)"
else
    echo "❌ NPM Audit found high/critical vulnerabilities!"
fi

# 2. Custom Dependency Audit
echo ""
echo "🔍 Running Custom Dependency Audit..."
npx tsx scripts/security/deps-audit.ts
DEPS_EXIT=$?

echo ""
echo "-----------------------------------"
if [ $NPM_EXIT -eq 0 ] && [ $DEPS_EXIT -eq 0 ]; then
    echo "✅ Static Security Audit Passed!"
else
    echo "⚠️  Security Audit found issues. Please review above."
fi

echo ""
echo "👉 To run Dynamic Analysis (OWASP ZAP), use:"
echo "   ./scripts/security/zap-scan.sh <TARGET_URL>"
echo ""

exit $NPM_EXIT
