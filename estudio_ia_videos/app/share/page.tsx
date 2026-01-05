'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
    Share2,
    Link,
    Copy,
    Mail,
    Users,
    Globe,
    Lock,
    Eye,
    Edit,
    Calendar,
    Clock,
    CheckCircle,
    Settings
} from 'lucide-react'
import { toast } from 'sonner'

interface ShareSettings {
    isPublic: boolean
    allowComments: boolean
    allowDownload: boolean
    requirePassword: boolean
    password: string
    expiresAt?: Date
}

interface SharedUser {
    id: string
    email: string
    permission: 'view' | 'edit' | 'admin'
    status: 'active' | 'pending'
}

export default function ShareProjectPage() {
    const [shareSettings, setShareSettings] = useState<ShareSettings>({
        isPublic: false,
        allowComments: true,
        allowDownload: false,
        requirePassword: false,
        password: ''
    })

    const [sharedUsers, setSharedUsers] = useState<SharedUser[]>([
        { id: '1', email: 'maria@example.com', permission: 'edit', status: 'active' },
        { id: '2', email: 'pedro@example.com', permission: 'view', status: 'pending' }
    ])

    const [inviteEmail, setInviteEmail] = useState('')
    const [shareLink] = useState('https://mvpvideo.com/share/abc123xyz')

    const copyLink = () => {
        navigator.clipboard.writeText(shareLink)
        toast.success('Link copiado para a área de transferência!')
    }

    const sendInvite = () => {
        if (!inviteEmail.trim()) {
            toast.error('Digite um email válido')
            return
        }

        setSharedUsers(prev => [...prev, {
            id: Date.now().toString(),
            email: inviteEmail,
            permission: 'view',
            status: 'pending'
        }])
        setInviteEmail('')
        toast.success(`Convite enviado para ${inviteEmail}`)
    }

    const removeUser = (id: string) => {
        setSharedUsers(prev => prev.filter(u => u.id !== id))
        toast.success('Acesso removido')
    }

    const updatePermission = (id: string, permission: SharedUser['permission']) => {
        setSharedUsers(prev => prev.map(u =>
            u.id === id ? { ...u, permission } : u
        ))
        toast.success('Permissão atualizada')
    }

    const updateSetting = (key: keyof ShareSettings, value: any) => {
        setShareSettings(prev => ({ ...prev, [key]: value }))
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-teal-50 p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-r from-green-500 to-teal-600 rounded-xl">
                            <Share2 className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent">
                                Compartilhar Projeto
                            </h1>
                            <p className="text-gray-600">Configure como seu projeto é compartilhado</p>
                        </div>
                    </div>
                </div>

                {/* Share Link */}
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Link className="w-5 h-5" />
                            Link de Compartilhamento
                        </CardTitle>
                        <CardDescription>Qualquer pessoa com o link pode acessar</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex gap-3">
                            <div className="flex-1 relative">
                                <Input
                                    value={shareLink}
                                    readOnly
                                    className="pr-20 bg-gray-50"
                                />
                                <Button
                                    size="sm"
                                    className="absolute right-1 top-1"
                                    onClick={copyLink}
                                >
                                    <Copy className="w-4 h-4 mr-1" />
                                    Copiar
                                </Button>
                            </div>
                            <Button variant="outline">
                                <Mail className="w-4 h-4 mr-2" />
                                Enviar por Email
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Share Settings */}
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Settings className="w-5 h-5" />
                            Configurações de Acesso
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                                <Globe className="w-5 h-5 text-blue-500" />
                                <div>
                                    <div className="font-medium">Acesso Público</div>
                                    <div className="text-sm text-gray-500">Qualquer pessoa pode ver</div>
                                </div>
                            </div>
                            <Switch
                                checked={shareSettings.isPublic}
                                onCheckedChange={(v) => updateSetting('isPublic', v)}
                            />
                        </div>

                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                                <Edit className="w-5 h-5 text-purple-500" />
                                <div>
                                    <div className="font-medium">Permitir Comentários</div>
                                    <div className="text-sm text-gray-500">Visitantes podem comentar</div>
                                </div>
                            </div>
                            <Switch
                                checked={shareSettings.allowComments}
                                onCheckedChange={(v) => updateSetting('allowComments', v)}
                            />
                        </div>

                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                                <Eye className="w-5 h-5 text-green-500" />
                                <div>
                                    <div className="font-medium">Permitir Download</div>
                                    <div className="text-sm text-gray-500">Visitantes podem baixar</div>
                                </div>
                            </div>
                            <Switch
                                checked={shareSettings.allowDownload}
                                onCheckedChange={(v) => updateSetting('allowDownload', v)}
                            />
                        </div>

                        <div className="p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <Lock className="w-5 h-5 text-red-500" />
                                    <div>
                                        <div className="font-medium">Proteger com Senha</div>
                                        <div className="text-sm text-gray-500">Exigir senha para acesso</div>
                                    </div>
                                </div>
                                <Switch
                                    checked={shareSettings.requirePassword}
                                    onCheckedChange={(v) => updateSetting('requirePassword', v)}
                                />
                            </div>
                            {shareSettings.requirePassword && (
                                <Input
                                    type="password"
                                    placeholder="Digite a senha"
                                    value={shareSettings.password}
                                    onChange={(e) => updateSetting('password', e.target.value)}
                                />
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Invite Users */}
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="w-5 h-5" />
                            Convidar Pessoas
                        </CardTitle>
                        <CardDescription>Convide colaboradores específicos</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex gap-3 mb-6">
                            <Input
                                type="email"
                                placeholder="email@exemplo.com"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                className="flex-1"
                            />
                            <Button onClick={sendInvite} className="bg-gradient-to-r from-green-500 to-teal-600">
                                <Mail className="w-4 h-4 mr-2" />
                                Enviar Convite
                            </Button>
                        </div>

                        {sharedUsers.length > 0 && (
                            <div className="space-y-3">
                                <h4 className="font-medium text-sm text-gray-500">Pessoas com acesso</h4>
                                {sharedUsers.map(user => (
                                    <div
                                        key={user.id}
                                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-green-500 to-teal-600 flex items-center justify-center text-white font-medium">
                                                {user.email[0].toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="font-medium">{user.email}</div>
                                                <Badge className={user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                                                    {user.status === 'active' ? 'Ativo' : 'Pendente'}
                                                </Badge>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <select
                                                value={user.permission}
                                                onChange={(e) => updatePermission(user.id, e.target.value as SharedUser['permission'])}
                                                className="px-2 py-1 text-sm border rounded-md"
                                            >
                                                <option value="view">Visualizar</option>
                                                <option value="edit">Editar</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="text-red-600 hover:bg-red-50"
                                                onClick={() => removeUser(user.id)}
                                            >
                                                Remover
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Activity */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="w-5 h-5" />
                            Atividade Recente
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 text-sm">
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                <span className="text-gray-600">Link copiado há 2 minutos</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                                <Mail className="w-4 h-4 text-blue-500" />
                                <span className="text-gray-600">Convite enviado para maria@example.com há 1 hora</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                                <Eye className="w-4 h-4 text-purple-500" />
                                <span className="text-gray-600">pedro@example.com visualizou o projeto há 3 horas</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
