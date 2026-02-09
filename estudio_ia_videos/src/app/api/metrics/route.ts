import { NextResponse } from 'next/server'
import { renderPrometheus, getMetricsJson } from '@lib/metrics'
import { applyRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/metrics
 * 
 * Returns application metrics in Prometheus format or JSON
 * 
 * Query params:
 * - format: 'prometheus' (default) | 'json'
 */
export async function GET(request: Request) {
  try {
    const rateLimitBlocked = await applyRateLimit(request, 'metrics-get', 60);
    if (rateLimitBlocked) return rateLimitBlocked;

  const { searchParams } = new URL(request.url)
  const format = searchParams.get('format') || 'prometheus'
  
  // Auth check for metrics endpoint
  // Em produção: OBRIGATÓRIO ter METRICS_TOKEN
  const authHeader = request.headers.get('authorization')
  const metricsToken = process.env.METRICS_TOKEN
  
  if (process.env.NODE_ENV === 'production' && !metricsToken) {
    return NextResponse.json(
      { error: 'Metrics endpoint disabled: METRICS_TOKEN not configured' },
      { status: 403 }
    )
  }
  
  if (metricsToken && authHeader !== `Bearer ${metricsToken}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }
  
  if (format === 'json') {
    return NextResponse.json(await getMetricsJson(), {
      headers: {
        'Cache-Control': 'no-store',
      },
    })
  }
  
  // Default: Prometheus format
  return new NextResponse(await renderPrometheus(), {
    headers: {
      'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

