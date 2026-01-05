/**
 * System Info Endpoint
 * GET /api/system/info
 * 
 * Returns detailed system information for debugging and monitoring.
 * Protected endpoint - requires admin authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseForRequest } from '@/lib/supabase/server';
import os from 'os';

export const dynamic = 'force-dynamic';

interface SystemInfo {
  system: {
    hostname: string;
    platform: string;
    arch: string;
    release: string;
    cpus: number;
    totalMemory: string;
    freeMemory: string;
    memoryUsage: {
      heapTotal: string;
      heapUsed: string;
      external: string;
      rss: string;
    };
    loadAverage: number[];
  };
  process: {
    pid: number;
    uptime: number;
    uptimeFormatted: string;
    nodeVersion: string;
    v8Version: string;
  };
  environment: {
    nodeEnv: string;
    timezone: string;
    locale: string;
  };
  timestamp: string;
}

function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let unitIndex = 0;
  let size = bytes;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${secs}s`);
  
  return parts.join(' ');
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Check authentication
  const supabase = getSupabaseForRequest(request);
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Authentication required' },
      { status: 401 }
    );
  }

  // Check if user is admin (optional - can be removed if all authenticated users should access)
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();
  const userRole = userData?.role;
  if (userRole !== 'admin' && userRole !== 'manager') {
    return NextResponse.json(
      { error: 'Forbidden', message: 'Admin access required' },
      { status: 403 }
    );
  }

  const memUsage = process.memoryUsage();
  
  const systemInfo: SystemInfo = {
    system: {
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      release: os.release(),
      cpus: os.cpus().length,
      totalMemory: formatBytes(os.totalmem()),
      freeMemory: formatBytes(os.freemem()),
      memoryUsage: {
        heapTotal: formatBytes(memUsage.heapTotal),
        heapUsed: formatBytes(memUsage.heapUsed),
        external: formatBytes(memUsage.external),
        rss: formatBytes(memUsage.rss),
      },
      loadAverage: os.loadavg(),
    },
    process: {
      pid: process.pid,
      uptime: process.uptime(),
      uptimeFormatted: formatUptime(process.uptime()),
      nodeVersion: process.version,
      v8Version: process.versions.v8,
    },
    environment: {
      nodeEnv: process.env.NODE_ENV || 'development',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      locale: Intl.DateTimeFormat().resolvedOptions().locale,
    },
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(systemInfo, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
