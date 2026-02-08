
import { NextResponse } from 'next/server';
import { getSupabaseForRequest } from '@lib/supabase/server';
import { getUsageSummary } from '@lib/billing/usage';
import { getUserPlan, PLANS } from '@lib/billing/limits';
import { applyRateLimit } from '@/lib/rate-limit';

export async function GET(request: Request) {
    try {
    const rateLimitBlocked = await applyRateLimit(request, 'billing-usage-get', 30);
    if (rateLimitBlocked) return rateLimitBlocked;

        const supabase = getSupabaseForRequest(request);
        const { data: { user }, error } = await supabase.auth.getUser();

        if (error || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const [usage, plan] = await Promise.all([
            getUsageSummary(user.id),
            getUserPlan(user.id)
        ]);

        const limits = PLANS[plan].limits;

        return NextResponse.json({
            plan,
            usage: {
                renders: usage.rendersCount,
                storage: usage.storageUsedBytes
            },
            limits: {
                renders: limits.rendersPerMonth,
                storage: limits.storageBytes
            }
        });

    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
