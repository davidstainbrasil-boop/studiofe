'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card'
import { Button } from '@components/ui/button'
import { Badge } from '@components/ui/badge'
import { Input } from '@components/ui/input'
import { ScrollArea } from '@components/ui/scroll-area'
import { Skeleton } from '@components/ui/skeleton'
import {
    Activity,
    Search,
    Filter,
    User,
    Video,
    Settings,
    Share2,
    Download,
    Upload,
    Trash2,
    Edit,
    Eye,
    LogIn,
    LogOut,
    Key,
    Shield,
    RefreshCw,
    AlertCircle,
    Loader2
} from 'lucide-react'
import { useActivity, type ActivityType } from '@hooks/use-activity'

export default function ActivityPage() {
    const [searchQuery, setSearchQuery] = useState('')
    const [filterType, setFilterType] = useState<ActivityType | 'all'>('all')

    const {
        activities,
        loading,
        error,
        refresh
    } = useActivity({
        type: filterType,
        search: searchQuery
    })

    const getTypeIcon = (type: ActivityType) => {
        switch (type) {
            case 'create': return <Upload className="w-4 h-4 text-green-500" />
            case 'edit': return <Edit className="w-4 h-4 text-blue-500" />
            case 'delete': return <Trash2 className="w-4 h-4 text-red-500" />
            case 'share': return <Share2 className="w-4 h-4 text-purple-500" />
            case 'export': return <Download className="w-4 h-4 text-orange-500" />
            case 'auth': return <LogIn className="w-4 h-4 text-indigo-500" />
            case 'settings': return <Settings className="w-4 h-4 text-gray-500" />
            case 'view': return <Eye className="w-4 h-4 text-cyan-500" />
        }
    }

    const getTypeColor = (type: ActivityType) => {
        switch (type) {
            case 'create': return 'bg-green-100 text-green-800'
            case 'edit': return 'bg-blue-100 text-blue-800'
            case 'delete': return 'bg-red-100 text-red-800'
            case 'share': return 'bg-purple-100 text-purple-800'
            case 'export': return 'bg-orange-100 text-orange-800'
            case 'auth': return 'bg-indigo-100 text-indigo-800'
            case 'settings': return 'bg-gray-100 text-gray-800'
            case 'view': return 'bg-cyan-100 text-cyan-800'
        }
    }

    const formatTimestamp = (dateStr: string) => {
        const date = new Date(dateStr)
        const now = new Date()
        const diff = now.getTime() - date.getTime()
        const minutes = Math.floor(diff / 60000)
        const hours = Math.floor(minutes / 60)
        const days = Math.floor(hours / 24)

        if (days > 0) return `${days}d atrás`
        if (hours > 0) return `${hours}h atrás`
        if (minutes > 0) return `${minutes}min atrás`
        return 'Agora'
    }

    // Loading skeleton
    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-6">
                <div className="max-w-4xl mx-auto">
                    <div className="mb-8">
                        <Skeleton className="h-12 w-64 mb-2" />
                        <Skeleton className="h-4 w-48" />
                    </div>
                    <div className="flex gap-4 mb-6">
                        <Skeleton className="h-10 flex-1" />
                        <Skeleton className="h-10 w-32" />
                    </div>
                    <Card>
                        <CardContent className="p-4">
                            <div className="space-y-4">
                                {[1, 2, 3, 4, 5].map(i => (
                                    <div key={i} className="flex gap-3 items-start">
                                        <Skeleton className="w-10 h-10 rounded-full" />
                                        <div className="flex-1 space-y-2">
                                            <Skeleton className="h-4 w-48" />
                                            <Skeleton className="h-3 w-64" />
                                        </div>
                                        <Skeleton className="h-4 w-16" />
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        )
    }

    // Error state
    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-6">
                <div className="max-w-4xl mx-auto">
                    <Card className="border-red-200 bg-red-50">
                        <CardContent className="p-6 text-center">
                            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                            <h3 className="font-semibold text-red-700 mb-2">Erro ao carregar atividades</h3>
                            <p className="text-red-600 mb-4">{error}</p>
                            <Button onClick={() => refresh()} variant="outline">
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Tentar novamente
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        )
    }

    const stats = {
        total: activities.length,
        today: activities.filter(a => {
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            return new Date(a.timestamp) >= today
        }).length,
        users: new Set(activities.map(a => a.user)).size
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-gray-50 p-6">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-gradient-to-r from-slate-600 to-gray-700 rounded-xl">
                                <Activity className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-600 to-gray-700 bg-clip-text text-transparent">
                                    Log de Atividades
                                </h1>
                                <p className="text-gray-600">Acompanhe todas as ações na plataforma</p>
                            </div>
                        </div>
                        <Button variant="outline" onClick={() => refresh()}>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Atualizar
                        </Button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <Card>
                        <CardContent className="p-6 text-center">
                            <div className="text-3xl font-bold text-slate-600 mb-1">{stats.total}</div>
                            <div className="text-sm text-gray-600">Total de Atividades</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6 text-center">
                            <div className="text-3xl font-bold text-green-600 mb-1">{stats.today}</div>
                            <div className="text-sm text-gray-600">Hoje</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6 text-center">
                            <div className="text-3xl font-bold text-blue-600 mb-1">{stats.users}</div>
                            <div className="text-sm text-gray-600">Usuários Ativos</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters */}
                <Card className="mb-6">
                    <CardContent className="p-4">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input
                                    placeholder="Buscar atividades..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                            <div className="flex gap-2 flex-wrap">
                                {(['all', 'create', 'edit', 'delete', 'share', 'export', 'auth', 'settings'] as const).map(type => (
                                    <Button
                                        key={type}
                                        variant={filterType === type ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setFilterType(type)}
                                    >
                                        {type === 'all' ? 'Todos' : type}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Activity List */}
                <Card>
                    <CardHeader>
                        <CardTitle>Atividades Recentes</CardTitle>
                        <CardDescription>{activities.length} atividades</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[500px]">
                            <div className="space-y-4">
                                {activities.map(activity => (
                                    <div
                                        key={activity.id}
                                        className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                    >
                                        {/* User Avatar */}
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium text-sm">
                                            {activity.userAvatar}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-medium">{activity.user}</span>
                                                <Badge className={getTypeColor(activity.type)}>
                                                    <span className="flex items-center gap-1">
                                                        {getTypeIcon(activity.type)}
                                                        {activity.action}
                                                    </span>
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-gray-600">{activity.description}</p>
                                        </div>

                                        {/* Timestamp */}
                                        <div className="text-sm text-gray-500">
                                            {formatTimestamp(activity.timestamp)}
                                        </div>
                                    </div>
                                ))}

                                {activities.length === 0 && (
                                    <div className="text-center py-12 text-gray-500">
                                        <Activity className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                                        <p>Nenhuma atividade encontrada</p>
                                        <p className="text-sm mt-2">Suas atividades aparecerão aqui quando você usar a plataforma</p>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
