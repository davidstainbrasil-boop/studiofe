/**
 * Alerts API Endpoint
 * Returns and manages system alerts
 */

import { NextResponse } from 'next/server';
import { errorAlerting } from '@lib/monitoring/error-alerting';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const unacknowledgedOnly = searchParams.get('unacknowledged') === 'true';

    const alerts = unacknowledgedOnly 
      ? errorAlerting.getUnacknowledgedAlerts()
      : errorAlerting.getRecentAlerts(limit);

    const stats = errorAlerting.getAlertStats();

    return NextResponse.json({
      success: true,
      data: {
        alerts,
        stats
      }
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch alerts'
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    if (body.action === 'acknowledge' && body.alertId) {
      const success = errorAlerting.acknowledgeAlert(body.alertId);
      return NextResponse.json({ success });
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action'
    }, { status: 400 });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to process request'
    }, { status: 500 });
  }
}
