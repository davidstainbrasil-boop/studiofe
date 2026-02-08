import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@lib/auth/admin-middleware';
import { getRequiredEnv, getOptionalEnv } from '@lib/env';
import { logger } from '@lib/logger';
import { applyRateLimit } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
    const rateLimitBlocked = await applyRateLimit(request, 'admin-system-stats-get', 30);
    if (rateLimitBlocked) return rateLimitBlocked;

  const { isAdmin, response } = await requireAdmin(request);
  if (!isAdmin) return response!;

  // Calcular uptime
  const uptimeSeconds = process.uptime();
  const days = Math.floor(uptimeSeconds / 86400);
  const hours = Math.floor((uptimeSeconds % 86400) / 3600);
  const minutes = Math.floor((uptimeSeconds % 3600) / 60);
  
  let uptime = '';
  if (days > 0) uptime += `${days}d `;
  if (hours > 0) uptime += `${hours}h `;
  uptime += `${minutes}m`;

  // Em produção, buscar dados reais do banco
  const stats = {
    totalUsers: 0,
    totalProjects: 0,
    apiCalls24h: 0,
    storageUsed: '0 MB',
    uptime: uptime.trim(),
    nodeVersion: process.version,
    memoryUsage: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`,
    cpuUsage: '0%',
  };

  // Tentar buscar dados reais do Supabase
  try {
    const supabaseUrl = getOptionalEnv('NEXT_PUBLIC_SUPABASE_URL');
    const supabaseKey = getOptionalEnv('SUPABASE_SERVICE_ROLE_KEY');
    
    if (supabaseUrl && supabaseKey) {
      // Buscar contagem de usuários
      const usersRes = await fetch(`${supabaseUrl}/rest/v1/profiles?select=count`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Prefer': 'count=exact'
        }
      });
      
      if (usersRes.ok) {
        const countHeader = usersRes.headers.get('content-range');
        if (countHeader) {
          const match = countHeader.match(/\/(\d+)/);
          if (match) {
            stats.totalUsers = parseInt(match[1], 10);
          }
        }
      }

      // Buscar contagem de projetos
      const projectsRes = await fetch(`${supabaseUrl}/rest/v1/projects?select=count`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Prefer': 'count=exact'
        }
      });
      
      if (projectsRes.ok) {
        const countHeader = projectsRes.headers.get('content-range');
        if (countHeader) {
          const match = countHeader.match(/\/(\d+)/);
          if (match) {
            stats.totalProjects = parseInt(match[1], 10);
          }
        }
      }
    }
  } catch (error) {
    logger.warn('Erro ao buscar estatísticas do Supabase', {
      component: 'API: admin/system/stats',
      error: error instanceof Error ? error.message : String(error)
    });
  }

  return NextResponse.json(stats);
}
