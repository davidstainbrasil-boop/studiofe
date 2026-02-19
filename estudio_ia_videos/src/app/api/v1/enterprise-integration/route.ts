import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@lib/logger'
import { isProduction } from '@lib/utils/mock-guard'
import { getServerAuth } from '@lib/auth/unified-session';
import { applyRateLimit } from '@/lib/rate-limit';
import { prisma } from '@lib/prisma';

interface EnterpriseMetadata {
  enterpriseIntegrations?: unknown[];
  hrSystems?: unknown[];
  totalEmployees?: number;
  costsReduction?: number;
  roiInvestment?: number;
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseMetadata(metadata: unknown): EnterpriseMetadata {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return {};
  }
  return metadata as EnterpriseMetadata;
}

function parsePeriodMonths(period?: string): number {
  const value = (period || '').trim().toLowerCase();
  if (value === '3_months') return 3;
  if (value === '6_months') return 6;
  if (value === '24_months') return 24;
  return 12;
}

function buildTrends(complianceScore: number, costsReduction: number, completedRenders: number) {
  const now = new Date();
  return Array.from({ length: 3 }, (_, idx) => {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - (2 - idx), 1);
    const month = monthDate.toLocaleString('pt-BR', { month: 'short' });
    const completion = Math.max(0, Math.min(100, Math.round((completedRenders / (idx + 2)) * 10)));
    const compliance = Math.max(0, Math.min(100, Math.round(complianceScore - (2 - idx))));
    const cost = Math.max(0, Math.round(costsReduction * ((idx + 1) / 3)));

    return { month, completion, compliance, cost };
  });
}

export async function GET(request: NextRequest) {
  try {
    const rateLimitBlocked = await applyRateLimit(request, 'v1-enterprise-integration-get', 60);
    if (rateLimitBlocked) return rateLimitBlocked;

    if (!isProduction()) {
      const erpIntegrations = [
        {
          id: 'sap-001',
          name: 'SAP ECC',
          vendor: 'SAP SE',
          status: 'connected',
          version: '6.0 EHP8',
          lastSync: '2025-09-26T08:30:00Z',
          records: 15847,
          modules: ['HR', 'MM', 'FI', 'CO'],
          authentication: 'oauth2',
          syncFrequency: '4 hours'
        },
        {
          id: 'oracle-002',
          name: 'Oracle HCM Cloud',
          vendor: 'Oracle Corporation',
          status: 'connected',
          version: '23C',
          lastSync: '2025-09-26T07:45:00Z',
          records: 8934,
          modules: ['HCM', 'Payroll', 'Talent', 'Learning'],
          authentication: 'api_key',
          syncFrequency: '6 hours'
        }
      ];

      const hrSystems = [
        {
          id: 'adp-001',
          name: 'ADP Workforce Now',
          provider: 'ADP',
          status: 'active',
          employees: 3456,
          departments: 24,
          integration_type: 'rest_api',
          features: ['Payroll', 'Benefits', 'Time Tracking', 'Performance']
        }
      ];

      const executiveDashboard = {
        totalEmployees: 15847,
        trainingCompleted: 13294,
        complianceScore: 97.2,
        costsReduction: 2840000,
        roi: 347,
        trends: [
          { month: 'Jul', completion: 78, compliance: 94, cost: 2650000 },
          { month: 'Ago', completion: 85, compliance: 95, cost: 2740000 },
          { month: 'Set', completion: 89, compliance: 97, cost: 2840000 }
        ]
      };

      const roiMetrics = {
        totalInvestment: 850000,
        timeSaved: 45000,
        trainingSavings: 1850000,
        complianceAvoidanceCosts: 2300000,
        productivityGains: 1650000,
        calculatedROI: 347,
        paybackPeriod: 8.5
      };

      return NextResponse.json({
        success: true,
        data: {
          erpIntegrations,
          hrSystems,
          executiveDashboard,
          roiMetrics,
          summary: {
            connectedERPs: erpIntegrations.filter(e => e.status === 'connected').length,
            totalRecords: erpIntegrations.reduce((sum, erp) => sum + erp.records, 0),
            activeHRSystems: hrSystems.filter(h => h.status === 'active').length,
            totalEmployees: executiveDashboard.totalEmployees
          }
        },
        timestamp: new Date().toISOString()
      });
    }

    const session = await getServerAuth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });
    }

    const userId = session.user.id;
    const currentMonth = new Date().toISOString().slice(0, 7);

    const [
      userRecord,
      totalProjects,
      totalRenders,
      completedRenders,
      failedRenders,
      activeRenders,
      usageMonth
    ] = await Promise.all([
      prisma.users.findUnique({
        where: { id: userId },
        select: { metadata: true }
      }),
      prisma.projects.count({ where: { userId } }),
      prisma.render_jobs.count({ where: { userId } }),
      prisma.render_jobs.count({ where: { userId, status: 'completed' } }),
      prisma.render_jobs.count({ where: { userId, status: 'failed' } }),
      prisma.render_jobs.count({ where: { userId, status: { in: ['pending', 'queued', 'processing'] } } }),
      prisma.user_usage.findFirst({ where: { userId, month: currentMonth } })
    ]);

    const metadata = parseMetadata(userRecord?.metadata);
    const erpIntegrations = (Array.isArray(metadata.enterpriseIntegrations) ? metadata.enterpriseIntegrations : []) as Array<Record<string, unknown>>;
    const hrSystems = (Array.isArray(metadata.hrSystems) ? metadata.hrSystems : []) as Array<Record<string, unknown>>;

    const totalEmployees = toNumber(metadata.totalEmployees, 0);
    const trainingSavings = completedRenders * 1200;
    const complianceAvoidanceCosts = completedRenders * 850;
    const productivityGains = completedRenders * 650;
    const totalInvestment = toNumber(metadata.roiInvestment, 850000);
    const totalBenefits = trainingSavings + complianceAvoidanceCosts + productivityGains;
    const calculatedROI = totalInvestment > 0
      ? Math.round((((totalBenefits - totalInvestment) / totalInvestment) * 100) * 10) / 10
      : 0;
    const paybackPeriod = totalBenefits > 0
      ? Number((totalInvestment / (totalBenefits / 12)).toFixed(1))
      : null;

    const complianceScore = totalRenders > 0
      ? Math.round(((completedRenders / totalRenders) * 100) * 10) / 10
      : 100;
    const costsReduction = toNumber(metadata.costsReduction, Math.round(trainingSavings * 0.4));

    const executiveDashboard = {
      totalEmployees,
      trainingCompleted: completedRenders,
      complianceScore,
      costsReduction,
      roi: calculatedROI,
      trends: buildTrends(complianceScore, costsReduction, completedRenders)
    };

    const roiMetrics = {
      totalInvestment,
      timeSaved: toNumber(usageMonth?.rendersCount, 0) * 45,
      trainingSavings,
      complianceAvoidanceCosts,
      productivityGains,
      calculatedROI,
      paybackPeriod
    };

    return NextResponse.json({
      success: true,
      data: {
        erpIntegrations,
        hrSystems,
        executiveDashboard,
        roiMetrics,
        summary: {
          connectedERPs: erpIntegrations.filter((e) => String(e.status || '') === 'connected').length,
          totalRecords: erpIntegrations.reduce((sum: number, erp) => sum + toNumber(erp.records, 0), 0),
          activeHRSystems: hrSystems.filter((h) => String(h.status || '') === 'active').length,
          totalEmployees
        },
        pipeline: {
          totalProjects,
          totalRenders,
          completedRenders,
          failedRenders,
          activeRenders
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error)); logger.error('Error in enterprise integration API', err, { component: 'API: v1/enterprise-integration' })
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerAuth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });
  }

  try {
    const blocked = await applyRateLimit(request, 'v1-enterprise-integration-post', 20);
    if (blocked) return blocked;

    const body = await request.json()
    const { action, systemId, parameters } = body

    if (isProduction()) {
      if (action === 'sync_erp') {
        if (!systemId || typeof systemId !== 'string') {
          return NextResponse.json(
            { success: false, error: 'systemId é obrigatório para sincronização' },
            { status: 400 }
          );
        }

        const event = await prisma.analytics_events.create({
          data: {
            userId: session.user.id,
            eventType: 'enterprise_sync_requested',
            eventData: {
              systemId,
              parameters: parameters || {},
              source: 'api/v1/enterprise-integration'
            }
          }
        });

        return NextResponse.json({
          success: true,
          message: `Sincronização registrada para ${systemId}`,
          data: {
            requestId: event.id,
            systemId,
            status: 'queued',
            startedAt: event.createdAt,
            estimatedDuration: 180
          }
        });
      }

      if (action === 'calculate_roi') {
        const months = parsePeriodMonths(typeof parameters?.period === 'string' ? parameters.period : undefined);
        const investment = toNumber(parameters?.investment, 850000);
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - months);

        const completed = await prisma.render_jobs.count({
          where: {
            userId: session.user.id,
            status: 'completed',
            createdAt: { gte: startDate }
          }
        });

        const benefits = {
          trainingSavings: completed * 1200,
          complianceSavings: completed * 850,
          productivityGains: completed * 650
        };
        const totalBenefits = benefits.trainingSavings + benefits.complianceSavings + benefits.productivityGains;
        const roi = investment > 0 ? Math.round((((totalBenefits - investment) / investment) * 100) * 10) / 10 : 0;
        const paybackMonths = totalBenefits > 0 ? Number((investment / (totalBenefits / 12)).toFixed(1)) : null;

        await prisma.analytics_events.create({
          data: {
            userId: session.user.id,
            eventType: 'enterprise_roi_calculated',
            eventData: {
              periodMonths: months,
              investment,
              completedRenders: completed,
              roi
            }
          }
        });

        return NextResponse.json({
          success: true,
          message: 'Cálculo de ROI concluído',
          data: {
            calculatedAt: new Date().toISOString(),
            period: `${months}_months`,
            investment,
            benefits,
            roi,
            paybackMonths
          }
        });
      }

      return NextResponse.json(
        { success: false, error: 'Invalid action' },
        { status: 400 }
      );
    }

    if (action === 'sync_erp') {
      const syncResult = {
        systemId,
        startedAt: new Date().toISOString(),
        estimatedDuration: 180,
        status: 'syncing',
        recordsToProcess: 5000
      };

      return NextResponse.json({
        success: true,
        message: `Sincronização iniciada para ${systemId}`,
        data: syncResult
      });
    }

    if (action === 'calculate_roi') {
      const roiCalculation = {
        calculatedAt: new Date().toISOString(),
        period: parameters?.period || '12_months',
        investment: parameters?.investment || 850000,
        benefits: {
          trainingSavings: 1850000,
          complianceSavings: 2300000,
          productivityGains: 1650000
        },
        roi: 347,
        paybackMonths: 8.5
      };

      return NextResponse.json({
        success: true,
        message: 'Cálculo de ROI concluído',
        data: roiCalculation
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    )
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error)); logger.error('Error in enterprise integration POST', err, { component: 'API: v1/enterprise-integration' })
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
