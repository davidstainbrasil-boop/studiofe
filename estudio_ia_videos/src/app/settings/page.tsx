'use client'

import Link from 'next/link'
import { Button } from '@components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card'
import { Shield, FileText, Lock, Bell } from 'lucide-react'

export default function SettingsPage() {
  const settingsCategories = [
    {
      title: 'Segurança',
      description: 'Gerencie configurações de segurança e autenticação',
      icon: Shield,
      href: '/settings/security',
      color: 'text-blue-600'
    },
    {
      title: 'Relatórios',
      description: 'Acesse e configure relatórios do sistema',
      icon: FileText,
      href: '/settings/reports',
      color: 'text-green-600'
    },
    {
      title: 'Logs de Auditoria',
      description: 'Visualize logs de auditoria e atividades',
      icon: Lock,
      href: '/settings/audit-logs',
      color: 'text-purple-600'
    }
  ]

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <div className="container mx-auto max-w-6xl py-10 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
          <p className="mt-2 text-muted-foreground">
            Gerencie todas as configurações do sistema
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {settingsCategories.map((category) => {
            const IconComponent = category.icon
            return (
              <Link key={category.href} href={category.href}>
                <Card className="transition-all hover:shadow-lg hover:scale-105 cursor-pointer h-full">
                  <CardHeader>
                    <div className={`mb-4 inline-flex rounded-lg p-3 ${category.color} bg-opacity-10`}>
                      <IconComponent className={`h-6 w-6 ${category.color}`} />
                    </div>
                    <CardTitle>{category.title}</CardTitle>
                    <CardDescription>{category.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="ghost" className="w-full">
                      Acessar
                    </Button>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>

        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Acesso Rápido</CardTitle>
              <CardDescription>
                Links para outras páginas de configuração
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/dashboard/settings">
                <Button variant="outline" className="w-full justify-start">
                  Configurações do Dashboard
                </Button>
              </Link>
              <Link href="/admin/configuracoes">
                <Button variant="outline" className="w-full justify-start">
                  Configurações do Admin
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6">
          <Link href="/">
            <Button variant="ghost">Voltar ao Início</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
