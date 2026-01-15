'use client'

/**
 * Media Library Panel - Draggable Media Assets
 *
 * Features:
 * - Upload images, videos
 * - Drag items to canvas
 * - Avatar templates
 * - Search and filter
 */

import React, { useState, useCallback, useRef } from 'react'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'
import { ScrollArea } from '@components/ui/scroll-area'
import { Badge } from '@components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@components/ui/tabs'
import { toast } from 'sonner'
import { cn } from '@lib/utils'
import {
  Image as ImageIcon,
  Video,
  User,
  Upload,
  Search,
  X,
  GripVertical,
  Plus,
  FolderOpen,
  Sparkles,
  Mic
} from 'lucide-react'

// Media item type
export interface MediaItem {
  id: string
  type: 'image' | 'video' | 'avatar'
  name: string
  url: string
  thumbnail?: string
  duration?: number
  metadata?: Record<string, unknown>
}

// Avatar template
interface AvatarTemplate {
  id: string
  name: string
  thumbnail: string
  engine: 'heygen' | 'synthesia' | 'did'
  voiceId?: string
}

// Sample avatar templates
const AVATAR_TEMPLATES: AvatarTemplate[] = [
  { id: 'avatar-1', name: 'Ana (Profissional)', thumbnail: '/avatars/ana.png', engine: 'heygen' },
  { id: 'avatar-2', name: 'Carlos (Educador)', thumbnail: '/avatars/carlos.png', engine: 'heygen' },
  { id: 'avatar-3', name: 'Sofia (Apresentadora)', thumbnail: '/avatars/sofia.png', engine: 'synthesia' },
  { id: 'avatar-4', name: 'Pedro (Tech)', thumbnail: '/avatars/pedro.png', engine: 'did' },
]

interface MediaLibraryPanelProps {
  onMediaSelect?: (item: MediaItem) => void
  onAvatarSelect?: (avatar: AvatarTemplate) => void
}

// Draggable media item component
const DraggableMediaItem: React.FC<{
  item: MediaItem | AvatarTemplate
  type: 'media' | 'avatar'
}> = ({ item, type }) => {
  const handleDragStart = (e: React.DragEvent) => {
    // Set drag data
    const dragData = {
      type: 'media-library-item',
      mediaType: type === 'avatar' ? 'avatar' : (item as MediaItem).type,
      id: item.id,
      name: item.name,
      url: type === 'media' ? (item as MediaItem).url : (item as AvatarTemplate).thumbnail,
      thumbnail: item.thumbnail,
      metadata: type === 'avatar' ? {
        engine: (item as AvatarTemplate).engine,
        voiceId: (item as AvatarTemplate).voiceId
      } : (item as MediaItem).metadata
    }

    e.dataTransfer.setData('application/json', JSON.stringify(dragData))
    e.dataTransfer.setData('text/plain', item.name)
    e.dataTransfer.effectAllowed = 'copy'

    // Custom drag image
    const dragEl = e.currentTarget as HTMLElement
    if (dragEl) {
      e.dataTransfer.setDragImage(dragEl, 40, 40)
    }
  }

  const isMedia = type === 'media'
  const mediaItem = item as MediaItem
  const avatarItem = item as AvatarTemplate

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className={cn(
        "group relative bg-white/5 rounded-lg overflow-hidden cursor-grab active:cursor-grabbing",
        "border border-transparent hover:border-blue-500/50 transition-all duration-200",
        "hover:bg-white/10 hover:shadow-lg hover:shadow-blue-500/10"
      )}
    >
      {/* Thumbnail */}
      <div className="aspect-video bg-gray-800 relative overflow-hidden">
        {item.thumbnail ? (
          <img
            src={item.thumbnail}
            alt={item.name}
            className="w-full h-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {type === 'avatar' ? (
              <User className="w-8 h-8 text-purple-400" />
            ) : mediaItem.type === 'video' ? (
              <Video className="w-8 h-8 text-blue-400" />
            ) : (
              <ImageIcon className="w-8 h-8 text-green-400" />
            )}
          </div>
        )}

        {/* Type badge */}
        <div className="absolute top-1 right-1">
          {type === 'avatar' ? (
            <Badge className="bg-purple-500/80 text-[10px] px-1.5 py-0.5">
              <Sparkles className="w-2.5 h-2.5 mr-0.5" />
              IA
            </Badge>
          ) : mediaItem.type === 'video' && mediaItem.duration ? (
            <Badge className="bg-black/60 text-[10px] px-1.5 py-0.5">
              {Math.floor(mediaItem.duration / 60)}:{(mediaItem.duration % 60).toString().padStart(2, '0')}
            </Badge>
          ) : null}
        </div>

        {/* Drag indicator */}
        <div className="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/10 transition-colors flex items-center justify-center">
          <GripVertical className="w-6 h-6 text-white opacity-0 group-hover:opacity-80 transition-opacity" />
        </div>
      </div>

      {/* Name */}
      <div className="p-2">
        <p className="text-xs text-gray-300 truncate">{item.name}</p>
        {type === 'avatar' && (
          <p className="text-[10px] text-gray-500 mt-0.5 capitalize">
            {avatarItem.engine}
          </p>
        )}
      </div>
    </div>
  )
}

export function MediaLibraryPanel({ onMediaSelect, onAvatarSelect }: MediaLibraryPanelProps) {
  const [activeTab, setActiveTab] = useState('images')
  const [searchQuery, setSearchQuery] = useState('')
  const [uploadedMedia, setUploadedMedia] = useState<MediaItem[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Handle file upload
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const newMedia: MediaItem[] = []

    Array.from(files).forEach((file) => {
      const isVideo = file.type.startsWith('video/')
      const isImage = file.type.startsWith('image/')

      if (!isVideo && !isImage) {
        toast.error(`Tipo nao suportado: ${file.name}`)
        return
      }

      const url = URL.createObjectURL(file)
      const item: MediaItem = {
        id: `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: isVideo ? 'video' : 'image',
        name: file.name.split('.')[0],
        url,
        thumbnail: isImage ? url : undefined,
      }

      newMedia.push(item)
    })

    if (newMedia.length > 0) {
      setUploadedMedia((prev) => [...newMedia, ...prev])
      toast.success(`${newMedia.length} arquivo(s) adicionado(s)`)
    }

    e.target.value = ''
  }, [])

  // Filter media by search
  const filteredMedia = uploadedMedia.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredAvatars = AVATAR_TEMPLATES.filter((avatar) =>
    avatar.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-white/5 space-y-3">
        <h3 className="text-sm font-semibold text-white">Biblioteca de Midia</h3>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input
            placeholder="Buscar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-sm bg-white/5 border-white/10 focus:border-blue-500"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
              onClick={() => setSearchQuery('')}
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>

        {/* Upload button */}
        <Button
          onClick={() => fileInputRef.current?.click()}
          className="w-full h-9 bg-blue-600 hover:bg-blue-700 text-white"
          size="sm"
        >
          <Upload className="w-4 h-4 mr-2" />
          Upload Midia
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid grid-cols-3 mx-4 mt-3 bg-white/5">
          <TabsTrigger value="images" className="text-xs data-[state=active]:bg-blue-600">
            <ImageIcon className="w-3.5 h-3.5 mr-1" />
            Imagens
          </TabsTrigger>
          <TabsTrigger value="videos" className="text-xs data-[state=active]:bg-blue-600">
            <Video className="w-3.5 h-3.5 mr-1" />
            Videos
          </TabsTrigger>
          <TabsTrigger value="avatars" className="text-xs data-[state=active]:bg-purple-600">
            <User className="w-3.5 h-3.5 mr-1" />
            Avatares
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1 px-4 py-3">
          {/* Images Tab */}
          <TabsContent value="images" className="m-0">
            {filteredMedia.filter((m) => m.type === 'image').length === 0 ? (
              <EmptyState
                icon={ImageIcon}
                title="Nenhuma imagem"
                description="Faca upload ou arraste imagens aqui"
                onUpload={() => fileInputRef.current?.click()}
              />
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {filteredMedia
                  .filter((m) => m.type === 'image')
                  .map((item) => (
                    <DraggableMediaItem key={item.id} item={item} type="media" />
                  ))}
              </div>
            )}
          </TabsContent>

          {/* Videos Tab */}
          <TabsContent value="videos" className="m-0">
            {filteredMedia.filter((m) => m.type === 'video').length === 0 ? (
              <EmptyState
                icon={Video}
                title="Nenhum video"
                description="Faca upload de videos MP4, WebM"
                onUpload={() => fileInputRef.current?.click()}
              />
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {filteredMedia
                  .filter((m) => m.type === 'video')
                  .map((item) => (
                    <DraggableMediaItem key={item.id} item={item} type="media" />
                  ))}
              </div>
            )}
          </TabsContent>

          {/* Avatars Tab */}
          <TabsContent value="avatars" className="m-0">
            <div className="space-y-4">
              {/* Info box */}
              <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                <div className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-purple-300 font-medium">Avatares com IA</p>
                    <p className="text-[10px] text-purple-400/70 mt-0.5">
                      Arraste um avatar para o canvas. Configure a voz no painel de propriedades.
                    </p>
                  </div>
                </div>
              </div>

              {/* Avatar grid */}
              <div className="grid grid-cols-2 gap-2">
                {filteredAvatars.map((avatar) => (
                  <DraggableMediaItem key={avatar.id} item={avatar} type="avatar" />
                ))}
              </div>

              {/* Custom avatar option */}
              <Button
                variant="outline"
                className="w-full h-auto py-4 border-dashed border-white/20 hover:border-purple-500/50 hover:bg-purple-500/5"
                onClick={() => toast.info('Em breve: Upload de avatar personalizado')}
              >
                <div className="flex flex-col items-center gap-2">
                  <Plus className="w-5 h-5 text-purple-400" />
                  <span className="text-xs text-gray-400">Avatar Personalizado</span>
                </div>
              </Button>
            </div>
          </TabsContent>
        </ScrollArea>
      </Tabs>

      {/* Instructions */}
      <div className="p-3 border-t border-white/5 bg-white/[0.02]">
        <p className="text-[10px] text-gray-500 text-center">
          Arraste e solte os itens diretamente no canvas
        </p>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={handleFileUpload}
      />
    </div>
  )
}

// Empty state component
const EmptyState: React.FC<{
  icon: typeof ImageIcon
  title: string
  description: string
  onUpload: () => void
}> = ({ icon: Icon, title, description, onUpload }) => (
  <div className="flex flex-col items-center justify-center py-8 text-center">
    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
      <Icon className="w-6 h-6 text-gray-500" />
    </div>
    <p className="text-sm text-gray-400 font-medium">{title}</p>
    <p className="text-xs text-gray-500 mt-1 max-w-[180px]">{description}</p>
    <Button
      variant="outline"
      size="sm"
      className="mt-4 text-xs border-white/10 hover:bg-white/5"
      onClick={onUpload}
    >
      <Upload className="w-3.5 h-3.5 mr-1.5" />
      Upload
    </Button>
  </div>
)

export default MediaLibraryPanel
