/**
 * E2E Test API Route
 * Runs the E2E test suite and returns results
 * Access via: GET /api/test/e2e
 */

import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({
      success: false,
      error: 'E2E tests are disabled in production'
    }, { status: 403 });
  }

  try {
    const { runE2ETests } = await import('@/__tests__/e2e/pipeline.test');
    const results = await runE2ETests();

    return NextResponse.json({
      success: results.failed === 0,
      data: {
        passed: results.passed,
        failed: results.failed,
        total: results.passed + results.failed,
        results: results.results
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: (error as Error).message,
      stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
    }, { status: 500 });
  }
}
