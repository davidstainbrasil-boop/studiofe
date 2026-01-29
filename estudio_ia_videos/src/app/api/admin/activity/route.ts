
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@lib/auth/admin-middleware';
import { prisma } from '@lib/prisma';
import { logger } from '@lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const { isAdmin, response } = await requireAdmin(req);
        if (!isAdmin) return response!;

        // Assuming audit_logs table exists based on previous phases, OR fallback to analytics_events
        // Let's use audit_logs if available, otherwise mock or empty.
        // Based on Phase 1, we implemented audit-logging-real.ts which uses 'audit_logs'.
        
        const events = await prisma.analytics_events.findMany({
            select: {
                id: true,
                eventType: true,
                eventData: true,
                createdAt: true,
                users: {
                    select: {
                        email: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 50
        });

        const logs = events.map((event) => ({
            id: event.id,
            action: event.eventType,
            details: event.eventData,
            created_at: event.createdAt,
            user: event.users ? { email: event.users.email } : null
        }));

        return NextResponse.json({ logs });
    } catch (error) {
        logger.error('Failed to fetch audit logs', error as Error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
