'use client'

/**
 * 📜 Version History Panel
 * 
 * Visual interface for browsing and managing project versions:
 * - Timeline view of versions
 * - Version comparison (diff)
 * - Restore functionality
 * - Version labeling and tagging
 */

import React, { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  History,
  Clock,
  RotateCcw,
  Tag,
  GitBranch,
  GitCommit,
  ChevronDown,
  ChevronRight,
  Trash2,
  Edit2,
  Eye,
  Check,
  X,
  Save,
  AlertTriangle,
  Calendar,
  HardDrive,
  MoreVertical,
  Search,
  Filter,
  Zap,
  User
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  useVersionHistory,
  type ProjectVersion,
  type ProjectSnapshot,
  type VersionDiff
} from '@/hooks/use-version-history'

// ============================================
// Types
// ============================================

interface VersionHistoryPanelProps {
  projectId: string
  currentSnapshot?: ProjectSnapshot
  onRestore?: (snapshot: ProjectSnapshot) => void
  className?: string
}

interface VersionItemProps {
  version: ProjectVersion
  isCurrentVersion: boolean
  isSelected: boolean
  onSelect: () => void
  onRestore: () => void
  onDelete: () => void
  onEdit: (updates: { label?: string; description?: string }) => void
}

// ============================================
// Main Component
// ============================================

export function VersionHistoryPanel({
  projectId,
  currentSnapshot,
  onRestore,
  className
}: VersionHistoryPanelProps) {
  const {
    versions,
    currentVersion,
    isLoading,
    hasUnsavedChanges,
    stats,
    createVersion,
    restoreVersion,
    deleteVersion,
    updateVersionMetadata,
    compareVersions
  } = useVersionHistory({ projectId })

  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null)
  const [compareVersionId, setCompareVersionId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'manual' | 'auto'>('all')
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [versionToDelete, setVersionToDelete] = useState<string | null>(null)

  // Filter versions
  const filteredVersions = useMemo(() => {
    return versions.filter(version => {
      // Filter by type
      if (filterType === 'manual' && version.isAutoSave) return false
      if (filterType === 'auto' && !version.isAutoSave) return false
      
      // Filter by search
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return (
          version.label?.toLowerCase().includes(query) ||
          version.description?.toLowerCase().includes(query) ||
          version.tags.some(tag => tag.toLowerCase().includes(query))
        )
      }
      
      return true
    })
  }, [versions, filterType, searchQuery])

  // Group versions by date
  const groupedVersions = useMemo(() => {
    const groups: Map<string, ProjectVersion[]> = new Map()
    
    filteredVersions.forEach(version => {
      const date = new Date(version.createdAt).toLocaleDateString('pt-BR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
      
      const existing = groups.get(date) || []
      groups.set(date, [...existing, version])
    })
    
    return groups
  }, [filteredVersions])

  // Handle save current version
  const handleSaveVersion = useCallback(async (label: string, description?: string) => {
    if (!currentSnapshot) return
    
    await createVersion(currentSnapshot, {
      label,
      description,
      isAutoSave: false
    })
    
    setShowSaveDialog(false)
  }, [currentSnapshot, createVersion])

  // Handle restore
  const handleRestore = useCallback(async (versionId: string) => {
    const snapshot = await restoreVersion(versionId)
    if (snapshot && onRestore) {
      onRestore(snapshot)
    }
  }, [restoreVersion, onRestore])

  // Handle delete
  const handleDelete = useCallback(async () => {
    if (!versionToDelete) return
    
    await deleteVersion(versionToDelete)
    setVersionToDelete(null)
    setShowDeleteDialog(false)
    
    if (selectedVersionId === versionToDelete) {
      setSelectedVersionId(null)
    }
  }, [versionToDelete, deleteVersion, selectedVersionId])

  // Get diff between versions
  const diff = useMemo(() => {
    if (!selectedVersionId || !compareVersionId) return null
    return compareVersions(selectedVersionId, compareVersionId)
  }, [selectedVersionId, compareVersionId, compareVersions])

  const selectedVersion = versions.find(v => v.id === selectedVersionId)

  return (
    <div className={cn('flex flex-col h-full bg-background', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5" />
          <h2 className="font-semibold">Histórico de Versões</h2>
          {hasUnsavedChanges && (
            <Badge variant="outline" className="text-amber-600 border-amber-300">
              Não salvo
            </Badge>
          )}
        </div>
        
        <Button onClick={() => setShowSaveDialog(true)} size="sm">
          <Save className="h-4 w-4 mr-1" />
          Salvar versão
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 p-4 border-b bg-muted/30">
        <div className="text-center">
          <p className="text-2xl font-bold">{stats.totalVersions}</p>
          <p className="text-xs text-muted-foreground">Versões</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold">{stats.manualCount}</p>
          <p className="text-xs text-muted-foreground">Manuais</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold">{formatFileSize(stats.totalSize)}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-2 p-3 border-b">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar versões..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9">
              <Filter className="h-4 w-4 mr-1" />
              {filterType === 'all' ? 'Todas' : filterType === 'manual' ? 'Manuais' : 'Auto'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setFilterType('all')}>
              Todas as versões
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilterType('manual')}>
              Apenas manuais
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilterType('auto')}>
              Apenas auto-save
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Version List */}
        <div className="w-1/2 border-r overflow-hidden flex flex-col">
          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : filteredVersions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <History className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">Nenhuma versão encontrada</p>
              </div>
            ) : (
              <div className="p-2">
                {Array.from(groupedVersions.entries()).map(([date, versionGroup]) => (
                  <div key={date} className="mb-4">
                    <div className="flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground sticky top-0 bg-background">
                      <Calendar className="h-3 w-3" />
                      {date}
                    </div>
                    
                    <div className="space-y-1">
                      {versionGroup.map(version => (
                        <VersionItem
                          key={version.id}
                          version={version}
                          isCurrentVersion={version.id === currentVersion?.id}
                          isSelected={version.id === selectedVersionId}
                          onSelect={() => setSelectedVersionId(version.id)}
                          onRestore={() => handleRestore(version.id)}
                          onDelete={() => {
                            setVersionToDelete(version.id)
                            setShowDeleteDialog(true)
                          }}
                          onEdit={(updates) => updateVersionMetadata(version.id, updates)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Version Details */}
        <div className="w-1/2 overflow-hidden flex flex-col">
          {selectedVersion ? (
            <VersionDetails
              version={selectedVersion}
              isCurrentVersion={selectedVersion.id === currentVersion?.id}
              onRestore={() => handleRestore(selectedVersion.id)}
              onCompareWith={(id) => setCompareVersionId(id)}
              compareVersionId={compareVersionId}
              availableVersions={versions.filter(v => v.id !== selectedVersion.id)}
              diff={diff}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Selecione uma versão para ver detalhes</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Save Dialog */}
      <SaveVersionDialog
        open={showSaveDialog}
        onOpenChange={setShowSaveDialog}
        onSave={handleSaveVersion}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir versão?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A versão será permanentemente excluída.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ============================================
// Version Item Component
// ============================================

function VersionItem({
  version,
  isCurrentVersion,
  isSelected,
  onSelect,
  onRestore,
  onDelete,
  onEdit
}: VersionItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editLabel, setEditLabel] = useState(version.label || '')

  const handleSaveEdit = () => {
    onEdit({ label: editLabel })
    setIsEditing(false)
  }

  return (
    <div
      className={cn(
        'group flex items-start gap-2 p-2 rounded-lg cursor-pointer transition-colors',
        isSelected ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted',
        isCurrentVersion && 'ring-2 ring-green-500/30'
      )}
      onClick={onSelect}
    >
      {/* Timeline indicator */}
      <div className="flex flex-col items-center pt-1">
        <div className={cn(
          'w-3 h-3 rounded-full border-2',
          isCurrentVersion 
            ? 'bg-green-500 border-green-600' 
            : version.isAutoSave 
            ? 'bg-muted border-muted-foreground/30'
            : 'bg-primary border-primary'
        )} />
        <div className="w-0.5 flex-1 bg-border mt-1" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          {isEditing ? (
            <div className="flex-1 flex items-center gap-1">
              <Input
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                className="h-7 text-sm"
                onClick={(e) => e.stopPropagation()}
                autoFocus
              />
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={(e) => {
                  e.stopPropagation()
                  handleSaveEdit()
                }}
              >
                <Check className="h-3 w-3" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={(e) => {
                  e.stopPropagation()
                  setIsEditing(false)
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm truncate">
                  {version.label || `v${version.version}`}
                </span>
                {isCurrentVersion && (
                  <Badge variant="secondary" className="text-[10px] h-4">
                    Atual
                  </Badge>
                )}
                {version.isAutoSave && (
                  <Zap className="h-3 w-3 text-muted-foreground" />
                )}
              </div>
              
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                <Clock className="h-3 w-3" />
                {formatTime(version.createdAt)}
                <span>•</span>
                <HardDrive className="h-3 w-3" />
                {formatFileSize(version.size)}
              </div>
            </div>
          )}

          {/* Actions */}
          {!isEditing && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {!isCurrentVersion && (
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation()
                    onRestore()
                  }}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Restaurar
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation()
                  setIsEditing(true)
                }}>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Renomear
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete()
                  }}
                  disabled={isCurrentVersion}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Tags */}
        {version.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {version.tags.map(tag => (
              <Badge key={tag} variant="outline" className="text-[10px] h-4">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================
// Version Details Component
// ============================================

function VersionDetails({
  version,
  isCurrentVersion,
  onRestore,
  onCompareWith,
  compareVersionId,
  availableVersions,
  diff
}: {
  version: ProjectVersion
  isCurrentVersion: boolean
  onRestore: () => void
  onCompareWith: (id: string | null) => void
  compareVersionId: string | null
  availableVersions: ProjectVersion[]
  diff: VersionDiff | null
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">{version.label || `Versão ${version.version}`}</h3>
          {!isCurrentVersion && (
            <Button size="sm" onClick={onRestore}>
              <RotateCcw className="h-4 w-4 mr-1" />
              Restaurar
            </Button>
          )}
        </div>
        
        {version.description && (
          <p className="text-sm text-muted-foreground mb-3">{version.description}</p>
        )}
        
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            {new Date(version.createdAt).toLocaleString('pt-BR')}
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <HardDrive className="h-4 w-4" />
            {formatFileSize(version.size)}
          </div>
          {version.createdBy && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="h-4 w-4" />
              {version.createdBy}
            </div>
          )}
          <div className="flex items-center gap-2 text-muted-foreground">
            {version.isAutoSave ? (
              <>
                <Zap className="h-4 w-4" />
                Auto-save
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Manual
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="snapshot" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="mx-4 mt-2">
          <TabsTrigger value="snapshot">Snapshot</TabsTrigger>
          <TabsTrigger value="compare">Comparar</TabsTrigger>
        </TabsList>

        <TabsContent value="snapshot" className="flex-1 overflow-auto p-4">
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-2">Slides</h4>
              <div className="grid grid-cols-4 gap-2">
                {version.snapshot.slides.slice(0, 8).map((slide, index) => (
                  <div
                    key={slide.id}
                    className="aspect-video bg-muted rounded flex items-center justify-center text-xs text-muted-foreground"
                  >
                    {index + 1}
                  </div>
                ))}
                {version.snapshot.slides.length > 8 && (
                  <div className="aspect-video bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                    +{version.snapshot.slides.length - 8}
                  </div>
                )}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">Configurações</h4>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>Resolução: {version.snapshot.settings.resolution.width}x{version.snapshot.settings.resolution.height}</p>
                <p>FPS: {version.snapshot.settings.fps}</p>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">Assets</h4>
              <p className="text-sm text-muted-foreground">
                {version.snapshot.assets.length} arquivo(s)
              </p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="compare" className="flex-1 overflow-auto p-4">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Comparar com:</label>
              <select
                value={compareVersionId || ''}
                onChange={(e) => onCompareWith(e.target.value || null)}
                className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
              >
                <option value="">Selecione uma versão</option>
                {availableVersions.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.label || `v${v.version}`} - {formatTime(v.createdAt)}
                  </option>
                ))}
              </select>
            </div>

            {diff && (
              <div className="space-y-3">
                {diff.added.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-green-600 mb-1">
                      Adicionados ({diff.added.length})
                    </h4>
                    <div className="space-y-1">
                      {diff.added.map(item => (
                        <div key={item.id} className="text-sm p-2 bg-green-50 rounded">
                          {item.type}: {item.path}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {diff.removed.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-red-600 mb-1">
                      Removidos ({diff.removed.length})
                    </h4>
                    <div className="space-y-1">
                      {diff.removed.map(item => (
                        <div key={item.id} className="text-sm p-2 bg-red-50 rounded">
                          {item.type}: {item.path}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {diff.modified.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-amber-600 mb-1">
                      Modificados ({diff.modified.length})
                    </h4>
                    <div className="space-y-1">
                      {diff.modified.map(item => (
                        <div key={item.id} className="text-sm p-2 bg-amber-50 rounded">
                          {item.type}: {item.path}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {diff.added.length === 0 && diff.removed.length === 0 && diff.modified.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhuma diferença encontrada
                  </p>
                )}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ============================================
// Save Version Dialog
// ============================================

function SaveVersionDialog({
  open,
  onOpenChange,
  onSave
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (label: string, description?: string) => void
}) {
  const [label, setLabel] = useState('')
  const [description, setDescription] = useState('')

  const handleSave = () => {
    if (!label.trim()) return
    onSave(label, description || undefined)
    setLabel('')
    setDescription('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Salvar nova versão</DialogTitle>
          <DialogDescription>
            Crie um ponto de restauração do estado atual do projeto.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nome da versão *</label>
            <Input
              placeholder="Ex: Antes de adicionar animações"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Descrição (opcional)</label>
            <Textarea
              placeholder="Descreva as alterações..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!label.trim()}>
            <Save className="h-4 w-4 mr-1" />
            Salvar versão
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================
// Utilities
// ============================================

function formatTime(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

// ============================================
// Exports
// ============================================

export default VersionHistoryPanel
