import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@lib/auth/admin-middleware';
import { prisma } from '@lib/prisma';
import { logger } from '@lib/logger';
import { applyRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
    const rateLimitBlocked = await applyRateLimit(req, 'admin-users-get', 30);
    if (rateLimitBlocked) return rateLimitBlocked;

        const { isAdmin, response } = await requireAdmin(req);
        if (!isAdmin) return response!;

        const records = await prisma.users.findMany({
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                plan_tier: true,
                createdAt: true,
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 100
        });

        const users = records.map((user) => ({
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            plan_tier: user.plan_tier,
            created_at: user.createdAt
        }));

        return NextResponse.json({ users });
    } catch (error) {
        logger.error('Failed to fetch users', error instanceof Error ? error : new Error(String(error)));
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
