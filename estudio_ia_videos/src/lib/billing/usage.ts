
import { prisma } from '@/lib/prisma';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

// Supabase admin client para tabelas de subscriptions (que podem não estar no Prisma schema)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function incrementUsage(userId: string, resource: 'renders' | 'storage', amount = 1) {
    const date = new Date();
    const currentMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    logger.info(`Incrementing ${resource} usage for user`, { userId, amount, resource });

    // Incrementar no user_usage (Prisma)
    await prisma.user_usage.upsert({
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
            storageUsedBytes: resource === 'storage' ? BigInt(amount) : BigInt(0)
        },
        update: {
            rendersCount: resource === 'renders' ? { increment: amount } : undefined,
            storageUsedBytes: resource === 'storage' ? { increment: BigInt(amount) } : undefined
        }
    });

    // Se for render, também atualizar na tabela subscriptions (para monetização)
    if (resource === 'renders') {
        try {
            // Tentar atualizar subscriptions (tabela de monetização)
            const { error } = await supabaseAdmin.rpc('increment_video_usage', { p_user_id: userId });
            
            if (error) {
                // Se a função não existe, fazer update direto
                const { data: sub } = await supabaseAdmin
                    .from('subscriptions')
                    .select('videos_used_this_month')
                    .eq('user_id', userId)
                    .single();

                if (sub) {
                    await supabaseAdmin
                        .from('subscriptions')
                        .update({ 
                            videos_used_this_month: (sub.videos_used_this_month || 0) + amount,
                            updated_at: new Date().toISOString()
                        })
                        .eq('user_id', userId);
                }
            }
        } catch (subError) {
            // Tabela pode não existir ainda, ignorar erro
            logger.warn('Could not update subscriptions table', { userId, error: subError });
        }
    }
}

export async function getUsageSummary(userId: string) {
    const date = new Date();
    const currentMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    const usage = await prisma.user_usage.findUnique({
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
