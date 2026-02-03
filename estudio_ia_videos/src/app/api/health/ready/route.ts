/**
 * Kubernetes Readiness Probe Endpoint
 * GET /api/health/ready
 * 
 * Returns 200 if the application is ready to receive traffic
 * Used by K8s to determine if pod should receive traffic
 * 
 * Checks:
 * - Database connection
 * - Redis connection
 * - Required services available
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Readiness check result interface
interface ReadinessResult {
  ready: boolean;
  timestamp: string;
  checks: {
    database: boolean;
    redis: boolean;
    supabase: boolean;
  };
  message?: string;
}

// Check Supabase connection
async function checkSupabase(): Promise<boolean> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return false;
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { error } = await supabase.from('users').select('count').limit(1).single();
    
    // Table might not exist yet, but connection is OK
    return !error || error.code === 'PGRST116';
  } catch {
    return false;
  }
}

// Check Redis connection
async function checkRedis(): Promise<boolean> {
  try {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    // Dynamic import to avoid bundling issues
    const { Redis } = await import('ioredis');
    const redis = new Redis(redisUrl, { 
      connectTimeout: 3000,
      maxRetriesPerRequest: 1,
    });
    
    const pong = await redis.ping();
    await redis.quit();
    
    return pong === 'PONG';
  } catch {
    return false;
  }
}

export async function GET() {
  const startTime = Date.now();
  
  try {
    // Run checks in parallel with timeout
    const [supabaseOk, redisOk] = await Promise.all([
      Promise.race([
        checkSupabase(),
        new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 5000))
      ]),
      Promise.race([
        checkRedis(),
        new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 3000))
      ])
    ]);
    
    const result: ReadinessResult = {
      ready: supabaseOk && redisOk,
      timestamp: new Date().toISOString(),
      checks: {
        database: supabaseOk,
        redis: redisOk,
        supabase: supabaseOk,
      }
    };
    
    // Add response time
    const responseTime = Date.now() - startTime;
    
    if (!result.ready) {
      const failed = [];
      if (!supabaseOk) failed.push('database');
      if (!redisOk) failed.push('redis');
      result.message = `Failed checks: ${failed.join(', ')}`;
      
      return NextResponse.json(result, { 
        status: 503,
        headers: {
          'X-Response-Time': `${responseTime}ms`,
          'Cache-Control': 'no-store',
        }
      });
    }
    
    return NextResponse.json(result, { 
      status: 200,
      headers: {
        'X-Response-Time': `${responseTime}ms`,
        'Cache-Control': 'no-store',
      }
    });
    
  } catch (error) {
    return NextResponse.json({
      ready: false,
      timestamp: new Date().toISOString(),
      checks: {
        database: false,
        redis: false,
        supabase: false,
      },
      message: (error as Error).message
    }, { 
      status: 503,
      headers: { 'Cache-Control': 'no-store' }
    });
  }
}
