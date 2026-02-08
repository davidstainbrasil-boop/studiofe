/**
 * Comprehensive Health Check Service
 * Checks status of all system services and dependencies
 */

import { logger } from '@lib/logger';

export interface ServiceHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  latencyMs?: number;
  message?: string;
  lastChecked: Date;
}

export interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  services: ServiceHealth[];
  timestamp: Date;
  uptime: number;
}

class HealthCheckService {
  private startTime = Date.now();

  /**
   * Check database (Prisma/Supabase) connectivity
   */
  async checkDatabase(): Promise<ServiceHealth> {
    const start = Date.now();
    try {
      const { prisma } = await import('@lib/prisma');
      await prisma.$queryRaw`SELECT 1`;
      
      return {
        name: 'Database (PostgreSQL)',
        status: 'healthy',
        latencyMs: Date.now() - start,
        lastChecked: new Date()
      };
    } catch (error) {
      return {
        name: 'Database (PostgreSQL)',
        status: 'unhealthy',
        message: (error as Error).message,
        latencyMs: Date.now() - start,
        lastChecked: new Date()
      };
    }
  }

/**
 * Check Redis connectivity
 */
  async checkRedis(): Promise<ServiceHealth> {
    const start = Date.now();
    try {
      const { default: Redis } = await import('ioredis');
      const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
        connectTimeout: 5000,
        lazyConnect: true
      });
      
      await redis.connect();
      await redis.ping();
      await redis.quit();
      
      return {
        name: 'Redis',
        status: 'healthy',
        latencyMs: Date.now() - start,
        lastChecked: new Date()
      };
    } catch (error) {
      return {
        name: 'Redis',
        status: 'degraded',
        message: 'Redis unavailable - queue may be disabled',
        latencyMs: Date.now() - start,
        lastChecked: new Date()
      };
    }
  }

  /**
   * Check Supabase Storage
   */
  async checkStorage(): Promise<ServiceHealth> {
    const start = Date.now();
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      
      const { data, error } = await supabase.storage.listBuckets();
      
      if (error) throw error;
      
      return {
        name: 'Supabase Storage',
        status: 'healthy',
        latencyMs: Date.now() - start,
        message: `${data.length} buckets available`,
        lastChecked: new Date()
      };
    } catch (error) {
      return {
        name: 'Supabase Storage',
        status: 'unhealthy',
        message: (error as Error).message,
        latencyMs: Date.now() - start,
        lastChecked: new Date()
      };
    }
  }

  /**
   * Check FFmpeg availability
   */
  async checkFFmpeg(): Promise<ServiceHealth> {
    const start = Date.now();
    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);
      
      const { stdout } = await execAsync('ffmpeg -version | head -1');
      
      return {
        name: 'FFmpeg',
        status: 'healthy',
        latencyMs: Date.now() - start,
        message: stdout.trim().substring(0, 50),
        lastChecked: new Date()
      };
    } catch (error) {
      return {
        name: 'FFmpeg',
        status: 'unhealthy',
        message: 'FFmpeg not installed',
        latencyMs: Date.now() - start,
        lastChecked: new Date()
      };
    }
  }

  /**
   * Check D-ID API
   */
  async checkDID(): Promise<ServiceHealth> {
    const start = Date.now();
    const apiKey = process.env.DID_API_KEY;
    
    if (!apiKey) {
      return {
        name: 'D-ID API',
        status: 'unknown',
        message: 'API key not configured',
        lastChecked: new Date()
      };
    }

    try {
      const response = await fetch('https://api.d-id.com/credits', {
        headers: { 'Authorization': `Basic ${apiKey}` }
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      
      return {
        name: 'D-ID API',
        status: 'healthy',
        latencyMs: Date.now() - start,
        message: `${data.remaining || 0} credits`,
        lastChecked: new Date()
      };
    } catch (error) {
      return {
        name: 'D-ID API',
        status: 'degraded',
        message: (error as Error).message,
        latencyMs: Date.now() - start,
        lastChecked: new Date()
      };
    }
  }

  /**
   * Check HeyGen API
   */
  async checkHeyGen(): Promise<ServiceHealth> {
    const start = Date.now();
    const apiKey = process.env.HEYGEN_API_KEY;
    
    if (!apiKey) {
      return {
        name: 'HeyGen API',
        status: 'unknown',
        message: 'API key not configured',
        lastChecked: new Date()
      };
    }

    try {
      const response = await fetch('https://api.heygen.com/v2/user/remaining_quota', {
        headers: { 'X-Api-Key': apiKey }
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      return {
        name: 'HeyGen API',
        status: 'healthy',
        latencyMs: Date.now() - start,
        lastChecked: new Date()
      };
    } catch (error) {
      return {
        name: 'HeyGen API',
        status: 'degraded',
        message: (error as Error).message,
        latencyMs: Date.now() - start,
        lastChecked: new Date()
      };
    }
  }

  /**
   * Check ElevenLabs API
   */
  async checkElevenLabs(): Promise<ServiceHealth> {
    const start = Date.now();
    const apiKey = process.env.ELEVENLABS_API_KEY;
    
    if (!apiKey) {
      return {
        name: 'ElevenLabs API',
        status: 'unknown',
        message: 'API key not configured',
        lastChecked: new Date()
      };
    }

    try {
      const response = await fetch('https://api.elevenlabs.io/v1/user', {
        headers: { 'xi-api-key': apiKey }
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      return {
        name: 'ElevenLabs API',
        status: 'healthy',
        latencyMs: Date.now() - start,
        lastChecked: new Date()
      };
    } catch (error) {
      return {
        name: 'ElevenLabs API',
        status: 'degraded',
        message: (error as Error).message,
        latencyMs: Date.now() - start,
        lastChecked: new Date()
      };
    }
  }

  /**
   * Run all health checks
   */
  async checkAll(): Promise<SystemHealth> {
    logger.info('Running health checks', { component: 'HealthCheckService' });
    
    const services = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkStorage(),
      this.checkFFmpeg(),
      this.checkDID(),
      this.checkHeyGen(),
      this.checkElevenLabs()
    ]);

    const unhealthyCount = services.filter(s => s.status === 'unhealthy').length;
    const degradedCount = services.filter(s => s.status === 'degraded').length;

    let overall: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (unhealthyCount > 0) {
      overall = 'unhealthy';
    } else if (degradedCount > 0) {
      overall = 'degraded';
    }

    return {
      overall,
      services,
      timestamp: new Date(),
      uptime: Date.now() - this.startTime
    };
  }

  /**
   * Quick health check (essential services only)
   */
  async checkEssential(): Promise<SystemHealth> {
    const services = await Promise.all([
      this.checkDatabase(),
      this.checkStorage()
    ]);

    const unhealthyCount = services.filter(s => s.status === 'unhealthy').length;

    return {
      overall: unhealthyCount > 0 ? 'unhealthy' : 'healthy',
      services,
      timestamp: new Date(),
      uptime: Date.now() - this.startTime
    };
  }
}

export const healthCheckService = new HealthCheckService();
