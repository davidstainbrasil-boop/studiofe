'use client';
import { logger } from '@/lib/logger';

/**
 * Admin Dashboard
 * System metrics, circuit breakers, and cleanup controls
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Video, HardDrive, Activity } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface Metrics {
  timestamp: string;
  uptime: number;
  uptimeFormatted: string;
  system: {
    nodeVersion: string;
    platform: string;
    memory: {
      heapUsedMB: string;
      heapTotalMB: string;
      heapUsagePercent: string;
    };
  };
  database: {
    totalProjects: number;
    totalUsers: number;
  };
  renders: {
    last24Hours: number;
    completed24h: number;
    failed24h: number;
    errorRate: number;
    errorRateFormatted: string;
  };
  circuitBreakers: Array<{
    name: string;
    state: string;
    failures: number;
    successes: number;
    totalRequests: number;
    isHealthy: boolean;
  }>;
  queue: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  } | null;
  health: {
    status: string;
    circuitBreakersOpen: number;
    errorRate: number;
  };
}

interface CleanupResults {
  success: boolean;
  summary: {
    totalDeleted: number;
    totalFreedMB: string;
    totalErrors: number;
    dryRun: boolean;
  };
  message?: string;
}

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [stats, setStats] = useState<any | null>(null);
  const [cleanupResults, setCleanupResults] = useState<CleanupResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchData();

    // Auto-refresh every 30 seconds
    if (autoRefresh) {
      const interval = setInterval(fetchData, 30000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const fetchData = async () => {
    try {
      const [resMetrics, resStats] = await Promise.all([
        fetch('/api/admin/metrics'),
        fetch('/api/admin/stats')
      ]);

      if (resMetrics.ok) {
        setMetrics(await resMetrics.json());
      }
      if (resStats.ok) {
        setStats(await resStats.json());
      }
    } catch (error) {
      logger.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const runCleanup = async (dryRun: boolean) => {
    setCleanupLoading(true);
    setCleanupResults(null);

    try {
      const res = await fetch(`/api/admin/cleanup?dryRun=${dryRun}`, {
        method: 'POST',
      });

      if (!res.ok) throw new Error('Cleanup failed');
      const data = await res.json();
      setCleanupResults(data);

      // Refresh metrics after cleanup
      if (!dryRun) {
        setTimeout(fetchData, 2000);
      }
    } catch (error) {
      logger.error('Cleanup error:', error);
      setCleanupResults({
        success: false,
        summary: {
          totalDeleted: 0,
          totalFreedMB: '0',
          totalErrors: 1,
          dryRun,
        },
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setCleanupLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading dashboard...</div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-red-500">Failed to load metrics</div>
      </div>
    );
  }

  const healthColor = metrics.health.status === 'healthy' ? 'green' : 'orange';

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">System health and operational metrics</p>
        </div>

        <div className="flex items-center gap-4">
          <Badge variant={metrics.health.status === 'healthy' ? 'default' : 'destructive'}>
            {metrics.health.status.toUpperCase()}
          </Badge>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">Auto-refresh</span>
          </label>

          <Button onClick={fetchData} size="sm" variant="outline">
            Refresh
          </Button>
        </div>
      </div>

      {/* Business KPIs */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                {stats.plans?.pro || 0} Pro / {stats.plans?.free || 0} Free
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Render Jobs (Total)</CardTitle>
              <Video className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.renderJobs?.total}</div>
              <p className="text-xs text-muted-foreground">
                {stats.renderJobs?.completedLast24h || 0} new in 24h
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
              <HardDrive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(stats.usedStorage / 1024 / 1024 / 1024).toFixed(2)} GB</div>
              <Progress value={stats.storageUtilization} className="h-1 mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users (1h)</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeSessions}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* System Health */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Uptime</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{metrics.uptimeFormatted}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Memory Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{metrics.system.memory.heapUsedMB} MB</p>
            <p className="text-xs text-gray-500">
              {metrics.system.memory.heapUsagePercent}% of {metrics.system.memory.heapTotalMB} MB
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Error Rate (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{metrics.renders.errorRateFormatted}</p>
            <p className="text-xs text-gray-500">
              {metrics.renders.failed24h} / {metrics.renders.last24Hours} jobs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Circuit Breakers</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {metrics.circuitBreakers.length - metrics.health.circuitBreakersOpen}
              <span className="text-gray-400"> / </span>
              {metrics.circuitBreakers.length}
            </p>
            <p className="text-xs text-gray-500">
              {metrics.health.circuitBreakersOpen} open
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Render Queue */}
      {metrics.queue && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Render Queue</CardTitle>
            <CardDescription>BullMQ job queue status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600">Waiting</p>
                <p className="text-xl font-bold">{metrics.queue.waiting}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-xl font-bold text-blue-600">{metrics.queue.active}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-xl font-bold text-green-600">{metrics.queue.completed}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Failed</p>
                <p className="text-xl font-bold text-red-600">{metrics.queue.failed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Circuit Breakers */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Circuit Breakers</CardTitle>
          <CardDescription>External service protection status</CardDescription>
        </CardHeader>
        <CardContent>
          {metrics.circuitBreakers.length === 0 ? (
            <p className="text-gray-500">No circuit breakers registered</p>
          ) : (
            <div className="space-y-2">
              {metrics.circuitBreakers.map((circuit) => (
                <div
                  key={circuit.name}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <span className="font-medium">{circuit.name}</span>
                    <Badge
                      variant={
                        circuit.state === 'closed'
                          ? 'default'
                          : circuit.state === 'open'
                            ? 'destructive'
                            : 'secondary'
                      }
                    >
                      {circuit.state}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-6 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">{circuit.totalRequests}</span> requests
                    </div>
                    <div>
                      <span className="font-medium text-green-600">{circuit.successes}</span> successes
                    </div>
                    <div>
                      <span className="font-medium text-red-600">{circuit.failures}</span> failures
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resource Cleanup */}
      <Card>
        <CardHeader>
          <CardTitle>Resource Cleanup</CardTitle>
          <CardDescription>
            Automatically delete old renders, failed jobs, and temporary files
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <Button
              onClick={() => runCleanup(true)}
              disabled={cleanupLoading}
              variant="outline"
            >
              {cleanupLoading ? 'Running...' : 'Preview Cleanup (Dry Run)'}
            </Button>

            <Button
              onClick={() => runCleanup(false)}
              disabled={cleanupLoading}
              variant="destructive"
            >
              {cleanupLoading ? 'Executing...' : 'Execute Cleanup'}
            </Button>
          </div>

          {cleanupResults && (
            <div
              className={`mt-4 p-4 rounded-lg ${cleanupResults.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}
            >
              <h4 className="font-bold mb-2">
                {cleanupResults.summary.dryRun ? 'Dry Run Results' : 'Cleanup Results'}
              </h4>

              {cleanupResults.success ? (
                <div className="space-y-1">
                  <p>
                    <strong>Deleted:</strong> {cleanupResults.summary.totalDeleted} files
                  </p>
                  <p>
                    <strong>Freed:</strong> {cleanupResults.summary.totalFreedMB} MB
                  </p>
                  <p>
                    <strong>Errors:</strong> {cleanupResults.summary.totalErrors}
                  </p>
                  {cleanupResults.summary.dryRun && (
                    <p className="text-sm text-green-700 mt-2">
                      This was a dry run. No files were actually deleted.
                    </p>
                  )}
                  {cleanupResults.message && (
                    <p className="text-sm text-gray-700 mt-2">{cleanupResults.message}</p>
                  )}
                </div>
              ) : (
                <p className="text-red-700">{cleanupResults.message || 'Cleanup failed'}</p>
              )}
            </div>
          )}

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium mb-2">Automated Cleanup</h4>
            <p className="text-sm text-gray-600">
              Cleanup runs automatically daily at 2 AM via cron job.
            </p>
            <p className="text-sm text-gray-600 mt-1">
              <strong>Retention Policy:</strong>
            </p>
            <ul className="text-sm text-gray-600 ml-4 mt-1 list-disc">
              <li>Completed renders: 30 days</li>
              <li>Failed jobs: 7 days</li>
              <li>Temporary files: 1 day</li>
              <li>Idempotency keys: 24 hours</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="mt-8 text-center text-sm text-gray-500">
        Last updated: {new Date(metrics.timestamp).toLocaleString()}
        <br />
        Node {metrics.system.nodeVersion} • {metrics.system.platform}
      </div>
    </div>
  );
}
