'use client'

/**
 * ⌨️ Keyboard Shortcuts Panel
 * 
 * Comprehensive keyboard shortcuts documentation and configuration
 * with search, categories, and customization
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Keyboard,
  Search,
  Command,
  Settings,
  Video,
  Type,
  Layers,
  Clock,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  ZoomIn,
  ZoomOut,
  Undo,
  Redo,
  Copy,
  Scissors,
  Clipboard,
  Save,
  FolderOpen,
  Download,
  Upload,
  Trash2,
  Plus,
  Minus,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Underline,
  Grid,
  Maximize2,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

// ============================================
// Types
// ============================================

export interface Shortcut {
  id: string
  keys: string[]
  action: string
  description: string
  category: ShortcutCategory
  icon?: React.ReactNode
  isCustomizable?: boolean
  isGlobal?: boolean
}

export type ShortcutCategory = 
  | 'general'
  | 'playback'
  | 'timeline'
  | 'canvas'
  | 'text'
  | 'media'
  | 'navigation'
  | 'view'

export interface ShortcutGroup {
  id: ShortcutCategory
  name: string
  icon: React.ReactNode
  shortcuts: Shortcut[]
}

interface KeyboardShortcutsPanelProps {
  className?: string
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

// ============================================
// Default Shortcuts
// ============================================

const DEFAULT_SHORTCUTS: Shortcut[] = [
  // General
  { id: 'save', keys: ['Ctrl', 'S'], action: 'Salvar', description: 'Salvar projeto atual', category: 'general', icon: <Save className="h-4 w-4" /> },
  { id: 'save-as', keys: ['Ctrl', 'Shift', 'S'], action: 'Salvar como', description: 'Salvar com novo nome', category: 'general', icon: <Save className="h-4 w-4" /> },
  { id: 'open', keys: ['Ctrl', 'O'], action: 'Abrir', description: 'Abrir projeto', category: 'general', icon: <FolderOpen className="h-4 w-4" /> },
  { id: 'new', keys: ['Ctrl', 'N'], action: 'Novo projeto', description: 'Criar novo projeto', category: 'general', icon: <Plus className="h-4 w-4" /> },
  { id: 'undo', keys: ['Ctrl', 'Z'], action: 'Desfazer', description: 'Desfazer última ação', category: 'general', icon: <Undo className="h-4 w-4" /> },
  { id: 'redo', keys: ['Ctrl', 'Y'], action: 'Refazer', description: 'Refazer ação desfeita', category: 'general', icon: <Redo className="h-4 w-4" /> },
  { id: 'redo-alt', keys: ['Ctrl', 'Shift', 'Z'], action: 'Refazer', description: 'Refazer ação desfeita (alternativo)', category: 'general', icon: <Redo className="h-4 w-4" /> },
  { id: 'export', keys: ['Ctrl', 'E'], action: 'Exportar', description: 'Exportar vídeo', category: 'general', icon: <Download className="h-4 w-4" /> },
  { id: 'shortcuts', keys: ['Ctrl', '/'], action: 'Atalhos', description: 'Mostrar atalhos de teclado', category: 'general', icon: <Keyboard className="h-4 w-4" /> },
  { id: 'command-palette', keys: ['Ctrl', 'K'], action: 'Paleta de comandos', description: 'Abrir paleta de comandos', category: 'general', icon: <Command className="h-4 w-4" /> },

  // Playback
  { id: 'play-pause', keys: ['Space'], action: 'Play/Pause', description: 'Iniciar ou pausar reprodução', category: 'playback', icon: <Play className="h-4 w-4" /> },
  { id: 'stop', keys: ['S'], action: 'Parar', description: 'Parar reprodução', category: 'playback', icon: <Pause className="h-4 w-4" /> },
  { id: 'rewind', keys: ['J'], action: 'Retroceder', description: 'Retroceder playback', category: 'playback', icon: <SkipBack className="h-4 w-4" /> },
  { id: 'forward', keys: ['L'], action: 'Avançar', description: 'Avançar playback', category: 'playback', icon: <SkipForward className="h-4 w-4" /> },
  { id: 'frame-back', keys: ['←'], action: 'Frame anterior', description: 'Voltar um frame', category: 'playback' },
  { id: 'frame-forward', keys: ['→'], action: 'Próximo frame', description: 'Avançar um frame', category: 'playback' },
  { id: 'go-start', keys: ['Home'], action: 'Ir para início', description: 'Ir para início do projeto', category: 'playback' },
  { id: 'go-end', keys: ['End'], action: 'Ir para fim', description: 'Ir para fim do projeto', category: 'playback' },
  { id: 'mute', keys: ['M'], action: 'Mudo', description: 'Ativar/desativar som', category: 'playback', icon: <Volume2 className="h-4 w-4" /> },
  { id: 'volume-up', keys: ['↑'], action: 'Aumentar volume', description: 'Aumentar volume', category: 'playback' },
  { id: 'volume-down', keys: ['↓'], action: 'Diminuir volume', description: 'Diminuir volume', category: 'playback' },
  { id: 'loop', keys: ['Ctrl', 'L'], action: 'Loop', description: 'Ativar/desativar loop', category: 'playback' },

  // Timeline
  { id: 'add-slide', keys: ['Ctrl', 'M'], action: 'Novo slide', description: 'Adicionar novo slide', category: 'timeline', icon: <Plus className="h-4 w-4" /> },
  { id: 'delete-slide', keys: ['Delete'], action: 'Excluir slide', description: 'Excluir slide selecionado', category: 'timeline', icon: <Trash2 className="h-4 w-4" /> },
  { id: 'duplicate-slide', keys: ['Ctrl', 'D'], action: 'Duplicar slide', description: 'Duplicar slide selecionado', category: 'timeline', icon: <Copy className="h-4 w-4" /> },
  { id: 'cut', keys: ['Ctrl', 'X'], action: 'Recortar', description: 'Recortar seleção', category: 'timeline', icon: <Scissors className="h-4 w-4" /> },
  { id: 'copy', keys: ['Ctrl', 'C'], action: 'Copiar', description: 'Copiar seleção', category: 'timeline', icon: <Copy className="h-4 w-4" /> },
  { id: 'paste', keys: ['Ctrl', 'V'], action: 'Colar', description: 'Colar da área de transferência', category: 'timeline', icon: <Clipboard className="h-4 w-4" /> },
  { id: 'select-all', keys: ['Ctrl', 'A'], action: 'Selecionar tudo', description: 'Selecionar todos os slides', category: 'timeline' },
  { id: 'deselect', keys: ['Escape'], action: 'Desselecionar', description: 'Limpar seleção', category: 'timeline' },
  { id: 'zoom-in-timeline', keys: ['Ctrl', '='], action: 'Zoom in timeline', description: 'Aumentar zoom da timeline', category: 'timeline', icon: <ZoomIn className="h-4 w-4" /> },
  { id: 'zoom-out-timeline', keys: ['Ctrl', '-'], action: 'Zoom out timeline', description: 'Diminuir zoom da timeline', category: 'timeline', icon: <ZoomOut className="h-4 w-4" /> },
  { id: 'fit-timeline', keys: ['Ctrl', '0'], action: 'Ajustar timeline', description: 'Ajustar timeline à tela', category: 'timeline' },
  { id: 'split', keys: ['Ctrl', 'Shift', 'D'], action: 'Dividir', description: 'Dividir clipe na posição atual', category: 'timeline' },

  // Canvas
  { id: 'move-up', keys: ['Ctrl', '↑'], action: 'Mover para cima', description: 'Mover elemento para cima', category: 'canvas' },
  { id: 'move-down', keys: ['Ctrl', '↓'], action: 'Mover para baixo', description: 'Mover elemento para baixo', category: 'canvas' },
  { id: 'move-left', keys: ['Ctrl', '←'], action: 'Mover para esquerda', description: 'Mover elemento para esquerda', category: 'canvas' },
  { id: 'move-right', keys: ['Ctrl', '→'], action: 'Mover para direita', description: 'Mover elemento para direita', category: 'canvas' },
  { id: 'bring-front', keys: ['Ctrl', ']'], action: 'Trazer para frente', description: 'Trazer elemento para frente', category: 'canvas' },
  { id: 'send-back', keys: ['Ctrl', '['], action: 'Enviar para trás', description: 'Enviar elemento para trás', category: 'canvas' },
  { id: 'lock', keys: ['Ctrl', 'Shift', 'L'], action: 'Bloquear', description: 'Bloquear/desbloquear elemento', category: 'canvas', icon: <Lock className="h-4 w-4" /> },
  { id: 'group', keys: ['Ctrl', 'G'], action: 'Agrupar', description: 'Agrupar elementos selecionados', category: 'canvas', icon: <Layers className="h-4 w-4" /> },
  { id: 'ungroup', keys: ['Ctrl', 'Shift', 'G'], action: 'Desagrupar', description: 'Desagrupar elementos', category: 'canvas' },
  { id: 'align-left', keys: ['Alt', 'Shift', 'L'], action: 'Alinhar esquerda', description: 'Alinhar à esquerda', category: 'canvas', icon: <AlignLeft className="h-4 w-4" /> },
  { id: 'align-center', keys: ['Alt', 'Shift', 'C'], action: 'Centralizar', description: 'Centralizar horizontalmente', category: 'canvas', icon: <AlignCenter className="h-4 w-4" /> },
  { id: 'align-right', keys: ['Alt', 'Shift', 'R'], action: 'Alinhar direita', description: 'Alinhar à direita', category: 'canvas', icon: <AlignRight className="h-4 w-4" /> },

  // Text
  { id: 'bold', keys: ['Ctrl', 'B'], action: 'Negrito', description: 'Aplicar negrito', category: 'text', icon: <Bold className="h-4 w-4" /> },
  { id: 'italic', keys: ['Ctrl', 'I'], action: 'Itálico', description: 'Aplicar itálico', category: 'text', icon: <Italic className="h-4 w-4" /> },
  { id: 'underline', keys: ['Ctrl', 'U'], action: 'Sublinhado', description: 'Aplicar sublinhado', category: 'text', icon: <Underline className="h-4 w-4" /> },
  { id: 'add-text', keys: ['T'], action: 'Adicionar texto', description: 'Adicionar caixa de texto', category: 'text', icon: <Type className="h-4 w-4" /> },
  { id: 'increase-font', keys: ['Ctrl', 'Shift', '>'], action: 'Aumentar fonte', description: 'Aumentar tamanho da fonte', category: 'text' },
  { id: 'decrease-font', keys: ['Ctrl', 'Shift', '<'], action: 'Diminuir fonte', description: 'Diminuir tamanho da fonte', category: 'text' },

  // Media
  { id: 'add-media', keys: ['Ctrl', 'Shift', 'I'], action: 'Importar mídia', description: 'Importar arquivo de mídia', category: 'media', icon: <Upload className="h-4 w-4" /> },
  { id: 'add-image', keys: ['I'], action: 'Adicionar imagem', description: 'Adicionar imagem ao canvas', category: 'media' },
  { id: 'add-video', keys: ['V'], action: 'Adicionar vídeo', description: 'Adicionar vídeo ao projeto', category: 'media', icon: <Video className="h-4 w-4" /> },
  { id: 'add-audio', keys: ['A'], action: 'Adicionar áudio', description: 'Adicionar trilha de áudio', category: 'media' },
  { id: 'record', keys: ['R'], action: 'Gravar', description: 'Iniciar gravação', category: 'media' },

  // Navigation
  { id: 'next-slide', keys: ['PageDown'], action: 'Próximo slide', description: 'Ir para próximo slide', category: 'navigation' },
  { id: 'prev-slide', keys: ['PageUp'], action: 'Slide anterior', description: 'Ir para slide anterior', category: 'navigation' },
  { id: 'first-slide', keys: ['Ctrl', 'Home'], action: 'Primeiro slide', description: 'Ir para primeiro slide', category: 'navigation' },
  { id: 'last-slide', keys: ['Ctrl', 'End'], action: 'Último slide', description: 'Ir para último slide', category: 'navigation' },
  { id: 'go-to-slide', keys: ['Ctrl', 'G'], action: 'Ir para slide', description: 'Ir para slide específico', category: 'navigation' },

  // View
  { id: 'fullscreen', keys: ['F11'], action: 'Tela cheia', description: 'Ativar/desativar tela cheia', category: 'view', icon: <Maximize2 className="h-4 w-4" /> },
  { id: 'preview', keys: ['Ctrl', 'P'], action: 'Preview', description: 'Visualizar projeto', category: 'view', icon: <Eye className="h-4 w-4" /> },
  { id: 'zoom-in', keys: ['Ctrl', '+'], action: 'Zoom in', description: 'Aumentar zoom', category: 'view', icon: <ZoomIn className="h-4 w-4" /> },
  { id: 'zoom-out', keys: ['Ctrl', '-'], action: 'Zoom out', description: 'Diminuir zoom', category: 'view', icon: <ZoomOut className="h-4 w-4" /> },
  { id: 'fit-screen', keys: ['Ctrl', '1'], action: 'Ajustar à tela', description: 'Ajustar visualização à tela', category: 'view' },
  { id: 'actual-size', keys: ['Ctrl', '2'], action: 'Tamanho real', description: 'Exibir em tamanho real', category: 'view' },
  { id: 'toggle-grid', keys: ['Ctrl', "'"], action: 'Grade', description: 'Mostrar/ocultar grade', category: 'view', icon: <Grid className="h-4 w-4" /> },
  { id: 'toggle-rulers', keys: ['Ctrl', 'R'], action: 'Réguas', description: 'Mostrar/ocultar réguas', category: 'view' },
  { id: 'toggle-sidebar', keys: ['Ctrl', 'B'], action: 'Sidebar', description: 'Mostrar/ocultar sidebar', category: 'view' },
  { id: 'toggle-timeline', keys: ['Ctrl', 'T'], action: 'Timeline', description: 'Mostrar/ocultar timeline', category: 'view' },
]

const CATEGORY_INFO: Record<ShortcutCategory, { name: string; icon: React.ReactNode }> = {
  general: { name: 'Geral', icon: <Command className="h-4 w-4" /> },
  playback: { name: 'Reprodução', icon: <Play className="h-4 w-4" /> },
  timeline: { name: 'Timeline', icon: <Clock className="h-4 w-4" /> },
  canvas: { name: 'Canvas', icon: <Layers className="h-4 w-4" /> },
  text: { name: 'Texto', icon: <Type className="h-4 w-4" /> },
  media: { name: 'Mídia', icon: <Video className="h-4 w-4" /> },
  navigation: { name: 'Navegação', icon: <SkipForward className="h-4 w-4" /> },
  view: { name: 'Visualização', icon: <Eye className="h-4 w-4" /> },
}

// ============================================
// Keyboard Shortcuts Panel
// ============================================

export function KeyboardShortcutsPanel({
  className,
  trigger,
  open: controlledOpen,
  onOpenChange
}: KeyboardShortcutsPanelProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen ?? internalOpen
  const setOpen = onOpenChange ?? setInternalOpen

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<ShortcutCategory | 'all'>('all')

  // Filter shortcuts based on search and category
  const filteredShortcuts = useMemo(() => {
    return DEFAULT_SHORTCUTS.filter(shortcut => {
      const matchesSearch = searchQuery === '' ||
        shortcut.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        shortcut.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        shortcut.keys.join(' ').toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesCategory = selectedCategory === 'all' || shortcut.category === selectedCategory
      
      return matchesSearch && matchesCategory
    })
  }, [searchQuery, selectedCategory])

  // Group shortcuts by category
  const groupedShortcuts = useMemo(() => {
    const groups: ShortcutGroup[] = []
    const categories: ShortcutCategory[] = ['general', 'playback', 'timeline', 'canvas', 'text', 'media', 'navigation', 'view']
    
    categories.forEach(category => {
      const categoryShortcuts = filteredShortcuts.filter(s => s.category === category)
      if (categoryShortcuts.length > 0) {
        groups.push({
          id: category,
          name: CATEGORY_INFO[category].name,
          icon: CATEGORY_INFO[category].icon,
          shortcuts: categoryShortcuts
        })
      }
    })
    
    return groups
  }, [filteredShortcuts])

  // Handle keyboard shortcut to open panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault()
        setOpen(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [setOpen])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Atalhos de Teclado
          </DialogTitle>
          <DialogDescription>
            Use atalhos de teclado para trabalhar mais rápido. Pressione{' '}
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">Ctrl</kbd>
            {' + '}
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">/</kbd>
            {' '}a qualquer momento para abrir esta referência.
          </DialogDescription>
        </DialogHeader>

        {/* Search and Filter */}
        <div className="flex gap-3 py-3 border-b">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar atalhos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Category Tabs */}
        <Tabs
          value={selectedCategory}
          onValueChange={(v) => setSelectedCategory(v as ShortcutCategory | 'all')}
          className="flex-1 overflow-hidden flex flex-col"
        >
          <TabsList className="justify-start overflow-x-auto flex-shrink-0">
            <TabsTrigger value="all">Todos</TabsTrigger>
            {Object.entries(CATEGORY_INFO).map(([key, { name, icon }]) => (
              <TabsTrigger key={key} value={key} className="gap-1.5">
                {icon}
                <span className="hidden sm:inline">{name}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={selectedCategory} className="flex-1 mt-4 overflow-hidden">
            <ScrollArea className="h-full pr-4">
              {filteredShortcuts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Search className="h-12 w-12 mb-4 opacity-50" />
                  <p className="text-lg font-medium">Nenhum atalho encontrado</p>
                  <p className="text-sm">Tente buscar com outros termos</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {groupedShortcuts.map(group => (
                    <div key={group.id}>
                      <div className="flex items-center gap-2 mb-3 text-muted-foreground">
                        {group.icon}
                        <h3 className="font-medium">{group.name}</h3>
                        <Badge variant="secondary" className="ml-auto">
                          {group.shortcuts.length}
                        </Badge>
                      </div>
                      
                      <div className="grid gap-1">
                        {group.shortcuts.map(shortcut => (
                          <ShortcutItem key={shortcut.id} shortcut={shortcut} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="border-t pt-4 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {filteredShortcuts.length} atalho{filteredShortcuts.length !== 1 ? 's' : ''} encontrado{filteredShortcuts.length !== 1 ? 's' : ''}
          </p>
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ============================================
// Shortcut Item
// ============================================

function ShortcutItem({ shortcut }: { shortcut: Shortcut }) {
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted transition-colors group">
      <div className="flex items-center gap-3">
        {shortcut.icon && (
          <div className="w-8 h-8 rounded bg-muted flex items-center justify-center group-hover:bg-background">
            {shortcut.icon}
          </div>
        )}
        <div>
          <p className="font-medium text-sm">{shortcut.action}</p>
          <p className="text-xs text-muted-foreground">{shortcut.description}</p>
        </div>
      </div>
      
      <div className="flex items-center gap-1">
        {shortcut.keys.map((key, index) => (
          <React.Fragment key={index}>
            {index > 0 && <span className="text-muted-foreground text-xs">+</span>}
            <kbd className={cn(
              'px-2 py-1 rounded text-xs font-mono',
              'bg-muted border border-border shadow-sm',
              'min-w-[28px] text-center'
            )}>
              {formatKey(key)}
            </kbd>
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}

// ============================================
// Keyboard Key Display Component
// ============================================

export function KeyboardKey({
  children,
  className
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <kbd className={cn(
      'inline-flex items-center justify-center px-2 py-1 rounded',
      'bg-muted border border-border shadow-sm',
      'text-xs font-mono min-w-[28px]',
      className
    )}>
      {children}
    </kbd>
  )
}

// ============================================
// Quick Shortcut Hint
// ============================================

export function ShortcutHint({
  keys,
  className
}: {
  keys: string[]
  className?: string
}) {
  return (
    <div className={cn('inline-flex items-center gap-0.5', className)}>
      {keys.map((key, index) => (
        <React.Fragment key={index}>
          {index > 0 && <span className="text-muted-foreground text-[10px]">+</span>}
          <kbd className="px-1 py-0.5 rounded text-[10px] font-mono bg-muted border text-muted-foreground">
            {formatKey(key)}
          </kbd>
        </React.Fragment>
      ))}
    </div>
  )
}

// ============================================
// Hook for registering shortcuts
// ============================================

export function useKeyboardShortcut(
  keys: string[],
  callback: (e: KeyboardEvent) => void,
  options: {
    enabled?: boolean
    preventDefault?: boolean
  } = {}
) {
  const { enabled = true, preventDefault = true } = options

  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (e: KeyboardEvent) => {
      const pressedKeys: string[] = []
      
      if (e.ctrlKey || e.metaKey) pressedKeys.push('Ctrl')
      if (e.shiftKey) pressedKeys.push('Shift')
      if (e.altKey) pressedKeys.push('Alt')
      
      const key = e.key.length === 1 ? e.key.toUpperCase() : e.key
      pressedKeys.push(key)
      
      // Check if keys match
      const normalizedExpected = keys.map(k => k.toLowerCase())
      const normalizedPressed = pressedKeys.map(k => k.toLowerCase())
      
      if (normalizedExpected.length === normalizedPressed.length &&
          normalizedExpected.every(k => normalizedPressed.includes(k))) {
        if (preventDefault) {
          e.preventDefault()
        }
        callback(e)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [keys, callback, enabled, preventDefault])
}

// ============================================
// Utilities
// ============================================

function formatKey(key: string): string {
  const keyMap: Record<string, string> = {
    'Ctrl': '⌘',
    'Control': '⌘',
    'Alt': '⌥',
    'Shift': '⇧',
    'Enter': '↵',
    'Escape': 'Esc',
    'ArrowUp': '↑',
    'ArrowDown': '↓',
    'ArrowLeft': '←',
    'ArrowRight': '→',
    'Backspace': '⌫',
    'Delete': 'Del',
    'Space': '␣',
    'Tab': '⇥'
  }
  
  // Check if on Mac
  const isMac = typeof navigator !== 'undefined' && /Mac/.test(navigator.platform)
  
  if (!isMac) {
    // Return Windows/Linux key names
    return keyMap[key]?.replace('⌘', 'Ctrl').replace('⌥', 'Alt').replace('⇧', 'Shift') || key
  }
  
  return keyMap[key] || key
}

// ============================================
// Exports
// ============================================

export default KeyboardShortcutsPanel
export { DEFAULT_SHORTCUTS, CATEGORY_INFO }
