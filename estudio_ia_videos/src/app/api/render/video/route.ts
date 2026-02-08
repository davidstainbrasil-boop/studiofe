import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@lib/auth/unified-session';
import { applyRateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  const blocked = await applyRateLimit(request, 'render-video', 10);
  if (blocked) return blocked;

  const session = await getServerAuth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });
  }

  return NextResponse.json({ error: 'Endpoint deprecated. Use /api/render/jobs' }, { status: 410 });
}

export async function GET(req: NextRequest) {
    const rateLimitBlocked = await applyRateLimit(req, 'render-video-get', 60);
    if (rateLimitBlocked) return rateLimitBlocked;

  return NextResponse.json({ error: 'Endpoint deprecated. Use /api/render/jobs' }, { status: 410 });
}

export async function DELETE(request: NextRequest) {
  const blocked = await applyRateLimit(request, 'render-video', 10);
  if (blocked) return blocked;

  const session = await getServerAuth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });
  }

  return NextResponse.json({ error: 'Endpoint deprecated. Use /api/render/jobs' }, { status: 410 });
}
