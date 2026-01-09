'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card'
import { Button } from '@components/ui/button'
import { Badge } from '@components/ui/badge'
import { Input } from '@components/ui/input'
import { Label } from '@components/ui/label'
import { Textarea } from '@components/ui/textarea'
import {
    Settings2,
    Save,
    Copy,
    Trash2,
    Star,
    Plus,
    Edit,
    Check
} from 'lucide-react'
import { toast } from 'sonner'

interface Preset {
    id: string
    name: string
    description: string
    type: 'subtitle' | 'enhance' | 'scene' | 'voice'
    settings: Record<string, any>
    isDefault: boolean
    usageCount: number
}

export default function PresetManagerPage() {
    const [presets, setPresets] = useState<Preset[]>([
        {
            id: '1',
            name: 'Legenda Padrão PT-BR',
            description: 'Configuração padrão para legendas em português',
            type: 'subtitle',
            settings: {
                language: 'pt-BR',
                model: 'whisper-1',
                format: 'srt'
            },
            isDefault: true,
            usageCount: 245
        },
        {
            id: '2',
            name: 'HD para 4K Ultra',
            description: 'Upscaling máximo com denoise',
            type: 'enhance',
            settings: {
                resolution: '2160p',
                denoise: 70,
                sharpness: 50
            },
            isDefault: false,
            usageCount: 128
        },
        {
            id: '3',
            name: 'Detecção Sensível',
            description: 'Detecta mais mudanças de cena',
            type: 'scene',
            settings: {
                sensitivity: 75,
                minDuration: 2
            },
            isDefault: false,
            usageCount: 89
        }
    ])

    const [isCreating, setIsCreating] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)

    const handleSetDefault = (id: string) => {
        setPresets(prev => prev.map(p => ({
            ...p,
            isDefault: p.id === id ? true : (p.type === presets.find(x => x.id === id)?.type ? false : p.isDefault)
        })))
        toast.success('Preset definido como padrão!')
    }

    const handleDuplicate = (preset: Preset) => {
        const newPreset: Preset = {
            ...preset,
            id: Date.now().toString(),
            name: `${preset.name} (Cópia)`,
            isDefault: false,
            usageCount: 0
        }
        setPresets(prev => [...prev, newPreset])
        toast.success('Preset duplicado!')
    }

    const handleDelete = (id: string) => {
        setPresets(prev => prev.filter(p => p.id !== id))
        toast.success('Preset removido!')
    }

    const getTypeColor = (type: Preset['type']) => {
        switch (type) {
            case 'subtitle': return 'bg-green-100 text-green-800'
            case 'enhance': return 'bg-blue-100 text-blue-800'
            case 'scene': return 'bg-purple-100 text-purple-800'
            case 'voice': return 'bg-orange-100 text-orange-800'
        }
    }

    const getTypeLabel = (type: Preset['type']) => {
        switch (type) {
            case 'subtitle': return 'Legendas'
            case 'enhance': return 'Enhancement'
            case 'scene': return 'Cenas'
            case 'voice': return 'Voz'
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl">
                                    <Settings2 className="w-8 h-8 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                                        Gerenciador de Presets
                                    </h1>
                                    <p className="text-gray-600">Crie e gerencie configurações reutilizáveis</p>
                                </div>
                            </div>
                        </div>
                        <Button
                            onClick={() => setIsCreating(true)}
                            className="bg-gradient-to-r from-indigo-500 to-purple-600"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Criar Preset
                        </Button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <Card>
                        <CardContent className="p-6 text-center">
                            <div className="text-3xl font-bold text-indigo-600 mb-1">{presets.length}</div>
                            <div className="text-sm text-gray-600">Total de Presets</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6 text-center">
                            <div className="text-3xl font-bold text-green-600 mb-1">
                                {presets.filter(p => p.type === 'subtitle').length}
                            </div>
                            <div className="text-sm text-gray-600">Legendas</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6 text-center">
                            <div className="text-3xl font-bold text-blue-600 mb-1">
                                {presets.filter(p => p.type === 'enhance').length}
                            </div>
                            <div className="text-sm text-gray-600">Enhancement</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6 text-center">
                            <div className="text-3xl font-bold text-purple-600 mb-1">
                                {presets.reduce((sum, p) => sum + p.usageCount, 0)}
                            </div>
                            <div className="text-sm text-gray-600">Usos Totais</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Presets Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {presets.map(preset => (
                        <Card key={preset.id} className="hover:shadow-lg transition-shadow">
                            <CardHeader>
                                <div className="flex items-start justify-between mb-2">
                                    <Badge className={getTypeColor(preset.type)}>
                                        {getTypeLabel(preset.type)}
                                    </Badge>
                                    {preset.isDefault && (
                                        <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-200">
                                            <Star className="w-3 h-3 mr-1 fill-yellow-500" />
                                            Padrão
                                        </Badge>
                                    )}
                                </div>
                                <CardTitle className="text-lg">{preset.name}</CardTitle>
                                <CardDescription>{preset.description}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {/* Settings Preview */}
                                    <div className="bg-gray-50 rounded-lg p-3">
                                        <div className="text-xs font-semibold text-gray-700 mb-2">Configurações:</div>
                                        <div className="space-y-1">
                                            {Object.entries(preset.settings).map(([key, value]) => (
                                                <div key={key} className="text-xs flex justify-between">
                                                    <span className="text-gray-600">{key}:</span>
                                                    <span className="font-medium">{String(value)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Usage Stats */}
                                    <div className="flex items-center justify-between text-sm text-gray-600">
                                        <span>Usado {preset.usageCount}x</span>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-2">
                                        {!preset.isDefault && (
                                            <Button
                                                onClick={() => handleSetDefault(preset.id)}
                                                variant="outline"
                                                size="sm"
                                                className="flex-1"
                                            >
                                                <Star className="w-4 h-4 mr-1" />
                                                Padrão
                                            </Button>
                                        )}
                                        <Button
                                            onClick={() => handleDuplicate(preset)}
                                            variant="outline"
                                            size="sm"
                                            className="flex-1"
                                        >
                                            <Copy className="w-4 h-4 mr-1" />
                                            Duplicar
                                        </Button>
                                        <Button
                                            onClick={() => setEditingId(preset.id)}
                                            variant="outline"
                                            size="sm"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            onClick={() => handleDelete(preset.id)}
                                            variant="outline"
                                            size="sm"
                                            className="text-red-600 hover:bg-red-50"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Create New Preset Card */}
                {isCreating && (
                    <Card className="mt-6">
                        <CardHeader>
                            <CardTitle>Criar Novo Preset</CardTitle>
                            <CardDescription>Configure um novo preset reutilizável</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label>Nome do Preset</Label>
                                        <Input placeholder="Ex: Legenda Premium" />
                                    </div>
                                    <div>
                                        <Label>Tipo</Label>
                                        <select className="w-full px-3 py-2 border rounded-md">
                                            <option value="subtitle">Legendas</option>
                                            <option value="enhance">Enhancement</option>
                                            <option value="scene">Cenas</option>
                                            <option value="voice">Voz</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <Label>Descrição</Label>
                                    <Textarea placeholder="Descreva as configurações deste preset..." />
                                </div>
                                <div className="flex gap-2">
                                    <Button className="bg-gradient-to-r from-indigo-500 to-purple-600">
                                        <Save className="w-4 h-4 mr-2" />
                                        Salvar Preset
                                    </Button>
                                    <Button variant="outline" onClick={() => setIsCreating(false)}>
                                        Cancelar
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}
