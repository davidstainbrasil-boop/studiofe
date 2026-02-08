/**
 * Health Check API Endpoint
 * Returns comprehensive system health status
 * 
 * GET /api/health - Quick essential check
 * GET /api/health?full=true - Full system check with all services
 */

import { NextResponse } from 'next/server';
import { healthCheckService } from '@lib/monitoring/health-check';
import { applyRateLimit } from '@/lib/rate-limit';

export async function GET(request: Request) {
  try {
    const rateLimitBlocked = await applyRateLimit(request, 'health-get', 120);
    if (rateLimitBlocked) return rateLimitBlocked;

    const { searchParams } = new URL(request.url);
    const full = searchParams.get('full') === 'true';

    const health = full 
      ? await healthCheckService.checkAll()
      : await healthCheckService.checkEssential();

    // Format for backwards compatibility
    const response = {
      status: health.overall,
      timestamp: health.timestamp.toISOString(),
      checks: Object.fromEntries(
        health.services.map(s => [
          s.name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
          {
            status: s.status,
            latency: s.latencyMs || 0,
            error: s.message
          }
        ])
      ),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: health.uptime,
      responseTime: 0
    };

    const statusCode = health.overall === 'healthy' ? 200 
      : health.overall === 'degraded' ? 200 
      : 503;

    return NextResponse.json(response, { status: statusCode });
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      message: (error as Error).message
    }, { status: 500 });
  }
}

