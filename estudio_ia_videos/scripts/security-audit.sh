#!/bin/bash

# Security Audit Script
# Runs various security checks on the application

set -e

echo "🔐 Running Security Audit..."

REPORT_DIR="./security-reports"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
REPORT_FILE="$REPORT_DIR/security-audit-${TIMESTAMP}.txt"

mkdir -p "$REPORT_DIR"

{
    echo "========================================"
    echo "Security Audit Report"
    echo "Date: $(date)"
    echo "========================================"
    echo ""

    # 1. NPM Audit
    echo "1. NPM AUDIT"
    echo "========================================"
    npm audit --production || true
    echo ""

    # 2. Check for hardcoded secrets
    echo "2. SECRETS SCAN"
    echo "========================================"
    echo "Scanning for potential hardcoded secrets..."
    
    # Common secret patterns
    grep -r -i -n \
        -e "api[_-]key\s*=\s*['\"][^'\"]*['\"]" \
        -e "secret\s*=\s*['\"][^'\"]*['\"]" \
        -e "password\s*=\s*['\"][^'\"]*['\"]" \
        -e "token\s*=\s*['\"][^'\"]*['\"]" \
        --exclude-dir=node_modules \
        --exclude-dir=.git \
        --exclude-dir=.next \
        --exclude="*.md" \
        --exclude="security-audit.sh" \
        . || echo "✅ No obvious hardcoded secrets found"
    echo ""

    # 3. Check environment files
    echo "3. ENVIRONMENT FILES CHECK"
    echo "========================================"
    if [ -f ".env" ] || [ -f ".env.local" ]; then
        echo "⚠️  Warning: .env files found (ensure they're in .gitignore)"
        ls -la .env* 2>/dev/null || true
    else
        echo "✅ No .env files in repository"
    fi
    echo ""

    # 4. Check for known vulnerable dependencies
    echo "4. DEPENDENCY VULNERABILITIES"
    echo "========================================"
    npx audit-ci --moderate || echo "⚠️  Vulnerabilities found (review above)"
    echo ""

    # 5. Check for TODO/FIXME security tags
    echo "5. SECURITY TODO/FIXME"
    echo "========================================"
    grep -r -n "TODO.*security\|FIXME.*security\|SECURITY.*TODO" \
        --exclude-dir=node_modules \
        --exclude-dir=.git \
        --exclude-dir=.next \
        --include="*.ts" --include="*.tsx" --include="*.js" \
        . || echo "✅ No security TODOs found"
    echo ""

    # 6. Check security headers middleware
    echo "6. SECURITY HEADERS CHECK"
    echo "========================================"
    if [ -f "src/middleware/security-headers.ts" ]; then
        echo "✅ Security headers middleware exists"
        grep -E "X-Frame-Options|X-Content-Type-Options|Content-Security-Policy" \
            src/middleware/security-headers.ts || echo "⚠️  Some headers might be missing"
    else
        echo "⚠️  Security headers middleware not found"
    fi
    echo ""

    # 7. Check for rate limiting
    echo "7. RATE LIMITING CHECK"
    echo "========================================"
    if grep -r "rate.*limit" src/middleware.ts &>/dev/null; then
        echo "✅ Rate limiting configured in middleware"
    else
        echo "⚠️  Rate limiting not found in middleware"
    fi
    echo ""

    # 8. CORS configuration check
    echo "8. CORS CONFIGURATION"
    echo "========================================"
    if grep -r "cors\|Access-Control-Allow-Origin" next.config.mjs &>/dev/null; then
        echo "✅ CORS configuration found"
    else
        echo "ℹ️  No explicit CORS configuration"
    fi
    echo ""

    # 9. Summary
    echo "========================================"
    echo "SECURITY AUDIT SUMMARY"
    echo "========================================"
    echo "✅ Checks completed: 8/8"
    echo "📊 Review the report above for any warnings"
    echo "📂 Full report: $REPORT_FILE"
    echo ""

} | tee "$REPORT_FILE"

echo "✅ Security audit complete!"
echo "📄 Report saved to: $REPORT_FILE"
echo ""
echo "🔍 Recommended next steps:"
echo "  1. Review and fix any HIGH/CRITICAL npm vulnerabilities"
echo "  2. Ensure no secrets are committed to repository"
echo "  3. Run OWASP ZAP for deeper security testing"
echo "  4. Configure automated security scans in CI/CD"
echo ""
