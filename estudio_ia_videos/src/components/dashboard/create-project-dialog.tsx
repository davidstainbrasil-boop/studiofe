'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@components/ui/dialog'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'
import { Label } from '@components/ui/label'
import { createClient } from '@lib/supabase/client'
import { Loader2, Layout, FileText, User, Wand2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@lib/utils'

interface CreateProjectDialogProps {
    trigger?: React.ReactNode
    open?: boolean
    onOpenChange?: (open: boolean) => void
}

export function CreateProjectDialog({ trigger, open, onOpenChange }: CreateProjectDialogProps) {
    const [name, setName] = useState('')
    type ProjectType = 'pptx' | 'template-nr' | 'talking-photo' | 'custom' | 'ai-generated';
    const [type, setType] = useState<ProjectType>('custom')
    const [isLoading, setIsLoading] = useState(false)
    const [internalOpen, setInternalOpen] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    const isControlled = open !== undefined
    const isOpen = isControlled ? open : internalOpen
    const setIsOpen = isControlled ? onOpenChange : setInternalOpen

    const handleCreate = async () => {
        if (!name.trim()) {
            toast.error('Por favor, digite um nome para o projeto')
            return
        }

        setIsLoading(true)
        try {
            const { data: { user: authUser } } = await supabase.auth.getUser()

            // [DEV MODE] Bypass Auth with Cookie check on client side
            let user = authUser;
            if (!user && document.cookie.includes('dev_bypass=true')) {
                console.log('🛡️ Bypass Auth (Client): Cookie found');
                user = { id: 'dev-user-id', email: 'dev@local' } as any;
            }

            if (!user) {
                toast.error('Você precisa estar logado para criar um projeto')
                return
            }

            // Generate project ID client-side for mock compatibility
            const projectId = crypto.randomUUID()

            const insertQuery = supabase
                .from('projects')
                .insert({
                    id: projectId,
                    name,
                    type,
                    user_id: user.id,
                    status: 'draft',
                    thumbnail_url: '/placeholder-project.jpg',
                    render_settings: {},
                    updated_at: new Date().toISOString()
                })

            // Handle both real Supabase (with .select) and mock (without)
            const hasSelect = typeof insertQuery.select === 'function'
            const { error } = hasSelect
                ? await insertQuery.select('id,type').single()
                : await insertQuery

            if (error) throw error

            const data = { id: projectId, type }

            toast.success('Projeto criado com sucesso!')
            setIsOpen?.(false)
            setName('')

            if (type === 'pptx') {
                router.push(`/studio-pro?projectId=${data.id}`)
            } else if (type === 'talking-photo') {
                router.push(`/studio-pro?projectId=${data.id}`)
            } else if (type === 'ai-generated') {
                router.push(`/studio-pro?projectId=${data.id}`)
            } else {
                router.push(`/studio-pro?projectId=${data.id}`)
            }

            router.refresh()
        } catch (error) {
            console.error('Error creating project:', error)
            toast.error('Falha ao criar projeto')
        } finally {
            setIsLoading(false)
        }
    }

    const projectTypes = [
        {
            id: 'custom',
            label: 'Criar do Zero',
            description: 'Editor de vídeo completo com timeline',
            icon: Layout
        },
        {
            id: 'pptx',
            label: 'Importar PPTX',
            description: 'Converta seus slides em vídeo',
            icon: FileText
        },
        {
            id: 'talking-photo',
            label: 'Avatar Falante',
            description: 'Dê vida a fotos com IA',
            icon: User
        },
        {
            id: 'ai-generated',
            label: 'Vídeo com IA',
            description: 'Roteiro e vídeo automático',
            icon: Wand2
        }
    ]

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Novo Projeto</DialogTitle>
                    <DialogDescription>
                        Escolha como você quer começar seu vídeo.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Nome do Projeto</Label>
                        <Input
                            id="name"
                            name="projectName"
                            autoComplete="off"
                            value={name}
                            onChange={(e) => {
                                console.log('[CreateProjectDialog] Input Change:', e.target.value);
                                setName(e.target.value);
                            }}
                            placeholder="Ex: Treinamento de Segurança"
                            className="text-lg"
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label>Tipo de Projeto</Label>
                        <div className="grid grid-cols-3 gap-4">
                            {projectTypes.map((item) => {
                                const Icon = item.icon
                                const isSelected = type === item.id
                                return (
                                    <div
                                        key={item.id}
                                        onClick={() => setType(item.id as ProjectType)}
                                        className={cn(
                                            "cursor-pointer rounded-xl border-2 p-4 hover:bg-accent hover:text-accent-foreground transition-all",
                                            isSelected ? "border-primary bg-primary/5" : "border-muted bg-card"
                                        )}
                                    >
                                        <Icon className={cn("mb-3 h-6 w-6", isSelected ? "text-primary" : "text-muted-foreground")} />
                                        <div className="font-semibold leading-none tracking-tight mb-1">
                                            {item.label}
                                        </div>
                                        <div className="text-xs text-muted-foreground leading-snug">
                                            {item.description}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setIsOpen?.(false)} disabled={isLoading}>
                        Cancelar
                    </Button>
                    <Button onClick={handleCreate} disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Criar Projeto
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
