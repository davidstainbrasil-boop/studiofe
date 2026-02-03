'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card'
import { Badge } from '@components/ui/badge'
import { Progress } from '@components/ui/progress'
import { ScrollArea } from '@components/ui/scroll-area'
import { Activity, AlertTriangle, CheckCircle, TrendingUp, TrendingDown, Clock, RefreshCw } from 'lucide-react'
import { Button } from '@components/ui/button'
import { toast } from 'sonner'
import { logger } from '@lib/logger'

interface RateLimitStatus {
    endpoint: string
    limit: number
    remaining: number
    used: number
    resetAt: string
    status: 'ok' | 'warning' | 'critical'
}

interface RateLimitStats {
    totalRequests: number
    blockedRequests: number
    topEndpoints: { endpoint: string; requests: number }[]
    recentBlocks: { endpoint: string; userId: string; timestamp: string }[]
}

export function RateLimitDashboard() {
    const [limits, setLimits] = useState<RateLimitStatus[]>([])
    const [stats, setStats] = useState<RateLimitStats | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchRateLimitData = useCallback(async () => {
        try {
            setError(null)
            const [limitsRes, statsRes] = await Promise.all([
                fetch('/api/admin/rate-limits/status'),
                fetch('/api/admin/rate-limits/stats')
            ])

            if (limitsRes.ok) {
                const data = await limitsRes.json()
                setLimits(data.limits || [])
            } else if (limitsRes.status === 401) {
                setError('Authentication required')
            }

            if (statsRes.ok) {
                const data = await statsRes.json()
                setStats(data.stats || { totalRequests: 0, blockedRequests: 0, topEndpoints: [], recentBlocks: [] })
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to load rate limit data'
            setError(errorMessage)
            logger.error('Rate limit dashboard fetch error', err instanceof Error ? err : new Error(String(err)))
            toast.error('Falha ao carregar dados de rate limit')
            // Set empty data on error
            setLimits([])
            setStats({ totalRequests: 0, blockedRequests: 0, topEndpoints: [], recentBlocks: [] })
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchRateLimitData()
        const interval = setInterval(fetchRateLimitData, 10000) // Refresh every 10s
        return () => clearInterval(interval)
    }, [fetchRateLimitData])

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Activity className="w-8 h-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Rate Limit Dashboard</h2>
                <p className="text-muted-foreground">Monitor API rate limits and usage patterns</p>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.totalRequests.toLocaleString() || 0}</div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <TrendingUp className="h-3 w-3 text-green-500" />
                            +12% from last hour
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Blocked Requests</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.blockedRequests || 0}</div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <TrendingDown className="h-3 w-3 text-red-500" />
                            {stats?.blockedRequests ? `${((stats.blockedRequests / stats.totalRequests) * 100).toFixed(2)}% of total` : '0% of total'}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Health Status</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${
                            limits.some(l => l.status === 'critical') ? 'text-red-600' :
                            limits.some(l => l.status === 'warning') ? 'text-yellow-600' : 'text-green-600'
                        }`}>
                            {limits.some(l => l.status === 'critical') ? 'Critical' :
                             limits.some(l => l.status === 'warning') ? 'Warning' : 'Healthy'}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {limits.filter(l => l.status === 'ok').length} of {limits.length} endpoints nominal
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Endpoint Limits */}
            <Card>
                <CardHeader>
                    <CardTitle>Endpoint Rate Limits</CardTitle>
                    <CardDescription>Current status of protected endpoints</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {limits.map((limit) => (
                            <div key={limit.endpoint} className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <code className="text-sm bg-muted px-2 py-1 rounded">{limit.endpoint}</code>
                                        <Badge variant={
                                            limit.status === 'ok' ? 'default' :
                                                limit.status === 'warning' ? 'secondary' : 'destructive'
                                        }>
                                            {limit.status.toUpperCase()}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Clock className="h-3 w-3" />
                                        Resets {new Date(limit.resetAt).toLocaleTimeString()}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                        <span>{limit.used} / {limit.limit} requests used</span>
                                        <span>{limit.remaining} remaining</span>
                                    </div>
                                    <Progress
                                        value={(limit.used / limit.limit) * 100}
                                        className="h-2"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Recent Blocks */}
            <Card>
                <CardHeader>
                    <CardTitle>Recent Blocked Requests</CardTitle>
                    <CardDescription>Latest rate limit violations</CardDescription>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-64">
                        <div className="space-y-2">
                            {stats?.recentBlocks && stats.recentBlocks.length > 0 ? (
                                stats.recentBlocks.map((block, i) => (
                                    <div key={i} className="flex items-center justify-between p-2 rounded bg-muted">
                                        <div>
                                            <code className="text-xs">{block.endpoint}</code>
                                            <p className="text-xs text-muted-foreground">User: {block.userId}</p>
                                        </div>
                                        <span className="text-xs text-muted-foreground">
                                            {new Date(block.timestamp).toLocaleString()}
                                        </span>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-8">No recent blocks</p>
                            )}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>

            {/* Error Display */}
            {error && (
                <Card className="border-yellow-200 bg-yellow-50">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-yellow-600" />
                            <p className="text-sm text-yellow-800">{error}</p>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={fetchRateLimitData}
                                className="ml-auto"
                            >
                                <RefreshCw className="h-3 w-3 mr-1" />
                                Retry
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
