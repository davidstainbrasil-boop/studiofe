/**
 * API Quota Endpoint
 * Returns current quota usage for all external APIs
 */

import { NextResponse } from 'next/server';
import { apiQuotaMonitor } from '@lib/monitoring/api-quota-monitor';
import { applyRateLimit } from '@/lib/rate-limit';
import { getServerAuth } from '@lib/auth/unified-session';

export async function GET(request: Request) {
  try {
    const rateLimitBlocked = await applyRateLimit(request, 'quotas-get', 60);
    if (rateLimitBlocked) return rateLimitBlocked;

    // Auth check — quota data should not be public
    const session = await getServerAuth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get('refresh') === 'true';

    const quotas = await apiQuotaMonitor.getAllQuotas(forceRefresh);

    return NextResponse.json({
      success: true,
      data: quotas,
      summary: await apiQuotaMonitor.getQuotaSummary()
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch quotas'
    }, { status: 500 });
  }
}
