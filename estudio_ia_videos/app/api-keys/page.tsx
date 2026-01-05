'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Key,
    Plus,
    Copy,
    Trash2,
    Eye,
    EyeOff,
    RefreshCw,
    Shield,
    Clock,
    Activity
} from 'lucide-react'
import { toast } from 'sonner'

interface ApiKey {
    id: string
    name: string
    key: string
    createdAt: Date
    lastUsed?: Date
    permissions: string[]
    isActive: boolean
    usageCount: number
}

export default function ApiKeysPage() {
    const [apiKeys, setApiKeys] = useState<ApiKey[]>([
        {
            id: '1',
            name: 'Production Key',
            key: 'mvp_prod_sk_1234567890abcdef',
            createdAt: new Date(Date.now() - 30 * 24 * 60 * 60000),
            lastUsed: new Date(Date.now() - 2 * 60 * 60000),
            permissions: ['read', 'write', 'delete'],
            isActive: true,
            usageCount: 15420
        },
        {
            id: '2',
            name: 'Development Key',
            key: 'mvp_dev_sk_abcdef1234567890',
            createdAt: new Date(Date.now() - 7 * 24 * 60 * 60000),
            lastUsed: new Date(Date.now() - 24 * 60 * 60000),
            permissions: ['read', 'write'],
            isActive: true,
            usageCount: 3250
        },
        {
            id: '3',
            name: 'Read Only Key',
            key: 'mvp_ro_sk_0987654321fedcba',
            createdAt: new Date(Date.now() - 60 * 24 * 60 * 60000),
            permissions: ['read'],
            isActive: false,
            usageCount: 890
        }
    ])

    const [showKeys, setShowKeys] = useState<Record<string, boolean>>({})
    const [isCreating, setIsCreating] = useState(false)
    const [newKeyName, setNewKeyName] = useState('')

    const toggleKeyVisibility = (id: string) => {
        setShowKeys(prev => ({ ...prev, [id]: !prev[id] }))
    }

    const copyToClipboard = (key: string) => {
        navigator.clipboard.writeText(key)
        toast.success('Chave copiada para a área de transferência!')
    }

    const regenerateKey = (id: string) => {
        const newKey = `mvp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`
        setApiKeys(prev => prev.map(k => k.id === id ? { ...k, key: newKey } : k))
        toast.success('Chave regenerada com sucesso!')
    }

    const toggleActive = (id: string) => {
        setApiKeys(prev => prev.map(k => k.id === id ? { ...k, isActive: !k.isActive } : k))
        toast.success('Status da chave atualizado!')
    }

    const deleteKey = (id: string) => {
        setApiKeys(prev => prev.filter(k => k.id !== id))
        toast.success('Chave removida!')
    }

    const createNewKey = () => {
        if (!newKeyName.trim()) {
            toast.error('Digite um nome para a chave')
            return
        }

        const newKey: ApiKey = {
            id: Date.now().toString(),
            name: newKeyName,
            key: `mvp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`,
            createdAt: new Date(),
            permissions: ['read', 'write'],
            isActive: true,
            usageCount: 0
        }

        setApiKeys(prev => [...prev, newKey])
        setNewKeyName('')
        setIsCreating(false)
        toast.success('Nova chave criada com sucesso!')
    }

    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        }).format(date)
    }

    const maskKey = (key: string) => {
        return key.slice(0, 12) + '••••••••••••' + key.slice(-4)
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 p-6">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-gradient-to-r from-slate-600 to-blue-600 rounded-xl">
                                <Key className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-600 to-blue-600 bg-clip-text text-transparent">
                                    API Keys
                                </h1>
                                <p className="text-gray-600">Gerencie suas chaves de acesso à API</p>
                            </div>
                        </div>
                        <Button
                            onClick={() => setIsCreating(true)}
                            className="bg-gradient-to-r from-slate-600 to-blue-600"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Nova Chave
                        </Button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <Card>
                        <CardContent className="p-6 text-center">
                            <div className="text-3xl font-bold text-slate-600 mb-1">{apiKeys.length}</div>
                            <div className="text-sm text-gray-600">Total de Chaves</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6 text-center">
                            <div className="text-3xl font-bold text-green-600 mb-1">
                                {apiKeys.filter(k => k.isActive).length}
                            </div>
                            <div className="text-sm text-gray-600">Chaves Ativas</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6 text-center">
                            <div className="text-3xl font-bold text-blue-600 mb-1">
                                {apiKeys.reduce((sum, k) => sum + k.usageCount, 0).toLocaleString()}
                            </div>
                            <div className="text-sm text-gray-600">Requisições Totais</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Create New Key */}
                {isCreating && (
                    <Card className="mb-6 border-2 border-blue-200">
                        <CardHeader>
                            <CardTitle>Criar Nova Chave</CardTitle>
                            <CardDescription>Configure uma nova chave de API</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <Label>Nome da Chave</Label>
                                    <Input
                                        placeholder="Ex: Mobile App Key"
                                        value={newKeyName}
                                        onChange={(e) => setNewKeyName(e.target.value)}
                                    />
                                </div>
                                <div className="flex items-end gap-2">
                                    <Button onClick={createNewKey}>
                                        <Plus className="w-4 h-4 mr-2" />
                                        Criar
                                    </Button>
                                    <Button variant="outline" onClick={() => setIsCreating(false)}>
                                        Cancelar
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* API Keys List */}
                <div className="space-y-4">
                    {apiKeys.map(apiKey => (
                        <Card key={apiKey.id} className={`transition-all ${!apiKey.isActive && 'opacity-60'}`}>
                            <CardContent className="p-6">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-3">
                                            <h3 className="font-semibold text-lg">{apiKey.name}</h3>
                                            <Badge variant={apiKey.isActive ? 'default' : 'secondary'}>
                                                {apiKey.isActive ? 'Ativa' : 'Inativa'}
                                            </Badge>
                                        </div>

                                        {/* Key Display */}
                                        <div className="flex items-center gap-2 mb-4 bg-gray-50 p-3 rounded-lg">
                                            <code className="flex-1 font-mono text-sm">
                                                {showKeys[apiKey.id] ? apiKey.key : maskKey(apiKey.key)}
                                            </code>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => toggleKeyVisibility(apiKey.id)}
                                            >
                                                {showKeys[apiKey.id] ? (
                                                    <EyeOff className="w-4 h-4" />
                                                ) : (
                                                    <Eye className="w-4 h-4" />
                                                )}
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => copyToClipboard(apiKey.key)}
                                            >
                                                <Copy className="w-4 h-4" />
                                            </Button>
                                        </div>

                                        {/* Metadata */}
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                            <div>
                                                <div className="text-xs text-gray-500 flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    Criada em
                                                </div>
                                                <div className="font-medium">{formatDate(apiKey.createdAt)}</div>
                                            </div>
                                            {apiKey.lastUsed && (
                                                <div>
                                                    <div className="text-xs text-gray-500 flex items-center gap-1">
                                                        <Activity className="w-3 h-3" />
                                                        Último uso
                                                    </div>
                                                    <div className="font-medium">{formatDate(apiKey.lastUsed)}</div>
                                                </div>
                                            )}
                                            <div>
                                                <div className="text-xs text-gray-500 flex items-center gap-1">
                                                    <Shield className="w-3 h-3" />
                                                    Permissões
                                                </div>
                                                <div className="font-medium">{apiKey.permissions.join(', ')}</div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-gray-500">Requisições</div>
                                                <div className="font-medium">{apiKey.usageCount.toLocaleString()}</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex flex-col gap-2 ml-4">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => regenerateKey(apiKey.id)}
                                        >
                                            <RefreshCw className="w-4 h-4 mr-1" />
                                            Regenerar
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => toggleActive(apiKey.id)}
                                        >
                                            {apiKey.isActive ? 'Desativar' : 'Ativar'}
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-red-600 hover:bg-red-50"
                                            onClick={() => deleteKey(apiKey.id)}
                                        >
                                            <Trash2 className="w-4 h-4 mr-1" />
                                            Excluir
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Security Notice */}
                <Card className="mt-8 border-yellow-200 bg-yellow-50">
                    <CardContent className="p-6">
                        <div className="flex items-start gap-3">
                            <Shield className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
                            <div>
                                <h3 className="font-semibold text-yellow-800 mb-1">
                                    Segurança das Chaves
                                </h3>
                                <p className="text-sm text-yellow-700">
                                    Nunca compartilhe suas chaves de API publicamente. Mantenha-as seguras e
                                    regenere-as periodicamente. Chaves comprometidas devem ser excluídas imediatamente.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
