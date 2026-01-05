'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import {
    Trash2,
    RotateCcw,
    AlertTriangle,
    Video,
    FileText,
    Music,
    Image,
    FolderOpen,
    Clock,
    Trash,
    CheckSquare
} from 'lucide-react'
import { toast } from 'sonner'

interface TrashItem {
    id: string
    name: string
    type: 'project' | 'video' | 'audio' | 'image' | 'document'
    thumbnail: string
    deletedAt: Date
    size: string
    expiresIn: number // days
}

export default function TrashPage() {
    const [items, setItems] = useState<TrashItem[]>([
        {
            id: '1',
            name: 'Projeto Antigo v1',
            type: 'project',
            thumbnail: '📁',
            deletedAt: new Date(Date.now() - 2 * 24 * 60 * 60000),
            size: '250 MB',
            expiresIn: 28
        },
        {
            id: '2',
            name: 'video_teste.mp4',
            type: 'video',
            thumbnail: '🎬',
            deletedAt: new Date(Date.now() - 5 * 24 * 60 * 60000),
            size: '120 MB',
            expiresIn: 25
        },
        {
            id: '3',
            name: 'musica_fundo_old.mp3',
            type: 'audio',
            thumbnail: '🎵',
            deletedAt: new Date(Date.now() - 15 * 24 * 60 * 60000),
            size: '8 MB',
            expiresIn: 15
        },
        {
            id: '4',
            name: 'thumbnail_descartada.jpg',
            type: 'image',
            thumbnail: '🖼️',
            deletedAt: new Date(Date.now() - 25 * 24 * 60 * 60000),
            size: '2 MB',
            expiresIn: 5
        }
    ])

    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())

    const getTypeIcon = (type: TrashItem['type']) => {
        switch (type) {
            case 'project': return <FolderOpen className="w-5 h-5 text-blue-500" />
            case 'video': return <Video className="w-5 h-5 text-purple-500" />
            case 'audio': return <Music className="w-5 h-5 text-green-500" />
            case 'image': return <Image className="w-5 h-5 text-pink-500" />
            case 'document': return <FileText className="w-5 h-5 text-orange-500" />
        }
    }

    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        }).format(date)
    }

    const toggleSelect = (id: string) => {
        const newSelected = new Set(selectedItems)
        if (newSelected.has(id)) {
            newSelected.delete(id)
        } else {
            newSelected.add(id)
        }
        setSelectedItems(newSelected)
    }

    const selectAll = () => {
        if (selectedItems.size === items.length) {
            setSelectedItems(new Set())
        } else {
            setSelectedItems(new Set(items.map(i => i.id)))
        }
    }

    const restoreItem = (id: string) => {
        setItems(prev => prev.filter(i => i.id !== id))
        setSelectedItems(prev => {
            const newSet = new Set(prev)
            newSet.delete(id)
            return newSet
        })
        toast.success('Item restaurado!')
    }

    const deleteItemPermanently = (id: string) => {
        setItems(prev => prev.filter(i => i.id !== id))
        setSelectedItems(prev => {
            const newSet = new Set(prev)
            newSet.delete(id)
            return newSet
        })
        toast.success('Item excluído permanentemente')
    }

    const restoreSelected = () => {
        setItems(prev => prev.filter(i => !selectedItems.has(i.id)))
        setSelectedItems(new Set())
        toast.success(`${selectedItems.size} itens restaurados!`)
    }

    const deleteSelected = () => {
        setItems(prev => prev.filter(i => !selectedItems.has(i.id)))
        setSelectedItems(new Set())
        toast.success(`${selectedItems.size} itens excluídos permanentemente`)
    }

    const emptyTrash = () => {
        setItems([])
        setSelectedItems(new Set())
        toast.success('Lixeira esvaziada!')
    }

    const totalSize = items.reduce((sum, item) => {
        const size = parseFloat(item.size)
        return sum + size
    }, 0)

    return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-gray-50 p-6">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-gradient-to-r from-red-500 to-gray-600 rounded-xl">
                                <Trash2 className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold bg-gradient-to-r from-red-600 to-gray-700 bg-clip-text text-transparent">
                                    Lixeira
                                </h1>
                                <p className="text-gray-600">Itens excluídos são removidos após 30 dias</p>
                            </div>
                        </div>
                        <Button
                            variant="destructive"
                            onClick={emptyTrash}
                            disabled={items.length === 0}
                        >
                            <Trash className="w-4 h-4 mr-2" />
                            Esvaziar Lixeira
                        </Button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <Card>
                        <CardContent className="p-6 text-center">
                            <div className="text-3xl font-bold text-red-600 mb-1">{items.length}</div>
                            <div className="text-sm text-gray-600">Itens na Lixeira</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6 text-center">
                            <div className="text-3xl font-bold text-gray-600 mb-1">{totalSize.toFixed(0)} MB</div>
                            <div className="text-sm text-gray-600">Espaço Ocupado</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6 text-center">
                            <div className="text-3xl font-bold text-orange-600 mb-1">
                                {items.filter(i => i.expiresIn <= 7).length}
                            </div>
                            <div className="text-sm text-gray-600">Expiram em 7 dias</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Bulk Actions */}
                {selectedItems.size > 0 && (
                    <Card className="mb-6 border-blue-200 bg-blue-50">
                        <CardContent className="p-4 flex items-center justify-between">
                            <span className="font-medium text-blue-800">
                                {selectedItems.size} item(s) selecionado(s)
                            </span>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={restoreSelected}>
                                    <RotateCcw className="w-4 h-4 mr-2" />
                                    Restaurar
                                </Button>
                                <Button variant="destructive" onClick={deleteSelected}>
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Excluir
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Items List */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Itens Excluídos</CardTitle>
                                <CardDescription>{items.length} itens</CardDescription>
                            </div>
                            <Button variant="outline" size="sm" onClick={selectAll}>
                                <CheckSquare className="w-4 h-4 mr-2" />
                                {selectedItems.size === items.length ? 'Desmarcar' : 'Selecionar'} Todos
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[400px]">
                            <div className="space-y-3">
                                {items.map(item => (
                                    <div
                                        key={item.id}
                                        className={`flex items-center gap-4 p-4 rounded-lg transition-colors ${selectedItems.has(item.id) ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 hover:bg-gray-100'
                                            }`}
                                    >
                                        <Checkbox
                                            checked={selectedItems.has(item.id)}
                                            onCheckedChange={() => toggleSelect(item.id)}
                                        />

                                        <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                                            <span className="text-2xl">{item.thumbnail}</span>
                                        </div>

                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                {getTypeIcon(item.type)}
                                                <span className="font-medium">{item.name}</span>
                                            </div>
                                            <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                                                <span>{item.size}</span>
                                                <span>•</span>
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    Excluído {formatDate(item.deletedAt)}
                                                </span>
                                                <span>•</span>
                                                <span className={item.expiresIn <= 7 ? 'text-red-500 font-medium' : ''}>
                                                    {item.expiresIn <= 7 && <AlertTriangle className="w-3 h-3 inline mr-1" />}
                                                    Expira em {item.expiresIn} dias
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => restoreItem(item.id)}
                                            >
                                                <RotateCcw className="w-4 h-4 mr-1" />
                                                Restaurar
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="text-red-600 hover:bg-red-50"
                                                onClick={() => deleteItemPermanently(item.id)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}

                                {items.length === 0 && (
                                    <div className="text-center py-12 text-gray-500">
                                        <Trash2 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                                        <h3 className="text-lg font-semibold mb-2">Lixeira Vazia</h3>
                                        <p>Nenhum item na lixeira</p>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>

                {/* Warning */}
                <Card className="mt-6 border-yellow-200 bg-yellow-50">
                    <CardContent className="p-4 flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-medium text-yellow-800">Atenção</p>
                            <p className="text-sm text-yellow-700">
                                Itens na lixeira são automaticamente excluídos permanentemente após 30 dias.
                                Esta ação não pode ser desfeita.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
