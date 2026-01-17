/**
 * API Quota Endpoint
 * Returns current quota usage for all external APIs
 */

import { NextResponse } from 'next/server';
import { apiQuotaMonitor } from '@lib/monitoring/api-quota-monitor';

export async function GET(request: Request) {
  try {
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
