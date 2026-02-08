/**
 * STORAGE QUOTA API
 * GET /api/storage/quota - Obter quota do usuário
 * PUT /api/storage/quota - Atualizar quota (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { storageSystem } from '@lib/storage-system-real';
import { getServerAuth } from '@lib/auth/unified-session';
import { applyRateLimit } from '@/lib/rate-limit';

export async function GET(req: NextRequest) {
  try {
    const rateLimitBlocked = await applyRateLimit(req, 'storage-quota-get', 30);
    if (rateLimitBlocked) return rateLimitBlocked;

    const session = await getServerAuth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const quota = await storageSystem.getQuota(session.user.id);

    return NextResponse.json(quota);
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerAuth();
    const userRole = (session?.user as { role?: string } | undefined)?.role;
    if (!session?.user?.id || userRole !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId, newLimit } = await req.json();

    if (!userId || !newLimit) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    await storageSystem.setQuota(userId, newLimit);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

