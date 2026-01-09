'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card'
import { Button } from '@components/ui/button'
import { Badge } from '@components/ui/badge'
import { Input } from '@components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@components/ui/tabs'
import { ScrollArea } from '@components/ui/scroll-area'
import {
    FolderOpen,
    Upload,
    Search,
    Grid,
    List,
    Video,
    Image,
    Music,
    FileText,
    MoreVertical,
    Download,
    Trash2,
    Copy,
    Star,
    Filter,
    Plus
} from 'lucide-react'
import { toast } from 'sonner'

interface MediaItem {
    id: string
    name: string
    type: 'video' | 'image' | 'audio' | 'document'
    size: string
    thumbnail?: string
    duration?: string
    uploadedAt: Date
    favorite: boolean
    usedIn: number
}

export default function MediaLibraryPage() {
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedType, setSelectedType] = useState<'all' | MediaItem['type']>('all')

    const [mediaItems, setMediaItems] = useState<MediaItem[]>([
        {
            id: '1',
            name: 'intro_animacao.mp4',
            type: 'video',
            size: '45 MB',
            thumbnail: '🎬',
            duration: '0:15',
            uploadedAt: new Date(Date.now() - 7 * 24 * 60 * 60000),
            favorite: true,
            usedIn: 12
        },
        {
            id: '2',
            name: 'background_music.mp3',
            type: 'audio',
            size: '8 MB',
            thumbnail: '🎵',
            duration: '3:45',
            uploadedAt: new Date(Date.now() - 14 * 24 * 60 * 60000),
            favorite: true,
            usedIn: 8
        },
        {
            id: '3',
            name: 'logo_empresa.png',
            type: 'image',
            size: '2 MB',
            thumbnail: '🖼️',
            uploadedAt: new Date(Date.now() - 30 * 24 * 60 * 60000),
            favorite: false,
            usedIn: 24
        },
        {
            id: '4',
            name: 'roteiro_tutorial.pdf',
            type: 'document',
            size: '1 MB',
            thumbnail: '📄',
            uploadedAt: new Date(Date.now() - 2 * 24 * 60 * 60000),
            favorite: false,
            usedIn: 1
        },
        {
            id: '5',
            name: 'cena_produto.mp4',
            type: 'video',
            size: '120 MB',
            thumbnail: '🎥',
            duration: '0:45',
            uploadedAt: new Date(Date.now() - 5 * 24 * 60 * 60000),
            favorite: false,
            usedIn: 5
        }
    ])

    const getTypeIcon = (type: MediaItem['type']) => {
        switch (type) {
            case 'video': return <Video className="w-5 h-5 text-blue-500" />
            case 'image': return <Image className="w-5 h-5 text-green-500" />
            case 'audio': return <Music className="w-5 h-5 text-purple-500" />
            case 'document': return <FileText className="w-5 h-5 text-orange-500" />
        }
    }

    const getTypeColor = (type: MediaItem['type']) => {
        switch (type) {
            case 'video': return 'bg-blue-100 text-blue-800'
            case 'image': return 'bg-green-100 text-green-800'
            case 'audio': return 'bg-purple-100 text-purple-800'
            case 'document': return 'bg-orange-100 text-orange-800'
        }
    }

    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit',
            month: 'short'
        }).format(date)
    }

    const toggleFavorite = (id: string) => {
        setMediaItems(prev => prev.map(item =>
            item.id === id ? { ...item, favorite: !item.favorite } : item
        ))
        toast.success('Favorito atualizado')
    }

    const deleteItem = (id: string) => {
        setMediaItems(prev => prev.filter(item => item.id !== id))
        toast.success('Arquivo removido')
    }

    const filteredItems = mediaItems.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesType = selectedType === 'all' || item.type === selectedType
        return matchesSearch && matchesType
    })

    const stats = {
        total: mediaItems.length,
        videos: mediaItems.filter(i => i.type === 'video').length,
        images: mediaItems.filter(i => i.type === 'image').length,
        audio: mediaItems.filter(i => i.type === 'audio').length,
        documents: mediaItems.filter(i => i.type === 'document').length
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-blue-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl">
                                <FolderOpen className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
                                    Biblioteca de Mídia
                                </h1>
                                <p className="text-gray-600">Gerencie todos os seus arquivos</p>
                            </div>
                        </div>
                        <Button className="bg-gradient-to-r from-cyan-500 to-blue-600">
                            <Upload className="w-4 h-4 mr-2" />
                            Upload
                        </Button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                    <Card>
                        <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold text-cyan-600">{stats.total}</div>
                            <div className="text-sm text-gray-600">Total</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold text-blue-600">{stats.videos}</div>
                            <div className="text-sm text-gray-600">Vídeos</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold text-green-600">{stats.images}</div>
                            <div className="text-sm text-gray-600">Imagens</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold text-purple-600">{stats.audio}</div>
                            <div className="text-sm text-gray-600">Áudios</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold text-orange-600">{stats.documents}</div>
                            <div className="text-sm text-gray-600">Documentos</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters */}
                <Card className="mb-6">
                    <CardContent className="p-4">
                        <div className="flex flex-col md:flex-row gap-4 items-center">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input
                                    placeholder="Buscar arquivos..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant={selectedType === 'all' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setSelectedType('all')}
                                >
                                    Todos
                                </Button>
                                <Button
                                    variant={selectedType === 'video' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setSelectedType('video')}
                                >
                                    <Video className="w-4 h-4 mr-1" />
                                    Vídeos
                                </Button>
                                <Button
                                    variant={selectedType === 'image' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setSelectedType('image')}
                                >
                                    <Image className="w-4 h-4 mr-1" />
                                    Imagens
                                </Button>
                                <Button
                                    variant={selectedType === 'audio' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setSelectedType('audio')}
                                >
                                    <Music className="w-4 h-4 mr-1" />
                                    Áudios
                                </Button>
                            </div>
                            <div className="flex gap-1 border rounded-md p-1">
                                <Button
                                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                                    size="sm"
                                    onClick={() => setViewMode('grid')}
                                >
                                    <Grid className="w-4 h-4" />
                                </Button>
                                <Button
                                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                                    size="sm"
                                    onClick={() => setViewMode('list')}
                                >
                                    <List className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Media Grid/List */}
                <Card>
                    <CardHeader>
                        <CardTitle>Seus Arquivos</CardTitle>
                        <CardDescription>{filteredItems.length} arquivos</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {viewMode === 'grid' ? (
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                {filteredItems.map(item => (
                                    <Card
                                        key={item.id}
                                        className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
                                    >
                                        <div className="h-32 bg-gray-100 flex items-center justify-center relative">
                                            <span className="text-4xl">{item.thumbnail}</span>
                                            {item.favorite && (
                                                <Star className="absolute top-2 right-2 w-4 h-4 text-yellow-500 fill-yellow-500" />
                                            )}
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                <Button size="sm" variant="secondary">
                                                    <Download className="w-4 h-4" />
                                                </Button>
                                                <Button size="sm" variant="secondary" onClick={() => toggleFavorite(item.id)}>
                                                    <Star className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                        <CardContent className="p-3">
                                            <div className="truncate text-sm font-medium mb-1">{item.name}</div>
                                            <div className="flex items-center justify-between text-xs text-gray-500">
                                                <span>{item.size}</span>
                                                <Badge className={`text-xs ${getTypeColor(item.type)}`}>
                                                    {item.type}
                                                </Badge>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <ScrollArea className="h-[500px]">
                                <div className="space-y-2">
                                    {filteredItems.map(item => (
                                        <div
                                            key={item.id}
                                            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                                                    <span className="text-2xl">{item.thumbnail}</span>
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium">{item.name}</span>
                                                        {item.favorite && (
                                                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-3 text-sm text-gray-500">
                                                        <Badge className={getTypeColor(item.type)}>
                                                            {item.type}
                                                        </Badge>
                                                        <span>{item.size}</span>
                                                        {item.duration && <span>{item.duration}</span>}
                                                        <span>{formatDate(item.uploadedAt)}</span>
                                                        <span>Usado em {item.usedIn} projetos</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button variant="outline" size="sm">
                                                    <Download className="w-4 h-4" />
                                                </Button>
                                                <Button variant="outline" size="sm" onClick={() => toggleFavorite(item.id)}>
                                                    <Star className={`w-4 h-4 ${item.favorite ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="text-red-600 hover:bg-red-50"
                                                    onClick={() => deleteItem(item.id)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        )}

                        {filteredItems.length === 0 && (
                            <div className="text-center py-12 text-gray-500">
                                <FolderOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                                <p>Nenhum arquivo encontrado</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
