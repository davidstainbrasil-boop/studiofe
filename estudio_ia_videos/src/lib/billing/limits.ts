
import { prisma } from '@/lib/prisma';

export const PLANS = {
    free: {
        name: 'Free',
        limits: {
            rendersPerMonth: 5,
            storageBytes: 1024 * 1024 * 1024 * 1, // 1GB
            maxVideoDurationSeconds: 300, // 5 min
        }
    },
    pro: {
        name: 'Pro',
        limits: {
            rendersPerMonth: 100,
            storageBytes: 1024 * 1024 * 1024 * 50, // 50GB
            maxVideoDurationSeconds: 1800, // 30 min
        }
    }
} as const;

export type PlanTier = keyof typeof PLANS;

export async function getUserPlan(userId: string): Promise<PlanTier> {
    const user = await prisma.users.findUnique({
        where: { id: userId },
        select: { plan_tier: true }
    });
    // plan_tier pode não existir no schema, fallback para 'free'
    const planTier = (user?.plan_tier as PlanTier | null) ?? 'free';
    return PLANS[planTier] ? planTier : 'free';
}

export async function checkLimit(userId: string, resource: 'renders' | 'storage', amount = 1): Promise<{ allowed: boolean; reason?: string }> {
    const plan = await getUserPlan(userId);
    const limits = PLANS[plan].limits;

    const date = new Date();
    const currentMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    const usage = await prisma.user_usage.findUnique({
        where: {
            userId_month: {
                userId,
                month: currentMonth
            }
        }
    });

    if (resource === 'renders') {
        const currentRenders = usage?.rendersCount || 0;
        if (currentRenders + amount > limits.rendersPerMonth) {
            return { allowed: false, reason: `Monthly render limit reached (${limits.rendersPerMonth})` };
        }
    }

    if (resource === 'storage') {
        const currentStorage = Number(usage?.storageUsedBytes || 0);
        if (currentStorage + amount > limits.storageBytes) {
            return { allowed: false, reason: `Storage limit reached (${(limits.storageBytes / 1024 / 1024 / 1024).toFixed(1)}GB)` };
        }
    }

    return { allowed: true };
}
