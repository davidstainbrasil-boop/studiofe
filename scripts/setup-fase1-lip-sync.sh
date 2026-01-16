#!/bin/bash

###############################################################################
# FASE 1: LIP-SYNC PROFISSIONAL - SETUP SCRIPT
# Instala e configura todas as dependências necessárias para lip-sync
###############################################################################

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "=========================================="
echo "FASE 1: LIP-SYNC SETUP"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_command() {
    if command -v "$1" &> /dev/null; then
        info "$1 is installed ✓"
        return 0
    else
        warn "$1 is NOT installed ✗"
        return 1
    fi
}

###############################################################################
# 1. Check Prerequisites
###############################################################################

echo "Step 1: Checking prerequisites..."
echo ""

# Check Node.js
if check_command node; then
    NODE_VERSION=$(node --version)
    info "Node.js version: $NODE_VERSION"
else
    error "Node.js is required but not installed. Please install Node.js 20+"
    exit 1
fi

# Check npm
if check_command npm; then
    NPM_VERSION=$(npm --version)
    info "npm version: $NPM_VERSION"
else
    error "npm is required but not installed."
    exit 1
fi

# Check Redis
if check_command redis-cli; then
    REDIS_VERSION=$(redis-cli --version)
    info "Redis: $REDIS_VERSION"
else
    warn "Redis is not installed. Installing..."

    # Detect OS and install Redis
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo apt-get update
        sudo apt-get install -y redis-server
        sudo systemctl enable redis-server
        sudo systemctl start redis-server
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        brew install redis
        brew services start redis
    else
        error "Unsupported OS for automatic Redis installation. Please install Redis manually."
        exit 1
    fi
fi

# Check FFmpeg
if check_command ffmpeg; then
    FFMPEG_VERSION=$(ffmpeg -version | head -n1)
    info "FFmpeg: $FFMPEG_VERSION"
else
    warn "FFmpeg is not installed. Installing..."

    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo apt-get update
        sudo apt-get install -y ffmpeg
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        brew install ffmpeg
    else
        error "Unsupported OS for automatic FFmpeg installation. Please install FFmpeg manually."
        exit 1
    fi
fi

echo ""

###############################################################################
# 2. Install NPM Dependencies
###############################################################################

echo "Step 2: Installing NPM dependencies..."
echo ""

cd "$PROJECT_ROOT/estudio_ia_videos"

# Core dependencies (should already be installed)
info "Checking core dependencies..."
npm list microsoft-cognitiveservices-speech-sdk &>/dev/null || npm install microsoft-cognitiveservices-speech-sdk
npm list bullmq &>/dev/null || npm install bullmq
npm list ioredis &>/dev/null || npm install ioredis
npm list fluent-ffmpeg &>/dev/null || npm install fluent-ffmpeg
npm list @types/fluent-ffmpeg &>/dev/null || npm install --save-dev @types/fluent-ffmpeg

info "All NPM dependencies installed ✓"
echo ""

###############################################################################
# 3. Install Rhubarb Lip-Sync
###############################################################################

echo "Step 3: Installing Rhubarb Lip-Sync..."
echo ""

RHUBARB_VERSION="1.13.0"
RHUBARB_DIR="/tmp/rhubarb-install"
RHUBARB_INSTALL_PATH="/usr/local/bin"

# Check if Rhubarb is already installed
if command -v rhubarb &> /dev/null; then
    INSTALLED_VERSION=$(rhubarb --version 2>&1 | head -n1 || echo "unknown")
    info "Rhubarb is already installed: $INSTALLED_VERSION"
else
    info "Downloading Rhubarb Lip-Sync v$RHUBARB_VERSION..."

    mkdir -p "$RHUBARB_DIR"
    cd "$RHUBARB_DIR"

    # Detect OS and download appropriate version
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        RHUBARB_URL="https://github.com/DanielSWolf/rhubarb-lip-sync/releases/download/v${RHUBARB_VERSION}/Rhubarb-Lip-Sync-${RHUBARB_VERSION}-Linux.zip"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        RHUBARB_URL="https://github.com/DanielSWolf/rhubarb-lip-sync/releases/download/v${RHUBARB_VERSION}/Rhubarb-Lip-Sync-${RHUBARB_VERSION}-macOS.zip"
    else
        error "Unsupported OS for Rhubarb installation. Please install manually from:"
        error "https://github.com/DanielSWolf/rhubarb-lip-sync/releases"
        exit 1
    fi

    info "Downloading from: $RHUBARB_URL"
    curl -L -o rhubarb.zip "$RHUBARB_URL"

    info "Extracting..."
    unzip -q rhubarb.zip

    info "Installing to $RHUBARB_INSTALL_PATH..."
    sudo cp rhubarb "$RHUBARB_INSTALL_PATH/"
    sudo chmod +x "$RHUBARB_INSTALL_PATH/rhubarb"

    # Cleanup
    cd "$PROJECT_ROOT"
    rm -rf "$RHUBARB_DIR"

    info "Rhubarb Lip-Sync installed successfully ✓"
fi

# Verify installation
if rhubarb --version &>/dev/null; then
    RHUBARB_VERSION=$(rhubarb --version 2>&1 | head -n1)
    info "Rhubarb verification: $RHUBARB_VERSION ✓"
else
    error "Rhubarb installation verification failed"
    exit 1
fi

echo ""

###############################################################################
# 4. Create .env.local Template
###############################################################################

echo "Step 4: Setting up environment variables..."
echo ""

ENV_FILE="$PROJECT_ROOT/estudio_ia_videos/.env.local"

if [ -f "$ENV_FILE" ]; then
    info ".env.local already exists"
else
    info "Creating .env.local template..."

    cat > "$ENV_FILE" << 'EOF'
# ========================================
# FASE 1: LIP-SYNC CONFIGURATION
# ========================================

# Azure Speech SDK (CRÍTICO - Obtenha em: https://portal.azure.com)
AZURE_SPEECH_KEY="sua-chave-azure-aqui"
AZURE_SPEECH_REGION="eastus"

# Redis (para cache de visemes)
REDIS_URL="redis://localhost:6379"

# Rhubarb (opcional - paths customizados)
RHUBARB_BINARY_PATH="/usr/local/bin/rhubarb"
RHUBARB_TEMP_DIR="/tmp/rhubarb"

# ========================================
# DATABASE & EXISTING CONFIG
# ========================================
# (Keep your existing DATABASE_URL, SUPABASE_URL, etc.)

EOF

    info ".env.local template created ✓"
    warn "IMPORTANT: Edit .env.local and add your Azure Speech SDK credentials!"
fi

echo ""

###############################################################################
# 5. Test Redis Connection
###############################################################################

echo "Step 5: Testing Redis connection..."
echo ""

if redis-cli ping &>/dev/null; then
    info "Redis is running and accessible ✓"
else
    warn "Redis is not responding. Starting Redis..."

    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo systemctl start redis-server
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        brew services start redis
    fi

    sleep 2

    if redis-cli ping &>/dev/null; then
        info "Redis started successfully ✓"
    else
        error "Failed to start Redis. Please start it manually:"
        error "  Linux: sudo systemctl start redis-server"
        error "  macOS: brew services start redis"
    fi
fi

echo ""

###############################################################################
# 6. Create Test Directories
###############################################################################

echo "Step 6: Creating test directories..."
echo ""

mkdir -p "$PROJECT_ROOT/estudio_ia_videos/public/test-audio"
mkdir -p "/tmp/rhubarb"

info "Test directories created ✓"
echo ""

###############################################################################
# 7. Summary
###############################################################################

echo "=========================================="
echo "SETUP COMPLETE! ✓"
echo "=========================================="
echo ""
echo "Installed:"
echo "  ✓ Node.js: $(node --version)"
echo "  ✓ Redis: $(redis-cli --version | cut -d' ' -f2)"
echo "  ✓ FFmpeg: $(ffmpeg -version 2>&1 | head -n1 | cut -d' ' -f3)"
echo "  ✓ Rhubarb: $(rhubarb --version 2>&1 | head -n1)"
echo "  ✓ NPM dependencies (Azure SDK, BullMQ, etc.)"
echo ""
echo "Next Steps:"
echo "  1. Edit .env.local and add your Azure Speech SDK credentials"
echo "     Get them at: https://portal.azure.com"
echo ""
echo "  2. Run tests:"
echo "     cd estudio_ia_videos"
echo "     npm test -- src/__tests__/lib/avatar"
echo ""
echo "  3. Test lip-sync generation:"
echo "     npm run dev"
echo "     POST http://localhost:3000/api/lip-sync/generate"
echo "     { \"text\": \"Hello world\", \"voice\": \"pt-BR-FranciscaNeural\" }"
echo ""
echo "  4. Check service status:"
echo "     GET http://localhost:3000/api/lip-sync/generate"
echo ""
echo "Documentation:"
echo "  - FASE1_IMPLEMENTACAO_PROGRESSO.md"
echo "  - PLANO_IMPLEMENTACAO_COMPLETO.md"
echo ""
echo "=========================================="
