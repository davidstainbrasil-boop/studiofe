#!/bin/bash

# ===========================================
# Production Deployment Script
# ===========================================

set -e

echo "🚀 Starting Production Deployment..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# ===========================================
# 1. Pre-deployment Checks
# ===========================================
echo -e "\n${YELLOW}[1/7] Running pre-deployment checks...${NC}"

# Check for required environment variables
if [ ! -f ".env.production" ] && [ ! -f ".env.local" ]; then
    echo -e "${RED}❌ No environment file found${NC}"
    echo "Please create .env.production from .env.production.template"
    exit 1
fi

# Check Node version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js 18+ required${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Pre-deployment checks passed${NC}"

# ===========================================
# 2. Install Dependencies
# ===========================================
echo -e "\n${YELLOW}[2/7] Installing dependencies...${NC}"
npm ci --legacy-peer-deps
echo -e "${GREEN}✅ Dependencies installed${NC}"

# ===========================================
# 3. Run Database Migrations
# ===========================================
echo -e "\n${YELLOW}[3/7] Running database migrations...${NC}"
npx prisma migrate deploy
echo -e "${GREEN}✅ Migrations complete${NC}"

# ===========================================
# 4. Generate Prisma Client
# ===========================================
echo -e "\n${YELLOW}[4/7] Generating Prisma client...${NC}"
npx prisma generate
echo -e "${GREEN}✅ Prisma client generated${NC}"

# ===========================================
# 5. Build Application
# ===========================================
echo -e "\n${YELLOW}[5/7] Building application...${NC}"
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build successful${NC}"

# ===========================================
# 6. Health Check (if already running)
# ===========================================
echo -e "\n${YELLOW}[6/7] Running health check...${NC}"

if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Health check passed${NC}"
else
    echo -e "${YELLOW}⚠️  Health check skipped (server not running)${NC}"
fi

# ===========================================
# 7. Start/Restart Application
# ===========================================
echo -e "\n${YELLOW}[7/7] Starting application...${NC}"

# If using PM2
if command -v pm2 &> /dev/null; then
    pm2 restart ecosystem.config.js --update-env || pm2 start ecosystem.config.js
    echo -e "${GREEN}✅ Application restarted with PM2${NC}"
else
    echo -e "${YELLOW}ℹ️  PM2 not found. Please start manually:${NC}"
    echo "   npm run start"
fi

# ===========================================
# Final Summary
# ===========================================
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}🎉 Production Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Next steps:"
echo "  1. Monitor logs: pm2 logs"
echo "  2. Check health: curl http://localhost:3000/api/health"
echo "  3. Monitor Dashboard: http://localhost:3000/admin/monitoring"
echo ""
