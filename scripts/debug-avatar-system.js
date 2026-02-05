#!/usr/bin/env node

/**
 * Quick Debug Script for Avatar System
 * Tests and fixes common deployment issues
 */

import fs from 'fs';
import path from 'path';

console.log('🔧 Avatar System Debug Script');
console.log('================================');

// Check environment variables
console.log('\n📋 Environment Variables:');
const envVars = [
  'NODE_ENV',
  'SKIP_AUTH',
  'SKIP_RATE_LIMIT',
  'DEV_BYPASS_USER_ID',
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
];

envVars.forEach((envVar) => {
  const value = process.env[envVar];
  if (value) {
    console.log(`✅ ${envVar}: ${envVar.includes('KEY') ? '***CONFIGURED***' : value}`);
  } else {
    console.log(`❌ ${envVar}: NOT SET`);
  }
});

// Check required directories
console.log('\n📁 Directory Structure:');
const requiredDirs = [
  'uploads',
  'uploads/pptx',
  'uploads/avatars',
  'uploads/videos',
  'public/assets',
];

requiredDirs.forEach((dir) => {
  const dirPath = path.join(process.cwd(), dir);
  if (fs.existsSync(dirPath)) {
    console.log(`✅ ${dir}: exists`);
  } else {
    console.log(`❌ ${dir}: missing - creating...`);
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`   ✅ ${dir}: created`);
  }
});

// Check Next.js build
console.log('\n🏗️ Next.js Build Status:');
const nextDir = path.join(process.cwd(), '.next');
if (fs.existsSync(nextDir)) {
  console.log('✅ .next directory exists');

  // Check for build artifacts
  const buildFiles = ['.next/BUILD_ID', '.next/static', '.next/server'];

  buildFiles.forEach((file) => {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      console.log(`✅ ${file}: built`);
    } else {
      console.log(`❌ ${file}: missing`);
    }
  });
} else {
  console.log('❌ .next directory missing - run npm run build');
}

// Check database connection
console.log('\n🗄️ Database Connection:');
if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.log('✅ Supabase URL configured');
  console.log('✅ Service role key configured');

  // Test connection (simplified)
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    );
    console.log('✅ Supabase client created successfully');
  } catch (error) {
    console.log('❌ Supabase client creation failed:', error.message);
  }
} else {
  console.log('❌ Supabase connection not configured');
}

// Check file upload capabilities
console.log('\n📤 Upload System Check:');
const uploadDir = path.join(process.cwd(), 'uploads/pptx');
if (fs.existsSync(uploadDir)) {
  try {
    fs.accessSync(uploadDir, fs.constants.W_OK);
    console.log('✅ Upload directory writable');
  } catch (error) {
    console.log('❌ Upload directory not writable');
  }
} else {
  console.log('❌ Upload directory does not exist');
}

// Generate debug configuration
console.log('\n🔧 Generating Debug Configuration...');
const debugConfig = {
  environment: process.env.NODE_ENV || 'development',
  skipAuth: process.env.SKIP_AUTH === 'true',
  skipRateLimit: process.env.SKIP_RATE_LIMIT === 'true',
  bypassUserId: process.env.DEV_BYPASS_USER_ID || 'dev-user-123',
  sentryDisabled: process.env.NODE_ENV === 'development',
  uploadDir: uploadDir,
  maxFileSize: '50MB',
  allowedTypes: ['.pptx', '.ppt', '.pdf'],
  debugMode: true,
  loggingLevel: 'debug',
};

const configPath = path.join(process.cwd(), 'debug-config.json');
fs.writeFileSync(configPath, JSON.stringify(debugConfig, null, 2));
console.log(`✅ Debug config saved to: ${configPath}`);

// Generate test script
const testScript = `#!/bin/bash
# Quick test script for avatar system

echo "🧪 Testing Avatar System APIs..."

# Test 1: Health check
echo "📡 Testing health endpoint..."
curl -f http://localhost:3000/api/health || echo "❌ Health check failed"

# Test 2: PPTX upload (with bypass)
echo "📤 Testing PPTX upload..."
curl -X POST http://localhost:3000/api/pptx/upload \\
  -H "x-user-id: dev-user-123" \\
  -F "file=@test-sample.pptx" \\
  || echo "❌ Upload test failed"

# Test 3: Avatar creation
echo "🎭 Testing avatar creation..."
curl -X POST http://localhost:3000/api/avatar/create \\
  -H "x-user-id: dev-user-123" \\
  -H "Content-Type: application/json" \\
  -d '{"prompt":"test avatar","gender":"male","age":30,"quality":"high"}' \\
  || echo "❌ Avatar creation failed"

echo "✅ Tests completed"
`;

const testScriptPath = path.join(process.cwd(), 'test-apis.sh');
fs.writeFileSync(testScriptPath, testScript);
fs.chmodSync(testScriptPath, '755');
console.log(`✅ Test script saved to: ${testScriptPath}`);

// Generate troubleshooting guide
const troubleshooting = `
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
`;

const guidePath = path.join(process.cwd(), 'TROUBLESHOOTING.md');
fs.writeFileSync(guidePath, troubleshooting);
console.log(`✅ Troubleshooting guide saved to: ${guidePath}`);

console.log('\n🎉 Debug Setup Complete!');
console.log('================================');
console.log('🔧 Configuration files created:');
console.log(`   - debug-config.json`);
console.log(`   - test-apis.sh`);
console.log(`   - TROUBLESHOOTING.md`);
console.log('\n🚀 To run the system in debug mode:');
console.log('1. Set environment variables (see TROUBLESHOOTING.md)');
console.log('2. Run: npm run dev');
console.log('3. Test: ./test-apis.sh');
