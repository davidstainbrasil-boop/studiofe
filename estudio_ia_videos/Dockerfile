# Base image with Node.js 20 (LTS) on Debian Bullseye
FROM node:20-bullseye

# Install system dependencies
# - Python 3 & Pip (for edge-tts)
# - FFmpeg (for video processing)
# - Fonts (Critical for video rendering text correctly)
# REMOVED: chromium (installed via Playwright/Puppeteer instead to avoid apt errors)
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    fonts-liberation \
    fonts-noto-color-emoji \
    fonts-freefont-ttf \
    && rm -rf /var/lib/apt/lists/*

# Install edge-tts globally via pip
# Using --break-system-packages because we are in a container
RUN pip3 install edge-tts

# Set working directory
WORKDIR /app

# Copy root package files
COPY package.json package-lock.json* ./

# Install root dependencies (including Playwright) and clean cache
RUN npm install --legacy-peer-deps && npm cache clean --force

# Install Playwright browsers and dependencies
# This replaces the apt-get chromium installation
RUN npx playwright install chromium --with-deps

# Create directory for the Next.js app
WORKDIR /app/estudio_ia_videos

# Copy Next.js app package files
COPY estudio_ia_videos/package.json estudio_ia_videos/package-lock.json* ./

# Copy Prisma schema for postinstall generation
COPY estudio_ia_videos/prisma ./prisma

# Install Next.js app dependencies
# We use --legacy-peer-deps to avoid potential conflicts
# Note: Puppeteer will download its own Chromium here since we removed PUPPETEER_SKIP_CHROMIUM_DOWNLOAD
RUN npm install --legacy-peer-deps && npm cache clean --force

# Return to root to copy the rest of the project
WORKDIR /app

# Copy the rest of the source code
COPY . .

# Create directories for artifacts and set permissions
# 777 is used here to ensure the node user or any other user can write to these directories
RUN mkdir -p estudio_ia_videos/public/tts-audio \
    estudio_ia_videos/public/videos \
    estudio_ia_videos/public/uploads \
    logs \
    && chmod -R 777 estudio_ia_videos/public \
    && chmod -R 777 logs

# Build Next.js app
RUN echo "Starting build..." && cd estudio_ia_videos && npm run build && echo "Build complete!" && ls -la .next || echo "Build failed or .next missing"

# Set environment variables
# EDGE_TTS_PATH for edge-tts
# Removed PUPPETEER_EXECUTABLE_PATH and PUPPETEER_SKIP_CHROMIUM_DOWNLOAD to let libraries manage browsers
ENV EDGE_TTS_PATH=edge-tts

# Default command to run the worker
CMD ["node", "scripts/render-worker.js"]
