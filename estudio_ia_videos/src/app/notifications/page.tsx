'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card'
import { Button } from '@components/ui/button'
import { Badge } from '@components/ui/badge'
import { ScrollArea } from '@components/ui/scroll-area'
import {
    Bell,
    CheckCircle,
    XCircle,
    Clock,
    Info,
    AlertCircle,
    Trash2,
    Check,
    X
} from 'lucide-react'
import { toast } from 'sonner'

interface Notification {
    id: string
    type: 'success' | 'error' | 'info' | 'warning'
    title: string
    message: string
    timestamp: Date
    read: boolean
    actionUrl?: string
}

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<Notification[]>([
        {
            id: '1',
            type: 'success',
            title: 'Vídeo processado com sucesso',
            message: 'O vídeo "Tutorial React.mp4" foi processado e as legendas estão prontas.',
            timestamp: new Date(Date.now() - 5 * 60000),
            read: false,
            actionUrl: '/auto-subtitles'
        },
        {
            id: '2',
            type: 'info',
            title: 'Novo preset criado',
            message: 'Preset "4K Ultra HD" foi criado e está disponível para uso.',
            timestamp: new Date(Date.now() - 30 * 60000),
            read: false,
            actionUrl: '/presets'
        },
        {
            id: '3',
            type: 'warning',
            title: 'Limite de processamento',
            message: 'Você usou 80% do seu limite mensal de processamento.',
            timestamp: new Date(Date.now() - 2 * 60 * 60000),
            read: true
        },
        {
            id: '4',
            type: 'error',
            title: 'Falha no upload',
            message: 'O arquivo "video_large.mp4" excedeu o limite de 500MB.',
            timestamp: new Date(Date.now() - 24 * 60 * 60000),
            read: true
        }
    ])

    const [filter, setFilter] = useState<'all' | 'unread'>('all')

    const unreadCount = notifications.filter(n => !n.read).length

    const markAsRead = (id: string) => {
        setNotifications(prev => prev.map(n =>
            n.id === id ? { ...n, read: true } : n
        ))
    }

    const markAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
        toast.success('Todas as notificações marcadas como lidas')
    }

    const deleteNotification = (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id))
        toast.success('Notificação removida')
    }

    const clearAll = () => {
        setNotifications([])
        toast.success('Todas as notificações removidas')
    }

    const getIcon = (type: Notification['type']) => {
        switch (type) {
            case 'success': return <CheckCircle className="w-5 h-5 text-green-500" />
            case 'error': return <XCircle className="w-5 h-5 text-red-500" />
            case 'warning': return <AlertCircle className="w-5 h-5 text-yellow-500" />
            case 'info': return <Info className="w-5 h-5 text-blue-500" />
        }
    }

    const getColor = (type: Notification['type']) => {
        switch (type) {
            case 'success': return 'border-green-200 bg-green-50'
            case 'error': return 'border-red-200 bg-red-50'
            case 'warning': return 'border-yellow-200 bg-yellow-50'
            case 'info': return 'border-blue-200 bg-blue-50'
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
                        <div className="flex gap2">
                            {unreadCount > 0 && (
                                <Button onClick={markAllAsRead} variant="outline" size="sm">
                                    <Check className="w-4 h-4 mr-2" />
                                    Marcar todas como lidas
                                </Button>
                            )}
                            {notifications.length > 0 && (
                                <Button onClick={clearAll} variant="outline" size="sm" className="ml-2">
                                    <Trash2 className="w-4 h-4 mr-2" />
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
                                                        onClick={() => deleteNotification(notification.id)}
                                                        variant="ghost"
                                                        size="sm"
                                                        className="ml-2"
                                                    >
                                                        <X className="w-4 h-4" />
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
                                                                onClick={() => markAsRead(notification.id)}
                                                                variant="outline"
                                                                size="sm"
                                                            >
                                                                Marcar como lida
                                                            </Button>
                                                        )}
                                                        {notification.actionUrl && (
                                                            <Button
                                                                onClick={() => {
                                                                    markAsRead(notification.id)
                                                                    window.location.href = notification.actionUrl!
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
