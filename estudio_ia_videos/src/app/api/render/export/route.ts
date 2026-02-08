import { NextResponse , NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@lib/auth';
import { applyRateLimit } from '@/lib/rate-limit';

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });
  }

  return NextResponse.json({ error: 'Endpoint deprecated. Use /api/render/jobs' }, { status: 410 });
}

export async function GET(req: NextRequest) {
    const rateLimitBlocked = await applyRateLimit(req, 'render-export-get', 20);
    if (rateLimitBlocked) return rateLimitBlocked;

  return NextResponse.json({ error: 'Endpoint deprecated. Use /api/render/jobs' }, { status: 410 });
}
