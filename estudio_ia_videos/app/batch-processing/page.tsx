'use client'

import React, { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    Layers,
    Upload,
    FileVideo,
    CheckCircle,
    XCircle,
    Clock,
    Zap,
    Download,
    Trash2,
    RefreshCw
} from 'lucide-react'
import { toast } from 'sonner'
import { useDropzone } from 'react-dropzone'

interface BatchJob {
    id: string
    filename: string
    size: number
    status: 'pending' | 'processing' | 'completed' | 'failed'
    progress: number
    result?: any
    error?: string
}

export default function BatchProcessingPage() {
    const [jobs, setJobs] = useState<BatchJob[]>([])
    const [processingType, setProcessingType] = useState<'subtitle' | 'enhance' | 'scene'>('subtitle')
    const [isProcessing, setIsProcessing] = useState(false)

    const onDrop = useCallback((acceptedFiles: File[]) => {
        const newJobs: BatchJob[] = acceptedFiles.map(file => ({
            id: `${Date.now()}-${Math.random()}`,
            filename: file.name,
            size: file.size,
            status: 'pending',
            progress: 0
        }))

        setJobs(prev => [...prev, ...newJobs])
        toast.success(`${acceptedFiles.length} arquivo(s) adicionado(s)`)
    }, [])

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'video/*': ['.mp4', '.mov', '.avi', '.webm']
        }
    })

    const processAllJobs = async () => {
        setIsProcessing(true)

        for (const job of jobs.filter(j => j.status === 'pending')) {
            try {
                // Update status to processing
                setJobs(prev => prev.map(j =>
                    j.id === job.id ? { ...j, status: 'processing' as const } : j
                ))

                // Simulate processing with progress updates
                for (let i = 0; i <= 100; i += 10) {
                    await new Promise(resolve => setTimeout(resolve, 200))
                    setJobs(prev => prev.map(j =>
                        j.id === job.id ? { ...j, progress: i } : j
                    ))
                }

                // Mark as completed
                setJobs(prev => prev.map(j =>
                    j.id === job.id ? {
                        ...j,
                        status: 'completed' as const,
                        progress: 100,
                        result: { outputUrl: '#' }
                    } : j
                ))

                toast.success(`${job.filename} processado com sucesso!`)
            } catch (error) {
                setJobs(prev => prev.map(j =>
                    j.id === job.id ? {
                        ...j,
                        status: 'failed' as const,
                        error: 'Erro no processamento'
                    } : j
                ))
                toast.error(`Erro ao processar ${job.filename}`)
            }
        }

        setIsProcessing(false)
        toast.success('Processamento em lote concluído!')
    }

    const removeJob = (id: string) => {
        setJobs(prev => prev.filter(j => j.id !== id))
    }

    const clearCompleted = () => {
        setJobs(prev => prev.filter(j => j.status !== 'completed'))
    }

    const stats = {
        total: jobs.length,
        pending: jobs.filter(j => j.status === 'pending').length,
        processing: jobs.filter(j => j.status === 'processing').length,
        completed: jobs.filter(j => j.status === 'completed').length,
        failed: jobs.filter(j => j.status === 'failed').length
    }

    const getStatusIcon = (status: BatchJob['status']) => {
        switch (status) {
            case 'pending': return <Clock className="w-4 h-4 text-gray-500" />
            case 'processing': return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
            case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />
            case 'failed': return <XCircle className="w-4 h-4 text-red-500" />
        }
    }

    const getStatusColor = (status: BatchJob['status']) => {
        switch (status) {
            case 'pending': return 'bg-gray-100 text-gray-800'
            case 'processing': return 'bg-blue-100 text-blue-800'
            case 'completed': return 'bg-green-100 text-green-800'
            case 'failed': return 'bg-red-100 text-red-800'
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl">
                            <Layers className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                Processamento em Lote
                            </h1>
                            <p className="text-gray-600">Processe múltiplos vídeos simultaneamente</p>
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                    <Card>
                        <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                            <div className="text-sm text-gray-600">Total</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold text-gray-600">{stats.pending}</div>
                            <div className="text-sm text-gray-600">Pendentes</div>
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

                {/* Processing Type */}
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle>Tipo de Processamento</CardTitle>
                        <CardDescription>Selecione o que deseja fazer com os vídeos</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Tabs value={processingType} onValueChange={(v: any) => setProcessingType(v)}>
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="subtitle">Gerar Legendas</TabsTrigger>
                                <TabsTrigger value="enhance">Melhorar Qualidade</TabsTrigger>
                                <TabsTrigger value="scene">Detectar Cenas</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </CardContent>
                </Card>

                {/* Upload Area */}
                <Card className="mb-6">
                    <CardContent className="p-6">
                        <div
                            {...getRootProps()}
                            className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'
                                }`}
                        >
                            <input {...getInputProps()} />
                            <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold mb-2">
                                {isDragActive ? 'Solte os vídeos aqui' : 'Arraste vídeos ou clique para selecionar'}
                            </h3>
                            <p className="text-gray-600">Suporte para múltiplos arquivos • MP4, MOV, AVI, WebM</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Jobs List */}
                {jobs.length > 0 && (
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Fila de Processamento</CardTitle>
                                    <CardDescription>{jobs.length} vídeos na fila</CardDescription>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        onClick={clearCompleted}
                                        variant="outline"
                                        size="sm"
                                        disabled={stats.completed === 0}
                                    >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Limpar Completos
                                    </Button>
                                    <Button
                                        onClick={processAllJobs}
                                        disabled={isProcessing || stats.pending === 0}
                                        className="bg-gradient-to-r from-blue-500 to-purple-600"
                                        size="sm"
                                    >
                                        <Zap className="w-4 h-4 mr-2" />
                                        Processar Todos
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {jobs.map(job => (
                                    <Card key={job.id} className="border">
                                        <CardContent className="p-4">
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-3 flex-1">
                                                    <FileVideo className="w-5 h-5 text-gray-500" />
                                                    <div className="flex-1">
                                                        <div className="font-medium">{job.filename}</div>
                                                        <div className="text-xs text-gray-500">
                                                            {(job.size / (1024 * 1024)).toFixed(2)} MB
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <Badge className={getStatusColor(job.status)}>
                                                        <span className="flex items-center gap-1">
                                                            {getStatusIcon(job.status)}
                                                            {job.status}
                                                        </span>
                                                    </Badge>
                                                    {job.status === 'completed' && (
                                                        <Button size="sm" variant="outline">
                                                            <Download className="w-4 h-4" />
                                                        </Button>
                                                    )}
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => removeJob(job.id)}
                                                        disabled={job.status === 'processing'}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>

                                            {job.status === 'processing' && (
                                                <Progress value={job.progress} className="h-2" />
                                            )}

                                            {job.error && (
                                                <div className="mt-2 text-sm text-red-600">{job.error}</div>
                                            )}
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}
