
import os from 'os';
import { prisma } from '@lib/prisma';

type JobCounts = Record<string, number>;

async function getRenderJobCounts(): Promise<JobCounts> {
  // Uses Prisma (DB connection must be configured). This is intentionally "real".
  const statuses = ['queued', 'processing', 'completed', 'failed', 'cancelled', 'pending'] as const;
  const counts: JobCounts = {};
  await Promise.all(
    statuses.map(async (status) => {
      try {
        counts[status] = await prisma.render_jobs.count({ where: { status } });
      } catch {
        counts[status] = 0;
      }
    })
  );
  return counts;
}

function getSystemSnapshot() {
  const mem = process.memoryUsage();
  return {
    uptime_seconds: Math.floor(process.uptime()),
    memory: {
      rss_bytes: mem.rss,
      heap_used_bytes: mem.heapUsed,
      heap_total_bytes: mem.heapTotal,
      external_bytes: mem.external,
    },
    cpu: {
      loadavg_1m: os.loadavg()[0] ?? 0,
      loadavg_5m: os.loadavg()[1] ?? 0,
      loadavg_15m: os.loadavg()[2] ?? 0,
      cores: os.cpus()?.length ?? 0,
    },
  };
}

export const getMetricsSnapshot = async () => {
  const jobsByStatus = await getRenderJobCounts();
  const system = getSystemSnapshot();
  return { jobsByStatus, system, timestamp: new Date().toISOString() };
};

export const getMetricsJson = async () => {
  const [projectsTotal, projectsCompleted, projectsProcessing] = await Promise.all([
    prisma.projects.count().catch(() => 0),
    prisma.projects.count({ where: { status: 'completed' } }).catch(() => 0),
    prisma.projects.count({ where: { status: 'in_progress' } }).catch(() => 0),
  ]);

  const jobsByStatus = await getRenderJobCounts();

  return {
    overview: {
      totalProjects: projectsTotal,
      completedProjects: projectsCompleted,
      processingProjects: projectsProcessing,
    },
    jobsByStatus,
    system: getSystemSnapshot(),
    timestamp: new Date().toISOString(),
  };
};

function escLabelValue(v: string) {
  return v.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

export const renderPrometheus = async () => {
  const snapshot = await getMetricsSnapshot();
  const lines: string[] = [];

  lines.push('# HELP app_uptime_seconds Process uptime in seconds');
  lines.push('# TYPE app_uptime_seconds gauge');
  lines.push(`app_uptime_seconds ${snapshot.system.uptime_seconds}`);

  lines.push('# HELP nodejs_memory_rss_bytes Resident set size in bytes');
  lines.push('# TYPE nodejs_memory_rss_bytes gauge');
  lines.push(`nodejs_memory_rss_bytes ${snapshot.system.memory.rss_bytes}`);

  lines.push('# HELP nodejs_heap_used_bytes Heap used in bytes');
  lines.push('# TYPE nodejs_heap_used_bytes gauge');
  lines.push(`nodejs_heap_used_bytes ${snapshot.system.memory.heap_used_bytes}`);

  lines.push('# HELP render_jobs_total Total render jobs by status');
  lines.push('# TYPE render_jobs_total gauge');
  for (const [status, count] of Object.entries(snapshot.jobsByStatus)) {
    lines.push(`render_jobs_total{status="${escLabelValue(status)}"} ${count}`);
  }

  return lines.join('\n') + '\n';
};
