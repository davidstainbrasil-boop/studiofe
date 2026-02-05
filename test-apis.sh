#!/bin/bash
# Quick test script for avatar system

echo "🧪 Testing Avatar System APIs..."

# Test 1: Health check
echo "📡 Testing health endpoint..."
curl -f http://localhost:3000/api/health || echo "❌ Health check failed"

# Test 2: PPTX upload (with bypass)
echo "📤 Testing PPTX upload..."
curl -X POST http://localhost:3000/api/pptx/upload \
  -H "x-user-id: dev-user-123" \
  -F "file=@test-sample.pptx" \
  || echo "❌ Upload test failed"

# Test 3: Avatar creation
echo "🎭 Testing avatar creation..."
curl -X POST http://localhost:3000/api/avatar/create \
  -H "x-user-id: dev-user-123" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"test avatar","gender":"male","age":30,"quality":"high"}' \
  || echo "❌ Avatar creation failed"

echo "✅ Tests completed"
