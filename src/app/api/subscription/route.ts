import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/database/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const plan = searchParams.get('plan') || 'free';
    const status = searchParams.get('status') || 'active';

    // Get or create user subscription
    let subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!subscription) {
      // Create free subscription if doesn't exist
      subscription = await prisma.subscription.create({
        data: {
          userId: session.user.id,
          plan: 'FREE',
          status: 'ACTIVE',
          startDate: new Date(),
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
    }

    // Calculate usage metrics for subscription limits
    const [totalVideos, totalStorage] = await Promise.all([
      prisma.video.count({
        where: {
          userId: session.user.id,
          createdAt: {
            gte: subscription.startDate,
          },
        },
      }),
      prisma.video.aggregate({
        where: {
          userId: session.user.id,
          fileSize: {
            not: null,
          },
        },
        _sum: {
          fileSize: true,
        },
      }),
    ]);

    const usedStorage = totalStorage._sum.fileSize || 0;
    const storageGB = usedStorage / (1024 * 1024 * 1024);

    // Plan limits
    const plans = {
      FREE: {
        name: 'Free',
        price: 0,
        videosPerMonth: 5,
        storageGB: 1,
        features: ['Basic templates', 'Standard quality', 'Email support'],
      },
      PRO: {
        name: 'Professional',
        price: 29.99,
        videosPerMonth: 50,
        storageGB: 10,
        features: [
          'Premium templates',
          'HD quality',
          '4K quality',
          'Priority support',
          'Analytics',
          'Collaboration',
        ],
      },
      ENTERPRISE: {
        name: 'Enterprise',
        price: 99.99,
        videosPerMonth: 500,
        storageGB: 100,
        features: [
          'All templates',
          'Ultra 8K quality',
          'API access',
          'Dedicated support',
          'Custom integrations',
          'White label',
          'SSO',
          'Advanced analytics',
        ],
      },
    };

    const currentPlan = plans[subscription.plan as keyof typeof plans];
    const isOverLimit =
      (plan === 'FREE' && totalVideos >= 5) ||
      (plan === 'FREE' && storageGB >= 1) ||
      (plan === 'PRO' && totalVideos >= 50) ||
      (plan === 'PRO' && storageGB >= 10);

    // Get subscription history
    const history = await prisma.subscription.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Available plans for upgrade
    const availablePlans = Object.entries(plans).map(([key, planData]) => ({
      id: key,
      ...planData,
      current: key === subscription.plan,
      canUpgrade: key !== subscription.plan,
      recommended: subscription.plan === 'FREE' ? 'PRO' : null,
      priceComparison:
        key !== subscription.plan
          ? {
              monthlyPrice: planData.price - plans[subscription.plan].price,
              yearlySavings: planData.price * 12 * 0.8, // 20% yearly discount
            }
          : null,
    }));

    return NextResponse.json({
      success: true,
      subscription: {
        ...subscription,
        plan: currentPlan,
        isOverLimit,
        used: {
          videos: totalVideos,
          storage: storageGB,
        },
        limits: {
          videosPerMonth: currentPlan.videosPerMonth,
          storageGB: currentPlan.storageGB,
        },
      },
      availablePlans,
      usage: {
        videos: totalVideos,
        storage: {
          used: usedStorage,
          formatBytes: (bytes: number) => {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
          },
        },
      },
      history: history.map((sub) => ({
        id: sub.id,
        plan: sub.plan,
        status: sub.status,
        startDate: sub.startDate,
        endDate: sub.endDate,
        price: plans[sub.plan]?.price || 0,
      })),
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
      },
      { status: 500 },
    );
  }
}
