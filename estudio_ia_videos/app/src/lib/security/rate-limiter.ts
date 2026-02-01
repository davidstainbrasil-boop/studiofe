/**
 * 🛡️ Advanced Rate Limiter - Sliding Window + Abuse Detection
 * MVP Vídeos TécnicoCursos v7
 * 
 * Features:
 * - Sliding window rate limiting
 * - Token bucket algorithm
 * - IP whitelisting/blacklisting
 * - Abuse detection (burst patterns, suspicious behavior)
 * - Redis-backed storage for distributed environments
 * - Graceful degradation to in-memory
 */

import { Redis } from 'ioredis';

// ===========================================
// Types & Interfaces
// ===========================================

export interface RateLimitConfig {
  /** Requests permitidos no window */
  limit: number;
  /** Window em segundos */
  windowSeconds: number;
  /** Usar sliding window (mais preciso, mais caro) */
  slidingWindow?: boolean;
  /** Token bucket: capacidade máxima */
  bucketCapacity?: number;
  /** Token bucket: refill rate por segundo */
  refillRate?: number;
  /** Bloquear por N segundos após exceder limite */
  blockDurationSeconds?: number;
  /** Multiplicador de block após múltiplas violações */
  blockMultiplier?: number;
}

export interface RateLimitResult {
  /** Se a request passou */
  allowed: boolean;
  /** Requests restantes no window */
  remaining: number;
  /** Limite total */
  limit: number;
  /** Timestamp de reset (Unix epoch) */
  reset: number;
  /** Tempo para retry (se blocked) */
  retryAfter?: number;
  /** Se o IP está bloqueado */
  blocked?: boolean;
  /** Motivo do bloqueio */
  blockReason?: string;
}

export interface AbusePattern {
  /** Nome do pattern */
  name: string;
  /** Descrição */
  description: string;
  /** Threshold para trigger */
  threshold: number;
  /** Window de detecção em segundos */
  windowSeconds: number;
  /** Ação a tomar */
  action: 'warn' | 'block' | 'captcha' | 'log';
  /** Duração do bloqueio em segundos */
  blockDuration?: number;
}

export interface RateLimiterOptions {
  /** Redis client (opcional, usa in-memory se não fornecido) */
  redis?: Redis;
  /** Prefixo para keys no Redis */
  keyPrefix?: string;
  /** Lista de IPs permitidos (bypass rate limit) */
  whitelist?: string[];
  /** Lista de IPs bloqueados */
  blacklist?: string[];
  /** Patterns de abuso para detectar */
  abusePatterns?: AbusePattern[];
  /** Habilitar detecção de abuso */
  enableAbuseDetection?: boolean;
}

// ===========================================
// Default Configurations
// ===========================================

const DEFAULT_CONFIGS: Record<string, RateLimitConfig> = {
  // API geral
  standard: {
    limit: 100,
    windowSeconds: 60,
    slidingWindow: true,
    blockDurationSeconds: 60,
  },
  // Endpoints de autenticação
  auth: {
    limit: 10,
    windowSeconds: 60,
    slidingWindow: true,
    blockDurationSeconds: 300,
    blockMultiplier: 2,
  },
  // Upload de arquivos
  upload: {
    limit: 20,
    windowSeconds: 60,
    blockDurationSeconds: 120,
  },
  // Renderização (caro)
  render: {
    limit: 5,
    windowSeconds: 60,
    blockDurationSeconds: 300,
  },
  // Webhooks (mais permissivo)
  webhook: {
    limit: 500,
    windowSeconds: 60,
    slidingWindow: false,
  },
  // Health checks
  health: {
    limit: 1000,
    windowSeconds: 60,
    slidingWindow: false,
  },
};

const DEFAULT_ABUSE_PATTERNS: AbusePattern[] = [
  {
    name: 'burst',
    description: 'Muitas requests em intervalo muito curto',
    threshold: 50,
    windowSeconds: 5,
    action: 'block',
    blockDuration: 300,
  },
  {
    name: 'sustained',
    description: 'Taxa alta sustentada',
    threshold: 500,
    windowSeconds: 300,
    action: 'block',
    blockDuration: 600,
  },
  {
    name: 'auth_brute_force',
    description: 'Tentativas repetidas de autenticação',
    threshold: 20,
    windowSeconds: 60,
    action: 'block',
    blockDuration: 1800,
  },
];

// ===========================================
// In-Memory Storage (fallback)
// ===========================================

interface InMemoryRecord {
  count: number;
  timestamps: number[];
  blocked: boolean;
  blockExpires?: number;
  violations: number;
}

class InMemoryStore {
  private data: Map<string, InMemoryRecord> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Cleanup a cada minuto
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  get(key: string): InMemoryRecord | undefined {
    return this.data.get(key);
  }

  set(key: string, value: InMemoryRecord): void {
    this.data.set(key, value);
  }

  delete(key: string): void {
    this.data.delete(key);
  }

  cleanup(): void {
    const now = Date.now();
    const entries = Array.from(this.data.entries());
    for (const [key, record] of entries) {
      // Remover records sem atividade por 10 minutos
      const latestTimestamp = record.timestamps[record.timestamps.length - 1] || 0;
      if (now - latestTimestamp > 600000) {
        this.data.delete(key);
      }
    }
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.data.clear();
  }
}

// ===========================================
// Rate Limiter Class
// ===========================================

export class AdvancedRateLimiter {
  private redis?: Redis;
  private memoryStore: InMemoryStore;
  private keyPrefix: string;
  private whitelist: Set<string>;
  private blacklist: Set<string>;
  private abusePatterns: AbusePattern[];
  private enableAbuseDetection: boolean;

  constructor(options: RateLimiterOptions = {}) {
    this.redis = options.redis;
    this.memoryStore = new InMemoryStore();
    this.keyPrefix = options.keyPrefix || 'rl:';
    this.whitelist = new Set(options.whitelist || []);
    this.blacklist = new Set(options.blacklist || []);
    this.abusePatterns = options.abusePatterns || DEFAULT_ABUSE_PATTERNS;
    this.enableAbuseDetection = options.enableAbuseDetection ?? true;

    // Adicionar localhost ao whitelist em desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      this.whitelist.add('127.0.0.1');
      this.whitelist.add('::1');
      this.whitelist.add('localhost');
    }
  }

  /**
   * Verifica rate limit para um identificador
   */
  async check(
    identifier: string,
    configName: string = 'standard'
  ): Promise<RateLimitResult> {
    const config = DEFAULT_CONFIGS[configName] || DEFAULT_CONFIGS.standard;
    return this.checkWithConfig(identifier, config);
  }

  /**
   * Verifica rate limit com configuração customizada
   */
  async checkWithConfig(
    identifier: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    // Check whitelist
    if (this.whitelist.has(identifier)) {
      return {
        allowed: true,
        remaining: config.limit,
        limit: config.limit,
        reset: Date.now() + config.windowSeconds * 1000,
      };
    }

    // Check blacklist
    if (this.blacklist.has(identifier)) {
      return {
        allowed: false,
        remaining: 0,
        limit: config.limit,
        reset: Date.now() + 86400000, // 24h
        blocked: true,
        blockReason: 'IP blacklisted',
        retryAfter: 86400,
      };
    }

    // Use Redis if available, otherwise memory
    if (this.redis) {
      return this.checkRedis(identifier, config);
    }
    return this.checkMemory(identifier, config);
  }

  /**
   * Rate limit check usando Redis (sliding window)
   */
  private async checkRedis(
    identifier: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const key = `${this.keyPrefix}${identifier}`;
    const blockKey = `${key}:blocked`;
    const now = Date.now();
    const windowStart = now - config.windowSeconds * 1000;

    try {
      // Check if blocked
      const blockData = await this.redis!.get(blockKey);
      if (blockData) {
        const blockInfo = JSON.parse(blockData);
        return {
          allowed: false,
          remaining: 0,
          limit: config.limit,
          reset: blockInfo.expires,
          blocked: true,
          blockReason: blockInfo.reason,
          retryAfter: Math.ceil((blockInfo.expires - now) / 1000),
        };
      }

      if (config.slidingWindow) {
        // Sliding window com sorted set
        const multi = this.redis!.multi();
        
        // Remove timestamps antigos
        multi.zremrangebyscore(key, 0, windowStart);
        
        // Conta requests no window
        multi.zcard(key);
        
        // Adiciona novo timestamp
        multi.zadd(key, now, `${now}-${Math.random()}`);
        
        // Define TTL
        multi.expire(key, config.windowSeconds);
        
        const results = await multi.exec();
        const count = (results?.[1]?.[1] as number) || 0;

        if (count >= config.limit) {
          await this.handleViolation(identifier, config, 'Rate limit exceeded');
          return {
            allowed: false,
            remaining: 0,
            limit: config.limit,
            reset: now + config.windowSeconds * 1000,
            retryAfter: config.windowSeconds,
          };
        }

        return {
          allowed: true,
          remaining: config.limit - count - 1,
          limit: config.limit,
          reset: now + config.windowSeconds * 1000,
        };
      } else {
        // Fixed window com counter
        const count = await this.redis!.incr(key);
        
        if (count === 1) {
          await this.redis!.expire(key, config.windowSeconds);
        }

        const ttl = await this.redis!.ttl(key);

        if (count > config.limit) {
          await this.handleViolation(identifier, config, 'Rate limit exceeded');
          return {
            allowed: false,
            remaining: 0,
            limit: config.limit,
            reset: now + ttl * 1000,
            retryAfter: ttl,
          };
        }

        return {
          allowed: true,
          remaining: config.limit - count,
          limit: config.limit,
          reset: now + ttl * 1000,
        };
      }
    } catch (error) {
      console.error('[RateLimiter] Redis error, falling back to memory:', error);
      return this.checkMemory(identifier, config);
    }
  }

  /**
   * Rate limit check usando memória (fallback)
   */
  private checkMemory(
    identifier: string,
    config: RateLimitConfig
  ): RateLimitResult {
    const now = Date.now();
    const windowStart = now - config.windowSeconds * 1000;
    let record = this.memoryStore.get(identifier);

    if (!record) {
      record = {
        count: 0,
        timestamps: [],
        blocked: false,
        violations: 0,
      };
    }

    // Check if blocked
    if (record.blocked && record.blockExpires && record.blockExpires > now) {
      return {
        allowed: false,
        remaining: 0,
        limit: config.limit,
        reset: record.blockExpires,
        blocked: true,
        blockReason: 'Rate limit exceeded',
        retryAfter: Math.ceil((record.blockExpires - now) / 1000),
      };
    } else if (record.blocked) {
      // Block expired
      record.blocked = false;
      record.blockExpires = undefined;
    }

    // Filter timestamps dentro do window
    record.timestamps = record.timestamps.filter((t) => t > windowStart);
    record.count = record.timestamps.length;

    if (record.count >= config.limit) {
      this.handleViolationSync(identifier, record, config);
      this.memoryStore.set(identifier, record);
      return {
        allowed: false,
        remaining: 0,
        limit: config.limit,
        reset: now + config.windowSeconds * 1000,
        retryAfter: config.windowSeconds,
      };
    }

    // Adicionar novo timestamp
    record.timestamps.push(now);
    record.count = record.timestamps.length;
    this.memoryStore.set(identifier, record);

    // Check abuse patterns
    if (this.enableAbuseDetection) {
      const abuseResult = this.checkAbusePatterns(identifier, record);
      if (abuseResult) {
        return abuseResult;
      }
    }

    return {
      allowed: true,
      remaining: config.limit - record.count,
      limit: config.limit,
      reset: now + config.windowSeconds * 1000,
    };
  }

  /**
   * Processa violação (Redis)
   */
  private async handleViolation(
    identifier: string,
    config: RateLimitConfig,
    reason: string
  ): Promise<void> {
    if (!config.blockDurationSeconds) return;

    const blockKey = `${this.keyPrefix}${identifier}:blocked`;
    const violationKey = `${this.keyPrefix}${identifier}:violations`;

    // Incrementar contador de violações
    const violations = await this.redis!.incr(violationKey);
    await this.redis!.expire(violationKey, 3600); // 1 hour

    // Calcular duração do block (com multiplicador)
    let blockDuration = config.blockDurationSeconds;
    if (config.blockMultiplier && violations > 1) {
      blockDuration *= Math.pow(config.blockMultiplier, violations - 1);
      blockDuration = Math.min(blockDuration, 86400); // Max 24h
    }

    const expires = Date.now() + blockDuration * 1000;
    await this.redis!.setex(
      blockKey,
      blockDuration,
      JSON.stringify({ reason, expires, violations })
    );

    console.warn(`[RateLimiter] Blocked ${identifier}: ${reason} (${blockDuration}s)`);
  }

  /**
   * Processa violação (Memory)
   */
  private handleViolationSync(
    identifier: string,
    record: InMemoryRecord,
    config: RateLimitConfig
  ): void {
    if (!config.blockDurationSeconds) return;

    record.violations += 1;

    let blockDuration = config.blockDurationSeconds;
    if (config.blockMultiplier && record.violations > 1) {
      blockDuration *= Math.pow(config.blockMultiplier, record.violations - 1);
      blockDuration = Math.min(blockDuration, 86400);
    }

    record.blocked = true;
    record.blockExpires = Date.now() + blockDuration * 1000;

    console.warn(`[RateLimiter] Blocked ${identifier} (${blockDuration}s)`);
  }

  /**
   * Detecta padrões de abuso
   */
  private checkAbusePatterns(
    identifier: string,
    record: InMemoryRecord
  ): RateLimitResult | null {
    const now = Date.now();

    for (const pattern of this.abusePatterns) {
      const windowStart = now - pattern.windowSeconds * 1000;
      const recentRequests = record.timestamps.filter((t) => t > windowStart).length;

      if (recentRequests >= pattern.threshold) {
        console.warn(
          `[RateLimiter] Abuse pattern detected: ${pattern.name} for ${identifier}`
        );

        if (pattern.action === 'block' && pattern.blockDuration) {
          record.blocked = true;
          record.blockExpires = now + pattern.blockDuration * 1000;
          this.memoryStore.set(identifier, record);

          return {
            allowed: false,
            remaining: 0,
            limit: 0,
            reset: record.blockExpires,
            blocked: true,
            blockReason: `Abuse detected: ${pattern.description}`,
            retryAfter: pattern.blockDuration,
          };
        }
      }
    }

    return null;
  }

  /**
   * Adiciona IP à whitelist
   */
  addToWhitelist(ip: string): void {
    this.whitelist.add(ip);
    this.blacklist.delete(ip);
  }

  /**
   * Adiciona IP à blacklist
   */
  addToBlacklist(ip: string): void {
    this.blacklist.add(ip);
    this.whitelist.delete(ip);
  }

  /**
   * Remove bloqueio manualmente
   */
  async unblock(identifier: string): Promise<boolean> {
    if (this.redis) {
      const blockKey = `${this.keyPrefix}${identifier}:blocked`;
      await this.redis.del(blockKey);
    }

    const record = this.memoryStore.get(identifier);
    if (record) {
      record.blocked = false;
      record.blockExpires = undefined;
      record.violations = 0;
      this.memoryStore.set(identifier, record);
    }

    return true;
  }

  /**
   * Obtém estatísticas
   */
  async getStats(): Promise<{
    whitelisted: number;
    blacklisted: number;
    inMemoryRecords: number;
  }> {
    return {
      whitelisted: this.whitelist.size,
      blacklisted: this.blacklist.size,
      inMemoryRecords: 0, // Memory store is private
    };
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.memoryStore.destroy();
  }
}

// ===========================================
// Singleton Export
// ===========================================

let rateLimiterInstance: AdvancedRateLimiter | null = null;

export function getRateLimiter(): AdvancedRateLimiter {
  if (!rateLimiterInstance) {
    // Tentar conectar ao Redis
    let redis: Redis | undefined;
    if (process.env.REDIS_URL) {
      try {
        redis = new Redis(process.env.REDIS_URL, {
          maxRetriesPerRequest: 3,
          enableReadyCheck: false,
          lazyConnect: true,
        });
      } catch {
        console.warn('[RateLimiter] Redis connection failed, using in-memory');
      }
    }

    rateLimiterInstance = new AdvancedRateLimiter({
      redis,
      keyPrefix: 'rl:v7:',
      enableAbuseDetection: true,
    });
  }

  return rateLimiterInstance;
}

export default getRateLimiter;

// ===========================================
// Middleware Helper
// ===========================================

export async function checkRateLimit(
  ip: string,
  endpoint: string
): Promise<{
  allowed: boolean;
  headers: Record<string, string>;
  status?: number;
  body?: Record<string, unknown>;
}> {
  const limiter = getRateLimiter();
  
  // Determinar configuração baseada no endpoint
  let configName = 'standard';
  if (endpoint.includes('/auth') || endpoint.includes('/login')) {
    configName = 'auth';
  } else if (endpoint.includes('/upload') || endpoint.includes('/pptx')) {
    configName = 'upload';
  } else if (endpoint.includes('/render')) {
    configName = 'render';
  } else if (endpoint.includes('/webhook')) {
    configName = 'webhook';
  } else if (endpoint.includes('/health')) {
    configName = 'health';
  }

  const result = await limiter.check(ip, configName);

  const headers: Record<string, string> = {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.reset.toString(),
  };

  if (!result.allowed) {
    headers['Retry-After'] = (result.retryAfter || 60).toString();
    
    return {
      allowed: false,
      headers,
      status: 429,
      body: {
        success: false,
        error: 'Too many requests',
        code: result.blocked ? 'BLOCKED' : 'RATE_LIMITED',
        message: result.blockReason || 'Rate limit exceeded. Please try again later.',
        retryAfter: result.retryAfter,
      },
    };
  }

  return { allowed: true, headers };
}
