import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const start = Date.now();

  try {
    // Test DB connection
    await prisma.$queryRaw`SELECT 1`;
    const latencyMs = Date.now() - start;

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      db: { connected: true, latencyMs },
      version: process.env.npm_package_version || '0.1.0',
    });
  } catch {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        db: { connected: false, error: 'Database connection failed' },
      },
      { status: 503 }
    );
  }
}
