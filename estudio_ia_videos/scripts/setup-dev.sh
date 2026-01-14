#!/bin/bash

# Quick development setup script

set -e

echo "🚀 Setting up MVP Video Platform for development..."

# Check prerequisites
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required but not installed."; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "❌ npm is required but not installed."; exit 1; }

echo "✅ Prerequisites check passed"

# Install dependencies
echo "\n📦 Installing dependencies..."
npm ci --legacy-peer-deps

# Generate Prisma Client
echo "\n🔧 Generating Prisma client..."
npx prisma generate

# Check for .env file
if [ ! -f ".env.local" ] && [ ! -f ".env" ]; then
    echo "\n⚠️  No environment file found!"
    echo "Creating .env.local from template..."
    cp .env.example .env.local
    echo "📝 Please edit .env.local with your configuration"
    echo "   Required: DATABASE_URL, REDIS_URL, SUPABASE_URL, etc."
    exit 1
fi

echo "\n✅ Environment file found"

# Run database migrations (optional - will fail if DB not accessible)
echo "\n🗄️  Attempting database migrations..."
if npx prisma migrate deploy 2>/dev/null; then
    echo "✅ Database migrations applied"
else
    echo "⚠️  Database migrations skipped (database not accessible)"
    echo "   Run 'npm run db:migrate' when database is ready"
fi

echo "\n✅ Setup complete!"
echo "\nNext steps:"
echo "  1. Edit .env.local if needed"
echo "  2. Start PostgreSQL and Redis"
echo "  3. Run: npm run dev"
echo "\nOr use Docker Compose:"
echo "  docker-compose up -d"
echo ""
