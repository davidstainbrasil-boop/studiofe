import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { applyRateLimit } from '@/lib/rate-limit';
import { POST as exportRealPOST } from '@/app/api/v1/video/export-real/route';

function buildForwardHeaders(source: NextRequest): Headers {
  const headers = new Headers();
  const cookie = source.headers.get('cookie');
  const authorization = source.headers.get('authorization') || source.headers.get('Authorization');
  const testUserId = source.headers.get('x-user-id');

  headers.set('content-type', 'application/json');
  if (cookie) headers.set('cookie', cookie);
  if (authorization) headers.set('authorization', authorization);
  if (testUserId) headers.set('x-user-id', testUserId);

  return headers;
}

export async function POST(req: NextRequest) {
  try {
    const blocked = await applyRateLimit(req, 'video-export', 5);
    if (blocked) return blocked;

    const body = await req.json();
    const projectId = body?.projectId;
    const options = body?.options ?? body?.settings ?? {};

    if (!projectId) {
      return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
    }

    const delegatedRequest = new NextRequest(new URL('/api/v1/video/export-real', req.url), {
      method: 'POST',
      headers: buildForwardHeaders(req),
      body: JSON.stringify({ projectId, options }),
    });

    const delegatedResponse = await exportRealPOST(delegatedRequest);
    const payload = await delegatedResponse.json();

    if (!delegatedResponse.ok) {
      return NextResponse.json(payload, { status: delegatedResponse.status });
    }

    const jobId = payload?.jobId ?? payload?.data?.jobId;
    const status = payload?.status ?? payload?.data?.status ?? 'queued';

    if (!jobId) {
      logger.error('Video Export Failed: delegated handler returned no jobId', {
        component: 'API: video/export',
      });
      return NextResponse.json({ error: 'Failed to start export' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        jobId,
        status,
      },
    });
  } catch (error) {
    logger.error('Video Export Failed', error as Error, { component: 'API: video/export' });
    return NextResponse.json({ error: 'Failed to start export' }, { status: 500 });
  }
}
