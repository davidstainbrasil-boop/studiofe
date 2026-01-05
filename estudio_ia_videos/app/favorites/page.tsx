'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
    Star,
    Search,
    Video,
    FileText,
    Music,
    Image,
    FolderOpen,
    MoreVertical,
    Trash2,
    Play,
    Download,
    ExternalLink
} from 'lucide-react'
import { toast } from 'sonner'

interface FavoriteItem {
    id: string
    name: string
    type: 'project' | 'video' | 'audio' | 'image' | 'document' | 'template'
    thumbnail: string
    addedAt: Date
    lastAccessed?: Date
    size?: string
    duration?: string
}

export default function FavoritesPage() {
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedType, setSelectedType] = useState<'all' | FavoriteItem['type']>('all')

    const [favorites, setFavorites] = useState<FavoriteItem[]>([
        {
            id: '1',
            name: 'Tutorial React Hooks',
            type: 'project',
            thumbnail: '📁',
            addedAt: new Date(Date.now() - 2 * 24 * 60 * 60000),
            lastAccessed: new Date(Date.now() - 60 * 60000)
        },
        {
            id: '2',
            name: 'Intro Animation v2',
            type: 'video',
            thumbnail: '🎬',
            addedAt: new Date(Date.now() - 7 * 24 * 60 * 60000),
            duration: '0:15',
            size: '45 MB'
        },
        {
            id: '3',
            name: 'Background Music Pack',
            type: 'audio',
            thumbnail: '🎵',
            addedAt: new Date(Date.now() - 14 * 24 * 60 * 60000),
            duration: '3:45',
            size: '8 MB'
        },
        {
            id: '4',
            name: 'Logo Principal',
            type: 'image',
            thumbnail: '🖼️',
            addedAt: new Date(Date.now() - 30 * 24 * 60 * 60000),
            size: '2 MB'
        },
        {
            id: '5',
            name: 'Template Marketing Pro',
            type: 'template',
            thumbnail: '📋',
            addedAt: new Date(Date.now() - 5 * 24 * 60 * 60000)
        },
        {
            id: '6',
            name: 'Roteiro Podcast',
            type: 'document',
            thumbnail: '📄',
            addedAt: new Date(Date.now() - 3 * 24 * 60 * 60000),
            size: '500 KB'
        }
    ])

    const getTypeIcon = (type: FavoriteItem['type']) => {
        switch (type) {
            case 'project': return <FolderOpen className="w-5 h-5 text-blue-500" />
            case 'video': return <Video className="w-5 h-5 text-purple-500" />
            case 'audio': return <Music className="w-5 h-5 text-green-500" />
            case 'image': return <Image className="w-5 h-5 text-pink-500" />
            case 'document': return <FileText className="w-5 h-5 text-orange-500" />
            case 'template': return <Star className="w-5 h-5 text-yellow-500" />
        }
    }

    const getTypeColor = (type: FavoriteItem['type']) => {
        switch (type) {
            case 'project': return 'bg-blue-100 text-blue-800'
            case 'video': return 'bg-purple-100 text-purple-800'
            case 'audio': return 'bg-green-100 text-green-800'
            case 'image': return 'bg-pink-100 text-pink-800'
            case 'document': return 'bg-orange-100 text-orange-800'
            case 'template': return 'bg-yellow-100 text-yellow-800'
        }
    }

    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit',
            month: 'short'
        }).format(date)
    }

    const removeFavorite = (id: string) => {
        setFavorites(prev => prev.filter(f => f.id !== id))
        toast.success('Removido dos favoritos')
    }

    const filteredFavorites = favorites.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesType = selectedType === 'all' || item.type === selectedType
        return matchesSearch && matchesType
    })

    const types = [
        { value: 'all', label: 'Todos' },
        { value: 'project', label: 'Projetos' },
        { value: 'video', label: 'Vídeos' },
        { value: 'audio', label: 'Áudios' },
        { value: 'image', label: 'Imagens' },
        { value: 'template', label: 'Templates' }
    ]

    return (
        <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-amber-50 p-6">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-r from-yellow-500 to-amber-600 rounded-xl">
                            <Star className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-600 to-amber-600 bg-clip-text text-transparent">
                                Favoritos
                            </h1>
                            <p className="text-gray-600">Seus itens marcados como favorito</p>
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
                    {types.map(type => (
                        <Card
                            key={type.value}
                            className={`cursor-pointer transition-all ${selectedType === type.value ? 'ring-2 ring-yellow-500' : ''}`}
                            onClick={() => setSelectedType(type.value as any)}
                        >
                            <CardContent className="p-4 text-center">
                                <div className="text-2xl font-bold text-gray-700">
                                    {type.value === 'all'
                                        ? favorites.length
                                        : favorites.filter(f => f.type === type.value).length
                                    }
                                </div>
                                <div className="text-xs text-gray-500">{type.label}</div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Search */}
                <Card className="mb-6">
                    <CardContent className="p-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder="Buscar favoritos..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Favorites Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredFavorites.map(item => (
                        <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow group">
                            <div className="h-32 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center relative">
                                <span className="text-5xl">{item.thumbnail}</span>

                                {/* Hover Actions */}
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                    <Button size="sm" variant="secondary">
                                        <Play className="w-4 h-4" />
                                    </Button>
                                    <Button size="sm" variant="secondary">
                                        <ExternalLink className="w-4 h-4" />
                                    </Button>
                                </div>

                                {/* Star indicator */}
                                <Star className="absolute top-2 right-2 w-5 h-5 text-yellow-500 fill-yellow-500" />
                            </div>

                            <CardContent className="p-4">
                                <div className="flex items-start justify-between mb-2">
                                    <div>
                                        <h3 className="font-semibold truncate">{item.name}</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Badge className={getTypeColor(item.type)} variant="secondary">
                                                {item.type}
                                            </Badge>
                                            {item.size && (
                                                <span className="text-xs text-gray-500">{item.size}</span>
                                            )}
                                            {item.duration && (
                                                <span className="text-xs text-gray-500">{item.duration}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between text-xs text-gray-500">
                                    <span>Adicionado {formatDate(item.addedAt)}</span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                                        onClick={() => removeFavorite(item.id)}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {filteredFavorites.length === 0 && (
                    <Card>
                        <CardContent className="p-12 text-center">
                            <Star className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-gray-700 mb-2">
                                Nenhum favorito encontrado
                            </h3>
                            <p className="text-gray-500">
                                Marque itens como favorito para acessá-los rapidamente
                            </p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}
