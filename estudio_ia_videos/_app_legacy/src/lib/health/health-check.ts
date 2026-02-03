/**
 * 🏥 Health Check Service
 * MVP Vídeos TécnicoCursos v7
 * 
 * Sistema completo de health checks para monitoramento:
 * - Database (Supabase/PostgreSQL)
 * - Redis (BullMQ Queue)
 * - Storage (Supabase Storage)
 * - External APIs (ElevenLabs, HeyGen)
 * - System Resources (CPU, Memory, Disk)
 * 
 * Features:
 * - Health score 0-100
 * - Component-level status
 * - Response time tracking
 * - Detailed diagnostics
 */

import * as os from 'os';
// Simple logger for health check
const logger = {
  info: (msg: string, data?: Record<string, unknown>) => console.log(`[INFO] ${msg}`, data),
  error: (msg: string, data?: Record<string, unknown>) => console.error(`[ERROR] ${msg}`, data),
  warn: (msg: string, data?: Record<string, unknown>) => console.warn(`[WARN] ${msg}`, data),
  debug: (msg: string, data?: Record<string, unknown>) => console.debug(`[DEBUG] ${msg}`, data),
};

// ===========================================
// Types
// ===========================================

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

export interface ComponentHealth {
  name: string;
  status: HealthStatus;
  response_time_ms: number;
  message?: string;
  details?: Record<string, unknown>;
  checked_at: string;
}

export interface SystemResources {
  cpu_usage_percent: number;
  memory_used_percent: number;
  memory_total_mb: number;
  memory_free_mb: number;
  uptime_seconds: number;
  load_average: number[];
  process_memory_mb: number;
}

export interface HealthReport {
  status: HealthStatus;
  score: number; // 0-100
  timestamp: string;
  version: string;
  environment: string;
  components: ComponentHealth[];
  resources: SystemResources;
  summary: {
    total_components: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
  };
}

export interface HealthCheckConfig {
  timeout_ms: number;
  include_details: boolean;
  database_url?: string;
  redis_url?: string;
  storage_url?: string;
}

// ===========================================
// Health Check Functions
// ===========================================

/**
 * Check Database (Supabase/PostgreSQL) health
 */
async function checkDatabase(config: HealthCheckConfig): Promise<ComponentHealth> {
  const start = Date.now();
  const checkedAt = new Date().toISOString();

  try {
    // Simular check do banco - em produção usar supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    
    if (!supabaseUrl) {
      return {
        name: 'database',
        status: 'unhealthy',
        response_time_ms: Date.now() - start,
        message: 'SUPABASE_URL not configured',
        checked_at: checkedAt,
      };
    }

    // Fazer health check via REST API
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout_ms);

    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      },
    });

    clearTimeout(timeoutId);
    const responseTime = Date.now() - start;

    if (response.ok || response.status === 400) { // 400 = needs table, but API is alive
      return {
        name: 'database',
        status: responseTime < 500 ? 'healthy' : 'degraded',
        response_time_ms: responseTime,
        message: 'Database connection OK',
        details: config.include_details ? {
          supabase_url: supabaseUrl.replace(/https?:\/\//, '***').slice(0, 20),
        } : undefined,
        checked_at: checkedAt,
      };
    }

    return {
      name: 'database',
      status: 'unhealthy',
      response_time_ms: responseTime,
      message: `Database returned status ${response.status}`,
      checked_at: checkedAt,
    };
  } catch (error) {
    return {
      name: 'database',
      status: 'unhealthy',
      response_time_ms: Date.now() - start,
      message: error instanceof Error ? error.message : 'Connection failed',
      checked_at: checkedAt,
    };
  }
}

/**
 * Check Redis health
 */
async function checkRedis(config: HealthCheckConfig): Promise<ComponentHealth> {
  const start = Date.now();
  const checkedAt = new Date().toISOString();

  try {
    const redisUrl = process.env.REDIS_URL;

    if (!redisUrl) {
      return {
        name: 'redis',
        status: 'degraded', // Redis opcional para desenvolvimento
        response_time_ms: Date.now() - start,
        message: 'REDIS_URL not configured (optional for dev)',
        checked_at: checkedAt,
      };
    }

    // Tentar conexão básica
    const { Redis } = await import('ioredis');
    const redis = new Redis(redisUrl, {
      connectTimeout: config.timeout_ms,
      maxRetriesPerRequest: 1,
    });

    const pingResult = await Promise.race([
      redis.ping(),
      new Promise<null>((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), config.timeout_ms)
      ),
    ]);

    await redis.quit();
    const responseTime = Date.now() - start;

    if (pingResult === 'PONG') {
      return {
        name: 'redis',
        status: responseTime < 200 ? 'healthy' : 'degraded',
        response_time_ms: responseTime,
        message: 'Redis connection OK',
        checked_at: checkedAt,
      };
    }

    return {
      name: 'redis',
      status: 'unhealthy',
      response_time_ms: responseTime,
      message: 'Unexpected ping response',
      checked_at: checkedAt,
    };
  } catch (error) {
    return {
      name: 'redis',
      status: 'unhealthy',
      response_time_ms: Date.now() - start,
      message: error instanceof Error ? error.message : 'Connection failed',
      checked_at: checkedAt,
    };
  }
}

/**
 * Check Storage (Supabase Storage) health
 */
async function checkStorage(config: HealthCheckConfig): Promise<ComponentHealth> {
  const start = Date.now();
  const checkedAt = new Date().toISOString();

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    
    if (!supabaseUrl) {
      return {
        name: 'storage',
        status: 'unhealthy',
        response_time_ms: Date.now() - start,
        message: 'SUPABASE_URL not configured',
        checked_at: checkedAt,
      };
    }

    // Check storage API
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout_ms);

    const response = await fetch(`${supabaseUrl}/storage/v1/`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''}`,
      },
    });

    clearTimeout(timeoutId);
    const responseTime = Date.now() - start;

    // Storage API retorna 400 sem bucket, mas está funcionando
    if (response.ok || response.status === 400) {
      return {
        name: 'storage',
        status: responseTime < 500 ? 'healthy' : 'degraded',
        response_time_ms: responseTime,
        message: 'Storage API accessible',
        checked_at: checkedAt,
      };
    }

    return {
      name: 'storage',
      status: 'unhealthy',
      response_time_ms: responseTime,
      message: `Storage returned status ${response.status}`,
      checked_at: checkedAt,
    };
  } catch (error) {
    return {
      name: 'storage',
      status: 'unhealthy',
      response_time_ms: Date.now() - start,
      message: error instanceof Error ? error.message : 'Connection failed',
      checked_at: checkedAt,
    };
  }
}

/**
 * Check ElevenLabs API health
 */
async function checkElevenLabs(config: HealthCheckConfig): Promise<ComponentHealth> {
  const start = Date.now();
  const checkedAt = new Date().toISOString();

  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    
    if (!apiKey) {
      return {
        name: 'elevenlabs',
        status: 'degraded',
        response_time_ms: Date.now() - start,
        message: 'ELEVENLABS_API_KEY not configured',
        checked_at: checkedAt,
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout_ms);

    const response = await fetch('https://api.elevenlabs.io/v1/user', {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'xi-api-key': apiKey,
      },
    });

    clearTimeout(timeoutId);
    const responseTime = Date.now() - start;

    if (response.ok) {
      const data = await response.json();
      return {
        name: 'elevenlabs',
        status: 'healthy',
        response_time_ms: responseTime,
        message: 'ElevenLabs API accessible',
        details: config.include_details ? {
          subscription: data.subscription?.tier || 'unknown',
          character_limit: data.subscription?.character_limit,
        } : undefined,
        checked_at: checkedAt,
      };
    }

    return {
      name: 'elevenlabs',
      status: response.status === 401 ? 'unhealthy' : 'degraded',
      response_time_ms: responseTime,
      message: `ElevenLabs returned status ${response.status}`,
      checked_at: checkedAt,
    };
  } catch (error) {
    return {
      name: 'elevenlabs',
      status: 'degraded', // TTS é opcional
      response_time_ms: Date.now() - start,
      message: error instanceof Error ? error.message : 'Connection failed',
      checked_at: checkedAt,
    };
  }
}

/**
 * Check HeyGen API health
 */
async function checkHeyGen(config: HealthCheckConfig): Promise<ComponentHealth> {
  const start = Date.now();
  const checkedAt = new Date().toISOString();

  try {
    const apiKey = process.env.HEYGEN_API_KEY;
    
    if (!apiKey) {
      return {
        name: 'heygen',
        status: 'degraded',
        response_time_ms: Date.now() - start,
        message: 'HEYGEN_API_KEY not configured',
        checked_at: checkedAt,
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout_ms);

    const response = await fetch('https://api.heygen.com/v2/user/remaining_quota', {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'X-Api-Key': apiKey,
      },
    });

    clearTimeout(timeoutId);
    const responseTime = Date.now() - start;

    if (response.ok) {
      const data = await response.json();
      return {
        name: 'heygen',
        status: 'healthy',
        response_time_ms: responseTime,
        message: 'HeyGen API accessible',
        details: config.include_details ? {
          remaining_quota: data.data?.remaining_quota,
        } : undefined,
        checked_at: checkedAt,
      };
    }

    return {
      name: 'heygen',
      status: response.status === 401 ? 'unhealthy' : 'degraded',
      response_time_ms: responseTime,
      message: `HeyGen returned status ${response.status}`,
      checked_at: checkedAt,
    };
  } catch (error) {
    return {
      name: 'heygen',
      status: 'degraded', // Avatar é opcional
      response_time_ms: Date.now() - start,
      message: error instanceof Error ? error.message : 'Connection failed',
      checked_at: checkedAt,
    };
  }
}

/**
 * Get system resources
 */
function getSystemResources(): SystemResources {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const processMemory = process.memoryUsage();

  // CPU usage estimation
  const cpus = os.cpus();
  let totalIdle = 0;
  let totalTick = 0;

  for (const cpu of cpus) {
    for (const type in cpu.times) {
      totalTick += cpu.times[type as keyof typeof cpu.times];
    }
    totalIdle += cpu.times.idle;
  }

  const cpuUsage = 100 - (totalIdle / totalTick) * 100;

  return {
    cpu_usage_percent: Math.round(cpuUsage * 100) / 100,
    memory_used_percent: Math.round((usedMem / totalMem) * 100 * 100) / 100,
    memory_total_mb: Math.round(totalMem / 1024 / 1024),
    memory_free_mb: Math.round(freeMem / 1024 / 1024),
    uptime_seconds: Math.round(os.uptime()),
    load_average: os.loadavg().map(l => Math.round(l * 100) / 100),
    process_memory_mb: Math.round(processMemory.heapUsed / 1024 / 1024),
  };
}

/**
 * Calculate health score (0-100)
 */
function calculateScore(components: ComponentHealth[], resources: SystemResources): number {
  let score = 100;

  // Component scores (60% weight)
  const componentWeight = 60 / components.length;
  for (const component of components) {
    switch (component.status) {
      case 'healthy':
        // Full points
        break;
      case 'degraded':
        score -= componentWeight * 0.5;
        break;
      case 'unhealthy':
        score -= componentWeight;
        break;
      case 'unknown':
        score -= componentWeight * 0.25;
        break;
    }
  }

  // Resource scores (40% weight)
  // CPU
  if (resources.cpu_usage_percent > 90) score -= 10;
  else if (resources.cpu_usage_percent > 80) score -= 5;
  else if (resources.cpu_usage_percent > 70) score -= 2;

  // Memory
  if (resources.memory_used_percent > 95) score -= 15;
  else if (resources.memory_used_percent > 90) score -= 10;
  else if (resources.memory_used_percent > 80) score -= 5;
  else if (resources.memory_used_percent > 70) score -= 2;

  // Load average (compared to CPU count)
  const cpuCount = os.cpus().length;
  const loadRatio = resources.load_average[0] / cpuCount;
  if (loadRatio > 2) score -= 10;
  else if (loadRatio > 1.5) score -= 5;
  else if (loadRatio > 1) score -= 2;

  return Math.max(0, Math.round(score));
}

/**
 * Determine overall status from components
 */
function determineOverallStatus(components: ComponentHealth[]): HealthStatus {
  const statuses = components.map(c => c.status);

  // Critical components that must be healthy
  const criticalComponents = ['database'];
  const criticalStatuses = components
    .filter(c => criticalComponents.includes(c.name))
    .map(c => c.status);

  if (criticalStatuses.includes('unhealthy')) {
    return 'unhealthy';
  }

  if (statuses.every(s => s === 'healthy')) {
    return 'healthy';
  }

  if (statuses.some(s => s === 'unhealthy')) {
    return 'unhealthy';
  }

  if (statuses.some(s => s === 'degraded')) {
    return 'degraded';
  }

  return 'unknown';
}

// ===========================================
// Main Health Check Function
// ===========================================

/**
 * Executa health check completo
 */
export async function performHealthCheck(
  config: Partial<HealthCheckConfig> = {}
): Promise<HealthReport> {
  const fullConfig: HealthCheckConfig = {
    timeout_ms: 5000,
    include_details: false,
    ...config,
  };

  // Executar checks em paralelo
  const componentChecks = await Promise.all([
    checkDatabase(fullConfig),
    checkRedis(fullConfig),
    checkStorage(fullConfig),
    checkElevenLabs(fullConfig),
    checkHeyGen(fullConfig),
  ]);

  const resources = getSystemResources();
  const score = calculateScore(componentChecks, resources);
  const status = determineOverallStatus(componentChecks);

  const summary = {
    total_components: componentChecks.length,
    healthy: componentChecks.filter(c => c.status === 'healthy').length,
    degraded: componentChecks.filter(c => c.status === 'degraded').length,
    unhealthy: componentChecks.filter(c => c.status === 'unhealthy').length,
  };

  const report: HealthReport = {
    status,
    score,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '7.0.0',
    environment: process.env.NODE_ENV || 'development',
    components: componentChecks,
    resources,
    summary,
  };

  // Log health check
  logger.info('[Health] Check completed', {
    status,
    score,
    summary,
  });

  return report;
}

// ===========================================
// Quick Health Check (Liveness)
// ===========================================

/**
 * Quick liveness check (apenas verifica se o processo está rodando)
 */
export function livenessCheck(): { status: 'ok'; timestamp: string } {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
  };
}

// ===========================================
// Readiness Check
// ===========================================

/**
 * Readiness check (verifica se pode receber tráfego)
 */
export async function readinessCheck(): Promise<{
  ready: boolean;
  timestamp: string;
  details?: string;
}> {
  try {
    // Verificar apenas componentes críticos
    const dbCheck = await checkDatabase({ timeout_ms: 3000, include_details: false });
    
    const ready = dbCheck.status === 'healthy' || dbCheck.status === 'degraded';

    return {
      ready,
      timestamp: new Date().toISOString(),
      details: ready ? undefined : `Database: ${dbCheck.message}`,
    };
  } catch (error) {
    return {
      ready: false,
      timestamp: new Date().toISOString(),
      details: error instanceof Error ? error.message : 'Check failed',
    };
  }
}

// ===========================================
// Startup Check
// ===========================================

/**
 * Startup check (verificações iniciais do sistema)
 */
export async function startupCheck(): Promise<{
  ok: boolean;
  timestamp: string;
  checks: { name: string; ok: boolean; message?: string }[];
}> {
  const checks: { name: string; ok: boolean; message?: string }[] = [];

  // Verificar variáveis de ambiente obrigatórias
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ];

  for (const envVar of requiredEnvVars) {
    const exists = !!process.env[envVar];
    checks.push({
      name: `env:${envVar}`,
      ok: exists,
      message: exists ? undefined : 'Missing required environment variable',
    });
  }

  // Verificar variáveis opcionais
  const optionalEnvVars = [
    'SUPABASE_SERVICE_ROLE_KEY',
    'REDIS_URL',
    'ELEVENLABS_API_KEY',
    'HEYGEN_API_KEY',
  ];

  for (const envVar of optionalEnvVars) {
    const exists = !!process.env[envVar];
    checks.push({
      name: `env:${envVar}`,
      ok: true, // Opcionais não falham
      message: exists ? undefined : 'Optional variable not set',
    });
  }

  const allRequired = checks
    .filter(c => c.name.startsWith('env:NEXT_PUBLIC') || c.name === 'env:SUPABASE_SERVICE_ROLE_KEY')
    .every(c => c.ok || c.name.includes('SERVICE_ROLE')); // Service role é opcional para client

  return {
    ok: allRequired,
    timestamp: new Date().toISOString(),
    checks,
  };
}
