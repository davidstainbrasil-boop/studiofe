import { logger } from '@lib/logger';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getRequiredEnv } from '@lib/env';

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export class AuditLoggingService {
  private supabase: SupabaseClient;

  constructor() {
    try {
      const supabaseUrl = getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL');
      const supabaseKey = getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY');
    
      this.supabase = createClient(supabaseUrl, supabaseKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });
    } catch (error) {
      logger.error('Failed to initialize AuditLoggingService', error instanceof Error ? error : new Error(String(error)), {
        component: 'AuditLoggingReal'
      });
      throw error;
    }
  }

  async log(log: Omit<AuditLog, 'id' | 'timestamp'>): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('analytics_events')
        .insert({
          userId: log.userId,
          eventType: `audit.${log.action}`,
          eventData: {
            resource: log.resource,
            ...log.metadata
          },
          createdAt: new Date().toISOString()
        });

      if (error) {
        logger.error('Failed to write audit log', error instanceof Error ? error : new Error(String(error)), { component: 'AuditLoggingReal' });
      }
    } catch (error) {
      logger.error('Error in audit logger', error instanceof Error ? error : new Error(String(error)), { component: 'AuditLoggingReal' });
    }
  }

  async query(filters: Partial<AuditLog>): Promise<AuditLog[]> {
    try {
      let query = this.supabase
        .from('analytics_events')
        .select('*')
        .ilike("eventType", 'audit.%')
        .order("createdAt", { ascending: false });

      if (filters.userId) {
        query = query.eq("userId", filters.userId);
      }

      if (filters.action) {
        query = query.eq("eventType", `audit.${filters.action}`);
      }

      const { data, error } = await query.limit(100);

      if (error) throw error;

      return (data || []).map(row => ({
        id: row.id,
        userId: row.userId,
        action: row.eventType.replace('audit.', ''),
        resource: row.eventData?.resource || 'unknown',
        timestamp: new Date(row.createdAt),
        metadata: row.eventData
      }));
    } catch (error) {
      logger.error('Failed to query audit logs', error instanceof Error ? error : new Error(String(error)), { component: 'AuditLoggingReal' });
      return [];
    }
  }
  
  async getUserActivity(userId: string, limit: number = 50): Promise<AuditLog[]> {
    return this.query({ userId });
  }

  async logUserAction(userId: string, action: string, resource: string, metadata?: Record<string, unknown>): Promise<void> {
    return this.log({
      userId,
      action,
      resource,
      metadata
    });
  }
}

export const auditLogger = new AuditLoggingService();

export enum AuditAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  READ = 'read',
  LOGIN = 'login',
  LOGOUT = 'logout',
  UPLOAD = 'upload',
  DOWNLOAD = 'download',
  FILE_UPLOAD = 'file_upload',
  FILE_DOWNLOAD = 'file_download',
  FILE_DELETE = 'file_delete',
}

export function getRequestMetadata(req: Request) {
  return {
    ip: req.headers.get('x-forwarded-for') || 'unknown',
    userAgent: req.headers.get('user-agent') || 'unknown',
  };
}
