export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@lib/auth';
import { prisma } from '@lib/prisma';
import { logger } from '@lib/logger';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30'; // days

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    // Get user's projects
    const userProjects = await prisma.projects.findMany({
      where: { userId },
      select: { id: true }
    });

    const projectIds = userProjects.map((p: any) => p.id);

    // Get NR compliance records
    const nrRecords = await prisma.nr_compliance_records.findMany({
      where: {
        projectId: { in: projectIds },
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Calculate metrics
    const totalValidations = nrRecords.length;
    const averageScore = nrRecords.length > 0 
      ? nrRecords.reduce((sum: number, v: any) => sum + v.score, 0) / nrRecords.length 
      : 0;

    // Compliance by NR type
    const complianceByNR = nrRecords.reduce((acc: any, validation: any) => {
      const nr = validation.nr;
      if (!acc[nr]) {
        acc[nr] = { total: 0, scores: [] };
      }
      acc[nr].total++;
      acc[nr].scores.push(validation.score);
      return acc;
    }, {} as Record<string, { total: number; scores: number[] }>);

    const nrMetrics = Object.entries(complianceByNR).map(([nr, data]: [string, any]) => ({
      nr,
      total: data.total,
      averageScore: data.scores.reduce((sum: number, score: number) => sum + score, 0) / data.scores.length,
      lastValidation: nrRecords.find((v: any) => v.nr === nr)?.createdAt
    }));

    // Trend data (last 7 days)
    const trendData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayStart = new Date(date.setHours(0, 0, 0, 0));
      const dayEnd = new Date(date.setHours(23, 59, 59, 999));

      const dayValidations = nrRecords.filter((v: any) => 
        v.createdAt >= dayStart && v.createdAt <= dayEnd
      );

      trendData.push({
        date: dayStart.toISOString().split('T')[0],
        validations: dayValidations.length,
        averageScore: dayValidations.length > 0 
          ? dayValidations.reduce((sum: number, v: any) => sum + v.score, 0) / dayValidations.length 
          : 0
      });
    }

    // Critical issues (scores below 70)
    const criticalIssues = nrRecords.filter((v: any) => v.score < 70).length;

    // Recent validations
    const recentValidations = nrRecords.slice(0, 10).map((v: any) => ({
      id: v.id,
      projectId: v.projectId,
      nrType: v.nr,
      score: v.score,
      createdAt: v.createdAt,
      suggestions: Array.isArray(v.recommendations) ? v.recommendations : []
    }));

    return NextResponse.json({
      summary: {
        totalValidations,
        averageScore: Math.round(averageScore),
        criticalIssues,
        complianceRate: Math.round((nrRecords.filter((v: any) => v.score >= 80).length / Math.max(totalValidations, 1)) * 100)
      },
      nrMetrics,
      trendData,
      recentValidations
    });

  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('Error fetching compliance metrics', err, { component: 'API: compliance/metrics' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
