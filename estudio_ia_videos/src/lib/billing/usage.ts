
import { prisma } from '@/lib/prisma';

export async function incrementUsage(userId: string, resource: 'renders' | 'storage', amount = 1) {
    const date = new Date();
    const currentMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    console.log(`[Billing] Incrementing ${resource} usage for user ${userId} by ${amount}`);

    await (prisma as any).user_usage.upsert({
        where: {
            userId_month: {
                userId,
                month: currentMonth
            }
        },
        create: {
            userId,
            month: currentMonth,
            rendersCount: resource === 'renders' ? amount : 0,
            storageUsedBytes: resource === 'storage' ? amount : 0
        },
        update: {
            rendersCount: resource === 'renders' ? { increment: amount } : undefined,
            storageUsedBytes: resource === 'storage' ? { increment: amount } : undefined
        }
    });
}

export async function getUsageSummary(userId: string) {
    const date = new Date();
    const currentMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    const usage = await (prisma as any).user_usage.findUnique({
        where: {
            userId_month: { userId, month: currentMonth }
        }
    });

    return {
        month: currentMonth,
        rendersCount: usage?.rendersCount || 0,
        storageUsedBytes: Number(usage?.storageUsedBytes || 0)
    };
}
