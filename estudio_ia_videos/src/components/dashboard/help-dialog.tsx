'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@components/ui/dialog'
import { Button } from '@components/ui/button'
import { ScrollArea } from '@components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@components/ui/tabs'
import { 
  BookOpen, 
  MessageCircle, 
  Keyboard, 
  ExternalLink, 
  HelpCircle, 
  PlayCircle, 
  FileText 
} from 'lucide-react'

interface HelpDialogProps {
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function HelpDialog({ trigger, open, onOpenChange }: HelpDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  
  const isControlled = open !== undefined
  const isOpen = isControlled ? open : internalOpen
  const setIsOpen = isControlled ? onOpenChange : setInternalOpen

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            Central de Ajuda
          </DialogTitle>
          <DialogDescription>
            Encontre tutoriais, guias e suporte para seus projetos.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="guide" className="w-full mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="guide">Guia Rápido</TabsTrigger>
            <TabsTrigger value="tutorials">Tutoriais</TabsTrigger>
            <TabsTrigger value="support">Suporte</TabsTrigger>
          </TabsList>

          <TabsContent value="guide" className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-6">
                <section>
                  <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                    <PlayCircle className="h-4 w-4" />
                    Primeiros Passos
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Bem-vindo ao Estúdio IA! Aqui você pode transformar apresentações e textos em vídeos profissionais em minutos.
                  </p>
                  <div className="grid gap-3">
                    <div className="bg-muted p-3 rounded-md">
                      <h4 className="font-medium text-sm">1. Criar Novo Projeto</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Clique em "Novo Projeto" no topo do dashboard. Escolha "Upload PPTX" para importar slides ou "Canvas em Branco" para começar do zero.
                      </p>
                    </div>
                    <div className="bg-muted p-3 rounded-md">
                      <h4 className="font-medium text-sm">2. Editor de Vídeo</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Use a timeline para ajustar tempos. Adicione avatares, narração (TTS) e elementos visuais pelo menu lateral.
                      </p>
                    </div>
                    <div className="bg-muted p-3 rounded-md">
                      <h4 className="font-medium text-sm">3. Exportação</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Quando terminar, clique em "Renderizar" para gerar seu vídeo em MP4 de alta qualidade.
                      </p>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md border border-blue-100 dark:border-blue-800">
                      <h4 className="font-medium text-sm flex items-center gap-2">
                        <span>🎭</span> 4. Avatares Emocionais & Edição
                        <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">Novo</span>
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Defina emoções com intensidade ajustável, ative gestos corporais automáticos e edite clips existentes diretamente na lista.
                      </p>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                    <Keyboard className="h-4 w-4" />
                    Dicas Úteis
                  </h3>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>Use <strong>Espaço</strong> para Play/Pause na timeline.</li>
                    <li><strong>Ctrl+Z</strong> desfaz a última ação.</li>
                    <li>Arraste e solte arquivos de mídia diretamente no canvas.</li>
                  </ul>
                </section>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="tutorials" className="mt-4">
            <div className="grid gap-4">
              <Button variant="outline" className="justify-start h-auto p-4" onClick={() => window.open('/docs/getting-started', '_blank')}>
                <FileText className="h-5 w-5 mr-3 text-blue-500" />
                <div className="text-left">
                  <div className="font-medium">Como importar PPTX</div>
                  <div className="text-xs text-muted-foreground">Aprenda a converter slides em vídeo</div>
                </div>
                <ExternalLink className="ml-auto h-4 w-4 text-muted-foreground" />
              </Button>
              
              <Button variant="outline" className="justify-start h-auto p-4" onClick={() => window.open('/docs/avatars', '_blank')}>
                <FileText className="h-5 w-5 mr-3 text-purple-500" />
                <div className="text-left">
                  <div className="font-medium">Usando Avatares IA</div>
                  <div className="text-xs text-muted-foreground">Configure gestos e fala do avatar</div>
                </div>
                <ExternalLink className="ml-auto h-4 w-4 text-muted-foreground" />
              </Button>

              <Button variant="outline" className="justify-start h-auto p-4" onClick={() => window.open('/docs/tts', '_blank')}>
                <FileText className="h-5 w-5 mr-3 text-green-500" />
                <div className="text-left">
                  <div className="font-medium">Text-to-Speech</div>
                  <div className="text-xs text-muted-foreground">Gere narrações naturais em segundos</div>
                </div>
                <ExternalLink className="ml-auto h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="support" className="mt-4">
            <div className="text-center py-8 space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                <MessageCircle className="h-8 w-8 text-blue-500" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Precisa de ajuda extra?</h3>
                <p className="text-muted-foreground text-sm max-w-xs mx-auto mt-2">
                  Nossa equipe de suporte está disponível para ajudar com problemas técnicos ou dúvidas.
                </p>
              </div>
              <Button className="w-full max-w-xs">
                Falar com Suporte
              </Button>
              <p className="text-xs text-muted-foreground">
                Tempo médio de resposta: 2 horas
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
