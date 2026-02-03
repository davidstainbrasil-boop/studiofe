/**
 * 📋 Audit Log API
 * MVP Vídeos TécnicoCursos v7
 * 
 * Endpoints:
 * - GET /api/audit - Lista entradas de auditoria
 * - GET /api/audit/stats - Estatísticas de auditoria
 * - GET /api/audit/export - Exporta logs (CSV)
 * - GET /api/audit/[id] - Detalhes de uma entrada
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auditLog, type AuditCategory, type AuditSeverity, type AuditAction, type AuditQuery } from '../../src/lib/audit/audit-log';

// ===========================================
// Validation Schemas
// ===========================================

const querySchema = z.object({
  category: z.string().optional(),
  action: z.string().optional(),
  severity: z.enum(['info', 'warning', 'critical']).optional(),
  actor_id: z.string().uuid().optional(),
  target_id: z.string().optional(),
  target_type: z.string().optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  ip_address: z.string().ip().optional(),
  limit: z.coerce.number().min(1).max(1000).default(100),
  offset: z.coerce.number().min(0).default(0),
});

// ===========================================
// GET Handler
// ===========================================

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');

  // TODO: Em produção, verificar permissões de admin
  // const user = await getAuthUser(req);
  // if (!user || !user.isAdmin) {
  //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // }

  try {
    // Endpoint: /api/audit/stats
    if (action === 'stats') {
      const stats = auditLog.getStats();
      return NextResponse.json({
        success: true,
        data: stats,
      });
    }

    // Endpoint: /api/audit/export
    if (action === 'export') {
      const userId = searchParams.get('user_id');
      const format = searchParams.get('format') || 'json';

      let entries;
      if (userId) {
        entries = auditLog.exportForUser(userId);
      } else {
        // Exportar todos (com limite)
        entries = auditLog.query({ limit: 10000 });
      }

      if (format === 'csv') {
        const csv = auditLog.exportToCsv(entries);
        return new NextResponse(csv, {
          status: 200,
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="audit-log-${new Date().toISOString().slice(0, 10)}.csv"`,
          },
        });
      }

      return NextResponse.json({
        success: true,
        data: {
          entries,
          count: entries.length,
          exported_at: new Date().toISOString(),
        },
      });
    }

    // Endpoint: /api/audit/[id]
    const entryId = searchParams.get('id');
    if (entryId) {
      const entry = auditLog.getById(entryId);
      
      if (!entry) {
        return NextResponse.json(
          { success: false, error: 'Audit entry not found' },
          { status: 404 }
        );
      }

      // Verificar integridade
      const isValid = auditLog.verifyIntegrity(entry);

      return NextResponse.json({
        success: true,
        data: {
          entry,
          integrity: isValid ? 'valid' : 'compromised',
        },
      });
    }

    // Default: Lista com filtros
    // Extrair parâmetros de query
    const queryParams: Record<string, string | undefined> = {};
    const entries_arr = Array.from(searchParams.entries());
    for (const [key] of entries_arr) {
      queryParams[key] = searchParams.get(key) || undefined;
    }

    const parsed = querySchema.safeParse(queryParams);
    
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid query parameters', details: parsed.error.errors },
        { status: 400 }
      );
    }

    const filters: AuditQuery = {
      category: parsed.data.category as AuditCategory | undefined,
      action: parsed.data.action as AuditAction | undefined,
      severity: parsed.data.severity as AuditSeverity | undefined,
      actor_id: parsed.data.actor_id,
      target_id: parsed.data.target_id,
      target_type: parsed.data.target_type,
      start_date: parsed.data.start_date,
      end_date: parsed.data.end_date,
      ip_address: parsed.data.ip_address,
      limit: parsed.data.limit,
      offset: parsed.data.offset,
    };

    const audit_entries = auditLog.query(filters);

    return NextResponse.json({
      success: true,
      data: {
        entries: audit_entries,
        count: audit_entries.length,
        filters: {
          ...filters,
          limit: parsed.data.limit,
          offset: parsed.data.offset,
        },
      },
    });
  } catch (error) {
    console.error('[Audit API] GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ===========================================
// POST Handler - Trigger actions
// ===========================================

export async function POST(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');

  // TODO: Verificar permissões de admin

  try {
    // Action: Cleanup old logs
    if (action === 'cleanup') {
      const removed = auditLog.cleanup();
      return NextResponse.json({
        success: true,
        data: {
          removed_entries: removed,
          message: `Cleaned up ${removed} old audit entries`,
        },
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[Audit API] POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
