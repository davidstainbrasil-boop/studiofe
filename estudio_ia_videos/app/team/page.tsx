'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
    Users,
    Plus,
    Mail,
    MoreVertical,
    Crown,
    Shield,
    Eye,
    Edit,
    Trash2,
    UserPlus,
    Settings
} from 'lucide-react'
import { toast } from 'sonner'

interface TeamMember {
    id: string
    name: string
    email: string
    avatar?: string
    role: 'owner' | 'admin' | 'editor' | 'viewer'
    status: 'active' | 'pending' | 'inactive'
    joinedAt: Date
    lastActive?: Date
}

export default function TeamPage() {
    const [members, setMembers] = useState<TeamMember[]>([
        {
            id: '1',
            name: 'João Silva',
            email: 'joao@example.com',
            role: 'owner',
            status: 'active',
            joinedAt: new Date(Date.now() - 90 * 24 * 60 * 60000),
            lastActive: new Date()
        },
        {
            id: '2',
            name: 'Maria Santos',
            email: 'maria@example.com',
            role: 'admin',
            status: 'active',
            joinedAt: new Date(Date.now() - 60 * 24 * 60 * 60000),
            lastActive: new Date(Date.now() - 2 * 60 * 60000)
        },
        {
            id: '3',
            name: 'Pedro Oliveira',
            email: 'pedro@example.com',
            role: 'editor',
            status: 'active',
            joinedAt: new Date(Date.now() - 30 * 24 * 60 * 60000),
            lastActive: new Date(Date.now() - 24 * 60 * 60000)
        },
        {
            id: '4',
            name: 'Ana Costa',
            email: 'ana@example.com',
            role: 'viewer',
            status: 'pending',
            joinedAt: new Date(Date.now() - 2 * 24 * 60 * 60000)
        }
    ])

    const [inviteEmail, setInviteEmail] = useState('')
    const [inviteRole, setInviteRole] = useState<TeamMember['role']>('editor')
    const [showInviteForm, setShowInviteForm] = useState(false)

    const getRoleIcon = (role: TeamMember['role']) => {
        switch (role) {
            case 'owner': return <Crown className="w-4 h-4 text-yellow-500" />
            case 'admin': return <Shield className="w-4 h-4 text-purple-500" />
            case 'editor': return <Edit className="w-4 h-4 text-blue-500" />
            case 'viewer': return <Eye className="w-4 h-4 text-gray-500" />
        }
    }

    const getRoleColor = (role: TeamMember['role']) => {
        switch (role) {
            case 'owner': return 'bg-yellow-100 text-yellow-800'
            case 'admin': return 'bg-purple-100 text-purple-800'
            case 'editor': return 'bg-blue-100 text-blue-800'
            case 'viewer': return 'bg-gray-100 text-gray-800'
        }
    }

    const getStatusColor = (status: TeamMember['status']) => {
        switch (status) {
            case 'active': return 'bg-green-100 text-green-800'
            case 'pending': return 'bg-yellow-100 text-yellow-800'
            case 'inactive': return 'bg-gray-100 text-gray-800'
        }
    }

    const handleInvite = () => {
        if (!inviteEmail.trim()) {
            toast.error('Digite um email válido')
            return
        }

        const newMember: TeamMember = {
            id: Date.now().toString(),
            name: inviteEmail.split('@')[0],
            email: inviteEmail,
            role: inviteRole,
            status: 'pending',
            joinedAt: new Date()
        }

        setMembers(prev => [...prev, newMember])
        setInviteEmail('')
        setShowInviteForm(false)
        toast.success(`Convite enviado para ${inviteEmail}`)
    }

    const handleRemoveMember = (id: string) => {
        setMembers(prev => prev.filter(m => m.id !== id))
        toast.success('Membro removido da equipe')
    }

    const handleChangeRole = (id: string, newRole: TeamMember['role']) => {
        setMembers(prev => prev.map(m => m.id === id ? { ...m, role: newRole } : m))
        toast.success('Papel atualizado')
    }

    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        }).format(date)
    }

    const stats = {
        total: members.length,
        active: members.filter(m => m.status === 'active').length,
        pending: members.filter(m => m.status === 'pending').length
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-6">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl">
                                <Users className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                                    Equipe
                                </h1>
                                <p className="text-gray-600">Gerencie os membros da sua equipe</p>
                            </div>
                        </div>
                        <Button
                            onClick={() => setShowInviteForm(true)}
                            className="bg-gradient-to-r from-indigo-500 to-purple-600"
                        >
                            <UserPlus className="w-4 h-4 mr-2" />
                            Convidar Membro
                        </Button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <Card>
                        <CardContent className="p-6 text-center">
                            <div className="text-3xl font-bold text-indigo-600 mb-1">{stats.total}</div>
                            <div className="text-sm text-gray-600">Total de Membros</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6 text-center">
                            <div className="text-3xl font-bold text-green-600 mb-1">{stats.active}</div>
                            <div className="text-sm text-gray-600">Membros Ativos</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6 text-center">
                            <div className="text-3xl font-bold text-yellow-600 mb-1">{stats.pending}</div>
                            <div className="text-sm text-gray-600">Convites Pendentes</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Invite Form */}
                {showInviteForm && (
                    <Card className="mb-6 border-2 border-indigo-200">
                        <CardHeader>
                            <CardTitle>Convidar Novo Membro</CardTitle>
                            <CardDescription>Envie um convite por email</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <Input
                                        type="email"
                                        placeholder="email@exemplo.com"
                                        value={inviteEmail}
                                        onChange={(e) => setInviteEmail(e.target.value)}
                                    />
                                </div>
                                <select
                                    value={inviteRole}
                                    onChange={(e) => setInviteRole(e.target.value as TeamMember['role'])}
                                    className="px-3 py-2 border rounded-md"
                                >
                                    <option value="admin">Admin</option>
                                    <option value="editor">Editor</option>
                                    <option value="viewer">Viewer</option>
                                </select>
                                <Button onClick={handleInvite}>
                                    <Mail className="w-4 h-4 mr-2" />
                                    Enviar Convite
                                </Button>
                                <Button variant="outline" onClick={() => setShowInviteForm(false)}>
                                    Cancelar
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Members List */}
                <Card>
                    <CardHeader>
                        <CardTitle>Membros da Equipe</CardTitle>
                        <CardDescription>{members.length} membros</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {members.map(member => (
                                <div
                                    key={member.id}
                                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                                >
                                    <div className="flex items-center gap-4">
                                        <Avatar className="w-12 h-12">
                                            <AvatarImage src={member.avatar} />
                                            <AvatarFallback className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
                                                {member.name.split(' ').map(n => n[0]).join('')}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold">{member.name}</span>
                                                <Badge className={getRoleColor(member.role)}>
                                                    <span className="flex items-center gap-1">
                                                        {getRoleIcon(member.role)}
                                                        {member.role}
                                                    </span>
                                                </Badge>
                                                <Badge className={getStatusColor(member.status)}>
                                                    {member.status}
                                                </Badge>
                                            </div>
                                            <div className="text-sm text-gray-500">{member.email}</div>
                                            <div className="text-xs text-gray-400">
                                                Entrou em {formatDate(member.joinedAt)}
                                                {member.lastActive && ` • Último acesso: ${formatDate(member.lastActive)}`}
                                            </div>
                                        </div>
                                    </div>

                                    {member.role !== 'owner' && (
                                        <div className="flex items-center gap-2">
                                            <select
                                                value={member.role}
                                                onChange={(e) => handleChangeRole(member.id, e.target.value as TeamMember['role'])}
                                                className="px-2 py-1 text-sm border rounded-md"
                                            >
                                                <option value="admin">Admin</option>
                                                <option value="editor">Editor</option>
                                                <option value="viewer">Viewer</option>
                                            </select>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="text-red-600 hover:bg-red-50"
                                                onClick={() => handleRemoveMember(member.id)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Roles Info */}
                <Card className="mt-8">
                    <CardHeader>
                        <CardTitle>Permissões por Papel</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="p-4 bg-yellow-50 rounded-lg">
                                <div className="flex items-center gap-2 font-semibold mb-2">
                                    <Crown className="w-5 h-5 text-yellow-500" />
                                    Owner
                                </div>
                                <ul className="text-sm text-gray-600 space-y-1">
                                    <li>✓ Acesso total</li>
                                    <li>✓ Gerenciar equipe</li>
                                    <li>✓ Faturamento</li>
                                    <li>✓ Excluir workspace</li>
                                </ul>
                            </div>
                            <div className="p-4 bg-purple-50 rounded-lg">
                                <div className="flex items-center gap-2 font-semibold mb-2">
                                    <Shield className="w-5 h-5 text-purple-500" />
                                    Admin
                                </div>
                                <ul className="text-sm text-gray-600 space-y-1">
                                    <li>✓ Gerenciar projetos</li>
                                    <li>✓ Convidar membros</li>
                                    <li>✓ Configurações</li>
                                    <li>✗ Faturamento</li>
                                </ul>
                            </div>
                            <div className="p-4 bg-blue-50 rounded-lg">
                                <div className="flex items-center gap-2 font-semibold mb-2">
                                    <Edit className="w-5 h-5 text-blue-500" />
                                    Editor
                                </div>
                                <ul className="text-sm text-gray-600 space-y-1">
                                    <li>✓ Criar projetos</li>
                                    <li>✓ Editar projetos</li>
                                    <li>✓ Exportar vídeos</li>
                                    <li>✗ Gerenciar equipe</li>
                                </ul>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-2 font-semibold mb-2">
                                    <Eye className="w-5 h-5 text-gray-500" />
                                    Viewer
                                </div>
                                <ul className="text-sm text-gray-600 space-y-1">
                                    <li>✓ Ver projetos</li>
                                    <li>✓ Comentar</li>
                                    <li>✗ Editar</li>
                                    <li>✗ Exportar</li>
                                </ul>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
