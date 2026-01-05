/**
 * API Version Endpoint
 * GET /api/system/version
 * 
 * Returns application version, build info, and system status.
 * Useful for deployment verification and monitoring.
 */

import { NextResponse } from 'next/server';
import { execSync } from 'child_process';

export const dynamic = 'force-dynamic';

interface VersionInfo {
  name: string;
  version: string;
  environment: string;
  build: {
    timestamp: string;
    commit: string | null;
    branch: string | null;
  };
  node: {
    version: string;
    platform: string;
    arch: string;
  };
  uptime: number;
  features: string[];
}

function getGitInfo(): { commit: string | null; branch: string | null } {
  try {
    const commit = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
    return { commit, branch };
  } catch {
    return { commit: null, branch: null };
  }
}

function getEnabledFeatures(): string[] {
  const features: string[] = [];
  
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) features.push('supabase');
  if (process.env.REDIS_URL || process.env.REDIS_HOST) features.push('redis');
  if (process.env.ELEVENLABS_API_KEY) features.push('tts-elevenlabs');
  if (process.env.OPENAI_API_KEY) features.push('ai-openai');
  if (process.env.SENTRY_DSN) features.push('sentry');
  if (process.env.AWS_S3_BUCKET) features.push('s3-storage');
  if (process.env.HEYGEN_API_KEY) features.push('avatar-heygen');
  
  return features;
}

export async function GET(): Promise<NextResponse<VersionInfo>> {
  const gitInfo = getGitInfo();
  
  const versionInfo: VersionInfo = {
    name: 'MVP Video TécnicoCursos',
    version: process.env.npm_package_version || '7.0.0',
    environment: process.env.NODE_ENV || 'development',
    build: {
      timestamp: new Date().toISOString(),
      commit: gitInfo.commit,
      branch: gitInfo.branch,
    },
    node: {
      version: process.version,
      platform: process.platform,
      arch: process.arch,
    },
    uptime: process.uptime(),
    features: getEnabledFeatures(),
  };

  return NextResponse.json(versionInfo, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
