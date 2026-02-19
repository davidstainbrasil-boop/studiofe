
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@lib/logger'
import { getServerAuth } from '@lib/auth/unified-session';
import { applyRateLimit } from '@/lib/rate-limit';
import { prisma } from '@lib/prisma';

const KNOWN_NR_CODES = ['NR-06', 'NR-10', 'NR-12', 'NR-17', 'NR-33', 'NR-35'];
const DAY_MS = 24 * 60 * 60 * 1000;

interface BIProject {
  id: string;
  name: string;
  description: string | null;
  metadata: unknown;
  isTemplate: boolean | null;
  createdAt: Date | null;
}

interface BIRenderJob {
  id: string;
  projectId: string | null;
  status: string | null;
  durationMs: number | null;
  createdAt: Date | null;
  completedAt: Date | null;
  avatarModelId: string | null;
}

interface BIEvent {
  eventType: string;
  createdAt: Date | null;
  sessionId: string | null;
  userId: string | null;
}

function dateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function asObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function detectNRCodes(project: BIProject): string[] {
  const haystack = `${project.name} ${project.description || ''} ${JSON.stringify(project.metadata || {})}`.toUpperCase();
  const found = KNOWN_NR_CODES.filter((code) => {
    const numeric = code.replace('NR-', '');
    return haystack.includes(code) || haystack.includes(`NR ${numeric}`) || haystack.includes(`NR${numeric}`);
  });
  return found;
}

function countEvents(events: BIEvent[], matcher: (eventType: string) => boolean): number {
  return events.reduce((sum, event) => sum + (matcher(event.eventType) ? 1 : 0), 0);
}

async function generateBusinessIntelligenceData(userId: string, days = 30) {
  const now = new Date();
  const startDate = new Date(now.getTime() - (days - 1) * DAY_MS);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const sixMonthsStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const oneDayAgo = new Date(Date.now() - DAY_MS);

  const [
    userRecord,
    monthUsage,
    projects,
    renderJobs,
    analyticsEvents,
    globalRecentUsers
  ] = await Promise.all([
    prisma.users.findUnique({
      where: { id: userId },
      select: { metadata: true }
    }),
    prisma.user_usage.findFirst({
      where: {
        userId,
        month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      },
      select: {
        storageUsedBytes: true
      }
    }),
    prisma.projects.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        description: true,
        metadata: true,
        isTemplate: true,
        createdAt: true
      }
    }),
    prisma.render_jobs.findMany({
      where: {
        userId,
        createdAt: { gte: startDate }
      },
      select: {
        id: true,
        projectId: true,
        status: true,
        durationMs: true,
        createdAt: true,
        completedAt: true,
        avatarModelId: true
      }
    }),
    prisma.analytics_events.findMany({
      where: {
        userId,
        createdAt: { gte: sixMonthsStart }
      },
      select: {
        eventType: true,
        createdAt: true,
        sessionId: true,
        userId: true
      }
    }),
    prisma.analytics_events.findMany({
      where: {
        createdAt: { gte: oneDayAgo },
        userId: { not: null }
      },
      distinct: ['userId'],
      select: { userId: true }
    })
  ]);

  const typedProjects = projects as BIProject[];
  const typedRenderJobs = renderJobs as BIRenderJob[];
  const typedEvents = analyticsEvents as BIEvent[];

  const totalProjects = typedProjects.length;
  const totalRenders = typedRenderJobs.length;
  const completedRenders = typedRenderJobs.filter((job) => job.status === 'completed').length;
  const videosRendering = typedRenderJobs.filter((job) => ['queued', 'pending', 'processing'].includes(String(job.status || ''))).length;
  const completionRate = totalRenders > 0 ? round1((completedRenders / totalRenders) * 100) : 0;

  const completedDurations = typedRenderJobs
    .filter((job) => job.status === 'completed' && typeof job.durationMs === 'number' && job.durationMs > 0)
    .map((job) => job.durationMs as number);
  const avgRenderTimeMinutes = completedDurations.length > 0
    ? round1((completedDurations.reduce((sum, value) => sum + value, 0) / completedDurations.length) / 1000 / 60)
    : 0;

  const metadata = asObject(userRecord?.metadata);
  const storageLimitBytes = Number(metadata.storage_limit_bytes ?? 10 * 1024 * 1024 * 1024);
  const storageUsedBytes = Number(monthUsage?.storageUsedBytes ?? 0);
  const storageUsed = storageLimitBytes > 0
    ? round1(Math.min(100, (storageUsedBytes / storageLimitBytes) * 100))
    : 0;

  const downloads = countEvents(typedEvents, (eventType) =>
    eventType.includes('download') || eventType.includes('export')
  );

  const projectsPerDay = new Map<string, { date: string; projetos: number; videos: number; visualizacoes: number }>();
  for (let i = 0; i < days; i++) {
    const day = new Date(startDate.getTime() + i * DAY_MS);
    const key = dateKey(day);
    projectsPerDay.set(key, { date: key, projetos: 0, videos: 0, visualizacoes: 0 });
  }

  typedProjects.forEach((project) => {
    if (!project.createdAt) return;
    const key = dateKey(project.createdAt);
    const entry = projectsPerDay.get(key);
    if (entry) entry.projetos += 1;
  });

  typedRenderJobs.forEach((job) => {
    if (!job.createdAt) return;
    const key = dateKey(job.createdAt);
    const entry = projectsPerDay.get(key);
    if (entry) entry.videos += 1;
  });

  typedEvents.forEach((event) => {
    if (!event.createdAt) return;
    const key = dateKey(event.createdAt);
    const entry = projectsPerDay.get(key);
    if (!entry) return;
    if (event.eventType.includes('view')) {
      entry.visualizacoes += 1;
    }
  });

  const nrProjects = new Map<string, Set<string>>();
  KNOWN_NR_CODES.forEach((code) => nrProjects.set(code, new Set<string>()));

  typedProjects.forEach((project) => {
    const codes = detectNRCodes(project);
    codes.forEach((code) => nrProjects.get(code)?.add(project.id));
  });

  const completedProjects = new Set(
    typedRenderJobs
      .filter((job) => job.status === 'completed' && job.projectId)
      .map((job) => String(job.projectId))
  );

  const complianceData = KNOWN_NR_CODES.map((nr) => {
    const projectsForNR = Array.from(nrProjects.get(nr) || []);
    const projetos = projectsForNR.length;
    const aprovados = projectsForNR.filter((projectId) => completedProjects.has(projectId)).length;
    const taxa = projetos > 0 ? round1((aprovados / projetos) * 100) : 0;

    return { nr, projetos, aprovados, taxa };
  }).filter((row) => row.projetos > 0 || row.aprovados > 0);

  const monthlyEngagement = Array.from({ length: 6 }, (_, index) => {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    const key = monthKey(monthDate);
    const eventsInMonth = typedEvents.filter((event) => event.createdAt && monthKey(event.createdAt) === key);
    const sessions = new Set(eventsInMonth.map((event) => event.sessionId || dateKey(event.createdAt || monthDate)));
    const activeDays = new Set(eventsInMonth.map((event) => dateKey(event.createdAt || monthDate)));
    const completedDurationsMonth = typedRenderJobs
      .filter((job) => job.completedAt && monthKey(job.completedAt) === key && typeof job.durationMs === 'number')
      .map((job) => Number(job.durationMs || 0));
    const avgMinutes = completedDurationsMonth.length > 0
      ? round1(completedDurationsMonth.reduce((sum, value) => sum + value, 0) / completedDurationsMonth.length / 1000 / 60)
      : 0;

    return {
      periodo: monthDate.toLocaleString('pt-BR', { month: 'short' }).replace('.', ''),
      usuarios: Math.max(activeDays.size, sessions.size > 0 ? 1 : 0),
      sessoes: eventsInMonth.length,
      tempo: avgMinutes
    };
  });

  const templateViews = countEvents(typedEvents, (eventType) => eventType.includes('template') && eventType.includes('view'));
  const templateDownloads = countEvents(typedEvents, (eventType) => eventType.includes('template') && eventType.includes('download'));
  const videoViews = countEvents(typedEvents, (eventType) => eventType.includes('video') && eventType.includes('view'));
  const videoDownloads = countEvents(typedEvents, (eventType) => eventType.includes('video') && eventType.includes('download'));
  const ttsEvents = countEvents(typedEvents, (eventType) => eventType.includes('tts'));
  const avatarViews = countEvents(typedEvents, (eventType) => eventType.includes('avatar') && eventType.includes('view'));
  const avatarDownloads = countEvents(typedEvents, (eventType) => eventType.includes('avatar') && eventType.includes('download'));

  const templateCount = typedProjects.filter((project) => project.isTemplate === true).length;
  const avatarJobs = typedRenderJobs.filter((job) => !!job.avatarModelId).length;

  return {
    realTimeMetrics: {
      activeUsers: globalRecentUsers.length,
      totalProjects,
      videosRendering,
      completionRate,
      avgRenderTime: avgRenderTimeMinutes,
      storageUsed,
      downloads
    },
    projectsData: Array.from(projectsPerDay.values()),
    complianceData,
    engagementData: monthlyEngagement,
    contentData: [
      {
        tipo: 'Templates NR',
        total: templateCount,
        views: templateViews,
        downloads: templateDownloads
      },
      {
        tipo: 'Vídeos Produzidos',
        total: completedRenders,
        views: videoViews,
        downloads: videoDownloads
      },
      {
        tipo: 'Áudios TTS',
        total: ttsEvents,
        views: ttsEvents,
        downloads: countEvents(typedEvents, (eventType) => eventType.includes('tts') && eventType.includes('download'))
      },
      {
        tipo: 'Avatares 3D',
        total: avatarJobs,
        views: avatarViews,
        downloads: avatarDownloads
      }
    ]
  };
}

export async function GET(request: NextRequest) {
  try {
    const rateLimitBlocked = await applyRateLimit(request, 'v1-analytics-business-intelligence-get', 60);
    if (rateLimitBlocked) return rateLimitBlocked;

    const session = await getServerAuth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });
    }

    const data = await generateBusinessIntelligenceData(session.user.id, 30);

    return NextResponse.json({
      success: true,
      data,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error)); logger.error('Error fetching analytics data', err, { component: 'API: v1/analytics/business-intelligence' })
    return NextResponse.json(
      { success: false, error: 'Failed to fetch analytics data' },
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
    const blocked = await applyRateLimit(request, 'v1-analytics-business-intelligence-post', 20);
    if (blocked) return blocked;

    const { action } = await request.json()

    switch (action) {
      case 'refresh': {
        const refreshedData = await generateBusinessIntelligenceData(session.user.id, 30);
        await prisma.analytics_events.create({
          data: {
            userId: session.user.id,
            eventType: 'business_intelligence_refresh',
            eventData: { source: 'api/v1/analytics/business-intelligence' }
          }
        }).catch(() => {});

        return NextResponse.json({
          success: true,
          message: 'Data refreshed successfully',
          data: refreshedData
        })
      }

      case 'export': {
        await prisma.analytics_events.create({
          data: {
            userId: session.user.id,
            eventType: 'business_intelligence_export_requested',
            eventData: { source: 'api/v1/analytics/business-intelligence' }
          }
        }).catch(() => {});

        return NextResponse.json({
          success: true,
          message: 'Report export initiated',
          downloadUrl: '/api/analytics/export?report=business-intelligence'
        })
      }

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        )
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error)); logger.error('Error processing analytics request', err, { component: 'API: v1/analytics/business-intelligence' })
    return NextResponse.json(
      { success: false, error: 'Failed to process request' },
      { status: 500 }
    )
  }
}
