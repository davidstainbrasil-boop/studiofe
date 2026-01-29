#!/bin/bash
set -e

# =========================================================================
# 🚀 DEPLOY PRODUCTION - VIDEO STUDIO PRO
# =========================================================================

echo "📦 Starting Production Deployment..."

# 1. Validate Environment
if [ ! -f .env.production ]; then
    echo "❌ ERROR: .env.production file not found!"
    echo "Please create it based on .env.production.example"
    exit 1
fi

echo "🔍 Reading environment variables..."
# Read secrets for build args (careful not to print them)
NEXT_PUBLIC_SUPABASE_URL=$(grep NEXT_PUBLIC_SUPABASE_URL .env.production | cut -d '=' -f2)
NEXT_PUBLIC_SUPABASE_ANON_KEY=$(grep NEXT_PUBLIC_SUPABASE_ANON_KEY .env.production | cut -d '=' -f2)
NEXT_PUBLIC_SITE_URL=$(grep NEXT_PUBLIC_SITE_URL .env.production | cut -d '=' -f2)

if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    echo "❌ ERROR: NEXT_PUBLIC_SUPABASE_URL is missing in .env.production"
    exit 1
fi

# 2. Database Migration (Safe to run multiple times? Yes, scripts are idempotent mostly or handle conflicts)
echo "🗄️  Applying Database Migrations..."
npm run setup:supabase

# 3. Docker Build
echo "🐳 Building Docker Image..."
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  --build-arg NEXT_PUBLIC_SITE_URL="$NEXT_PUBLIC_SITE_URL" \
  --build-arg NEXT_PUBLIC_SENTRY_DSN="" \
  -f Dockerfile.production \
  -t video-studio-pro:latest .

echo "✅ Build Complete!"

# 4. Instructions
echo ""
echo "========================================================"
echo "🚀 READY TO RUN"
echo "========================================================"
echo "To start the container:"
echo "docker run -d -p 3000:3000 --env-file .env.production --name video-studio video-studio-pro:latest"
echo ""
