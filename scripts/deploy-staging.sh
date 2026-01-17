#!/bin/bash

###############################################################################
# Deploy Staging - Quick Start Script
# Automatiza o deploy do MVP Video para Vercel staging
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Icons
CHECK="${GREEN}✓${NC}"
CROSS="${RED}✗${NC}"
ARROW="${BLUE}→${NC}"
WARN="${YELLOW}⚠${NC}"

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                                                                ║"
echo "║         MVP VIDEO - STAGING DEPLOYMENT SCRIPT                 ║"
echo "║                                                                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

###############################################################################
# STEP 1: Pre-flight checks
###############################################################################

echo -e "${ARROW} ${BLUE}Step 1: Pre-flight checks${NC}"
echo ""

# Check if in correct directory
if [ ! -f "package.json" ]; then
    echo -e "${CROSS} Not in estudio_ia_videos directory"
    echo -e "  Please run: cd estudio_ia_videos"
    exit 1
fi
echo -e "${CHECK} In correct directory"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${CROSS} Node.js not found"
    exit 1
fi
echo -e "${CHECK} Node.js $(node --version)"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${CROSS} npm not found"
    exit 1
fi
echo -e "${CHECK} npm $(npm --version)"

# Check if dependencies installed
if [ ! -d "node_modules" ]; then
    echo -e "${WARN} Dependencies not installed"
    echo -e "${ARROW} Installing dependencies..."
    npm install
fi
echo -e "${CHECK} Dependencies installed"

echo ""

###############################################################################
# STEP 2: Environment configuration
###############################################################################

echo -e "${ARROW} ${BLUE}Step 2: Environment configuration${NC}"
echo ""

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo -e "${WARN} .env.local not found"

    if [ -f ".env.example" ]; then
        echo -e "${ARROW} Creating .env.local from .env.example"
        cp .env.example .env.local
        echo -e "${YELLOW}⚠ IMPORTANT: Edit .env.local with your credentials before deploying${NC}"
        echo -e "  Required variables:"
        echo -e "    - DATABASE_URL (Supabase)"
        echo -e "    - NEXT_PUBLIC_SUPABASE_URL"
        echo -e "    - NEXT_PUBLIC_SUPABASE_ANON_KEY"
        echo -e "    - SUPABASE_SERVICE_ROLE_KEY"
        echo -e "    - NEXTAUTH_SECRET (generate with: openssl rand -base64 32)"
        echo ""
        read -p "Press Enter after configuring .env.local..."
    else
        echo -e "${CROSS} .env.example not found"
        exit 1
    fi
fi
echo -e "${CHECK} .env.local exists"

# Validate critical env vars
if ! grep -q "DATABASE_URL=" .env.local || grep -q "DATABASE_URL=\"\"" .env.local; then
    echo -e "${WARN} DATABASE_URL not configured in .env.local"
    echo -e "  Get it from: https://supabase.com → Your Project → Settings → Database"
    exit 1
fi
echo -e "${CHECK} DATABASE_URL configured"

if ! grep -q "NEXTAUTH_SECRET=" .env.local || grep -q "NEXTAUTH_SECRET=\"\"" .env.local; then
    echo -e "${WARN} NEXTAUTH_SECRET not configured"
    echo -e "${ARROW} Generating NEXTAUTH_SECRET..."
    SECRET=$(openssl rand -base64 32)
    echo "NEXTAUTH_SECRET=\"$SECRET\"" >> .env.local
    echo -e "${CHECK} NEXTAUTH_SECRET generated"
else
    echo -e "${CHECK} NEXTAUTH_SECRET configured"
fi

echo ""

###############################################################################
# STEP 3: Database setup
###############################################################################

echo -e "${ARROW} ${BLUE}Step 3: Database setup${NC}"
echo ""

# Generate Prisma client
echo -e "${ARROW} Generating Prisma client..."
npx prisma generate > /dev/null 2>&1
echo -e "${CHECK} Prisma client generated"

# Push schema to database
echo -e "${ARROW} Pushing schema to database..."
if npx prisma db push --skip-generate > /dev/null 2>&1; then
    echo -e "${CHECK} Database schema updated"
else
    echo -e "${WARN} Database push failed (might be OK if already in sync)"
fi

echo ""

###############################################################################
# STEP 4: Build validation
###############################################################################

echo -e "${ARROW} ${BLUE}Step 4: Build validation${NC}"
echo ""

echo -e "${ARROW} Running build to validate..."
if npm run build > build.log 2>&1; then
    echo -e "${CHECK} Build successful"
    rm -f build.log
else
    echo -e "${CROSS} Build failed"
    echo -e "  Check build.log for details"
    exit 1
fi

echo ""

###############################################################################
# STEP 5: Vercel CLI setup
###############################################################################

echo -e "${ARROW} ${BLUE}Step 5: Vercel CLI setup${NC}"
echo ""

# Check if Vercel CLI installed
if ! command -v vercel &> /dev/null; then
    echo -e "${WARN} Vercel CLI not found"
    echo -e "${ARROW} Installing Vercel CLI globally..."
    npm install -g vercel
    echo -e "${CHECK} Vercel CLI installed"
else
    echo -e "${CHECK} Vercel CLI $(vercel --version)"
fi

# Check if logged in
if ! vercel whoami &> /dev/null; then
    echo -e "${WARN} Not logged in to Vercel"
    echo -e "${ARROW} Please login to Vercel..."
    vercel login
fi
echo -e "${CHECK} Logged in as $(vercel whoami)"

echo ""

###############################################################################
# STEP 6: Deploy to staging
###############################################################################

echo -e "${ARROW} ${BLUE}Step 6: Deploy to staging${NC}"
echo ""

echo -e "${YELLOW}This will deploy your application to Vercel staging.${NC}"
echo -e "${YELLOW}You'll be prompted for project configuration.${NC}"
echo ""
read -p "Continue with deployment? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${CROSS} Deployment cancelled"
    exit 0
fi

echo -e "${ARROW} Deploying to Vercel..."
echo ""

# Deploy
if vercel --yes; then
    echo ""
    echo -e "${CHECK} ${GREEN}Deployment successful!${NC}"
else
    echo ""
    echo -e "${CROSS} ${RED}Deployment failed${NC}"
    exit 1
fi

echo ""

###############################################################################
# STEP 7: Post-deployment
###############################################################################

echo -e "${ARROW} ${BLUE}Step 7: Post-deployment validation${NC}"
echo ""

# Get deployment URL
DEPLOYMENT_URL=$(vercel inspect --url)

echo -e "${ARROW} Deployment URL: ${BLUE}$DEPLOYMENT_URL${NC}"

# Save URL
echo "STAGING_URL=$DEPLOYMENT_URL" > .env.staging
echo -e "${CHECK} URL saved to .env.staging"

echo ""
echo -e "${ARROW} Testing health endpoint..."

# Wait a bit for deployment to be ready
sleep 5

# Test health endpoint
if curl -f -s "$DEPLOYMENT_URL/api/health" > /dev/null 2>&1; then
    echo -e "${CHECK} Health check passed"
else
    echo -e "${WARN} Health check failed (might take a few more seconds)"
    echo -e "  Try manually: curl $DEPLOYMENT_URL/api/health"
fi

echo ""

###############################################################################
# COMPLETION
###############################################################################

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                                                                ║"
echo "║               🎉 DEPLOYMENT COMPLETE! 🎉                       ║"
echo "║                                                                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}Your application is now live at:${NC}"
echo -e "  ${BLUE}$DEPLOYMENT_URL${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo -e "  1. Test in browser: $DEPLOYMENT_URL/studio"
echo -e "  2. Configure environment variables in Vercel dashboard"
echo -e "  3. Run tests and collect feedback"
echo ""
echo -e "${YELLOW}Important:${NC}"
echo -e "  - Configure production env vars in Vercel dashboard"
echo -e "  - Test all features thoroughly"
echo -e "  - Monitor logs: vercel logs $DEPLOYMENT_URL --follow"
echo ""
echo -e "${GREEN}For more details, see: DEPLOY_STAGING_QUICKSTART.md${NC}"
echo ""

###############################################################################
# Optional: Open browser
###############################################################################

echo ""
read -p "Open deployment in browser? (y/N) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    if command -v xdg-open &> /dev/null; then
        xdg-open "$DEPLOYMENT_URL/studio"
    elif command -v open &> /dev/null; then
        open "$DEPLOYMENT_URL/studio"
    else
        echo -e "${ARROW} Please open manually: $DEPLOYMENT_URL/studio"
    fi
fi

echo ""
echo -e "${GREEN}Deployment script completed successfully!${NC}"
echo ""
