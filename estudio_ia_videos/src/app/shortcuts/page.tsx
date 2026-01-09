'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card'
import { Button } from '@components/ui/button'
import { Badge } from '@components/ui/badge'
import { Input } from '@components/ui/input'
import {
    Keyboard,
    Search,
    Command,
    ArrowUp,
    ArrowDown,
    ArrowLeft,
    ArrowRight
} from 'lucide-react'

interface Shortcut {
    id: string
    keys: string[]
    action: string
    category: 'general' | 'editor' | 'timeline' | 'playback' | 'export'
}

export default function ShortcutsPage() {
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedCategory, setSelectedCategory] = useState<'all' | Shortcut['category']>('all')

    const shortcuts: Shortcut[] = [
        // General
        { id: '1', keys: ['Ctrl', 'N'], action: 'Novo Projeto', category: 'general' },
        { id: '2', keys: ['Ctrl', 'O'], action: 'Abrir Projeto', category: 'general' },
        { id: '3', keys: ['Ctrl', 'S'], action: 'Salvar Projeto', category: 'general' },
        { id: '4', keys: ['Ctrl', 'Shift', 'S'], action: 'Salvar Como', category: 'general' },
        { id: '5', keys: ['Ctrl', 'Z'], action: 'Desfazer', category: 'general' },
        { id: '6', keys: ['Ctrl', 'Shift', 'Z'], action: 'Refazer', category: 'general' },
        { id: '7', keys: ['Ctrl', 'C'], action: 'Copiar', category: 'general' },
        { id: '8', keys: ['Ctrl', 'V'], action: 'Colar', category: 'general' },
        { id: '9', keys: ['Ctrl', 'X'], action: 'Recortar', category: 'general' },
        { id: '10', keys: ['Delete'], action: 'Excluir Seleção', category: 'general' },

        // Editor
        { id: '11', keys: ['V'], action: 'Ferramenta Seleção', category: 'editor' },
        { id: '12', keys: ['C'], action: 'Ferramenta Corte', category: 'editor' },
        { id: '13', keys: ['T'], action: 'Adicionar Texto', category: 'editor' },
        { id: '14', keys: ['M'], action: 'Adicionar Marcador', category: 'editor' },
        { id: '15', keys: ['Ctrl', 'D'], action: 'Duplicar Clip', category: 'editor' },
        { id: '16', keys: ['Ctrl', 'G'], action: 'Agrupar Clips', category: 'editor' },
        { id: '17', keys: ['Ctrl', 'Shift', 'G'], action: 'Desagrupar', category: 'editor' },

        // Timeline
        { id: '18', keys: ['Home'], action: 'Ir para Início', category: 'timeline' },
        { id: '19', keys: ['End'], action: 'Ir para Fim', category: 'timeline' },
        { id: '20', keys: ['←'], action: 'Frame Anterior', category: 'timeline' },
        { id: '21', keys: ['→'], action: 'Próximo Frame', category: 'timeline' },
        { id: '22', keys: ['Shift', '←'], action: '10 Frames Antes', category: 'timeline' },
        { id: '23', keys: ['Shift', '→'], action: '10 Frames Depois', category: 'timeline' },
        { id: '24', keys: ['+'], action: 'Zoom In Timeline', category: 'timeline' },
        { id: '25', keys: ['-'], action: 'Zoom Out Timeline', category: 'timeline' },
        { id: '26', keys: ['\\'], action: 'Fit Timeline', category: 'timeline' },

        // Playback
        { id: '27', keys: ['Space'], action: 'Play/Pause', category: 'playback' },
        { id: '28', keys: ['L'], action: 'Acelerar (2x, 4x, 8x)', category: 'playback' },
        { id: '29', keys: ['J'], action: 'Reverso (2x, 4x, 8x)', category: 'playback' },
        { id: '30', keys: ['K'], action: 'Parar', category: 'playback' },
        { id: '31', keys: ['I'], action: 'Marcar Entrada', category: 'playback' },
        { id: '32', keys: ['O'], action: 'Marcar Saída', category: 'playback' },

        // Export
        { id: '33', keys: ['Ctrl', 'E'], action: 'Exportar Vídeo', category: 'export' },
        { id: '34', keys: ['Ctrl', 'Shift', 'E'], action: 'Exportar Seleção', category: 'export' },
        { id: '35', keys: ['Ctrl', 'M'], action: 'Adicionar à Fila', category: 'export' }
    ]

    const categories = [
        { value: 'all', label: 'Todos', count: shortcuts.length },
        { value: 'general', label: 'Geral', count: shortcuts.filter(s => s.category === 'general').length },
        { value: 'editor', label: 'Editor', count: shortcuts.filter(s => s.category === 'editor').length },
        { value: 'timeline', label: 'Timeline', count: shortcuts.filter(s => s.category === 'timeline').length },
        { value: 'playback', label: 'Reprodução', count: shortcuts.filter(s => s.category === 'playback').length },
        { value: 'export', label: 'Exportar', count: shortcuts.filter(s => s.category === 'export').length }
    ]

    const filteredShortcuts = shortcuts.filter(shortcut => {
        const matchesSearch = shortcut.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
            shortcut.keys.join(' ').toLowerCase().includes(searchQuery.toLowerCase())
        const matchesCategory = selectedCategory === 'all' || shortcut.category === selectedCategory
        return matchesSearch && matchesCategory
    })

    const getCategoryColor = (category: Shortcut['category']) => {
        switch (category) {
            case 'general': return 'bg-blue-100 text-blue-800'
            case 'editor': return 'bg-green-100 text-green-800'
            case 'timeline': return 'bg-purple-100 text-purple-800'
            case 'playback': return 'bg-orange-100 text-orange-800'
            case 'export': return 'bg-red-100 text-red-800'
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-slate-50 p-6">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-r from-gray-700 to-slate-800 rounded-xl">
                            <Keyboard className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-700 to-slate-800 bg-clip-text text-transparent">
                                Atalhos de Teclado
                            </h1>
                            <p className="text-gray-600">Acelere seu fluxo de trabalho</p>
                        </div>
                    </div>
                </div>

                {/* Search */}
                <Card className="mb-6">
                    <CardContent className="p-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder="Buscar atalhos..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Categories */}
                <div className="flex gap-2 flex-wrap mb-6">
                    {categories.map(cat => (
                        <Button
                            key={cat.value}
                            variant={selectedCategory === cat.value ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setSelectedCategory(cat.value as any)}
                        >
                            {cat.label}
                            <Badge variant="secondary" className="ml-2 text-xs">
                                {cat.count}
                            </Badge>
                        </Button>
                    ))}
                </div>

                {/* Shortcuts Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredShortcuts.map(shortcut => (
                        <Card key={shortcut.id} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="flex gap-1">
                                            {shortcut.keys.map((key, idx) => (
                                                <React.Fragment key={idx}>
                                                    <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono shadow-sm">
                                                        {key}
                                                    </kbd>
                                                    {idx < shortcut.keys.length - 1 && (
                                                        <span className="text-gray-400">+</span>
                                                    )}
                                                </React.Fragment>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm font-medium">{shortcut.action}</span>
                                        <Badge className={getCategoryColor(shortcut.category)} variant="secondary">
                                            {shortcut.category}
                                        </Badge>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {filteredShortcuts.length === 0 && (
                    <Card>
                        <CardContent className="p-12 text-center">
                            <Keyboard className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500">Nenhum atalho encontrado</p>
                        </CardContent>
                    </Card>
                )}

                {/* Tips */}
                <Card className="mt-8 border-blue-200 bg-blue-50">
                    <CardContent className="p-6">
                        <h3 className="font-bold text-blue-800 mb-2 flex items-center gap-2">
                            <Command className="w-5 h-5" />
                            Dica Pro
                        </h3>
                        <p className="text-blue-700 text-sm">
                            Use <kbd className="px-1 bg-blue-100 rounded">Ctrl</kbd> + <kbd className="px-1 bg-blue-100 rounded">/</kbd> a qualquer momento para abrir esta referência de atalhos.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
