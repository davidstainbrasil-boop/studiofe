import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@lib/auth/admin-middleware';
import { prisma } from '@lib/prisma';
import { logger } from '@lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const { isAdmin, response } = await requireAdmin(req);
        if (!isAdmin) return response!;

        const users = await prisma.users.findMany({
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                plan_tier: true,
                created_at: true,
            },
            orderBy: {
                created_at: 'desc'
            },
            take: 100
        });

        // Map for frontend compatibility if needed, or send as is
        return NextResponse.json({ users });
    } catch (error) {
        logger.error('Failed to fetch users', error instanceof Error ? error : new Error(String(error)));
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

