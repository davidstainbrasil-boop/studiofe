'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card'
import { Button } from '@components/ui/button'
import { Badge } from '@components/ui/badge'
import { ScrollArea } from '@components/ui/scroll-area'
import { Skeleton } from '@components/ui/skeleton'
import {
    Bell,
    CheckCircle,
    XCircle,
    Clock,
    Info,
    AlertCircle,
    Trash2,
    Check,
    X,
    RefreshCw,
    Loader2
} from 'lucide-react'
import { toast } from 'sonner'
import { useNotifications, type Notification } from '@hooks/use-notifications'

export default function NotificationsPage() {
    const {
        notifications,
        unreadCount,
        isLoading,
        error,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        deleteAllRead,
        refreshNotifications
    } = useNotifications()
    
    const [filter, setFilter] = useState<'all' | 'unread'>('all')
    const [actionLoading, setActionLoading] = useState<string | null>(null)

    const handleMarkAsRead = async (id: string) => {
        setActionLoading(id)
        const result = await markAsRead(id)
        if (result.success) {
            toast.success('Notificação marcada como lida')
        }
        setActionLoading(null)
    }

    const handleMarkAllAsRead = async () => {
        setActionLoading('all')
        const result = await markAllAsRead()
        if (result.success) {
            toast.success('Todas as notificações marcadas como lidas')
        }
        setActionLoading(null)
    }

    const handleDeleteNotification = async (id: string) => {
        setActionLoading(id)
        const result = await deleteNotification(id)
        if (result.success) {
            toast.success('Notificação removida')
        }
        setActionLoading(null)
    }

    const handleClearAll = async () => {
        setActionLoading('clear')
        await deleteAllRead()
        toast.success('Notificações lidas removidas')
        setActionLoading(null)
    }

    const getIcon = (type: Notification['type']) => {
        switch (type) {
            case 'success': return <CheckCircle className="w-5 h-5 text-green-500" />
            case 'error': return <XCircle className="w-5 h-5 text-red-500" />
            case 'warning': return <AlertCircle className="w-5 h-5 text-yellow-500" />
            case 'info': return <Info className="w-5 h-5 text-blue-500" />
            case 'render': return <CheckCircle className="w-5 h-5 text-purple-500" />
            case 'collaboration': return <Info className="w-5 h-5 text-cyan-500" />
            case 'system': return <AlertCircle className="w-5 h-5 text-gray-500" />
            default: return <Info className="w-5 h-5 text-blue-500" />
        }
    }

    const getColor = (type: Notification['type']) => {
        switch (type) {
            case 'success': return 'border-green-200 bg-green-50'
            case 'error': return 'border-red-200 bg-red-50'
            case 'warning': return 'border-yellow-200 bg-yellow-50'
            case 'info': return 'border-blue-200 bg-blue-50'
            case 'render': return 'border-purple-200 bg-purple-50'
            case 'collaboration': return 'border-cyan-200 bg-cyan-50'
            case 'system': return 'border-gray-200 bg-gray-50'
            default: return 'border-blue-200 bg-blue-50'
        }
    }

    const formatTimestamp = (date: Date) => {
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

    const filteredNotifications = filter === 'unread'
        ? notifications.filter(n => !n.read)
        : notifications

    // Loading state
    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-6">
                <div className="max-w-4xl mx-auto">
                    <div className="mb-8">
                        <div className="flex items-center gap-3">
                            <Skeleton className="w-14 h-14 rounded-xl" />
                            <div>
                                <Skeleton className="h-8 w-48 mb-2" />
                                <Skeleton className="h-4 w-32" />
                            </div>
                        </div>
                    </div>
                    <div className="space-y-4">
                        {[...Array(4)].map((_, i) => (
                            <Skeleton key={i} className="h-32 w-full rounded-lg" />
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    // Error state  
    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-6">
                <div className="max-w-4xl mx-auto">
                    <Card className="border-red-200 bg-red-50">
                        <CardContent className="p-12 text-center">
                            <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-red-700 mb-2">
                                Erro ao carregar notificações
                            </h3>
                            <p className="text-red-600 mb-4">{error.message}</p>
                            <Button onClick={() => refreshNotifications()} variant="outline">
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Tentar novamente
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl relative">
                                <Bell className="w-8 h-8 text-white" />
                                {unreadCount > 0 && (
                                    <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                                        {unreadCount}
                                    </div>
                                )}
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                                    Notificações
                                </h1>
                                <p className="text-gray-600">
                                    {unreadCount > 0 ? `${unreadCount} não lida(s)` : 'Todas as notificações lidas'}
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button onClick={() => refreshNotifications()} variant="outline" size="sm">
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Atualizar
                            </Button>
                            {unreadCount > 0 && (
                                <Button 
                                    onClick={handleMarkAllAsRead} 
                                    variant="outline" 
                                    size="sm"
                                    disabled={actionLoading === 'all'}
                                >
                                    {actionLoading === 'all' ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                        <Check className="w-4 h-4 mr-2" />
                                    )}
                                    Marcar todas como lidas
                                </Button>
                            )}
                            {notifications.length > 0 && (
                                <Button 
                                    onClick={handleClearAll} 
                                    variant="outline" 
                                    size="sm" 
                                    className="ml-2"
                                    disabled={actionLoading === 'clear'}
                                >
                                    {actionLoading === 'clear' ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                        <Trash2 className="w-4 h-4 mr-2" />
                                    )}
                                    Limpar tudo
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Filter */}
                <div className="flex gap-2 mb-6">
                    <Button
                        onClick={() => setFilter('all')}
                        variant={filter === 'all' ? 'default' : 'outline'}
                        size="sm"
                    >
                        Todas ({notifications.length})
                    </Button>
                    <Button
                        onClick={() => setFilter('unread')}
                        variant={filter === 'unread' ? 'default' : 'outline'}
                        size="sm"
                    >
                        Não lidas ({unreadCount})
                    </Button>
                </div>

                {/* Notifications List */}
                {filteredNotifications.length === 0 ? (
                    <Card>
                        <CardContent className="p-12 text-center">
                            <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-gray-700 mb-2">
                                Nenhuma notificação
                            </h3>
                            <p className="text-gray-500">
                                {filter === 'unread'
                                    ? 'Você leu todas as suas notificações!'
                                    : 'Quando houver novidades, elas aparecerão aqui.'}
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <ScrollArea className="h-[600px]">
                        <div className="space-y-4">
                            {filteredNotifications.map(notification => (
                                <Card
                                    key={notification.id}
                                    className={`border-l-4 transition-all ${getColor(notification.type)} ${!notification.read ? 'shadow-md' : 'opacity-75'
                                        }`}
                                >
                                    <CardContent className="p-4">
                                        <div className="flex items-start gap-4">
                                            <div className="mt-1">{getIcon(notification.type)}</div>

                                            <div className="flex-1">
                                                <div className="flex items-start justify-between mb-2">
                                                    <div>
                                                        <h3 className="font-semibold text-gray-900">
                                                            {notification.title}
                                                            {!notification.read && (
                                                                <span className="ml-2 inline-block w-2 h-2 bg-blue-500 rounded-full" />
                                                            )}
                                                        </h3>
                                                        <p className="text-sm text-gray-600 mt-1">
                                                            {notification.message}
                                                        </p>
                                                    </div>
                                                    <Button
                                                        onClick={() => handleDeleteNotification(notification.id)}
                                                        variant="ghost"
                                                        size="sm"
                                                        className="ml-2"
                                                        disabled={actionLoading === notification.id}
                                                    >
                                                        {actionLoading === notification.id ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            <X className="w-4 h-4" />
                                                        )}
                                                    </Button>
                                                </div>

                                                <div className="flex items-center justify-between mt-3">
                                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                                        <Clock className="w-3 h-3" />
                                                        {formatTimestamp(notification.timestamp)}
                                                    </div>

                                                    <div className="flex gap-2">
                                                        {!notification.read && (
                                                            <Button
                                                                onClick={() => handleMarkAsRead(notification.id)}
                                                                variant="outline"
                                                                size="sm"
                                                                disabled={actionLoading === notification.id}
                                                            >
                                                                Marcar como lida
                                                            </Button>
                                                        )}
                                                        {notification.action_url && (
                                                            <Button
                                                                onClick={() => {
                                                                    handleMarkAsRead(notification.id)
                                                                    window.location.href = notification.action_url!
                                                                }}
                                                                size="sm"
                                                                className="bg-blue-600 hover:bg-blue-700"
                                                            >
                                                                Ver detalhes
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </ScrollArea>
                )}
            </div>
        </div>
    )
}
