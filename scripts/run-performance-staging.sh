#!/bin/bash

# run-performance-staging.sh
# Execute full performance suite against Staging

if [ -z "$1" ]; then
    echo "❌ Usage: ./scripts/run-performance-staging.sh <STAGING_URL>"
    exit 1
fi

STAGING_URL=$1
export TEST_BASE_URL=$STAGING_URL
export REPORT_DIR="evidencias/performance_$(date +%Y%m%d_%H%M%S)"

echo "🚀 Starting Performance Suite against: $STAGING_URL"
echo "📂 Reports will be saved to: $REPORT_DIR"
mkdir -p $REPORT_DIR

# 1. Lighthouse
echo ""
echo "---------- LIGHTHOUSE AUDIT ----------"
npx tsx scripts/performance/run-lighthouse.ts
mv *.html $REPORT_DIR/ 2>/dev/null || true
mv *.json $REPORT_DIR/ 2>/dev/null || true

# 2. Load Tests (Basic)
echo ""
echo "---------- LOAD TESTING (SMOKE) ----------"
# Run 'normalBrowsing' scenario for quick check
node scripts/load-testing.js normalBrowsing
mv /var/log/load-test/*.json $REPORT_DIR/ 2>/dev/null || true

echo ""
echo "✅ Performance suite completed."
