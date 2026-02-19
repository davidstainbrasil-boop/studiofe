import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@lib/logger'
import { getServerAuth } from '@lib/auth/unified-session';
import { applyRateLimit } from '@/lib/rate-limit';
import { prisma } from '@lib/prisma';

const NR_CATALOG = [
  { nr: 'NR-06', name: 'Equipamentos de Proteção Individual' },
  { nr: 'NR-10', name: 'Instalações Elétricas' },
  { nr: 'NR-12', name: 'Máquinas e Equipamentos' },
  { nr: 'NR-17', name: 'Ergonomia' },
  { nr: 'NR-33', name: 'Espaços Confinados' },
  { nr: 'NR-35', name: 'Trabalho em Altura' }
];

interface ComplianceProject {
  id: string;
  name: string;
  description: string | null;
  metadata: unknown;
  updatedAt: Date | null;
}

interface ComplianceRenderJob {
  projectId: string | null;
  status: string | null;
  createdAt: Date | null;
}

interface ComplianceItem {
  nr: string;
  name: string;
  status: 'compliant' | 'partial' | 'non-compliant';
  score: number;
  requirements: { met: number; total: number };
  lastUpdate: string;
  nextAudit: string;
  certificate?: {
    issued: string;
    expires: string;
    certificate_id: string;
  };
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function detectNRCodes(project: ComplianceProject): string[] {
  const text = `${project.name} ${project.description || ''} ${JSON.stringify(project.metadata || {})}`.toUpperCase();
  return NR_CATALOG
    .map((entry) => entry.nr)
    .filter((code) => {
      const numeric = code.replace('NR-', '');
      return text.includes(code) || text.includes(`NR ${numeric}`) || text.includes(`NR${numeric}`);
    });
}

function buildRecommendations(score: number, issues: number): string[] {
  const recommendations: string[] = [];

  if (issues > 0) recommendations.push('Corrigir os requisitos pendentes identificados na validação.');
  if (score < 90) recommendations.push('Executar nova rodada de treinamento focada nos itens críticos.');
  if (score < 80) recommendations.push('Revisar procedimentos operacionais e evidências de conformidade.');
  if (recommendations.length === 0) {
    recommendations.push('Manter rotina atual de auditoria e revalidação periódica.');
  }

  return recommendations;
}

async function buildComplianceData(userId: string) {
  const [projects, renderJobs, userRecord] = await Promise.all([
    prisma.projects.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        description: true,
        metadata: true,
        updatedAt: true
      }
    }),
    prisma.render_jobs.findMany({
      where: { userId },
      select: {
        projectId: true,
        status: true,
        createdAt: true
      }
    }),
    prisma.users.findUnique({
      where: { id: userId },
      select: { metadata: true }
    })
  ]);

  const typedProjects = projects as ComplianceProject[];
  const typedRenderJobs = renderJobs as ComplianceRenderJob[];

  const projectsByNR = new Map<string, Set<string>>();
  NR_CATALOG.forEach((entry) => projectsByNR.set(entry.nr, new Set<string>()));

  typedProjects.forEach((project) => {
    const codes = detectNRCodes(project);
    codes.forEach((code) => projectsByNR.get(code)?.add(project.id));
  });

  const complianceItems: ComplianceItem[] = NR_CATALOG.map((entry) => {
    const relatedProjects = Array.from(projectsByNR.get(entry.nr) || []);
    const relatedJobs = typedRenderJobs.filter((job) => job.projectId && relatedProjects.includes(job.projectId));
    const completedJobs = relatedJobs.filter((job) => job.status === 'completed').length;
    const failedJobs = relatedJobs.filter((job) => job.status === 'failed').length;

    const totalRequirements = Math.max(1, relatedProjects.length * 5 + relatedJobs.length);
    const metRequirements = Math.max(0, Math.min(totalRequirements, completedJobs * 2 + relatedProjects.length - failedJobs));
    const score = round1((metRequirements / totalRequirements) * 100);

    const status: ComplianceItem['status'] =
      score >= 95 ? 'compliant' : score >= 75 ? 'partial' : 'non-compliant';

    const lastProjectUpdate = typedProjects
      .filter((project) => relatedProjects.includes(project.id) && project.updatedAt)
      .map((project) => project.updatedAt as Date)
      .sort((a, b) => b.getTime() - a.getTime())[0];

    const lastUpdate = (lastProjectUpdate || new Date()).toISOString().split('T')[0];
    const nextAuditDate = new Date(lastProjectUpdate || new Date());
    nextAuditDate.setDate(nextAuditDate.getDate() + 90);

    const item: ComplianceItem = {
      nr: entry.nr,
      name: entry.name,
      status,
      score,
      requirements: {
        met: metRequirements,
        total: totalRequirements
      },
      lastUpdate,
      nextAudit: nextAuditDate.toISOString().split('T')[0]
    };

    if (status === 'compliant' && relatedProjects.length > 0) {
      const year = new Date().getFullYear();
      item.certificate = {
        issued: lastUpdate,
        expires: new Date(new Date(lastUpdate).setFullYear(year + 1)).toISOString().split('T')[0],
        certificate_id: `CERT-${entry.nr.replace('-', '')}-${year}-${String(relatedProjects.length).padStart(3, '0')}`
      };
    }

    return item;
  }).filter((item) => item.requirements.total > 1 || item.requirements.met > 0);

  const overallScore = complianceItems.length > 0
    ? round1(complianceItems.reduce((sum, item) => sum + item.score, 0) / complianceItems.length)
    : 0;
  const compliantNRs = complianceItems.filter((item) => item.status === 'compliant').length;
  const auditsPending = complianceItems.filter((item) => item.status !== 'compliant').length;

  const metadata = userRecord?.metadata as { certificates?: { certificates?: unknown[] } } | null;
  const storedCertificates = metadata?.certificates?.certificates;
  const storedCertificatesCount = Array.isArray(storedCertificates) ? storedCertificates.length : 0;

  return {
    overallScore,
    totalNRs: 37,
    compliantNRs,
    certificatesIssued: storedCertificatesCount + compliantNRs,
    auditsPending,
    nrCompliance: complianceItems
  };
}

export async function GET(request: NextRequest) {
  try {
    const rateLimitBlocked = await applyRateLimit(request, 'v1-advanced-compliance-get', 60);
    if (rateLimitBlocked) return rateLimitBlocked;

    const session = await getServerAuth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });
    }

    const complianceData = await buildComplianceData(session.user.id);

    return NextResponse.json({
      success: true,
      data: complianceData,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error)); logger.error('Error in advanced compliance API', err, { component: 'API: v1/advanced-compliance' })
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
    const blocked = await applyRateLimit(request, 'v1-advanced-compliance-post', 20);
    if (blocked) return blocked;

    const body = await request.json()
    const { action, nr, parameters } = body
    const normalizedNR = typeof nr === 'string' ? nr.toUpperCase() : '';

    if (action === 'generate_report') {
      if (!normalizedNR) {
        return NextResponse.json(
          { success: false, error: 'NR é obrigatório para gerar relatório' },
          { status: 400 }
        );
      }

      const queueJob = await prisma.processing_queue.create({
        data: {
          type: 'compliance_report',
          status: 'pending',
          priority: 5,
          payload: {
            userId: session.user.id,
            nr: normalizedNR,
            format: String(parameters?.format || 'pdf'),
            requestedAt: new Date().toISOString()
          }
        }
      });

      return NextResponse.json({
        success: true,
        message: `Relatório ${normalizedNR} enfileirado com sucesso`,
        data: {
          reportId: queueJob.id,
          nr: normalizedNR,
          generatedAt: new Date().toISOString(),
          format: String(parameters?.format || 'pdf').toUpperCase(),
          status: queueJob.status,
          downloadUrl: `/api/analytics/export?report=compliance&nr=${encodeURIComponent(normalizedNR)}&jobId=${queueJob.id}`
        }
      })
    }

    if (action === 'validate_compliance') {
      if (!normalizedNR) {
        return NextResponse.json(
          { success: false, error: 'NR é obrigatório para validação' },
          { status: 400 }
        );
      }

      const complianceData = await buildComplianceData(session.user.id);
      const item = complianceData.nrCompliance.find((entry) => entry.nr === normalizedNR);

      if (!item) {
        return NextResponse.json(
          { success: false, error: `NR ${normalizedNR} não encontrada nos dados do usuário` },
          { status: 404 }
        );
      }

      const issues = Math.max(0, item.requirements.total - item.requirements.met);
      const recommendations = buildRecommendations(item.score, issues);

      await prisma.analytics_events.create({
        data: {
          userId: session.user.id,
          eventType: 'compliance_validation',
          eventData: {
            nr: normalizedNR,
            score: item.score,
            issues
          }
        }
      }).catch(() => {});

      return NextResponse.json({
        success: true,
        message: `Validação ${normalizedNR} concluída`,
        data: {
          nr: normalizedNR,
          validatedAt: new Date().toISOString(),
          score: item.score,
          issues,
          recommendations
        }
      })
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    )
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error)); logger.error('Error in advanced compliance POST', err, { component: 'API: v1/advanced-compliance' })
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

