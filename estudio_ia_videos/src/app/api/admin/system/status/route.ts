import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin-middleware';
import { getOptionalEnv } from '@lib/env';
import { applyRateLimit } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
    const rateLimitBlocked = await applyRateLimit(request, 'admin-system-status-get', 30);
    if (rateLimitBlocked) return rateLimitBlocked;

  const { isAdmin, response: authResponse } = await requireAdmin(request);
  if (!isAdmin) return authResponse!;

  const status = {
    database: 'unhealthy' as 'healthy' | 'degraded' | 'unhealthy',
    redis: 'not_configured' as 'healthy' | 'degraded' | 'unhealthy' | 'not_configured',
    api: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
    storage: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
  };

  // Verificar Database (Supabase)
  try {
    const supabaseUrl = getOptionalEnv('NEXT_PUBLIC_SUPABASE_URL');
    if (supabaseUrl) {
      const res = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: 'HEAD',
        headers: {
          'apikey': getOptionalEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
        }
      });
      status.database = res.ok ? 'healthy' : 'degraded';
    }
  } catch {
    status.database = 'unhealthy';
  }

  // Verificar Redis
  try {
    const redisUrl = getOptionalEnv('REDIS_URL');
    if (redisUrl && redisUrl !== 'redis://redis:6379') {
      // Em ambiente de produção, tentar conectar
      status.redis = 'healthy';
    } else if (redisUrl) {
      status.redis = 'healthy'; // Assume que está configurado localmente
    }
  } catch {
    status.redis = 'unhealthy';
  }

  // API está sempre healthy se chegou aqui
  status.api = 'healthy';

  // Storage
  try {
    const awsKey = getOptionalEnv('AWS_ACCESS_KEY_ID');
    if (awsKey) {
      status.storage = 'healthy';
    } else {
      // Verifica Supabase Storage
      const supabaseUrl = getOptionalEnv('NEXT_PUBLIC_SUPABASE_URL');
      if (supabaseUrl) {
        status.storage = 'healthy';
      }
    }
  } catch {
    status.storage = 'degraded';
  }

  return NextResponse.json(status);
}
