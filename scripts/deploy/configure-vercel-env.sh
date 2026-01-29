#!/bin/bash
# Configure Vercel Environment Variables for Production
# This script sets all required environment variables for cursostecno.com.br

set -e

echo "🚀 Configuring Vercel Environment Variables for Production"
echo "============================================================"

cd /root/_MVP_Video_TecnicoCursos_v7/estudio_ia_videos

# Source the .env.local file to get current values
export $(grep -v '^#' .env.local | xargs)

echo ""
echo "📝 Setting 38 environment variables..."
echo ""

# Database Configuration
echo "1/38 Setting DATABASE_URL..."
echo "$DATABASE_URL" | vercel env add DATABASE_URL production --force

echo "2/38 Setting DIRECT_DATABASE_URL..."
echo "$DIRECT_DATABASE_URL" | vercel env add DIRECT_DATABASE_URL production --force

# Supabase Configuration
echo "3/38 Setting NEXT_PUBLIC_SUPABASE_URL..."
echo "$NEXT_PUBLIC_SUPABASE_URL" | vercel env add NEXT_PUBLIC_SUPABASE_URL production --force

echo "4/38 Setting NEXT_PUBLIC_SUPABASE_ANON_KEY..."
echo "$NEXT_PUBLIC_SUPABASE_ANON_KEY" | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production --force

echo "5/38 Setting SUPABASE_SERVICE_ROLE_KEY..."
echo "$SUPABASE_SERVICE_ROLE_KEY" | vercel env add SUPABASE_SERVICE_ROLE_KEY production --force

# Redis Configuration
echo "6/38 Setting REDIS_URL..."
echo "redis://127.0.0.1:6379" | vercel env add REDIS_URL production --force

echo "7/38 Setting REDIS_HOST..."
echo "127.0.0.1" | vercel env add REDIS_HOST production --force

echo "8/38 Setting REDIS_PORT..."
echo "6379" | vercel env add REDIS_PORT production --force

# Authentication
echo "9/38 Setting JWT_SECRET..."
echo "$JWT_SECRET" | vercel env add JWT_SECRET production --force

echo "10/38 Setting JWT_EXPIRES_IN..."
echo "7d" | vercel env add JWT_EXPIRES_IN production --force

echo "11/38 Setting SESSION_SECRET..."
echo "$SESSION_SECRET" | vercel env add SESSION_SECRET production --force

echo "12/38 Setting NEXTAUTH_SECRET..."
echo "$NEXTAUTH_SECRET" | vercel env add NEXTAUTH_SECRET production --force

echo "13/38 Setting NEXTAUTH_URL..."
echo "https://cursostecno.com.br" | vercel env add NEXTAUTH_URL production --force

# Application Configuration
echo "14/38 Setting NODE_ENV..."
echo "production" | vercel env add NODE_ENV production --force

echo "15/38 Setting NEXT_PUBLIC_APP_URL..."
echo "https://cursostecno.com.br" | vercel env add NEXT_PUBLIC_APP_URL production --force

echo "16/38 Setting NEXT_PUBLIC_API_URL..."
echo "https://cursostecno.com.br/api" | vercel env add NEXT_PUBLIC_API_URL production --force

echo "17/38 Setting NEXT_PUBLIC_SITE_URL..."
echo "https://cursostecno.com.br" | vercel env add NEXT_PUBLIC_SITE_URL production --force

echo "18/38 Setting LOG_LEVEL..."
echo "info" | vercel env add LOG_LEVEL production --force

# TTS Configuration
echo "19/38 Setting TTS_PROVIDER..."
echo "edge-tts" | vercel env add TTS_PROVIDER production --force

echo "20/38 Setting TTS_DEFAULT_VOICE..."
echo "pt-BR-FranciscaNeural" | vercel env add TTS_DEFAULT_VOICE production --force

echo "21/38 Setting AZURE_SPEECH_KEY..."
echo "$AZURE_SPEECH_KEY" | vercel env add AZURE_SPEECH_KEY production --force

echo "22/38 Setting AZURE_SPEECH_REGION..."
echo "$AZURE_SPEECH_REGION" | vercel env add AZURE_SPEECH_REGION production --force

echo "23/38 Setting ELEVENLABS_API_KEY..."
echo "$ELEVENLABS_API_KEY" | vercel env add ELEVENLABS_API_KEY production --force

# Avatar APIs
echo "24/38 Setting DID_API_KEY..."
echo "$DID_API_KEY" | vercel env add DID_API_KEY production --force

echo "25/38 Setting HEYGEN_API_KEY..."
echo "$HEYGEN_API_KEY" | vercel env add HEYGEN_API_KEY production --force

# Video Rendering
echo "26/38 Setting RENDER_CONCURRENCY..."
echo "2" | vercel env add RENDER_CONCURRENCY production --force

echo "27/38 Setting RENDER_TIMEOUT_MINUTES..."
echo "30" | vercel env add RENDER_TIMEOUT_MINUTES production --force

echo "28/38 Setting DEFAULT_VIDEO_QUALITY..."
echo "1080p" | vercel env add DEFAULT_VIDEO_QUALITY production --force

echo "29/38 Setting DEFAULT_VIDEO_FPS..."
echo "30" | vercel env add DEFAULT_VIDEO_FPS production --force

# Feature Flags
echo "30/38 Setting FLAG_ENABLE_TTS..."
echo "true" | vercel env add FLAG_ENABLE_TTS production --force

echo "31/38 Setting FLAG_ENABLE_AVATAR_3D..."
echo "false" | vercel env add FLAG_ENABLE_AVATAR_3D production --force

echo "32/38 Setting FLAG_ENABLE_AI_CONTENT..."
echo "false" | vercel env add FLAG_ENABLE_AI_CONTENT production --force

echo "33/38 Setting FLAG_ENABLE_REALTIME..."
echo "true" | vercel env add FLAG_ENABLE_REALTIME production --force

echo "34/38 Setting FLAG_ENABLE_ANALYTICS..."
echo "true" | vercel env add FLAG_ENABLE_ANALYTICS production --force

# Upload Configuration
echo "35/38 Setting MAX_UPLOAD_SIZE_MB..."
echo "500" | vercel env add MAX_UPLOAD_SIZE_MB production --force

echo "36/38 Setting ALLOWED_UPLOAD_TYPES..."
echo "pptx,ppt,pdf,png,jpg,jpeg,gif,mp4,mp3,wav" | vercel env add ALLOWED_UPLOAD_TYPES production --force

# Monitoring
echo "37/38 Setting ENABLE_METRICS..."
echo "true" | vercel env add ENABLE_METRICS production --force

echo "38/38 Setting NEXT_PUBLIC_DISABLE_SUPABASE_REALTIME..."
echo "true" | vercel env add NEXT_PUBLIC_DISABLE_SUPABASE_REALTIME production --force

echo ""
echo "✅ All 38 environment variables configured successfully!"
echo ""
echo "📋 Verifying configuration..."
vercel env ls

echo ""
echo "✅ Configuration complete!"
echo ""
echo "Next steps:"
echo "  1. Deploy to production: vercel --prod"
echo "  2. Test site: https://cursostecno.com.br"
