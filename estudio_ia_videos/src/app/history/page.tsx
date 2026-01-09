'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card'
import { Button } from '@components/ui/button'
import { Badge } from '@components/ui/badge'
import { Input } from '@components/ui/input'
import { ScrollArea } from '@components/ui/scroll-area'
import {
    History,
    Video,
    FileText,
    TrendingUp,
    Scissors,
    Mic,
    Download,
    Search,
    Filter,
    Calendar,
    CheckCircle,
    XCircle,
    Clock
} from 'lucide-react'

interface ProcessingRecord {
    id: string
    type: 'subtitle' | 'enhance' | 'scene' | 'voice'
    videoName: string
    status: 'completed' | 'failed' | 'processing'
    startedAt: Date
    completedAt?: Date
    duration?: number
    outputUrl?: string
    error?: string
}

export default function ProcessingHistoryPage() {
    const [searchQuery, setSearchQuery] = useState('')
    const [filterType, setFilterType] = useState<'all' | ProcessingRecord['type']>('all')
    const [filterStatus, setFilterStatus] = useState<'all' | ProcessingRecord['status']>('all')

    const [records] = useState<ProcessingRecord[]>([
        {
            id: '1',
            type: 'subtitle',
            videoName: 'Tutorial_React_2024.mp4',
            status: 'completed',
            startedAt: new Date(Date.now() - 2 * 60 * 60000),
            completedAt: new Date(Date.now() - 2 * 60 * 60000 + 5 * 60000),
            duration: 5,
            outputUrl: '#'
        },
        {
            id: '2',
            type: 'enhance',
            videoName: 'Video_Marketing.mp4',
            status: 'completed',
            startedAt: new Date(Date.now() - 5 * 60 * 60000),
            completedAt: new Date(Date.now() - 5 * 60 * 60000 + 15 * 60000),
            duration: 15,
            outputUrl: '#'
        },
        {
            id: '3',
            type: 'scene',
            videoName: 'Aula_Completa.mp4',
            status: 'processing',
            startedAt: new Date(Date.now() - 10 * 60000)
        },
        {
            id: '4',
            type: 'voice',
            videoName: 'Podcast_Episode_01.mp4',
            status: 'failed',
            startedAt: new Date(Date.now() - 24 * 60 * 60000),
            error: 'Arquivo muito grande'
        }
    ])

    const getTypeIcon = (type: ProcessingRecord['type']) => {
        switch (type) {
            case 'subtitle': return <FileText className="w-4 h-4" />
            case 'enhance': return <TrendingUp className="w-4 h-4" />
            case 'scene': return <Scissors className="w-4 h-4" />
            case 'voice': return <Mic className="w-4 h-4" />
        }
    }

    const getTypeColor = (type: ProcessingRecord['type']) => {
        switch (type) {
            case 'subtitle': return 'bg-green-100 text-green-800'
            case 'enhance': return 'bg-blue-100 text-blue-800'
            case 'scene': return 'bg-purple-100 text-purple-800'
            case 'voice': return 'bg-orange-100 text-orange-800'
        }
    }

    const getStatusIcon = (status: ProcessingRecord['status']) => {
        switch (status) {
            case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />
            case 'failed': return <XCircle className="w-4 h-4 text-red-500" />
            case 'processing': return <Clock className="w-4 h-4 text-blue-500 animate-spin" />
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

    const filteredRecords = records.filter(record => {
        const matchesSearch = record.videoName.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesType = filterType === 'all' || record.type === filterType
        const matchesStatus = filterStatus === 'all' || record.status === filterStatus
        return matchesSearch && matchesType && matchesStatus
    })

    const stats = {
        total: records.length,
        completed: records.filter(r => r.status === 'completed').length,
        processing: records.filter(r => r.status === 'processing').length,
        failed: records.filter(r => r.status === 'failed').length
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-gradient-to-r from-slate-600 to-gray-700 rounded-xl">
                            <History className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-600 to-gray-700 bg-clip-text text-transparent">
                                Histórico de Processamento
                            </h1>
                            <p className="text-gray-600">Acompanhe todos os vídeos processados</p>
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                    <Card>
                        <CardContent className="p-6 text-center">
                            <div className="text-3xl font-bold text-slate-600 mb-1">{stats.total}</div>
                            <div className="text-sm text-gray-600">Total Processados</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6 text-center">
                            <div className="text-3xl font-bold text-green-600 mb-1">{stats.completed}</div>
                            <div className="text-sm text-gray-600">Completos</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6 text-center">
                            <div className="text-3xl font-bold text-blue-600 mb-1">{stats.processing}</div>
                            <div className="text-sm text-gray-600">Em Processamento</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6 text-center">
                            <div className="text-3xl font-bold text-red-600 mb-1">{stats.failed}</div>
                            <div className="text-sm text-gray-600">Falhas</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters */}
                <Card className="mb-6">
                    <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <Input
                                        placeholder="Buscar por nome do vídeo..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <select
                                    value={filterType}
                                    onChange={(e) => setFilterType(e.target.value as any)}
                                    className="px-3 py-2 border rounded-md"
                                >
                                    <option value="all">Todos os tipos</option>
                                    <option value="subtitle">Legendas</option>
                                    <option value="enhance">Enhancement</option>
                                    <option value="scene">Cenas</option>
                                    <option value="voice">Voz</option>
                                </select>
                                <select
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value as any)}
                                    className="px-3 py-2 border rounded-md"
                                >
                                    <option value="all">Todos os status</option>
                                    <option value="completed">Completos</option>
                                    <option value="processing">Processando</option>
                                    <option value="failed">Falhas</option>
                                </select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Records List */}
                <Card>
                    <CardHeader>
                        <CardTitle>Registros de Processamento</CardTitle>
                        <CardDescription>{filteredRecords.length} registros encontrados</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[500px]">
                            <div className="space-y-4">
                                {filteredRecords.map(record => (
                                    <Card key={record.id} className="border">
                                        <CardContent className="p-6">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-start gap-4 flex-1">
                                                    <div className="p-3 bg-gray-100 rounded-lg">
                                                        <Video className="w-6 h-6 text-gray-600" />
                                                    </div>

                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <h3 className="font-semibold text-lg">{record.videoName}</h3>
                                                            <Badge className={getTypeColor(record.type)}>
                                                                <span className="flex items-center gap-1">
                                                                    {getTypeIcon(record.type)}
                                                                    {record.type}
                                                                </span>
                                                            </Badge>
                                                        </div>

                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                                                            <div>
                                                                <div className="text-xs text-gray-500">Iniciado</div>
                                                                <div className="font-medium">{formatDate(record.startedAt)}</div>
                                                            </div>
                                                            {record.completedAt && (
                                                                <div>
                                                                    <div className="text-xs text-gray-500">Concluído</div>
                                                                    <div className="font-medium">{formatDate(record.completedAt)}</div>
                                                                </div>
                                                            )}
                                                            {record.duration && (
                                                                <div>
                                                                    <div className="text-xs text-gray-500">Duração</div>
                                                                    <div className="font-medium">{record.duration}min</div>
                                                                </div>
                                                            )}
                                                            <div>
                                                                <div className="text-xs text-gray-500">Status</div>
                                                                <div className="flex items-center gap-1 font-medium">
                                                                    {getStatusIcon(record.status)}
                                                                    {record.status}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {record.error && (
                                                            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                                                                Erro: {record.error}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {record.status === 'completed' && record.outputUrl && (
                                                    <Button size="sm" className="ml-4">
                                                        <Download className="w-4 h-4 mr-2" />
                                                        Download
                                                    </Button>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}

                                {filteredRecords.length === 0 && (
                                    <div className="text-center py-12 text-gray-500">
                                        Nenhum registro encontrado com os filtros aplicados.
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
