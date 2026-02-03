/**
 * 📋 Audit Log Service
 * MVP Vídeos TécnicoCursos v7
 * 
 * Sistema de auditoria para compliance (LGPD/GDPR):
 * - Log de todas as ações sensíveis
 * - Imutabilidade dos registros
 * - Retenção configurável
 * - Exportação para compliance
 * 
 * Features:
 * - Categorias: auth, data, admin, security
 * - Severity levels: info, warning, critical
 * - Detalhes de contexto (IP, user agent, etc)
 * - Busca e filtros avançados
 */

import * as crypto from 'crypto';
// Simple logger for audit log
const logger = {
  info: (msg: string, data?: Record<string, unknown>) => console.log(`[INFO] ${msg}`, data),
  error: (msg: string, data?: Record<string, unknown>) => console.error(`[ERROR] ${msg}`, data),
  warn: (msg: string, data?: Record<string, unknown>) => console.warn(`[WARN] ${msg}`, data),
  debug: (msg: string, data?: Record<string, unknown>) => console.debug(`[DEBUG] ${msg}`, data),
};

// ===========================================
// Types
// ===========================================

export type AuditCategory =
  | 'auth'        // Login, logout, password changes
  | 'data'        // CRUD operations on user data
  | 'admin'       // Administrative actions
  | 'security'    // Security events
  | 'billing'     // Payment and subscription
  | 'export'      // Data exports
  | 'api'         // API access
  | 'system';     // System events

export type AuditAction =
  // Auth
  | 'user.login'
  | 'user.logout'
  | 'user.login_failed'
  | 'user.password_changed'
  | 'user.password_reset_requested'
  | 'user.2fa_enabled'
  | 'user.2fa_disabled'
  // Data
  | 'project.created'
  | 'project.updated'
  | 'project.deleted'
  | 'project.shared'
  | 'video.rendered'
  | 'video.downloaded'
  | 'video.deleted'
  // Admin
  | 'user.role_changed'
  | 'user.suspended'
  | 'user.reactivated'
  | 'user.deleted_by_admin'
  | 'settings.updated'
  | 'permission.granted'
  | 'permission.revoked'
  // Security
  | 'security.suspicious_activity'
  | 'security.rate_limit_exceeded'
  | 'security.ip_blocked'
  | 'security.brute_force_detected'
  // Billing
  | 'subscription.created'
  | 'subscription.cancelled'
  | 'payment.successful'
  | 'payment.failed'
  // Export
  | 'export.data_requested'
  | 'export.data_completed'
  | 'export.account_deleted'
  // API
  | 'api.key_created'
  | 'api.key_revoked'
  | 'webhook.created'
  | 'webhook.deleted'
  // System
  | 'system.maintenance_started'
  | 'system.maintenance_ended'
  | 'system.backup_completed'
  | 'system.error';

export type AuditSeverity = 'info' | 'warning' | 'critical';

export interface AuditEntry {
  id: string;
  timestamp: string;
  category: AuditCategory;
  action: AuditAction;
  severity: AuditSeverity;
  actor: {
    user_id?: string;
    email?: string;
    ip_address?: string;
    user_agent?: string;
    session_id?: string;
  };
  target?: {
    type: string; // 'user', 'project', 'video', etc
    id: string;
    name?: string;
  };
  details?: Record<string, unknown>;
  metadata?: {
    request_id?: string;
    api_version?: string;
    source?: string; // 'web', 'api', 'admin', 'system'
  };
  checksum: string; // Para verificar integridade
}

export interface AuditQuery {
  category?: AuditCategory;
  action?: AuditAction;
  severity?: AuditSeverity;
  actor_id?: string;
  target_id?: string;
  target_type?: string;
  start_date?: string;
  end_date?: string;
  ip_address?: string;
  limit?: number;
  offset?: number;
}

export interface AuditStats {
  total_entries: number;
  by_category: Record<AuditCategory, number>;
  by_severity: Record<AuditSeverity, number>;
  recent_critical: number;
  oldest_entry?: string;
  newest_entry?: string;
}

// ===========================================
// Audit Log Service
// ===========================================

class AuditLogService {
  private logs: AuditEntry[] = [];
  private readonly maxInMemoryLogs = 10000;
  private retentionDays = 365; // 1 year default

  constructor() {
    // Em produção, isso seria conectado a um banco de dados
    // com write-ahead log e backup imediato
  }

  /**
   * Registra uma entrada de auditoria
   */
  log(
    category: AuditCategory,
    action: AuditAction,
    options: {
      severity?: AuditSeverity;
      actor?: AuditEntry['actor'];
      target?: AuditEntry['target'];
      details?: Record<string, unknown>;
      metadata?: AuditEntry['metadata'];
    } = {}
  ): AuditEntry {
    const entry: AuditEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      category,
      action,
      severity: options.severity || this.inferSeverity(action),
      actor: options.actor || {},
      target: options.target,
      details: options.details,
      metadata: options.metadata,
      checksum: '', // Será calculado abaixo
    };

    // Calcular checksum para integridade
    entry.checksum = this.calculateChecksum(entry);

    // Adicionar ao log
    this.logs.unshift(entry);

    // Limitar tamanho em memória
    if (this.logs.length > this.maxInMemoryLogs) {
      this.logs = this.logs.slice(0, this.maxInMemoryLogs);
    }

    // Log para sistema de logging
    logger.info('[Audit] Entry created', {
      id: entry.id,
      category,
      action,
      severity: entry.severity,
      actor_id: entry.actor.user_id,
    });

    return entry;
  }

  /**
   * Busca entradas de auditoria
   */
  query(filters: AuditQuery): AuditEntry[] {
    let results = [...this.logs];

    if (filters.category) {
      results = results.filter(e => e.category === filters.category);
    }

    if (filters.action) {
      results = results.filter(e => e.action === filters.action);
    }

    if (filters.severity) {
      results = results.filter(e => e.severity === filters.severity);
    }

    if (filters.actor_id) {
      results = results.filter(e => e.actor.user_id === filters.actor_id);
    }

    if (filters.target_id) {
      results = results.filter(e => e.target?.id === filters.target_id);
    }

    if (filters.target_type) {
      results = results.filter(e => e.target?.type === filters.target_type);
    }

    if (filters.ip_address) {
      results = results.filter(e => e.actor.ip_address === filters.ip_address);
    }

    if (filters.start_date) {
      const startDate = new Date(filters.start_date);
      results = results.filter(e => new Date(e.timestamp) >= startDate);
    }

    if (filters.end_date) {
      const endDate = new Date(filters.end_date);
      results = results.filter(e => new Date(e.timestamp) <= endDate);
    }

    // Paginação
    const offset = filters.offset || 0;
    const limit = filters.limit || 100;
    results = results.slice(offset, offset + limit);

    return results;
  }

  /**
   * Obtém uma entrada por ID
   */
  getById(id: string): AuditEntry | null {
    return this.logs.find(e => e.id === id) || null;
  }

  /**
   * Verifica integridade de uma entrada
   */
  verifyIntegrity(entry: AuditEntry): boolean {
    const expectedChecksum = this.calculateChecksum(entry);
    return entry.checksum === expectedChecksum;
  }

  /**
   * Exporta logs para compliance (LGPD/GDPR)
   */
  exportForUser(userId: string): AuditEntry[] {
    return this.logs.filter(e => 
      e.actor.user_id === userId || 
      (e.target?.type === 'user' && e.target.id === userId)
    );
  }

  /**
   * Exporta logs em formato CSV
   */
  exportToCsv(entries: AuditEntry[]): string {
    const headers = [
      'id',
      'timestamp',
      'category',
      'action',
      'severity',
      'actor_user_id',
      'actor_ip',
      'target_type',
      'target_id',
      'details',
    ];

    const rows = entries.map(e => [
      e.id,
      e.timestamp,
      e.category,
      e.action,
      e.severity,
      e.actor.user_id || '',
      e.actor.ip_address || '',
      e.target?.type || '',
      e.target?.id || '',
      JSON.stringify(e.details || {}),
    ]);

    return [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');
  }

  /**
   * Obtém estatísticas
   */
  getStats(): AuditStats {
    const categories: Record<AuditCategory, number> = {
      auth: 0,
      data: 0,
      admin: 0,
      security: 0,
      billing: 0,
      export: 0,
      api: 0,
      system: 0,
    };

    const severities: Record<AuditSeverity, number> = {
      info: 0,
      warning: 0,
      critical: 0,
    };

    let recentCritical = 0;
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

    for (const entry of this.logs) {
      categories[entry.category]++;
      severities[entry.severity]++;
      
      if (entry.severity === 'critical' && new Date(entry.timestamp).getTime() > oneDayAgo) {
        recentCritical++;
      }
    }

    return {
      total_entries: this.logs.length,
      by_category: categories,
      by_severity: severities,
      recent_critical: recentCritical,
      oldest_entry: this.logs.length > 0 ? this.logs[this.logs.length - 1].timestamp : undefined,
      newest_entry: this.logs.length > 0 ? this.logs[0].timestamp : undefined,
    };
  }

  /**
   * Cleanup de logs antigos (respeitar retenção)
   */
  cleanup(): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);

    const initialCount = this.logs.length;
    this.logs = this.logs.filter(e => new Date(e.timestamp) > cutoffDate);
    
    const removedCount = initialCount - this.logs.length;
    
    if (removedCount > 0) {
      logger.info('[Audit] Cleanup completed', {
        removed: removedCount,
        remaining: this.logs.length,
      });
    }

    return removedCount;
  }

  // ===========================================
  // Private Methods
  // ===========================================

  private calculateChecksum(entry: AuditEntry): string {
    // Criar objeto sem checksum para calcular
    const entryWithoutChecksum = { ...entry };
    delete (entryWithoutChecksum as Partial<AuditEntry>).checksum;

    const data = JSON.stringify(entryWithoutChecksum, Object.keys(entryWithoutChecksum).sort());
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
  }

  private inferSeverity(action: AuditAction): AuditSeverity {
    // Critical actions
    if ([
      'user.deleted_by_admin',
      'security.suspicious_activity',
      'security.brute_force_detected',
      'export.account_deleted',
      'permission.revoked',
    ].includes(action)) {
      return 'critical';
    }

    // Warning actions
    if ([
      'user.login_failed',
      'user.suspended',
      'security.rate_limit_exceeded',
      'security.ip_blocked',
      'payment.failed',
      'user.role_changed',
    ].includes(action)) {
      return 'warning';
    }

    return 'info';
  }
}

// ===========================================
// Singleton Instance
// ===========================================

export const auditLog = new AuditLogService();

// ===========================================
// Helper Functions
// ===========================================

/**
 * Log de autenticação
 */
export function auditAuth(
  action: Extract<AuditAction, `user.${string}`>,
  userId: string | undefined,
  ip: string | undefined,
  success: boolean,
  details?: Record<string, unknown>
): void {
  auditLog.log('auth', action, {
    severity: success ? 'info' : 'warning',
    actor: {
      user_id: userId,
      ip_address: ip,
    },
    details: {
      success,
      ...details,
    },
  });
}

/**
 * Log de ação de dados
 */
export function auditData(
  action: Extract<AuditAction, `project.${string}` | `video.${string}`>,
  userId: string,
  targetType: string,
  targetId: string,
  details?: Record<string, unknown>
): void {
  auditLog.log('data', action, {
    actor: { user_id: userId },
    target: { type: targetType, id: targetId },
    details,
  });
}

/**
 * Log de ação administrativa
 */
export function auditAdmin(
  action: Extract<AuditAction, `user.${string}` | `settings.${string}` | `permission.${string}`>,
  adminId: string,
  targetUserId?: string,
  details?: Record<string, unknown>
): void {
  auditLog.log('admin', action, {
    severity: 'warning',
    actor: { user_id: adminId },
    target: targetUserId ? { type: 'user', id: targetUserId } : undefined,
    details,
    metadata: { source: 'admin' },
  });
}

/**
 * Log de evento de segurança
 */
export function auditSecurity(
  action: Extract<AuditAction, `security.${string}`>,
  ip: string | undefined,
  userId?: string,
  details?: Record<string, unknown>
): void {
  auditLog.log('security', action, {
    severity: 'critical',
    actor: {
      user_id: userId,
      ip_address: ip,
    },
    details,
  });
}

/**
 * Log de exportação de dados (LGPD/GDPR)
 */
export function auditExport(
  action: Extract<AuditAction, `export.${string}`>,
  userId: string,
  details?: Record<string, unknown>
): void {
  auditLog.log('export', action, {
    severity: action === 'export.account_deleted' ? 'critical' : 'info',
    actor: { user_id: userId },
    target: { type: 'user', id: userId },
    details,
  });
}

/**
 * Log de acesso à API
 */
export function auditApiAccess(
  action: Extract<AuditAction, `api.${string}` | `webhook.${string}`>,
  userId: string,
  details?: Record<string, unknown>
): void {
  auditLog.log('api', action, {
    actor: { user_id: userId },
    details,
    metadata: { source: 'api' },
  });
}

// ===========================================
// Middleware Helper
// ===========================================

/**
 * Extrai contexto de request para auditoria
 */
export function extractAuditContext(req: Request): Partial<AuditEntry['actor']> {
  const headers = req.headers;
  
  return {
    ip_address: headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                headers.get('x-real-ip') || 
                undefined,
    user_agent: headers.get('user-agent') || undefined,
    session_id: headers.get('x-session-id') || undefined,
  };
}
