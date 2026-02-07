'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card'
import { Button } from '@components/ui/button'
import { Badge } from '@components/ui/badge'
import { Input } from '@components/ui/input'
import { Textarea } from '@components/ui/textarea'
import { ScrollArea } from '@components/ui/scroll-area'
import {
    Calendar,
    Clock,
    Plus,
    Video,
    Youtube,
    Instagram,
    Twitter,
    Edit,
    Trash2,
    CheckCircle,
    XCircle,
    Send,
    CalendarDays
} from 'lucide-react'
import { toast } from 'sonner'

interface ScheduledPost {
    id: string
    projectName: string
    platforms: string[]
    scheduledAt: Date
    status: 'scheduled' | 'published' | 'failed' | 'draft'
    caption?: string
    thumbnail?: string
}

export default function SchedulingPage() {
    const [posts, setPosts] = useState<ScheduledPost[]>([])
    const [loading, setLoading] = useState(true)

    // Fetch scheduled posts from API
    React.useEffect(() => {
        async function fetchScheduledPosts() {
            try {
                const response = await fetch('/api/scheduling/posts')
                if (response.ok) {
                    const data = await response.json()
                    if (data.posts) {
                        setPosts(data.posts.map((p: Record<string, unknown>) => ({
                            id: String(p.id),
                            projectName: String(p.project_name || p.projectName || 'Projeto'),
                            platforms: Array.isArray(p.platforms) ? p.platforms.map(String) : [],
                            scheduledAt: new Date(String(p.scheduled_at || p.scheduledAt)),
                            status: String(p.status || 'draft') as ScheduledPost['status'],
                            caption: p.caption ? String(p.caption) : undefined,
                            thumbnail: p.thumbnail ? String(p.thumbnail) : undefined,
                        })))
                    }
                }
            } catch (error) {
                // If API doesn't exist yet, start with empty state
                console.debug('Scheduling API not available yet')
            } finally {
                setLoading(false)
            }
        }
        fetchScheduledPosts()
    }, [])

    const [showScheduleForm, setShowScheduleForm] = useState(false)

    const getPlatformIcon = (platform: string) => {
        switch (platform) {
            case 'youtube': return <Youtube className="w-4 h-4 text-red-500" />
            case 'instagram': return <Instagram className="w-4 h-4 text-pink-500" />
            case 'twitter': return <Twitter className="w-4 h-4 text-blue-400" />
            case 'tiktok': return <span>📱</span>
            case 'spotify': return <span>🎵</span>
            default: return <Video className="w-4 h-4" />
        }
    }

    const getStatusColor = (status: ScheduledPost['status']) => {
        switch (status) {
            case 'scheduled': return 'bg-blue-100 text-blue-800'
            case 'published': return 'bg-green-100 text-green-800'
            case 'failed': return 'bg-red-100 text-red-800'
            case 'draft': return 'bg-gray-100 text-gray-800'
        }
    }

    const getStatusIcon = (status: ScheduledPost['status']) => {
        switch (status) {
            case 'scheduled': return <Clock className="w-4 h-4" />
            case 'published': return <CheckCircle className="w-4 h-4" />
            case 'failed': return <XCircle className="w-4 h-4" />
            case 'draft': return <Edit className="w-4 h-4" />
        }
    }

    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date)
    }

    const handlePublishNow = (id: string) => {
        setPosts(prev => prev.map(p =>
            p.id === id ? { ...p, status: 'published' as const, scheduledAt: new Date() } : p
        ))
        toast.success('Publicado com sucesso!')
    }

    const handleDelete = (id: string) => {
        setPosts(prev => prev.filter(p => p.id !== id))
        toast.success('Agendamento removido')
    }

    const handleRetry = (id: string) => {
        setPosts(prev => prev.map(p =>
            p.id === id ? { ...p, status: 'scheduled' as const, scheduledAt: new Date(Date.now() + 60 * 60000) } : p
        ))
        toast.success('Reagendado para daqui 1 hora')
    }

    const stats = {
        total: posts.length,
        scheduled: posts.filter(p => p.status === 'scheduled').length,
        published: posts.filter(p => p.status === 'published').length,
        failed: posts.filter(p => p.status === 'failed').length
    }

    const upcomingPosts = posts.filter(p => p.status === 'scheduled').sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-6">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl">
                                <Calendar className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                                    Agendamento
                                </h1>
                                <p className="text-gray-600">Agende publicações em suas redes</p>
                            </div>
                        </div>
                        <Button
                            onClick={() => setShowScheduleForm(true)}
                            className="bg-gradient-to-r from-blue-500 to-indigo-600"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Agendar Publicação
                        </Button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                    <Card>
                        <CardContent className="p-6 text-center">
                            <div className="text-3xl font-bold text-blue-600 mb-1">{stats.total}</div>
                            <div className="text-sm text-gray-600">Total</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6 text-center">
                            <div className="text-3xl font-bold text-indigo-600 mb-1">{stats.scheduled}</div>
                            <div className="text.sm text-gray-600">Agendados</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6 text-center">
                            <div className="text-3xl font-bold text-green-600 mb-1">{stats.published}</div>
                            <div className="text-sm text-gray-600">Publicados</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6 text-center">
                            <div className="text-3xl font-bold text-red-600 mb-1">{stats.failed}</div>
                            <div className="text-sm text-gray-600">Falhas</div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Upcoming */}
                    <Card className="lg:col-span-1">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CalendarDays className="w-5 h-5" />
                                Próximos
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {upcomingPosts.slice(0, 5).map(post => (
                                    <div key={post.id} className="p-3 bg-gray-50 rounded-lg">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-xl">{post.thumbnail}</span>
                                            <span className="font-medium text-sm truncate">{post.projectName}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                            <Clock className="w-3 h-3" />
                                            {formatDate(post.scheduledAt)}
                                        </div>
                                        <div className="flex gap-1 mt-2">
                                            {post.platforms.map(p => (
                                                <span key={p}>{getPlatformIcon(p)}</span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                                {upcomingPosts.length === 0 && (
                                    <p className="text-gray-500 text-center py-4">Nenhum agendamento</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* All Posts */}
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle>Todas as Publicações</CardTitle>
                            <CardDescription>{posts.length} publicações</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[400px]">
                                <div className="space-y-4">
                                    {posts.map(post => (
                                        <Card key={post.id} className="border">
                                            <CardContent className="p-4">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-start gap-4">
                                                        <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center text-2xl">
                                                            {post.thumbnail}
                                                        </div>
                                                        <div>
                                                            <h3 className="font-semibold">{post.projectName}</h3>
                                                            {post.caption && (
                                                                <p className="text-sm text-gray-600 line-clamp-2">{post.caption}</p>
                                                            )}
                                                            <div className="flex items-center gap-3 mt-2">
                                                                <div className="flex gap-1">
                                                                    {post.platforms.map(p => (
                                                                        <span key={p}>{getPlatformIcon(p)}</span>
                                                                    ))}
                                                                </div>
                                                                <span className="text-xs text-gray-500">
                                                                    {formatDate(post.scheduledAt)}
                                                                </span>
                                                                <Badge className={getStatusColor(post.status)}>
                                                                    <span className="flex items-center gap-1">
                                                                        {getStatusIcon(post.status)}
                                                                        {post.status}
                                                                    </span>
                                                                </Badge>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex gap-2">
                                                        {post.status === 'scheduled' && (
                                                            <Button
                                                                size="sm"
                                                                onClick={() => handlePublishNow(post.id)}
                                                            >
                                                                <Send className="w-4 h-4 mr-1" />
                                                                Publicar
                                                            </Button>
                                                        )}
                                                        {post.status === 'failed' && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => handleRetry(post.id)}
                                                            >
                                                                Tentar Novamente
                                                            </Button>
                                                        )}
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="text-red-600 hover:bg-red-50"
                                                            onClick={() => handleDelete(post.id)}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>

                {/* Schedule Form Modal */}
                {showScheduleForm && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <Card className="w-full max-w-lg mx-4">
                            <CardHeader>
                                <CardTitle>Agendar Publicação</CardTitle>
                                <CardDescription>Configure quando e onde publicar</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium">Projeto</label>
                                    <select className="w-full mt-1 px-3 py-2 border rounded-md">
                                        <option>Tutorial React Hooks</option>
                                        <option>Dica Rápida CSS</option>
                                        <option>Novo Projeto</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Plataformas</label>
                                    <div className="flex gap-2 mt-1">
                                        {['youtube', 'instagram', 'twitter', 'tiktok'].map(p => (
                                            <Button key={p} variant="outline" size="sm">
                                                {getPlatformIcon(p)}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Data e Hora</label>
                                    <Input type="datetime-local" className="mt-1" />
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Legenda</label>
                                    <Textarea placeholder="Digite a legenda..." className="mt-1" />
                                </div>
                                <div className="flex gap-2 justify-end">
                                    <Button variant="outline" onClick={() => setShowScheduleForm(false)}>
                                        Cancelar
                                    </Button>
                                    <Button
                                        className="bg-gradient-to-r from-blue-500 to-indigo-600"
                                        onClick={() => {
                                            toast.success('Publicação agendada!')
                                            setShowScheduleForm(false)
                                        }}
                                    >
                                        Agendar
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    )
}
