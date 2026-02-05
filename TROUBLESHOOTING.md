
# Avatar System Troubleshooting Guide

## Common Issues and Solutions

### 1. Sentry 403 Errors
**Problem**: Sentry returning 403 status
**Solution**: 
- Set SKIP_AUTH=true in environment
- Set DEV_BYPASS_USER_ID=dev-user-123
- Temporarily disable Sentry in development

### 2. PPTX Upload 500 Errors  
**Problem**: Upload failing with 500 status
**Solution**:
- Check upload directory permissions: chmod 755 uploads/
- Ensure file size limits are configured
- Verify Supabase connection string
- Check PPTX processor dependencies

### 3. Authentication Issues
**Problem**: User authentication failures
**Solution**:
- Use bypass headers: x-user-id: dev-user-123
- Set SKIP_AUTH=true environment variable
- Check Supabase credentials

### 4. Database Connection Issues
**Problem**: Cannot connect to database
**Solution**:
- Verify NEXT_PUBLIC_SUPABASE_URL
- Check SUPABASE_SERVICE_ROLE_KEY
- Test with Supabase client directly

## Quick Debug Commands

### Set Development Environment
export NODE_ENV=development
export SKIP_AUTH=true  
export SKIP_RATE_LIMIT=true
export DEV_BYPASS_USER_ID=dev-user-123

### Test APIs
./test-apis.sh

### Check Logs
tail -f .next/server.log

### Restart Development Server
npm run dev

## Environment Variables for Development

Add these to your .env.local:

NODE_ENV=development
SKIP_AUTH=true
SKIP_RATE_LIMIT=true
DEV_BYPASS_USER_ID=dev-user-123
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
