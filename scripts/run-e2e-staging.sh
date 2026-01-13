#!/bin/bash

# run-e2e-staging.sh
# Helper script to run E2E tests against a staging environment

echo "🧪 Starting E2E Tests on Staging..."
echo "-----------------------------------"

# Check URL argument
if [ -z "$1" ]; then
    echo "ℹ️  Usage: ./scripts/run-e2e-staging.sh <STAGING_URL>"
    echo "   Example: ./scripts/run-e2e-staging.sh https://mvp-git-staging-user.vercel.app"
    echo ""
    read -p "🌐 Enter Staging URL: " STAGING_URL
else
    STAGING_URL=$1
fi

if [ -z "$STAGING_URL" ]; then
    echo "❌ Error: Staging URL is required."
    exit 1
fi

# Remove trailing slash if present
STAGING_URL=${STAGING_URL%/}

echo "🎯 Target: $STAGING_URL"
echo "⏳ Running Playwright..."
echo ""

# Run Playwright with staging config
# E2E_SKIP_SERVER=true tells config not to start local dev server
# NODE_ENV=staging loads .env.staging if present, but we rely mostly on env vars here or local env
# E2E_BASE_URL sets the baseURL for tests

export NODE_ENV=staging
export E2E_SKIP_SERVER=true
export E2E_BASE_URL=$STAGING_URL

# We use 'npx playwright test' directly
npx playwright test

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo ""
    echo "✅ All tests passed on staging!"
else
    echo ""
    echo "❌ Some tests failed. Check the report."
    echo "   Report: evidencias/fase-2/playwright-report/index.html"
fi

exit $EXIT_CODE
