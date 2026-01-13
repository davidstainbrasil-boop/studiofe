#!/bin/bash

# zap-scan.sh
# Run OWASP ZAP against a target URL using Docker

if [ -z "$1" ]; then
    echo "❌ Usage: ./scripts/security/zap-scan.sh <TARGET_URL>"
    echo "   Example: ./scripts/security/zap-scan.sh https://staging.myapp.com"
    exit 1
fi

TARGET_URL=$1

echo "🛡️  Starting OWASP ZAP Scan against: $TARGET_URL"
echo "🐳  (Requires Docker)"
echo ""

# Check if docker is available
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Please install Docker to run ZAP."
    exit 1
fi

REPORT_DIR="$(pwd)/evidencias/security_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$REPORT_DIR"

echo "📂 Reports will be saved to: $REPORT_DIR"
echo "⏳ Pulling ZAP image (if needed)..."

# Run ZAP Baseline Scan
# -t: Target URL
# -r: Report filename (inside container)
# -v: Volume mapping
docker run --rm -v "$REPORT_DIR":/zap/wrk/:rw \
    -t ghcr.io/zaproxy/zaproxy:stable zap-baseline.py \
    -t "$TARGET_URL" \
    -r zap-report.html

echo ""
echo "✅ Scan completed (check for failures above)"
echo "📄 Report: $REPORT_DIR/zap-report.html"
