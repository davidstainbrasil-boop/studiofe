#!/usr/bin/env node

/**
 * Health Check Script
 * Verifica status de todas dependências críticas
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js'
import { execSync } from 'child_process'
import fetch from 'node-fetch'
import { Client } from 'pg'

// Force polyfill
(global as any).fetch = fetch

interface HealthCheckResult {
  service: string
  status: 'healthy' | 'unhealthy' | 'warning'
  message: string
  duration?: number
}

async function checkDatabase(): Promise<HealthCheckResult> {
  const start = Date.now()
  
  // 1. Tentar conexão direta via PG (mais confiável para ambiente Docker)
  try {
    const client = new Client({
      connectionString: process.env.DATABASE_URL || `postgresql://postgres:postgres@localhost:5432/video_tecnico`
    })
    
    await client.connect()
    await client.query('SELECT 1')
    await client.end()
    
    // Se conexão direta funcionou, tentar via Supabase API
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      
      const { data, error } = await supabase
        .from('users') 
        .select('id')
        .limit(1)
      
      if (error) throw new Error(error.message)
        
      return {
        service: 'Database',
        status: 'healthy',
        message: `Connected successfully (Direct + API)`,
        duration: Date.now() - start
      }
    } catch (apiError) {
      // API falhou, mas Banco está OK -> Warning
      return {
        service: 'Database',
        status: 'warning',
        message: `Database OK but Supabase API unreachable: ${(apiError as Error).message}`,
        duration: Date.now() - start
      }
    }

  } catch (pgError) {
    // Banco realmente fora do ar
    return {
      service: 'Database',
      status: 'unhealthy',
      message: `Connection failed: ${(pgError as Error).message}`,
      duration: Date.now() - start
    }
  }
}

async function checkRedis(): Promise<HealthCheckResult> {
  const start = Date.now()
  
  // Test Redis connectivity directly with ioredis
  try {
    const { default: Redis } = await import('ioredis')
    const client = new Redis({
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null, // Don't retry for health check
      lazyConnect: true
    })
    
    await client.connect()
    await client.ping()
    await client.quit()
    
    return {
      service: 'Redis',
      status: 'healthy',
      message: 'Connected and responding to ping',
      duration: Date.now() - start
    }
  } catch (error) {
    return {
      service: 'Redis',
      status: 'unhealthy',
      message: `Connection failed: ${(error as Error).message}`,
      duration: Date.now() - start
    }
  }
}

async function checkBullMQ(): Promise<HealthCheckResult> {
  const start = Date.now()
  
  try {
    // Test BullMQ connectivity
    const { Queue } = await import('bullmq')
    const connection = {
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || undefined
    }
    
    // Create a temporary queue to test connection
    const testQueue = new Queue('health-test', { connection })
    
    // Check connection by getting metrics
    const metrics = await testQueue.getMetrics('completed')
    
    // Clean up
    await testQueue.close()
    
    return {
      service: 'BullMQ',
      status: 'healthy',
      message: `Connected, completed jobs: ${metrics.total}`,
      duration: Date.now() - start
    }
  } catch (error) {
    return {
      service: 'BullMQ',
      status: 'unhealthy',
      message: `Connection failed: ${(error as Error).message}`,
      duration: Date.now() - start
    }
  }
}

async function checkStorageBuckets(): Promise<HealthCheckResult> {
  const start = Date.now()
  
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    // List all buckets
    const { data: buckets, error } = await supabase
      .storage
      .listBuckets()
    
    if (error) {
      // Check if it's a connection error (API down)
      if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
         return {
          service: 'Storage',
          status: 'warning',
          message: `Storage API unreachable (expected in Docker-only mode): ${error.message}`,
          duration: Date.now() - start
        }
      }
      throw new Error(error.message)
    }
    
    const expectedBuckets = ['avatars', 'videos', 'thumbnails', 'assets']
    const foundBuckets = buckets.map(b => b.name)
    const missingBuckets = expectedBuckets.filter(b => !foundBuckets.includes(b))
    
    if (missingBuckets.length > 0) {
      return {
        service: 'Storage',
        status: 'unhealthy',
        message: `Missing buckets: ${missingBuckets.join(', ')}`,
        duration: Date.now() - start
      }
    }
    
    return {
      service: 'Storage',
      status: 'healthy',
      message: `All ${buckets.length} buckets accessible: ${foundBuckets.join(', ')}`,
      duration: Date.now() - start
    }
  } catch (error) {
    return {
      service: 'Storage',
      status: 'unhealthy',
      message: `Storage check failed: ${(error as Error).message}`,
      duration: Date.now() - start
    }
  }
}

async function checkEnvironment(): Promise<HealthCheckResult> {
  const start = Date.now()
  
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'REDIS_HOST',
    'REDIS_PORT'
  ]
  
  const missingVars = requiredVars.filter(v => !process.env[v])
  
  if (missingVars.length > 0) {
    return {
      service: 'Environment',
      status: 'unhealthy',
      message: `Missing environment variables: ${missingVars.join(', ')}`,
      duration: Date.now() - start
    }
  }
  
  return {
    service: 'Environment',
    status: 'healthy',
    message: `All ${requiredVars.length} required variables present`,
    duration: Date.now() - start
  }
}

async function runAllHealthChecks(): Promise<HealthCheckResult[]> {
  console.log('🏥 Running health checks...\n')
  
  const checks = [
    checkEnvironment(),
    checkDatabase(),
    checkRedis(),
    checkBullMQ(),
    checkStorageBuckets()
  ]
  
  const results = await Promise.all(checks)
  
  // Print results
  results.forEach(result => {
    const statusIcon = 
      result.status === 'healthy' ? '✅' : 
      result.status === 'warning' ? '⚠️' : 
      '❌'
    
    console.log(`${statusIcon} ${result.service}: ${result.message}`)
    if (result.duration) {
      console.log(`   Duration: ${result.duration}ms`)
    }
    console.log('')
  })
  
  // Summary
  const healthy = results.filter(r => r.status === 'healthy').length
  const unhealthy = results.filter(r => r.status === 'unhealthy').length
  const warnings = results.filter(r => r.status === 'warning').length
  
  console.log(`📊 Summary: ${healthy} healthy, ${warnings} warnings, ${unhealthy} unhealthy`)
  
  if (unhealthy > 0) {
    console.log('\n❌ System is unhealthy')
    process.exit(1)
  } else if (warnings > 0) {
    console.log('\n⚠️  System has warnings but is operational')
    process.exit(0)
  } else {
    console.log('\n✅ All systems are healthy')
    process.exit(0)
  }
  
  return results
}

// Run the health check if executed directly
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  runAllHealthChecks().catch(console.error);
}

export { runAllHealthChecks, HealthCheckResult }
