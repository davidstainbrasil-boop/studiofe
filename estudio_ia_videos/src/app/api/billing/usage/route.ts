
import { NextResponse } from 'next/server';
import { getSupabaseForRequest } from '@lib/supabase/server';
import { getUsageSummary } from '@lib/billing/usage';
import { getUserPlan, PLANS } from '@lib/billing/limits';

export async function GET(request: Request) {
    try {
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
