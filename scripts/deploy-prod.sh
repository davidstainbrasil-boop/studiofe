#!/bin/bash
# 🚀 Production Deployment Script
# MVP Vídeos TécnicoCursos v7
# Usage: ./deploy-prod.sh [--skip-tests] [--force]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "${BLUE}[STEP]${NC} $1"; }

# Configuration
APP_DIR="/opt/mvp-videos"
COMPOSE_FILE="docker-compose.prod.yml"
BACKUP_DIR="/opt/backups"
SKIP_TESTS=false
FORCE=false

# Parse arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --skip-tests) SKIP_TESTS=true ;;
        --force) FORCE=true ;;
        *) echo "Unknown parameter: $1"; exit 1 ;;
    esac
    shift
done

echo "=========================================="
echo "  🚀 Production Deployment"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "=========================================="

# Pre-flight checks
log_step "1/8 Pre-flight checks..."

if [ ! -d "$APP_DIR" ]; then
    log_error "App directory not found: $APP_DIR"
    exit 1
fi

cd "$APP_DIR"

# Check Docker
if ! command -v docker &> /dev/null; then
    log_error "Docker is not installed"
    exit 1
fi

# Check if compose file exists
if [ ! -f "$COMPOSE_FILE" ]; then
    log_error "Compose file not found: $COMPOSE_FILE"
    exit 1
fi

log_info "Pre-flight checks passed"

# Health check current deployment
log_step "2/8 Checking current deployment health..."

CURRENT_HEALTH=$(curl -sf http://localhost:3000/api/health 2>/dev/null || echo '{"status":"unknown"}')
log_info "Current status: $(echo $CURRENT_HEALTH | jq -r '.status // "unknown"')"

# Create backup
log_step "3/8 Creating backup..."

mkdir -p "$BACKUP_DIR"
BACKUP_FILE="$BACKUP_DIR/pre-deploy-$(date +%Y%m%d%H%M).tar.gz"

# Backup important files
tar -czf "$BACKUP_FILE" \
    --exclude='node_modules' \
    --exclude='.next' \
    --exclude='logs' \
    estudio_ia_videos/package.json \
    .env* \
    docker-compose*.yml \
    2>/dev/null || true

log_info "Backup created: $BACKUP_FILE"

# Pull latest code
log_step "4/8 Pulling latest code..."

git fetch origin
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
git pull origin "$CURRENT_BRANCH"

NEW_VERSION=$(git rev-parse --short HEAD)
log_info "Updated to: $NEW_VERSION"

# Run tests (optional)
if [ "$SKIP_TESTS" = false ]; then
    log_step "5/8 Running tests..."
    
    cd estudio_ia_videos
    npm ci --production=false
    npm run test:ci || {
        if [ "$FORCE" = false ]; then
            log_error "Tests failed! Use --force to deploy anyway"
            exit 1
        fi
        log_warn "Tests failed but --force specified, continuing..."
    }
    cd ..
else
    log_step "5/8 Skipping tests (--skip-tests)"
fi

# Build new image
log_step "6/8 Building new Docker image..."

docker build -f Dockerfile.production -t mvp-videos:$NEW_VERSION .
docker tag mvp-videos:$NEW_VERSION mvp-videos:latest

log_info "Image built: mvp-videos:$NEW_VERSION"

# Deploy with zero-downtime
log_step "7/8 Deploying with zero-downtime..."

# Tag current as previous for rollback
docker tag mvp-videos:latest mvp-videos:previous 2>/dev/null || true

# Rolling update
docker compose -f $COMPOSE_FILE up -d --remove-orphans

# Wait for health check
log_info "Waiting for health check..."
RETRIES=30
HEALTHY=false

for i in $(seq 1 $RETRIES); do
    sleep 2
    HEALTH=$(curl -sf http://localhost:3000/api/health 2>/dev/null || echo '{}')
    STATUS=$(echo $HEALTH | jq -r '.status // "unknown"')
    
    if [ "$STATUS" = "healthy" ]; then
        HEALTHY=true
        break
    fi
    
    echo -n "."
done
echo ""

if [ "$HEALTHY" = false ]; then
    log_error "Health check failed after $RETRIES attempts!"
    log_warn "Rolling back..."
    
    docker tag mvp-videos:previous mvp-videos:latest
    docker compose -f $COMPOSE_FILE up -d --no-deps app
    
    exit 1
fi

log_info "Health check passed!"

# Post-deploy cleanup
log_step "8/8 Post-deploy cleanup..."

# Remove old images
docker image prune -f --filter "until=24h"

# Cleanup old backups (keep last 10)
ls -t "$BACKUP_DIR"/pre-deploy-*.tar.gz 2>/dev/null | tail -n +11 | xargs rm -f 2>/dev/null || true

echo ""
echo "=========================================="
echo "  ✅ Deployment Complete!"
echo "=========================================="
echo "  Version: $NEW_VERSION"
echo "  Time: $(date '+%Y-%m-%d %H:%M:%S')"
echo "  Health: $(curl -sf http://localhost:3000/api/health | jq -r '.status')"
echo ""
echo "Useful commands:"
echo "  View logs:     docker compose -f $COMPOSE_FILE logs -f app"
echo "  Check status:  docker compose -f $COMPOSE_FILE ps"
echo "  Rollback:      docker tag mvp-videos:previous mvp-videos:latest && docker compose -f $COMPOSE_FILE up -d app"
echo ""
