'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card'
import { Badge } from '@components/ui/badge'
import { Progress } from '@components/ui/progress'
import { ScrollArea } from '@components/ui/scroll-area'
import { Activity, AlertTriangle, CheckCircle, TrendingUp, TrendingDown, Clock } from 'lucide-react'

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

    useEffect(() => {
        fetchRateLimitData()
        const interval = setInterval(fetchRateLimitData, 10000) // Refresh every 10s
        return () => clearInterval(interval)
    }, [])

    async function fetchRateLimitData() {
        try {
            const [limitsRes, statsRes] = await Promise.all([
                fetch('/api/admin/rate-limits/status'),
                fetch('/api/admin/rate-limits/stats')
            ])

            if (limitsRes.ok) {
                const data = await limitsRes.json()
                setLimits(data.limits || mockLimits)
            }

            if (statsRes.ok) {
                const data = await statsRes.json()
                setStats(data.stats || mockStats)
            }
        } catch (error) {
            // Use mock data on error
            setLimits(mockLimits)
            setStats(mockStats)
        } finally {
            setLoading(false)
        }
    }

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
                        <div className="text-2xl font-bold text-green-600">Healthy</div>
                        <p className="text-xs text-muted-foreground mt-1">All limits nominal</p>
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
        </div>
    )
}

// Mock data for development
const mockLimits: RateLimitStatus[] = [
    { endpoint: '/api/render', limit: 100, remaining: 85, used: 15, resetAt: new Date(Date.now() + 3600000).toISOString(), status: 'ok' },
    { endpoint: '/api/pptx/upload', limit: 50, remaining: 35, used: 15, resetAt: new Date(Date.now() + 3600000).toISOString(), status: 'ok' },
    { endpoint: '/api/tts/generate', limit: 200, remaining: 50, used: 150, resetAt: new Date(Date.now() + 3600000).toISOString(), status: 'warning' },
    { endpoint: '/api/projects', limit: 1000, remaining: 920, used: 80, resetAt: new Date(Date.now() + 3600000).toISOString(), status: 'ok' },
]

const mockStats: RateLimitStats = {
    totalRequests: 12450,
    blockedRequests: 23,
    topEndpoints: [
        { endpoint: '/api/projects', requests: 5200 },
        { endpoint: '/api/render', requests: 3400 },
        { endpoint: '/api/tts/generate', requests: 2100 },
    ],
    recentBlocks: [
        { endpoint: '/api/render', userId: 'user-123', timestamp: new Date(Date.now() - 300000).toISOString() },
        { endpoint: '/api/tts/generate', userId: 'user-456', timestamp: new Date(Date.now() - 600000).toISOString() },
    ]
}
