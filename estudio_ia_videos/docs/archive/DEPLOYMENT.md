# Production Deployment Guide

## 🎯 Overview
This guide covers deploying the MVP Video Platform to production.

## ✅ Pre-Deployment Checklist

### 1. Environment Configuration
- [ ] Copy `.env.production.template` to `.env.production`
- [ ] Fill in all required environment variables:
  - [ ] DATABASE_URL
  - [ ] SUPABASE credentials
  - [ ] REDIS_URL
  - [ ] AWS credentials (S3 + CloudFront)
  - [ ] NEXTAUTH_SECRET (min 32 chars)
  - [ ] SENTRY_DSN (optional but recommended)
  - [ ] API keys (OpenAI, ElevenLabs, HeyGen)

### 2. Infrastructure Setup
- [ ] PostgreSQL database provisioned
- [ ] Redis instance running
- [ ] AWS S3 bucket created
- [ ] CloudFront distribution configured
- [ ] Domain DNS configured
- [ ] SSL certificate active

### 3. Code Preparation
- [ ] All tests passing locally
- [ ] Build successful (`npm run build`)
- [ ] No TypeScript errors
- [ ] Git repository clean
- [ ] Latest changes pushed to `main` branch

## 🚀 Deployment Methods

### Option A: Vercel (Recommended for MVP)

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Login
vercel login

# 3. Link project
vercel link

# 4. Set environment variables
vercel env add DATABASE_URL production
vercel env add REDIS_URL production
# ... (repeat for all env vars)

# 5. Deploy
vercel --prod
```

**Vercel Configuration:**
- Framework: Next.js
- Build Command: `npm run build`
- Output Directory: `.next`
- Install Command: `npm ci --legacy-peer-deps`

### Option B: Self-Hosted (VPS/AWS EC2)

```bash
# 1. SSH into server
ssh user@your-server.com

# 2. Clone repository
git clone YOUR_REPO_URL /var/www/production
cd /var/www/production/estudio_ia_videos

# 3. Install dependencies
npm ci --legacy-peer-deps

# 4. Configure environment
cp .env.production.template .env.production
nano .env.production  # Fill in values

# 5. Run deployment script
./scripts/deploy-production.sh

# 6. Start with PM2 (auto-restart)
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup  # Follow instructions
```

### Option C: Docker

```bash
# 1. Build image
docker build -t mvp-video-app:latest .

# 2. Run container
docker run -d \
  --name mvp-video-app \
  -p 3000:3000 \
  --env-file .env.production \
  --restart unless-stopped \
  mvp-video-app:latest

# 3. Check health
curl http://localhost:3000/api/health
```

## 🔍 Post-Deployment Verification

### 1. Health Check
```bash
curl https://your-domain.com/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "checks": {
    "database": {"status": "healthy", "latency": 15},
    "cache": {"status": "healthy", "latency": 5},
    "storage": {"status": "healthy", "latency": 0}
  }
}
```

### 2. Admin Dashboard
Navigate to: `https://your-domain.com/admin/monitoring`
- Check rate limit status
- Verify cache warming is active
- Review recent activity

### 3. Test Critical Flows
- [ ] User registration/login
- [ ] PPTX upload
- [ ] Video render job creation
- [ ] TTS generation
- [ ] Video download

### 4. Monitoring Setup
```bash
# Setup PM2 monitoring (if self-hosted)
pm2 install pm2-logrotate

# View logs
pm2 logs mvp-video-app

# Monitor resources
pm2 monit
```

## 📊 Performance Optimization

### CDN Configuration
Once deployed, test CDN:
```bash
# Video should be served from CloudFront
curl -I https://your-cloudfront-domain.net/videos/test.mp4
# Should return: X-Cache: Hit from cloudfront
```

### Cache Warming
Cache is automatically warmed on startup. Manual trigger:
```bash
curl -X POST https://your-domain.com/api/admin/cache/warm \
  -H "Cookie: your-session-cookie"
```

### Rate Limiting
Monitor at: `https://your-domain.com/admin/monitoring`

## 🚨 Rollback Procedure

### Vercel
```bash
# List deployments
vercel ls

# Rollback to previous
vercel rollback YOUR_DEPLOYMENT_URL
```

### Self-Hosted
```bash
# Using PM2
pm2 stop mvp-video-app

# Revert git
git reset --hard HEAD~1

# Rebuild
npm run build

# Restart
pm2 restart mvp-video-app
```

## 📈 Scaling Considerations

### Horizontal Scaling
PM2 cluster mode (already configured):
```bash
pm2 scale mvp-video-app +2  # Add 2 more instances
```

### Database Scaling
- Enable connection pooling (already configured in Prisma)
- Consider read replicas for heavy read loads
- Monitor slow queries via Prisma logs

### Redis Scaling
- Use Redis Cluster for high availability
- Configure persistence (RDB + AOF)

## 🔐 Security Checklist

- [ ] HTTPS enforced (SSL certificate)
- [ ] Environment variables stored securely
- [ ] Database connection encrypted
- [ ] Rate limiting active
- [ ] CORS configured properly
- [ ] Sentry error tracking enabled
- [ ] Regular automated backups

## 📞 Support & Troubleshooting

### Common Issues

**Build fails:**
```bash
# Clear cache and rebuild
rm -rf .next node_modules
npm ci --legacy-peer-deps
npm run build
```

**Database connection errors:**
- Verify DATABASE_URL format
- Check firewall rules
- Test connection: `npx prisma db pull`

**Redis connection issues:**
- Verify REDIS_URL
- Check Redis server status
- Test: `redis-cli ping`

**CDN not working:**
- Verify AWS credentials
- Check CloudFront distribution status
- Review S3 bucket permissions

### Monitoring Dashboards
- Application: `/admin/monitoring`
- PM2 (self-hosted): `pm2 monit`
- Sentry: `https://sentry.io/organizations/YOUR_ORG/`

## 🎉 Success Criteria

Deployment is successful when:
- ✅ Health check returns `200 OK`
- ✅ All admin dashboards accessible
- ✅ User can register and login
- ✅ Video upload and render working
- ✅ No critical errors in logs (first 30 minutes)
- ✅ CPU < 70%, Memory < 80%
- ✅ Response times < 500ms (p95)

---

**Deployment Automation:**
For CI/CD, see `.github/workflows/` (if exists) or configure:
1. GitHub Actions for automated testing
2. Auto-deploy to staging on `staging` branch push
3. Manual approval for production deploy

**Next Steps:**
1. Monitor for 24 hours
2. Run performance testing (Lighthouse, K6)
3. Security audit (OWASP ZAP)
4. User acceptance testing
5. Go-Live announcement 🚀
