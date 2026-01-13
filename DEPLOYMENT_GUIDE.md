# 🚀 Production Deployment Guide

**Version:** 1.4 (Post-Sprint 4)
**Date:** 2026-01-13
**System:** MVP Video Platform (https://cursostecno.com.br)

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Environment Configuration](#environment-configuration)
4. [Database Setup](#database-setup)
5. [Redis Setup](#redis-setup)
6. [Application Deployment](#application-deployment)
7. [PM2 Configuration](#pm2-configuration)
8. [Post-Deployment Verification](#post-deployment-verification)
9. [Monitoring Setup](#monitoring-setup)
10. [Troubleshooting](#troubleshooting)
11. [Rollback Procedures](#rollback-procedures)

---

## Prerequisites

### System Requirements

- **OS:** Ubuntu 20.04+ / Debian 10+
- **Node.js:** v18.x or v20.x
- **npm:** v9.x or v10.x
- **PostgreSQL:** v14+
- **Redis:** v6.x or v7.x
- **PM2:** v5.x
- **Memory:** 2GB minimum, 4GB recommended
- **Storage:** 20GB minimum, 50GB recommended

### Required Access

- [ ] Root or sudo access to server
- [ ] Database admin credentials
- [ ] Redis access
- [ ] Git repository access
- [ ] Environment variables (`.env` file)

---

## Initial Setup

### 1. Clone Repository

```bash
# Clone the repository
cd /root
git clone <repository-url> _MVP_Video_TecnicoCursos_v7
cd _MVP_Video_TecnicoCursos_v7/estudio_ia_videos

# Checkout production branch
git checkout production  # or main/master
```

### 2. Install Dependencies

```bash
# Install Node.js dependencies
npm install --production=false

# Install PM2 globally (if not already installed)
npm install -g pm2

# Verify installations
node --version
npm --version
pm2 --version
```

### 3. Install System Dependencies

```bash
# PostgreSQL (if not installed)
sudo apt update
sudo apt install postgresql postgresql-contrib

# Redis (if not installed)
sudo apt install redis-server

# FFmpeg (for video processing)
sudo apt install ffmpeg

# Verify installations
psql --version
redis-cli --version
ffmpeg -version
```

---

## Environment Configuration

### 1. Create Environment File

```bash
cd /root/_MVP_Video_TecnicoCursos_v7
cp .env.example .env
nano .env
```

### 2. Required Environment Variables

```bash
# Node Environment
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0

# Database (PostgreSQL)
DATABASE_URL="postgresql://username:password@localhost:5432/video_tecnico"
DIRECT_URL="postgresql://username:password@localhost:5432/video_tecnico"

# Supabase (Authentication)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Redis (Caching & Rate Limiting)
REDIS_URL=redis://localhost:6379

# TTS Services
ELEVENLABS_API_KEY=your-elevenlabs-key
AZURE_TTS_KEY=your-azure-key
AZURE_TTS_REGION=eastus

# Sentry (Monitoring) - Optional but recommended
SENTRY_DSN=https://your-key@sentry.io/your-project
SENTRY_AUTH_TOKEN=your-sentry-auth-token

# Cron Secret (for automated cleanup)
CRON_SECRET=your-secure-random-string

# File Upload
MAX_FILE_SIZE=104857600  # 100MB in bytes
UPLOAD_DIR=/root/_MVP_Video_TecnicoCursos_v7/estudio_ia_videos/public/uploads

# Admin
ADMIN_SECRET=your-admin-secret
```

### 3. Generate Secrets

```bash
# Generate secure random secrets
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Use output for CRON_SECRET, ADMIN_SECRET, etc.
```

### 4. Validate Environment

```bash
# Check all required variables are set
node -e "
const requiredVars = ['DATABASE_URL', 'REDIS_URL', 'NEXT_PUBLIC_SUPABASE_URL'];
const missing = requiredVars.filter(v => !process.env[v]);
if (missing.length > 0) {
  console.error('❌ Missing variables:', missing.join(', '));
  process.exit(1);
}
console.log('✅ All required environment variables set');
"
```

---

## Database Setup

### 1. Create Database

```bash
# Connect to PostgreSQL
sudo -u postgres psql

# Create database and user
CREATE DATABASE video_tecnico;
CREATE USER video_user WITH ENCRYPTED PASSWORD 'your-secure-password';
GRANT ALL PRIVILEGES ON DATABASE video_tecnico TO video_user;
\q
```

### 2. Run Migrations

```bash
cd /root/_MVP_Video_TecnicoCursos_v7/estudio_ia_videos

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Verify database schema
npx prisma db pull
```

### 3. Create Indexes (Sprint 3)

```bash
# Apply performance indexes
npx prisma db execute --file ../migrations/sprint3-add-indexes.sql --schema prisma/schema.prisma

# Verify indexes
psql $DATABASE_URL -c "\di"
```

### 4. Seed Initial Data (Optional)

```bash
# Seed templates, defaults, etc.
npx prisma db seed
```

---

## Redis Setup

### 1. Configure Redis

```bash
# Edit Redis configuration
sudo nano /etc/redis/redis.conf

# Recommended settings:
maxmemory 512mb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
```

### 2. Start Redis

```bash
# Start Redis service
sudo systemctl start redis
sudo systemctl enable redis

# Verify Redis is running
redis-cli ping
# Should return: PONG

# Check Redis info
redis-cli INFO | grep -E "version|uptime|connected_clients|used_memory"
```

### 3. Test Redis Connection

```bash
# Test from application
node -e "
const Redis = require('ioredis');
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
redis.ping().then(result => {
  console.log('✅ Redis connected:', result);
  redis.disconnect();
}).catch(err => {
  console.error('❌ Redis connection failed:', err.message);
  process.exit(1);
});
"
```

---

## Application Deployment

### 1. Build Application

```bash
cd /root/_MVP_Video_TecnicoCursos_v7/estudio_ia_videos

# Run TypeScript check (warnings are OK)
npm run build

# Verify build output
ls -lh .next/BUILD_ID
```

### 2. Create Required Directories

```bash
# Create upload directories
mkdir -p /root/_MVP_Video_TecnicoCursos_v7/estudio_ia_videos/public/uploads/pptx-images
mkdir -p /root/_MVP_Video_TecnicoCursos_v7/estudio_ia_videos/public/uploads/videos
mkdir -p /root/_MVP_Video_TecnicoCursos_v7/estudio_ia_videos/public/uploads/audio

# Create log directories
sudo mkdir -p /var/log/pm2
sudo mkdir -p /var/log/cleanup-cron

# Set permissions
sudo chown -R $USER:$USER /var/log/pm2
sudo chown -R $USER:$USER /var/log/cleanup-cron
```

### 3. Test Application Locally

```bash
# Test server startup
node server.js &
SERVER_PID=$!

# Wait for startup
sleep 5

# Test health endpoint
curl http://localhost:3000/api/health

# Check response
if [ $? -eq 0 ]; then
  echo "✅ Server started successfully"
else
  echo "❌ Server failed to start"
fi

# Stop test server
kill $SERVER_PID
```

---

## PM2 Configuration

### 1. Configure PM2

```bash
cd /root/_MVP_Video_TecnicoCursos_v7

# Use the ecosystem config file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'mvp-video',
      script: './estudio_ia_videos/server.js',
      cwd: '/root/_MVP_Video_TecnicoCursos_v7',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: '/var/log/pm2/mvp-video-error.log',
      out_file: '/var/log/pm2/mvp-video-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      listen_timeout: 10000,
      kill_timeout: 5000,
    }
  ]
};
EOF
```

### 2. Start with PM2

```bash
# Start application
pm2 start ecosystem.config.js

# Save PM2 configuration (survives reboots)
pm2 save

# Setup PM2 startup script
pm2 startup
# Follow the command output instructions

# Verify process is running
pm2 list
pm2 logs mvp-video --lines 50
```

### 3. Configure Automated Cleanup Cron

```bash
# Make cleanup script executable
chmod +x /root/_MVP_Video_TecnicoCursos_v7/scripts/daily-cleanup.sh

# Add to PM2 (runs daily at 2 AM)
pm2 start /root/_MVP_Video_TecnicoCursos_v7/ecosystem-cron.config.js

# Save configuration
pm2 save
```

---

## Post-Deployment Verification

### 1. Health Checks

```bash
# Application health
curl https://cursostecno.com.br/api/health
# Expected: {"status":"ok","timestamp":"..."}

# Database connectivity
curl https://cursostecno.com.br/api/health/db
# Expected: {"database":"connected"}

# Redis connectivity
redis-cli ping
# Expected: PONG
```

### 2. Verify Cache Warming

```bash
# Check PM2 logs for cache warming
pm2 logs mvp-video --lines 100 | grep -i "cache warming"

# Expected output:
# 🔥 Starting cache warming...
# ✅ Cache warming initiated (running in background)
# Templates cache warmed
# User tiers cache warmed
# ...

# Check Redis keys
redis-cli KEYS "*" | wc -l
# Should show 50-100+ keys (including queues and cache)
```

### 3. Verify Rate Limiting

```bash
# Test rate limiting endpoint
curl -I https://cursostecno.com.br/api/render/start -X POST

# Check for rate limit headers
# X-RateLimit-Limit: 100
# X-RateLimit-Remaining: 99
```

### 4. Verify Monitoring

```bash
# Check Sentry is receiving events
curl https://cursostecno.com.br/api/test-error

# Check Sentry dashboard for new error
# https://sentry.io/organizations/your-org/projects/
```

### 5. Admin Dashboard

```bash
# Access admin dashboard
open https://cursostecno.com.br/admin/dashboard

# Verify metrics showing:
# - System health
# - Circuit breaker status
# - Queue metrics
# - Cache statistics (if implemented)
```

---

## Monitoring Setup

### 1. PM2 Monitoring

```bash
# Install PM2 monitoring (optional)
pm2 install pm2-logrotate

# Configure log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
pm2 set pm2-logrotate:compress true
```

### 2. System Monitoring

```bash
# Monitor application
pm2 monit

# Or use
pm2 status
pm2 logs mvp-video --lines 100

# Monitor Redis
redis-cli INFO stats
redis-cli INFO memory

# Monitor Database
psql $DATABASE_URL -c "
SELECT
  schemaname,
  tablename,
  n_live_tup as live_tuples,
  n_dead_tup as dead_tuples
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;
"
```

### 3. Set Up Alerts

```bash
# Create monitoring script
cat > /root/monitor.sh << 'EOF'
#!/bin/bash
# Check if application is responding
if ! curl -f -s http://localhost:3000/api/health > /dev/null; then
  echo "❌ Application not responding, restarting..."
  pm2 restart mvp-video
  # Send alert (email, Slack, etc.)
fi

# Check Redis
if ! redis-cli ping > /dev/null 2>&1; then
  echo "❌ Redis not responding"
  sudo systemctl restart redis
fi

# Check disk space
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
  echo "⚠️  Disk usage above 80%: ${DISK_USAGE}%"
  # Trigger cleanup
  /root/_MVP_Video_TecnicoCursos_v7/scripts/daily-cleanup.sh
fi
EOF

chmod +x /root/monitor.sh

# Add to crontab (every 5 minutes)
(crontab -l 2>/dev/null; echo "*/5 * * * * /root/monitor.sh >> /var/log/monitor.log 2>&1") | crontab -
```

---

## Troubleshooting

### Application Won't Start

**Symptoms:** PM2 shows "errored" or keeps restarting

**Solutions:**

```bash
# Check PM2 logs
pm2 logs mvp-video --err --lines 100

# Common issues:
# 1. Missing environment variables
grep -E "DATABASE_URL|REDIS_URL" /root/_MVP_Video_TecnicoCursos_v7/.env

# 2. Port already in use
sudo lsof -i :3000
# Kill process if needed: kill -9 <PID>

# 3. Database connection failed
psql $DATABASE_URL -c "SELECT 1"

# 4. Redis connection failed
redis-cli ping

# 5. Build artifacts missing
ls -la /root/_MVP_Video_TecnicoCursos_v7/estudio_ia_videos/.next
# Rebuild if needed: npm run build
```

### High Memory Usage

**Symptoms:** PM2 shows high memory, frequent restarts

**Solutions:**

```bash
# Check memory usage
pm2 list
free -h

# Increase max memory if needed
pm2 delete mvp-video
pm2 start ecosystem.config.js --max-memory-restart 2G

# Check for memory leaks
pm2 monit
# Look for steadily increasing memory

# Clear Redis if needed
redis-cli FLUSHALL
```

### Cache Not Working

**Symptoms:** Slow queries, Redis keys not appearing

**Solutions:**

```bash
# Check Redis connection
redis-cli ping
redis-cli INFO stats

# Check Redis keys
redis-cli KEYS "*"

# Verify REDIS_URL
echo $REDIS_URL

# Test cache manually
redis-cli SET test "value"
redis-cli GET test
redis-cli DEL test

# Check application logs
pm2 logs mvp-video | grep -i cache
```

### Rate Limiting Not Working

**Symptoms:** No rate limit headers, unlimited requests

**Solutions:**

```bash
# Check rate limit keys in Redis
redis-cli KEYS "rl:*"

# Test rate limiting
for i in {1..110}; do
  curl -s -o /dev/null -w "%{http_code}\n" \
    https://cursostecno.com.br/api/render/start -X POST
done | sort | uniq -c

# Check logs
pm2 logs mvp-video | grep -i "rate limit"

# Verify tier detection
redis-cli KEYS "user:*:tier"
```

### Database Performance Issues

**Symptoms:** Slow queries, high CPU

**Solutions:**

```bash
# Check database stats
psql $DATABASE_URL -c "
SELECT
  query,
  calls,
  total_time,
  mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
"

# Check indexes
psql $DATABASE_URL -c "\di"

# Re-apply indexes if needed
cd /root/_MVP_Video_TecnicoCursos_v7
npx prisma db execute --file migrations/sprint3-add-indexes.sql --schema estudio_ia_videos/prisma/schema.prisma

# Analyze tables
psql $DATABASE_URL -c "ANALYZE;"
```

---

## Rollback Procedures

### Quick Rollback (< 5 minutes)

```bash
# Stop application
pm2 stop mvp-video

# Checkout previous version
cd /root/_MVP_Video_TecnicoCursos_v7
git log --oneline -5
git checkout <previous-commit-hash>

# Rebuild
cd estudio_ia_videos
npm run build

# Restart
pm2 restart mvp-video

# Verify
curl https://cursostecno.com.br/api/health
```

### Database Rollback

```bash
# Rollback last migration
cd /root/_MVP_Video_TecnicoCursos_v7/estudio_ia_videos
npx prisma migrate resolve --rolled-back <migration-name>

# Or restore from backup
pg_restore -U video_user -d video_tecnico backup.sql
```

### Redis Rollback

```bash
# Clear all cache (fresh start)
redis-cli FLUSHALL

# Or restore from RDB backup
sudo cp /var/lib/redis/dump.rdb.backup /var/lib/redis/dump.rdb
sudo systemctl restart redis
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] Code reviewed and tested
- [ ] Environment variables updated
- [ ] Database migrations ready
- [ ] Backup created
- [ ] Deployment window scheduled
- [ ] Team notified

### Deployment

- [ ] Pull latest code
- [ ] Install dependencies
- [ ] Run migrations
- [ ] Build application
- [ ] Test locally
- [ ] Deploy with PM2
- [ ] Verify health checks

### Post-Deployment

- [ ] Monitor logs for 15 minutes
- [ ] Check error rate in Sentry
- [ ] Verify cache warming worked
- [ ] Test critical endpoints
- [ ] Check Redis memory usage
- [ ] Monitor user reports
- [ ] Document any issues

---

## Useful Commands

```bash
# Application
pm2 restart mvp-video          # Restart app
pm2 logs mvp-video --lines 100 # View logs
pm2 monit                       # Monitor resources
pm2 flush                       # Clear logs

# Redis
redis-cli KEYS "*"              # List all keys
redis-cli INFO stats            # View stats
redis-cli FLUSHALL              # Clear all data
redis-cli MONITOR               # Watch commands

# Database
psql $DATABASE_URL              # Connect to DB
npx prisma studio               # GUI for DB
npx prisma migrate status       # Check migrations

# System
df -h                           # Disk space
free -h                         # Memory usage
top                             # CPU usage
journalctl -u pm2-root          # System logs
```

---

## Support & Documentation

- **Full Documentation:** See [ALL_SPRINTS_SUMMARY.md](ALL_SPRINTS_SUMMARY.md)
- **Sprint 4 Guide:** [SPRINT_4_QUICK_START.md](SPRINT_4_QUICK_START.md)
- **Production Summary:** [PRODUCTION_READY_SUMMARY.md](PRODUCTION_READY_SUMMARY.md)
- **Next Steps:** [NEXT_STEPS_RECOMMENDATIONS.md](NEXT_STEPS_RECOMMENDATIONS.md)

---

**END OF DEPLOYMENT GUIDE**

**Last Updated:** 2026-01-13
**Version:** 1.4 (Post-Sprint 4)
