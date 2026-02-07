'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card'
import { Button } from '@components/ui/button'
import { Badge } from '@components/ui/badge'
import { Progress } from '@components/ui/progress'
import { ScrollArea } from '@components/ui/scroll-area'
import {
    Download,
    FileVideo,
    Clock,
    CheckCircle,
    XCircle,
    Pause,
    Play,
    Trash2,
    RefreshCw,
    Settings,
    HardDrive
} from 'lucide-react'
import { toast } from 'sonner'

interface ExportJob {
    id: string
    projectName: string
    format: string
    resolution: string
    size?: string
    status: 'queued' | 'processing' | 'completed' | 'failed' | 'paused'
    progress: number
    startedAt?: Date
    completedAt?: Date
    downloadUrl?: string
    error?: string
}

export default function ExportQueuePage() {
    const [jobs, setJobs] = useState<ExportJob[]>([])
    const [loading, setLoading] = useState(true)

    // Fetch real export/render jobs from API
    React.useEffect(() => {
        async function fetchJobs() {
            try {
                const response = await fetch('/api/render/jobs')
                if (response.ok) {
                    const data = await response.json()
                    const renderJobs = (data.jobs || data.data || []).map((job: Record<string, unknown>) => ({
                        id: String(job.id || job.job_id),
                        projectName: String(job.project_name || job.projectName || 'Projeto'),
                        format: String(job.format || 'MP4'),
                        resolution: String(job.resolution || '1080p'),
                        size: job.file_size ? `${Math.round(Number(job.file_size) / (1024 * 1024))} MB` : undefined,
                        status: mapRenderStatus(String(job.status)),
                        progress: Number(job.progress || 0),
                        startedAt: job.started_at ? new Date(String(job.started_at)) : undefined,
                        completedAt: job.completed_at ? new Date(String(job.completed_at)) : undefined,
                        downloadUrl: job.output_url ? String(job.output_url) : undefined,
                        error: job.error ? String(job.error) : undefined,
                    }))
                    setJobs(renderJobs)
                }
            } catch (error) {
                console.error('Failed to fetch export jobs:', error)
            } finally {
                setLoading(false)
            }
        }
        fetchJobs()
        // Poll every 5 seconds for active jobs
        const interval = setInterval(fetchJobs, 5000)
        return () => clearInterval(interval)
    }, [])

    function mapRenderStatus(status: string): ExportJob['status'] {
        switch (status) {
            case 'completed': return 'completed'
            case 'failed': case 'error': return 'failed'
            case 'processing': case 'rendering': return 'processing'
            case 'paused': return 'paused'
            default: return 'queued'
        }
    }

    const getStatusIcon = (status: ExportJob['status']) => {
        switch (status) {
            case 'queued': return <Clock className="w-4 h-4 text-gray-500" />
            case 'processing': return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
            case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />
            case 'failed': return <XCircle className="w-4 h-4 text-red-500" />
            case 'paused': return <Pause className="w-4 h-4 text-yellow-500" />
        }
    }

    const getStatusColor = (status: ExportJob['status']) => {
        switch (status) {
            case 'queued': return 'bg-gray-100 text-gray-800'
            case 'processing': return 'bg-blue-100 text-blue-800'
            case 'completed': return 'bg-green-100 text-green-800'
            case 'failed': return 'bg-red-100 text-red-800'
            case 'paused': return 'bg-yellow-100 text-yellow-800'
        }
    }

    const handlePause = (id: string) => {
        setJobs(prev => prev.map(j =>
            j.id === id ? { ...j, status: j.status === 'paused' ? 'processing' as const : 'paused' as const } : j
        ))
        toast.success('Status atualizado')
    }

    const handleRetry = (id: string) => {
        setJobs(prev => prev.map(j =>
            j.id === id ? { ...j, status: 'queued' as const, progress: 0, error: undefined } : j
        ))
        toast.success('Export adicionado à fila novamente')
    }

    const handleCancel = (id: string) => {
        setJobs(prev => prev.filter(j => j.id !== id))
        toast.success('Export cancelado')
    }

    const formatDuration = (start: Date, end?: Date) => {
        const endTime = end || new Date()
        const diff = endTime.getTime() - start.getTime()
        const minutes = Math.floor(diff / 60000)
        const seconds = Math.floor((diff % 60000) / 1000)
        return `${minutes}m ${seconds}s`
    }

    const stats = {
        total: jobs.length,
        processing: jobs.filter(j => j.status === 'processing').length,
        queued: jobs.filter(j => j.status === 'queued').length,
        completed: jobs.filter(j => j.status === 'completed').length,
        failed: jobs.filter(j => j.status === 'failed').length
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 p-6">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl">
                                <Download className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                                    Fila de Export
                                </h1>
                                <p className="text-gray-600">Gerencie seus exports em andamento</p>
                            </div>
                        </div>
                        <Button variant="outline">
                            <Settings className="w-4 h-4 mr-2" />
                            Configurações de Export
                        </Button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                    <Card>
                        <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold text-orange-600">{stats.total}</div>
                            <div className="text-sm text-gray-600">Total</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold text-blue-600">{stats.processing}</div>
                            <div className="text-sm text-gray-600">Processando</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold text-gray-600">{stats.queued}</div>
                            <div className="text-sm text-gray-600">Na Fila</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
                            <div className="text-sm text-gray-600">Completos</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
                            <div className="text-sm text-gray-600">Falhas</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Export Queue */}
                <Card>
                    <CardHeader>
                        <CardTitle>Exports na Fila</CardTitle>
                        <CardDescription>{jobs.length} exports</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[500px]">
                            <div className="space-y-4">
                                {jobs.map(job => (
                                    <Card key={job.id} className="border">
                                        <CardContent className="p-6">
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-3 bg-gray-100 rounded-lg">
                                                        <FileVideo className="w-6 h-6 text-gray-600" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-semibold text-lg">{job.projectName}</h3>
                                                        <div className="flex items-center gap-2 text-sm text-gray-500">
                                                            <span>{job.format}</span>
                                                            <span>•</span>
                                                            <span>{job.resolution}</span>
                                                            {job.size && (
                                                                <>
                                                                    <span>•</span>
                                                                    <span className="flex items-center gap-1">
                                                                        <HardDrive className="w-3 h-3" />
                                                                        {job.size}
                                                                    </span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <Badge className={getStatusColor(job.status)}>
                                                    <span className="flex items-center gap-1">
                                                        {getStatusIcon(job.status)}
                                                        {job.status}
                                                    </span>
                                                </Badge>
                                            </div>

                                            {/* Progress Bar */}
                                            {(job.status === 'processing' || job.status === 'paused') && (
                                                <div className="mb-4">
                                                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                                                        <span>Progresso</span>
                                                        <span>{job.progress}%</span>
                                                    </div>
                                                    <Progress value={job.progress} className="h-2" />
                                                </div>
                                            )}

                                            {/* Time Info */}
                                            {job.startedAt && (
                                                <div className="text-sm text-gray-500 mb-4">
                                                    {job.completedAt ? (
                                                        <span>Duração: {formatDuration(job.startedAt, job.completedAt)}</span>
                                                    ) : (
                                                        <span>Em execução: {formatDuration(job.startedAt)}</span>
                                                    )}
                                                </div>
                                            )}

                                            {/* Error Message */}
                                            {job.error && (
                                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 mb-4">
                                                    {job.error}
                                                </div>
                                            )}

                                            {/* Actions */}
                                            <div className="flex gap-2">
                                                {job.status === 'completed' && job.downloadUrl && (
                                                    <Button className="bg-green-600 hover:bg-green-700">
                                                        <Download className="w-4 h-4 mr-2" />
                                                        Download
                                                    </Button>
                                                )}

                                                {job.status === 'processing' && (
                                                    <Button variant="outline" onClick={() => handlePause(job.id)}>
                                                        <Pause className="w-4 h-4 mr-2" />
                                                        Pausar
                                                    </Button>
                                                )}

                                                {job.status === 'paused' && (
                                                    <Button variant="outline" onClick={() => handlePause(job.id)}>
                                                        <Play className="w-4 h-4 mr-2" />
                                                        Continuar
                                                    </Button>
                                                )}

                                                {job.status === 'failed' && (
                                                    <Button variant="outline" onClick={() => handleRetry(job.id)}>
                                                        <RefreshCw className="w-4 h-4 mr-2" />
                                                        Tentar Novamente
                                                    </Button>
                                                )}

                                                {job.status !== 'completed' && (
                                                    <Button
                                                        variant="outline"
                                                        className="text-red-600 hover:bg-red-50"
                                                        onClick={() => handleCancel(job.id)}
                                                    >
                                                        <Trash2 className="w-4 h-4 mr-2" />
                                                        Cancelar
                                                    </Button>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}

                                {jobs.length === 0 && (
                                    <div className="text-center py-12 text-gray-500">
                                        <Download className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                                        <p>Nenhum export na fila</p>
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
