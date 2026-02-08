'use client'
import { logger } from '@/lib/logger';

/**
 * Queue Monitor Dashboard - Fase 4
 * Dashboard visual para monitorar workers e filas de rendering
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import {
  Activity, Server, CheckCircle, XCircle, Clock,
  Play, Pause, RefreshCw, Trash2, AlertCircle,
  TrendingUp, Users, Cpu, HardDrive
} from 'lucide-react'

// ============================================================================
// TYPES
// ============================================================================

interface QueueMetrics {
  waiting: number
  active: number
  completed: number
  failed: number
  delayed: number
  paused: number
}

interface WorkerMetrics {
  id: string
  name: string
  status: 'active' | 'idle' | 'stopped'
  currentJob?: string
  processedJobs: number
  failedJobs: number
  avgProcessingTime: number
  lastActive: Date
  memory: {
    used: number
    total: number
  }
  cpu: number
}

interface Job {
  id: string
  name: string
  data: any
  progress: any
  state: string
  attempts: number
  timestamp: number
  processedOn?: number
  finishedOn?: number
  failedReason?: string
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function QueueMonitorDashboard() {
  const [metrics, setMetrics] = useState<QueueMetrics | null>(null)
  const [workers, setWorkers] = useState<WorkerMetrics[]>([])
  const [activeJobs, setActiveJobs] = useState<Job[]>([])
  const [recentCompleted, setRecentCompleted] = useState<Job[]>([])
  const [recentFailed, setRecentFailed] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)

  // Fetch metrics
  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/admin/queue/metrics')
      const data = await response.json()

      if (data.success) {
        setMetrics(data.data.queue)
        setWorkers(data.data.workers)
        setActiveJobs(data.data.recentJobs.active)
        setRecentCompleted(data.data.recentJobs.completed)
        setRecentFailed(data.data.recentJobs.failed)
      }
    } catch (error) {
      logger.error('Error fetching metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  // Auto-refresh
  useEffect(() => {
    fetchMetrics()

    if (autoRefresh) {
      const interval = setInterval(fetchMetrics, 5000) // Every 5 seconds
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  // Cancel job
  const handleCancelJob = async (jobId: string) => {
    try {
      const response = await fetch(`/api/admin/queue/jobs?jobId=${jobId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchMetrics()
      }
    } catch (error) {
      logger.error('Error cancelling job:', error)
    }
  }

  // Retry job
  const handleRetryJob = async (jobId: string) => {
    try {
      const response = await fetch(`/api/admin/queue/jobs?jobId=${jobId}`, {
        method: 'PUT'
      })

      if (response.ok) {
        await fetchMetrics()
      }
    } catch (error) {
      logger.error('Error retrying job:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Loading metrics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Queue Monitor</h1>
          <p className="text-gray-500">Real-time rendering queue and worker metrics</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
            Auto-refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchMetrics}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Queue Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard
          title="Waiting"
          value={metrics?.waiting || 0}
          icon={<Clock className="h-4 w-4" />}
          color="text-yellow-500"
        />

        <MetricCard
          title="Active"
          value={metrics?.active || 0}
          icon={<Activity className="h-4 w-4" />}
          color="text-blue-500"
        />

        <MetricCard
          title="Completed"
          value={metrics?.completed || 0}
          icon={<CheckCircle className="h-4 w-4" />}
          color="text-green-500"
        />

        <MetricCard
          title="Failed"
          value={metrics?.failed || 0}
          icon={<XCircle className="h-4 w-4" />}
          color="text-red-500"
        />

        <MetricCard
          title="Delayed"
          value={metrics?.delayed || 0}
          icon={<Clock className="h-4 w-4" />}
          color="text-orange-500"
        />

        <MetricCard
          title="Workers"
          value={workers.length}
          icon={<Server className="h-4 w-4" />}
          color="text-purple-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Workers Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Workers ({workers.length})
            </CardTitle>
            <CardDescription>Active rendering workers</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-3">
                {workers.map(worker => (
                  <div
                    key={worker.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-2 w-2 rounded-full ${
                        worker.status === 'active' ? 'bg-green-500' :
                        worker.status === 'idle' ? 'bg-yellow-500' : 'bg-gray-500'
                      }`} />

                      <div>
                        <div className="font-medium">{worker.name}</div>
                        <div className="text-xs text-gray-500">
                          {worker.processedJobs} jobs processed
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <Badge variant={
                        worker.status === 'active' ? 'default' :
                        worker.status === 'idle' ? 'secondary' : 'outline'
                      }>
                        {worker.status}
                      </Badge>

                      <div className="text-xs text-gray-500 mt-1">
                        {Math.round(worker.memory.used / 1024 / 1024)}MB
                      </div>
                    </div>
                  </div>
                ))}

                {workers.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    <Server className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No workers active</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Active Jobs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Active Jobs ({activeJobs.length})
            </CardTitle>
            <CardDescription>Currently processing</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-3">
                {activeJobs.map(job => (
                  <div
                    key={job.id}
                    className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium text-sm">{job.name}</div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCancelJob(job.id as string)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>

                    {job.progress && (
                      <>
                        <Progress value={job.progress.progress || 0} className="h-1 mb-1" />
                        <div className="text-xs text-gray-500">
                          {job.progress.stage} - {job.progress.currentTask || 'Processing'}
                        </div>
                      </>
                    )}
                  </div>
                ))}

                {activeJobs.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No active jobs</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Recent Jobs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Completed */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              Recently Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {recentCompleted.map(job => (
                  <div key={job.id} className="text-sm p-2 bg-green-50 dark:bg-green-900/20 rounded">
                    <div className="font-medium">{job.name}</div>
                    <div className="text-xs text-gray-500">
                      {job.finishedOn && new Date(job.finishedOn).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Failed */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              Recently Failed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {recentFailed.map(job => (
                  <div key={job.id} className="text-sm p-2 bg-red-50 dark:bg-red-900/20 rounded">
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-medium">{job.name}</div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRetryJob(job.id as string)}
                      >
                        <RefreshCw className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="text-xs text-red-600">{job.failedReason}</div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ============================================================================
// METRIC CARD COMPONENT
// ============================================================================

function MetricCard({
  title,
  value,
  icon,
  color
}: {
  title: string
  value: number
  icon: React.ReactNode
  color: string
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
          <div className={color}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  )
}
