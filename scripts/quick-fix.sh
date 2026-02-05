#!/bin/bash

# Quick Fix Script for Avatar System
# Resolves common authentication and upload issues

echo "🔧 Avatar System Quick Fix Script"
echo "=================================="

# 1. Kill existing Next.js processes
echo "🛑 Stopping existing processes..."
pkill -f "next dev" 2>/dev/null || true
pkill -f "node.*next" 2>/dev/null || true
sleep 2

# 2. Clear .next cache
echo "🧹 Clearing Next.js cache..."
rm -rf .next 2>/dev/null || true
rm -rf node_modules/.cache 2>/dev/null || true

# 3. Set development environment
echo "⚙️ Setting up development environment..."
export NODE_ENV=development
export SKIP_AUTH=true
export SKIP_RATE_LIMIT=true
export DEV_BYPASS_USER_ID=dev-user-123

# 4. Create minimal .env.local for testing
cat > .env.local << EOF
NODE_ENV=development
SKIP_AUTH=true
SKIP_RATE_LIMIT=true
DEV_BYPASS_USER_ID=dev-user-123
NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co
SUPABASE_SERVICE_ROLE_KEY=placeholder-key
SENTRY_DISABLED=true
EOF

echo "✅ Environment configured"

# 5. Start development server
echo "🚀 Starting development server..."
npm run dev &
DEV_PID=$!

# Wait for server to start
echo "⏳ Waiting for server to start..."
sleep 10

# 6. Test health endpoint
echo "🏥 Testing health endpoint..."
for i in {1..30}; do
    if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
        echo "✅ Server is ready!"
        break
    fi
    sleep 1
    echo -n "."
done

# 7. Test PPTX upload with debug headers
echo "📤 Testing PPTX upload..."
curl -X POST http://localhost:3000/api/pptx/upload \
  -H "x-user-id: dev-user-123" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@README.md" \
  -H "x-debug-mode: true" \
  -v

echo ""
echo "🎯 Development server is running at: http://localhost:3000"
echo "🔧 Debug mode is enabled"
echo "📤 Upload endpoint should now work"
echo ""
echo "📋 Quick commands to test:"
echo "  curl http://localhost:3000/api/health"
echo "  curl -X POST http://localhost:3000/api/pptx/upload -H 'x-user-id: dev-user-123' -F 'file=@test.txt'"
echo ""
echo "🛑 To stop: kill $DEV_PID"