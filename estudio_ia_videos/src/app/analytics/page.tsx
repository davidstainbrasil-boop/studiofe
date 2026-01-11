'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card'
import { Badge } from '@components/ui/badge'
import {
    BarChart,
    Bar,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts'
import {
    TrendingUp,
    Users,
    Video,
    Clock,
    Zap,
    DollarSign,
    Activity,
    Award
} from 'lucide-react'

export default function AnalyticsDashboard() {
    const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month')

    // Mock data - replace with real data from your analytics service
    const stats = {
        totalVideos: 1247,
        totalUsers: 342,
        processingTime: '2,450h',
        timeSaved: '98%',
        revenue: 'R$ 12,450',
        activeJobs: 23
    }

    const videosByType = [
        { name: 'Legendas', value: 450, color: '#3b82f6' },
        { name: 'Enhancement', value: 320, color: '#8b5cf6' },
        { name: 'Cenas', value: 280, color: '#ec4899' },
        { name: 'Voz', value: 197, color: '#10b981' }
    ]

    const dailyUsage = [
        { day: 'Seg', videos: 45, users: 12 },
        { day: 'Ter', videos: 52, users: 15 },
        { day: 'Qua', videos: 38, users: 11 },
        { day: 'Qui', videos: 65, users: 18 },
        { day: 'Sex', videos: 78, users: 22 },
        { day: 'Sáb', videos: 42, users: 14 },
        { day: 'Dom', videos: 30, users: 9 }
    ]

    const performanceMetrics = [
        { hour: '00:00', cpu: 20, memory: 35 },
        { hour: '04:00', cpu: 15, memory: 30 },
        { hour: '08:00', cpu: 45, memory: 55 },
        { hour: '12:00', cpu: 75, memory: 70 },
        { hour: '16:00', cpu: 85, memory: 80 },
        { hour: '20:00', cpu: 60, memory: 65 },
        { hour: '23:59', cpu: 30, memory: 40 }
    ]

    const topFeatures = [
        { feature: 'Auto-Subtitles', uses: 450, trend: '+12%' },
        { feature: 'Voice Cloning', uses: 320, trend: '+8%' },
        { feature: 'Video Enhancement', uses: 280, trend: '+15%' },
        { feature: 'Scene Detection', uses: 197, trend: '+5%' }
    ]

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
                        Analytics Dashboard
                    </h1>
                    <p className="text-gray-600">Visão geral de uso e performance da plataforma</p>
                </div>

                {/* Main Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-3 bg-blue-100 rounded-lg">
                                    <Video className="w-6 h-6 text-blue-600" />
                                </div>
                                <Badge variant="secondary" className="bg-green-100 text-green-800">
                                    +23% este mês
                                </Badge>
                            </div>
                            <div className="text-3xl font-bold text-gray-900 mb-1">{stats.totalVideos}</div>
                            <div className="text-sm text-gray-600">Vídeos Processados</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-3 bg-purple-100 rounded-lg">
                                    <Users className="w-6 h-6 text-purple-600" />
                                </div>
                                <Badge variant="secondary" className="bg-green-100 text-green-800">
                                    +15% este mês
                                </Badge>
                            </div>
                            <div className="text-3xl font-bold text-gray-900 mb-1">{stats.totalUsers}</div>
                            <div className="text-sm text-gray-600">Usuários Ativos</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-3 bg-green-100 rounded-lg">
                                    <Clock className="w-6 h-6 text-green-600" />
                                </div>
                                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                                    {stats.timeSaved} savings
                                </Badge>
                            </div>
                            <div className="text-3xl font-bold text-gray-900 mb-1">{stats.processingTime}</div>
                            <div className="text-sm text-gray-600">Tempo de Processamento</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-3 bg-yellow-100 rounded-lg">
                                    <DollarSign className="w-6 h-6 text-yellow-600" />
                                </div>
                                <Badge variant="secondary" className="bg-green-100 text-green-800">
                                    +28% MRR
                                </Badge>
                            </div>
                            <div className="text-3xl font-bold text-gray-900 mb-1">{stats.revenue}</div>
                            <div className="text-sm text-gray-600">Receita Mensal</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-3 bg-orange-100 rounded-lg">
                                    <Activity className="w-6 h-6 text-orange-600" />
                                </div>
                                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                                    Em tempo real
                                </Badge>
                            </div>
                            <div className="text-3xl font-bold text-gray-900 mb-1">{stats.activeJobs}</div>
                            <div className="text-sm text-gray-600">Jobs Ativos</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-3 bg-pink-100 rounded-lg">
                                    <Award className="w-6 h-6 text-pink-600" />
                                </div>
                                <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                                    Top Feature
                                </Badge>
                            </div>
                            <div className="text-3xl font-bold text-gray-900 mb-1">4.8/5.0</div>
                            <div className="text-sm text-gray-600">Satisfação Média</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* Daily Usage */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Uso Diário</CardTitle>
                            <CardDescription>Vídeos processados e usuários ativos</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={dailyUsage}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="day" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="videos" fill="#3b82f6" name="Vídeos" />
                                    <Bar dataKey="users" fill="#8b5cf6" name="Usuários" />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Videos by Type */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Distribuição por Tipo</CardTitle>
                            <CardDescription>Vídeos processados por feature</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={videosByType}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, percent }: any) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                                        outerRadius={100}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {videosByType.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>

                {/* Performance Metrics */}
                <Card className="mb-8">
                    <CardHeader>
                        <CardTitle>Performance do Sistema</CardTitle>
                        <CardDescription>Uso de CPU e memória nas últimas 24 horas</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={performanceMetrics}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="hour" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="cpu" stroke="#3b82f6" name="CPU %" strokeWidth={2} />
                                <Line type="monotone" dataKey="memory" stroke="#8b5cf6" name="Memória %" strokeWidth={2} />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Top Features */}
                <Card>
                    <CardHeader>
                        <CardTitle>Features Mais Usadas</CardTitle>
                        <CardDescription>Ranking de funcionalidades por uso</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {topFeatures.map((item, index) => (
                                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                    <div className="flex items-center gap-4">
                                        <div className="text-2xl font-bold text-gray-400">#{index + 1}</div>
                                        <div>
                                            <div className="font-semibold">{item.feature}</div>
                                            <div className="text-sm text-gray-600">{item.uses} utilizações</div>
                                        </div>
                                    </div>
                                    <Badge className="bg-green-100 text-green-800">
                                        <TrendingUp className="w-3 h-3 mr-1" />
                                        {item.trend}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
