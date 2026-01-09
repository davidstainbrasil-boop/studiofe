'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card'
import { Button } from '@components/ui/button'
import { Badge } from '@components/ui/badge'
import { Input } from '@components/ui/input'
import { Label } from '@components/ui/label'
import { Switch } from '@components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@components/ui/tabs'
import {
    Settings,
    User,
    Bell,
    Palette,
    Shield,
    Globe,
    Keyboard,
    HardDrive,
    Save,
    RefreshCw
} from 'lucide-react'
import { toast } from 'sonner'

export default function SettingsPage() {
    const [settings, setSettings] = useState({
        // Profile
        name: 'João Silva',
        email: 'joao@example.com',
        avatar: '👤',

        // Notifications
        emailNotifications: true,
        pushNotifications: true,
        processingAlerts: true,
        weeklyReport: true,

        // Appearance
        darkMode: false,
        compactMode: false,
        language: 'pt-BR',

        // Processing
        defaultQuality: '1080p',
        autoEnhance: false,
        saveOriginals: true,

        // Security
        twoFactorAuth: false,
        sessionTimeout: '24h'
    })

    const handleSave = () => {
        toast.success('Configurações salvas com sucesso!')
    }

    const updateSetting = (key: string, value: any) => {
        setSettings(prev => ({ ...prev, [key]: value }))
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-slate-50 p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-r from-gray-600 to-slate-700 rounded-xl">
                            <Settings className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-600 to-slate-700 bg-clip-text text-transparent">
                                Configurações
                            </h1>
                            <p className="text-gray-600">Personalize sua experiência</p>
                        </div>
                    </div>
                </div>

                <Tabs defaultValue="profile" className="space-y-6">
                    <TabsList className="grid w-full grid-cols-5">
                        <TabsTrigger value="profile">
                            <User className="w-4 h-4 mr-2" />
                            Perfil
                        </TabsTrigger>
                        <TabsTrigger value="notifications">
                            <Bell className="w-4 h-4 mr-2" />
                            Notificações
                        </TabsTrigger>
                        <TabsTrigger value="appearance">
                            <Palette className="w-4 h-4 mr-2" />
                            Aparência
                        </TabsTrigger>
                        <TabsTrigger value="processing">
                            <HardDrive className="w-4 h-4 mr-2" />
                            Processamento
                        </TabsTrigger>
                        <TabsTrigger value="security">
                            <Shield className="w-4 h-4 mr-2" />
                            Segurança
                        </TabsTrigger>
                    </TabsList>

                    {/* Profile Tab */}
                    <TabsContent value="profile">
                        <Card>
                            <CardHeader>
                                <CardTitle>Informações do Perfil</CardTitle>
                                <CardDescription>Atualize suas informações pessoais</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="flex items-center gap-6">
                                    <div className="w-24 h-24 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-4xl">
                                        {settings.avatar}
                                    </div>
                                    <Button variant="outline">Alterar Avatar</Button>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label>Nome Completo</Label>
                                        <Input
                                            value={settings.name}
                                            onChange={(e) => updateSetting('name', e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <Label>Email</Label>
                                        <Input
                                            type="email"
                                            value={settings.email}
                                            onChange={(e) => updateSetting('email', e.target.value)}
                                        />
                                    </div>
                                </div>

                                <Button onClick={handleSave} className="bg-gradient-to-r from-blue-500 to-purple-600">
                                    <Save className="w-4 h-4 mr-2" />
                                    Salvar Alterações
                                </Button>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Notifications Tab */}
                    <TabsContent value="notifications">
                        <Card>
                            <CardHeader>
                                <CardTitle>Preferências de Notificação</CardTitle>
                                <CardDescription>Escolha como você quer receber atualizações</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                    <div>
                                        <div className="font-medium">Notificações por Email</div>
                                        <div className="text-sm text-gray-500">Receba atualizações no seu email</div>
                                    </div>
                                    <Switch
                                        checked={settings.emailNotifications}
                                        onCheckedChange={(v) => updateSetting('emailNotifications', v)}
                                    />
                                </div>

                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                    <div>
                                        <div className="font-medium">Notificações Push</div>
                                        <div className="text-sm text-gray-500">Receba alertas no navegador</div>
                                    </div>
                                    <Switch
                                        checked={settings.pushNotifications}
                                        onCheckedChange={(v) => updateSetting('pushNotifications', v)}
                                    />
                                </div>

                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                    <div>
                                        <div className="font-medium">Alertas de Processamento</div>
                                        <div className="text-sm text-gray-500">Seja notificado quando vídeos ficarem prontos</div>
                                    </div>
                                    <Switch
                                        checked={settings.processingAlerts}
                                        onCheckedChange={(v) => updateSetting('processingAlerts', v)}
                                    />
                                </div>

                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                    <div>
                                        <div className="font-medium">Relatório Semanal</div>
                                        <div className="text-sm text-gray-500">Resumo semanal das suas atividades</div>
                                    </div>
                                    <Switch
                                        checked={settings.weeklyReport}
                                        onCheckedChange={(v) => updateSetting('weeklyReport', v)}
                                    />
                                </div>

                                <Button onClick={handleSave} className="bg-gradient-to-r from-blue-500 to-purple-600">
                                    <Save className="w-4 h-4 mr-2" />
                                    Salvar Preferências
                                </Button>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Appearance Tab */}
                    <TabsContent value="appearance">
                        <Card>
                            <CardHeader>
                                <CardTitle>Aparência</CardTitle>
                                <CardDescription>Personalize a interface da plataforma</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                    <div>
                                        <div className="font-medium">Modo Escuro</div>
                                        <div className="text-sm text-gray-500">Interface com cores escuras</div>
                                    </div>
                                    <Switch
                                        checked={settings.darkMode}
                                        onCheckedChange={(v) => updateSetting('darkMode', v)}
                                    />
                                </div>

                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                    <div>
                                        <div className="font-medium">Modo Compacto</div>
                                        <div className="text-sm text-gray-500">Interface mais densa</div>
                                    </div>
                                    <Switch
                                        checked={settings.compactMode}
                                        onCheckedChange={(v) => updateSetting('compactMode', v)}
                                    />
                                </div>

                                <div>
                                    <Label>Idioma</Label>
                                    <select
                                        value={settings.language}
                                        onChange={(e) => updateSetting('language', e.target.value)}
                                        className="w-full mt-2 px-3 py-2 border rounded-md"
                                    >
                                        <option value="pt-BR">Português (Brasil)</option>
                                        <option value="en-US">English (US)</option>
                                        <option value="es">Español</option>
                                    </select>
                                </div>

                                <Button onClick={handleSave} className="bg-gradient-to-r from-blue-500 to-purple-600">
                                    <Save className="w-4 h-4 mr-2" />
                                    Salvar Configurações
                                </Button>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Processing Tab */}
                    <TabsContent value="processing">
                        <Card>
                            <CardHeader>
                                <CardTitle>Configurações de Processamento</CardTitle>
                                <CardDescription>Defina como seus vídeos são processados</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div>
                                    <Label>Qualidade Padrão de Export</Label>
                                    <select
                                        value={settings.defaultQuality}
                                        onChange={(e) => updateSetting('defaultQuality', e.target.value)}
                                        className="w-full mt-2 px-3 py-2 border rounded-md"
                                    >
                                        <option value="720p">HD (720p)</option>
                                        <option value="1080p">Full HD (1080p)</option>
                                        <option value="1440p">2K (1440p)</option>
                                        <option value="2160p">4K (2160p)</option>
                                    </select>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                    <div>
                                        <div className="font-medium">Auto-Enhancement</div>
                                        <div className="text-sm text-gray-500">Melhorar vídeos automaticamente</div>
                                    </div>
                                    <Switch
                                        checked={settings.autoEnhance}
                                        onCheckedChange={(v) => updateSetting('autoEnhance', v)}
                                    />
                                </div>

                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                    <div>
                                        <div className="font-medium">Manter Arquivos Originais</div>
                                        <div className="text-sm text-gray-500">Guardar versão original dos vídeos</div>
                                    </div>
                                    <Switch
                                        checked={settings.saveOriginals}
                                        onCheckedChange={(v) => updateSetting('saveOriginals', v)}
                                    />
                                </div>

                                <Button onClick={handleSave} className="bg-gradient-to-r from-blue-500 to-purple-600">
                                    <Save className="w-4 h-4 mr-2" />
                                    Salvar Configurações
                                </Button>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Security Tab */}
                    <TabsContent value="security">
                        <Card>
                            <CardHeader>
                                <CardTitle>Segurança</CardTitle>
                                <CardDescription>Proteja sua conta</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                    <div>
                                        <div className="font-medium">Autenticação em Dois Fatores</div>
                                        <div className="text-sm text-gray-500">Adicione uma camada extra de segurança</div>
                                    </div>
                                    <Switch
                                        checked={settings.twoFactorAuth}
                                        onCheckedChange={(v) => updateSetting('twoFactorAuth', v)}
                                    />
                                </div>

                                <div>
                                    <Label>Timeout de Sessão</Label>
                                    <select
                                        value={settings.sessionTimeout}
                                        onChange={(e) => updateSetting('sessionTimeout', e.target.value)}
                                        className="w-full mt-2 px-3 py-2 border rounded-md"
                                    >
                                        <option value="1h">1 hora</option>
                                        <option value="4h">4 horas</option>
                                        <option value="24h">24 horas</option>
                                        <option value="7d">7 dias</option>
                                    </select>
                                </div>

                                <div className="pt-4 border-t">
                                    <h4 className="font-medium mb-4">Ações da Conta</h4>
                                    <div className="flex gap-4">
                                        <Button variant="outline">
                                            <RefreshCw className="w-4 h-4 mr-2" />
                                            Alterar Senha
                                        </Button>
                                        <Button variant="outline" className="text-red-600 hover:bg-red-50">
                                            Encerrar Todas as Sessões
                                        </Button>
                                    </div>
                                </div>

                                <Button onClick={handleSave} className="bg-gradient-to-r from-blue-500 to-purple-600">
                                    <Save className="w-4 h-4 mr-2" />
                                    Salvar Configurações
                                </Button>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}
