import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@lib/auth';

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });
  }

  return NextResponse.json({ error: 'Endpoint deprecated. Use /api/render/jobs' }, { status: 410 });
}

export async function GET() {
  return NextResponse.json({ error: 'Endpoint deprecated. Use /api/render/jobs' }, { status: 410 });
}
