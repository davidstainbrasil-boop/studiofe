import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin-middleware';
import { applyRateLimit } from '@/lib/rate-limit';
import { healthCheckService, type ServiceHealth } from '@lib/monitoring/health-check';

type BasicStatus = 'healthy' | 'degraded' | 'unhealthy';
type ConfigurableStatus = BasicStatus | 'not_configured';

function toBasicStatus(status: ServiceHealth['status']): BasicStatus {
  if (status === 'healthy' || status === 'degraded' || status === 'unhealthy') {
    return status;
  }
  return 'degraded';
}

export async function GET(request: NextRequest) {
    const rateLimitBlocked = await applyRateLimit(request, 'admin-system-status-get', 30);
    if (rateLimitBlocked) return rateLimitBlocked;

  const { isAdmin, response: authResponse } = await requireAdmin(request);
  if (!isAdmin) return authResponse!;

  const status = {
    database: 'unhealthy' as BasicStatus,
    redis: 'not_configured' as ConfigurableStatus,
    api: 'healthy' as BasicStatus,
    storage: 'not_configured' as ConfigurableStatus,
    ffmpeg: 'unhealthy' as BasicStatus,
  };

  const hasRedisConfig = Boolean(process.env.REDIS_URL || process.env.REDIS_HOST);
  const hasAwsStorageConfig = Boolean(
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.AWS_REGION
  );
  const hasSupabaseStorageConfig = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  const hasStorageConfig = hasAwsStorageConfig || hasSupabaseStorageConfig;

  const [databaseHealth, redisHealth, storageHealth, ffmpegHealth] = await Promise.all([
    healthCheckService.checkDatabase(),
    hasRedisConfig ? healthCheckService.checkRedis() : Promise.resolve(null),
    hasStorageConfig ? healthCheckService.checkStorage() : Promise.resolve(null),
    healthCheckService.checkFFmpeg(),
  ]);

  status.database = toBasicStatus(databaseHealth.status);
  status.redis = hasRedisConfig && redisHealth ? toBasicStatus(redisHealth.status) : 'not_configured';
  status.storage = hasStorageConfig && storageHealth ? toBasicStatus(storageHealth.status) : 'not_configured';
  status.ffmpeg = toBasicStatus(ffmpegHealth.status);

  const coreStatuses: BasicStatus[] = [
    status.database,
    status.ffmpeg,
    status.redis === 'not_configured' ? 'degraded' : status.redis,
    status.storage === 'not_configured' ? 'degraded' : status.storage,
  ];

  if (coreStatuses.includes('unhealthy')) {
    status.api = 'unhealthy';
  } else if (coreStatuses.includes('degraded')) {
    status.api = 'degraded';
  } else {
    status.api = 'healthy';
  }

  return NextResponse.json({
    ...status,
    checkedAt: new Date().toISOString(),
    details: {
      database: databaseHealth.message,
      redis: redisHealth?.message,
      storage: storageHealth?.message,
      ffmpeg: ffmpegHealth.message,
    },
  });
}
