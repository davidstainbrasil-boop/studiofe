# Phase 2 Avatar System - Deployment Guide

**Version**: 1.0.0
**Last Updated**: 2026-01-18
**Status**: Production Ready

## Overview

This guide covers deployment of the Phase 2 Avatar System, including multi-tier avatar rendering with Ready Player Me, D-ID, HeyGen, and local Remotion rendering.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Configuration](#environment-configuration)
3. [Database Setup](#database-setup)
4. [BullMQ Queue Setup](#bullmq-queue-setup)
5. [Provider Configuration](#provider-configuration)
6. [Remotion Worker Setup](#remotion-worker-setup)
7. [Deployment Steps](#deployment-steps)
8. [Post-Deployment Verification](#post-deployment-verification)
9. [Monitoring](#monitoring)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### System Requirements

**Application Server**:

- Node.js v18+ or v20+
- 4GB RAM minimum (8GB recommended for HIGH tier rendering)
- 50GB storage minimum
- PostgreSQL 14+
- Redis 6+
- PM2 for process management

**Remotion Worker** (for HIGH tier rendering):

- Node.js v18+
- 8GB RAM minimum (16GB recommended)
- GPU recommended but not required
- FFmpeg with H.264 support

### Required Services

- [x] PostgreSQL database with Prisma schema
- [x] Redis instance (for BullMQ queues)
- [x] D-ID API account (STANDARD tier) - Optional
- [x] HeyGen API account (STANDARD tier) - Optional
- [x] Ready Player Me avatars (HIGH tier) - No API key needed

---

## Environment Configuration

### 1. Application Server (.env)

```bash
# Node Environment
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/video_tecnico"
DIRECT_URL="postgresql://user:pass@localhost:5432/video_tecnico"

# Redis (for BullMQ)
REDIS_URL=redis://localhost:6379

# Phase 2: Avatar Providers

# D-ID (STANDARD Tier)
DID_API_KEY=your_did_api_key_here
DID_API_URL=https://api.d-id.com

# HeyGen (STANDARD Tier - Backup)
HEYGEN_API_KEY=your_heygen_api_key_here
HEYGEN_API_URL=https://api.heygen.com/v2

# Ready Player Me (HIGH Tier)
RPM_CDN_URL=https://models.readyplayer.me
REMOTION_WORKERS=2  # Number of parallel rendering workers

# BullMQ Configuration
BULLMQ_CONCURRENCY=5        # Max concurrent jobs
BULLMQ_REMOVE_ON_COMPLETE=100  # Keep last 100 completed jobs
BULLMQ_REMOVE_ON_FAIL=1000     # Keep last 1000 failed jobs

# Remotion Configuration
REMOTION_TIMEOUT=300000     # 5 minutes timeout per render
REMOTION_QUALITY=high       # low | medium | high
REMOTION_CODEC=h264         # h264 | h265 | vp8 | vp9
REMOTION_BITRATE=10M        # Video bitrate

# Feature Flags
ENABLE_DID_PROVIDER=true
ENABLE_HEYGEN_PROVIDER=true
ENABLE_RPM_PROVIDER=true
ENABLE_FALLBACK_SYSTEM=true

# Monitoring
SENTRY_DSN=https://your-key@sentry.io/your-project
```

### 2. Remotion Worker (.env.remotion)

```bash
# Worker Configuration
NODE_ENV=production
REDIS_URL=redis://localhost:6379
DATABASE_URL="postgresql://user:pass@localhost:5432/video_tecnico"

# Remotion Settings
REMOTION_CONCURRENCY=2
REMOTION_TIMEOUT=300000
REMOTION_QUALITY=high

# Output Storage
VIDEO_OUTPUT_DIR=/var/www/videos
VIDEO_CDN_URL=https://cdn.example.com/videos
```

---

## Database Setup

### 1. Verify Prisma Schema

```bash
cd /root/_MVP_Video_TecnicoCursos_v7/estudio_ia_videos

# Check schema includes Phase 2 tables
cat prisma/schema.prisma | grep -A 10 "model video_jobs"
```

**Expected**:

```prisma
model video_jobs {
  id          String   @id
  user_id     String
  status      String   // pending | processing | completed | failed
  type        String   // rpm-avatar-render | did-avatar | heygen-avatar
  metadata    Json?
  created_at  DateTime @default(now())
  updated_at  DateTime @updatedAt
  completed_at DateTime?

  @@index([user_id])
  @@index([status])
  @@index([created_at])
}
```

### 2. Run Migrations

```bash
# Generate Prisma client
npx prisma generate

# Deploy migrations
npx prisma migrate deploy

# Verify video_jobs table exists
psql $DATABASE_URL -c "\d video_jobs"
```

### 3. Create Indexes for Performance

```sql
-- Create indexes for fast job lookups
CREATE INDEX IF NOT EXISTS idx_video_jobs_user_status
  ON video_jobs(user_id, status);

CREATE INDEX IF NOT EXISTS idx_video_jobs_type_status
  ON video_jobs(type, status);

CREATE INDEX IF NOT EXISTS idx_video_jobs_created_at_desc
  ON video_jobs(created_at DESC);
```

**Apply**:

```bash
psql $DATABASE_URL < /path/to/phase2-indexes.sql
```

---

## BullMQ Queue Setup

### 1. Install BullMQ Dependencies

```bash
cd /root/_MVP_Video_TecnicoCursos_v7/estudio_ia_videos

# Verify BullMQ is installed
npm list bullmq
# Should show: bullmq@5.x.x
```

### 2. Configure Redis for BullMQ

```bash
# Edit Redis config
sudo nano /etc/redis/redis.conf

# Add/update these settings:
maxmemory 1gb
maxmemory-policy noeviction  # Important for BullMQ
save 900 1
save 300 10

# Restart Redis
sudo systemctl restart redis

# Verify
redis-cli CONFIG GET maxmemory
redis-cli CONFIG GET maxmemory-policy
```

### 3. Test BullMQ Connection

```bash
node -e "
const { Queue } = require('bullmq');
const connection = { host: 'localhost', port: 6379 };

const queue = new Queue('test-queue', { connection });

queue.add('test-job', { foo: 'bar' })
  .then(() => {
    console.log('✅ BullMQ connected successfully');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ BullMQ connection failed:', err.message);
    process.exit(1);
  });
"
```

---

## Provider Configuration

### 1. D-ID Setup (STANDARD Tier)

**Get API Key**:

1. Sign up at https://studio.d-id.com/
2. Go to Settings → API Keys
3. Create new key
4. Add to `.env`:

```bash
DID_API_KEY=your_key_here
```

**Test Connection**:

```bash
curl https://api.d-id.com/talks \
  -H "Authorization: Basic $(echo -n YOUR_API_KEY | base64)" \
  -H "Content-Type: application/json" \
  -X GET

# Expected: 200 OK with list of talks
```

**Verify in Application**:

```bash
node -e "
const { DIDService } = require('./estudio_ia_videos/src/lib/services/avatar/did-service-real');
const service = new DIDService();

console.log('✅ D-ID service loaded');
console.log('API Key configured:', !!process.env.DID_API_KEY);
"
```

### 2. HeyGen Setup (STANDARD Tier - Backup)

**Get API Key**:

1. Sign up at https://www.heygen.com/
2. Navigate to API tab
3. Generate API key
4. Add to `.env`:

```bash
HEYGEN_API_KEY=your_key_here
```

**Test Connection**:

```bash
curl https://api.heygen.com/v2/avatars \
  -H "X-Api-Key: YOUR_API_KEY" \
  -X GET

# Expected: 200 OK with list of avatars
```

### 3. Ready Player Me Setup (HIGH Tier)

**No API key required** - RPM uses public CDN.

**Test GLB Access**:

```bash
# Test fetching a GLB model
curl -I https://models.readyplayer.me/65a8dba831b23abb4f401bae.glb

# Expected: 200 OK
# Content-Type: model/gltf-binary
# Content-Length: 2500000 (approximately)
```

**Create Test Avatar**:

1. Visit https://readyplayer.me/
2. Customize avatar
3. Click "Generate"
4. Copy GLB URL (format: `https://models.readyplayer.me/[id].glb`)
5. Save for testing

---

## Remotion Worker Setup

### 1. Install Remotion Dependencies

```bash
cd /root/_MVP_Video_TecnicoCursos_v7/estudio_ia_videos

# Verify Remotion packages
npm list @remotion/cli @remotion/renderer
# Should show v4.x

# Install system dependencies
sudo apt update
sudo apt install -y ffmpeg
ffmpeg -version  # Verify H.264 support
```

### 2. Create Worker Script

**File**: `/root/_MVP_Video_TecnicoCursos_v7/estudio_ia_videos/worker-remotion.js`

```javascript
const { Worker } = require('bullmq');
const { bundle } = require('@remotion/bundler');
const { renderMedia, selectComposition } = require('@remotion/renderer');
const { logger } = require('./src/lib/logger');

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
};

const worker = new Worker(
  'avatar-render',
  async (job) => {
    const { jobId, composition, inputProps } = job.data;

    logger.info('Starting Remotion render', { jobId, composition });

    try {
      // 1. Bundle Remotion project
      const bundleLocation = await bundle({
        entryPoint: './src/app/remotion/index.ts',
        webpackOverride: (config) => config,
      });

      // 2. Select composition
      const comp = await selectComposition({
        serveUrl: bundleLocation,
        id: composition,
        inputProps,
      });

      // 3. Render video
      const outputPath = `/var/www/videos/${jobId}.mp4`;

      await renderMedia({
        composition: comp,
        serveUrl: bundleLocation,
        codec: 'h264',
        outputLocation: outputPath,
        inputProps,
        onProgress: ({ progress }) => {
          job.updateProgress(Math.round(progress * 100));
        },
      });

      logger.info('Render completed', { jobId, outputPath });

      return {
        outputUrl: `${process.env.VIDEO_CDN_URL}/${jobId}.mp4`,
        outputPath,
      };
    } catch (error) {
      logger.error('Render failed', { jobId, error: error.message });
      throw error;
    }
  },
  {
    connection,
    concurrency: parseInt(process.env.REMOTION_WORKERS || '2', 10),
  },
);

worker.on('completed', (job) => {
  logger.info('Job completed', { jobId: job.id });
});

worker.on('failed', (job, err) => {
  logger.error('Job failed', { jobId: job.id, error: err.message });
});

logger.info('Remotion worker started', { concurrency: worker.opts.concurrency });
```

### 3. Configure PM2 for Worker

**File**: `/root/_MVP_Video_TecnicoCursos_v7/ecosystem-remotion.config.js`

```javascript
module.exports = {
  apps: [
    {
      name: 'remotion-worker',
      script: './estudio_ia_videos/worker-remotion.js',
      cwd: '/root/_MVP_Video_TecnicoCursos_v7',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '8G',
      env: {
        NODE_ENV: 'production',
        REDIS_URL: 'redis://localhost:6379',
        REMOTION_WORKERS: '2',
      },
      error_file: '/var/log/pm2/remotion-worker-error.log',
      out_file: '/var/log/pm2/remotion-worker-out.log',
      autorestart: true,
    },
  ],
};
```

### 4. Start Worker

```bash
# Start Remotion worker
pm2 start ecosystem-remotion.config.js

# Save configuration
pm2 save

# Verify running
pm2 list
pm2 logs remotion-worker --lines 50
```

---

## Deployment Steps

### Step 1: Pull Latest Code

```bash
cd /root/_MVP_Video_TecnicoCursos_v7

# Backup current version
git tag backup-$(date +%Y%m%d-%H%M%S)

# Pull Phase 2 code
git pull origin main

# Verify Phase 2 files exist
ls -lh estudio_ia_videos/src/lib/services/avatar/ready-player-me-service.ts
ls -lh estudio_ia_videos/src/app/remotion/components/RPMAvatarWithLipSync.tsx
```

### Step 2: Install Dependencies

```bash
cd estudio_ia_videos

# Install new dependencies
npm install

# Verify critical packages
npm list bullmq @remotion/cli @react-three/fiber three
```

### Step 3: Build Application

```bash
# Run build
npm run build

# Check for errors (warnings OK)
if [ $? -eq 0 ]; then
  echo "✅ Build successful"
else
  echo "❌ Build failed"
  exit 1
fi

# Verify build output
ls -lh .next/BUILD_ID
```

### Step 4: Run Database Migrations

```bash
# Generate Prisma client
npx prisma generate

# Deploy migrations
npx prisma migrate deploy

# Verify video_jobs table
psql $DATABASE_URL -c "SELECT COUNT(*) FROM video_jobs"
```

### Step 5: Update Environment Variables

```bash
# Add Phase 2 variables to .env
cat >> .env << 'EOF'

# Phase 2: Avatar System
DID_API_KEY=your_did_key
HEYGEN_API_KEY=your_heygen_key
RPM_CDN_URL=https://models.readyplayer.me
REMOTION_WORKERS=2
BULLMQ_CONCURRENCY=5
ENABLE_RPM_PROVIDER=true
EOF

# Verify all required variables
node -e "
const required = ['DID_API_KEY', 'REMOTION_WORKERS', 'REDIS_URL'];
const missing = required.filter(v => !process.env[v]);
if (missing.length > 0) {
  console.error('❌ Missing:', missing.join(', '));
  process.exit(1);
}
console.log('✅ All Phase 2 variables configured');
"
```

### Step 6: Restart Services

```bash
# Restart main application
pm2 restart mvp-video

# Start Remotion worker (if not already running)
pm2 start ecosystem-remotion.config.js

# Save PM2 configuration
pm2 save

# Verify all services running
pm2 list
```

### Step 7: Verify Health

```bash
# Wait for startup
sleep 10

# Check application health
curl http://localhost:3000/api/health

# Check Remotion worker logs
pm2 logs remotion-worker --lines 20 --nostream

# Check Redis queues
redis-cli KEYS "bull:avatar-render:*"
```

---

## Post-Deployment Verification

### 1. Test PLACEHOLDER Tier (Quick)

```bash
bash test-avatar-placeholder.sh

# Expected output:
# ✅ PLACEHOLDER tier functional
# Time: <1s
# Credits: 0
```

### 2. Test STANDARD Tier (D-ID)

```bash
# Only if DID_API_KEY is configured
if [ -n "$DID_API_KEY" ]; then
  bash test-avatar-standard-did.sh
fi

# Expected output:
# ✅ D-ID job created
# ✅ Render time: ~45s
# ✅ Credits: 1
```

### 3. Test HIGH Tier (Ready Player Me)

```bash
bash test-avatar-high-rpm.sh

# Expected output:
# ✅ GLB fetched
# ✅ Blend shapes applied
# ✅ Remotion render completed
# ✅ Render time: ~120s
# ✅ Credits: 3
```

### 4. Run Full Validation Suite

```bash
bash test-validation-quick.sh

# Expected: 8/8 tests passing
```

### 5. Verify API Endpoints

```bash
# Test render endpoint
curl -X POST http://localhost:3000/api/v2/avatars/render \
  -H "Content-Type: application/json" \
  -H "x-user-id: test-user" \
  -d '{
    "text": "Teste de deployment",
    "quality": "PLACEHOLDER"
  }'

# Expected: { "success": true, "jobId": "..." }

# Test status endpoint
curl http://localhost:3000/api/v2/avatars/status/[jobId] \
  -H "x-user-id: test-user"

# Expected: { "status": "completed", "videoUrl": "..." }
```

---

## Monitoring

### 1. Application Metrics

```bash
# Check PM2 status
pm2 status

# Monitor memory usage
pm2 monit

# View logs
pm2 logs mvp-video --lines 100
pm2 logs remotion-worker --lines 100
```

### 2. Queue Metrics

```bash
# Check BullMQ queues
redis-cli KEYS "bull:avatar-render:*"

# Count pending jobs
redis-cli LLEN "bull:avatar-render:wait"

# Count active jobs
redis-cli LLEN "bull:avatar-render:active"

# Count completed jobs
redis-cli LLEN "bull:avatar-render:completed"
```

### 3. Provider Health

```bash
# Check provider success rates (last 24 hours)
psql $DATABASE_URL << 'SQL'
SELECT
  type,
  status,
  COUNT(*) as count,
  ROUND(AVG(EXTRACT(EPOCH FROM (completed_at - created_at))), 2) as avg_seconds
FROM video_jobs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY type, status
ORDER BY type, status;
SQL
```

### 4. Set Up Alerts

**Create monitoring script**:

```bash
cat > /root/monitor-phase2.sh << 'EOF'
#!/bin/bash

# Check Remotion worker
if ! pm2 list | grep -q "remotion-worker.*online"; then
  echo "❌ Remotion worker not running"
  pm2 restart remotion-worker
fi

# Check BullMQ queue depth
QUEUE_DEPTH=$(redis-cli LLEN "bull:avatar-render:wait")
if [ "$QUEUE_DEPTH" -gt 100 ]; then
  echo "⚠️  Queue depth high: $QUEUE_DEPTH jobs"
fi

# Check failed jobs
FAILED_COUNT=$(redis-cli LLEN "bull:avatar-render:failed")
if [ "$FAILED_COUNT" -gt 50 ]; then
  echo "⚠️  High failed job count: $FAILED_COUNT"
fi
EOF

chmod +x /root/monitor-phase2.sh

# Add to crontab (every 5 minutes)
(crontab -l 2>/dev/null; echo "*/5 * * * * /root/monitor-phase2.sh >> /var/log/monitor-phase2.log 2>&1") | crontab -
```

---

## Troubleshooting

### Remotion Worker Not Processing Jobs

**Check**:

```bash
# Verify worker is running
pm2 list | grep remotion-worker

# Check worker logs
pm2 logs remotion-worker --lines 100 --err

# Test BullMQ connection
redis-cli PING

# Check queue
redis-cli LLEN "bull:avatar-render:wait"
redis-cli LLEN "bull:avatar-render:active"
```

**Solutions**:

```bash
# Restart worker
pm2 restart remotion-worker

# Clear stuck jobs
redis-cli DEL "bull:avatar-render:active"

# Increase concurrency if needed
pm2 delete remotion-worker
pm2 start ecosystem-remotion.config.js --env REMOTION_WORKERS=4
```

### GLB Model Download Fails

**Symptoms**: 404 errors when fetching Ready Player Me models

**Check**:

```bash
# Test GLB URL directly
curl -I https://models.readyplayer.me/65a8dba831b23abb4f401bae.glb

# Check application logs
pm2 logs mvp-video | grep "GLB"
```

**Solutions**:

- Verify avatar ID is correct
- Check network connectivity
- Try alternative RPM CDN URL (`api.readyplayer.me`)

### High Memory Usage on Remotion Worker

**Check**:

```bash
# Monitor memory
pm2 monit

# Check concurrent renders
redis-cli LLEN "bull:avatar-render:active"
```

**Solutions**:

```bash
# Reduce concurrency
pm2 delete remotion-worker
pm2 start ecosystem-remotion.config.js --env REMOTION_WORKERS=1

# Increase max memory
# Edit ecosystem-remotion.config.js:
# max_memory_restart: '12G'
pm2 restart remotion-worker
```

### D-ID/HeyGen API Errors

**Check**:

```bash
# Verify API keys
echo $DID_API_KEY
echo $HEYGEN_API_KEY

# Test API directly
curl https://api.d-id.com/talks \
  -H "Authorization: Basic $(echo -n $DID_API_KEY | base64)"
```

**Solutions**:

- Verify API key is valid and not expired
- Check API rate limits
- Enable fallback system: `ENABLE_FALLBACK_SYSTEM=true`

---

## Deployment Checklist

### Pre-Deployment

- [ ] Phase 2 code tested locally
- [ ] All 8/8 validation tests passing
- [ ] Provider API keys configured
- [ ] Database migration plan ready
- [ ] Backup created
- [ ] Deployment window scheduled

### Deployment

- [ ] Pull latest code
- [ ] Install dependencies
- [ ] Run migrations
- [ ] Build application
- [ ] Update environment variables
- [ ] Restart application server
- [ ] Start Remotion worker
- [ ] Verify health checks

### Post-Deployment

- [ ] All validation tests passing
- [ ] APIs responding correctly
- [ ] BullMQ queues processing
- [ ] Remotion worker rendering
- [ ] No errors in logs (15 min monitoring)
- [ ] Test each quality tier
- [ ] Monitor memory/CPU usage
- [ ] Document any issues

---

## Rollback Plan

### Quick Rollback (< 5 minutes)

```bash
# Stop services
pm2 stop mvp-video remotion-worker

# Checkout previous version
cd /root/_MVP_Video_TecnicoCursos_v7
git checkout backup-<timestamp>

# Rebuild
cd estudio_ia_videos
npm run build

# Restart
pm2 restart mvp-video remotion-worker

# Verify
curl http://localhost:3000/api/health
```

---

## Support

- **API Reference**: [FASE2_API_REFERENCE.md](./FASE2_API_REFERENCE.md)
- **Provider Guide**: [FASE2_PROVIDER_GUIDE.md](./FASE2_PROVIDER_GUIDE.md)
- **Testing Guide**: [FASE2_TESTING.md](./FASE2_TESTING.md)
- **Status Report**: [FASE2_FINAL_STATUS.md](./FASE2_FINAL_STATUS.md)

---

**Last Updated**: 2026-01-18
**Version**: 1.0.0
**Phase**: 2 (Complete)
