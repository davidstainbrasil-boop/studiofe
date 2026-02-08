'use client'

/**
 * Avatar Library Panel
 * Painel profissional de biblioteca de avatares hiper-realistas
 * Integra D-ID, HeyGen, ReadyPlayerMe e outros providers
 */

import React, { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'
import { Label } from '@components/ui/label'
import { Badge } from '@components/ui/badge'
import { ScrollArea } from '@components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@components/ui/dialog'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@components/ui/card'
import {
  User, Search, Filter, Star, Download, Upload,
  Play, Settings, Zap, Sparkles, Users, Globe,
  Heart, Eye, TrendingUp, Plus, Check, X, Loader2
} from 'lucide-react'
import { cn } from '@lib/utils'
import { toast } from 'sonner'

// ============================================================================
// TYPES
// ============================================================================

export type AvatarProvider = 'did' | 'heygen' | 'rpm' | 'metahuman' | 'custom'

export type AvatarGender = 'male' | 'female' | 'neutral'

export type AvatarEthnicity =
  | 'caucasian'
  | 'african'
  | 'asian'
  | 'hispanic'
  | 'middle-eastern'
  | 'mixed'

export interface Avatar {
  id: string
  provider: AvatarProvider
  name: string
  thumbnailUrl: string
  previewVideoUrl?: string
  gender: AvatarGender
  ethnicity?: AvatarEthnicity
  age?: string // 'young' | 'adult' | 'senior'
  style?: string // 'professional' | 'casual' | 'formal'

  // Metadata
  tags: string[]
  featured: boolean
  premium: boolean
  rating?: number
  usageCount: number

  // Provider-specific
  providerId: string
  providerMetadata?: Record<string, any>

  // Voice compatibility
  voiceIds?: string[]
  supportedLanguages?: string[]

  // Customization
  customizable: boolean
  emotions?: string[]
}

export interface AvatarFilters {
  provider?: AvatarProvider[]
  gender?: AvatarGender[]
  ethnicity?: AvatarEthnicity[]
  age?: string[]
  tags?: string[]
  featured?: boolean
  premium?: boolean
}

// ============================================================================
// API DATA FETCHING (Real avatars from /api/avatars)
// ============================================================================

function mapApiAvatarToAvatar(data: Record<string, unknown>): Avatar {
  return {
    id: (data.id as string) || `avatar-${Date.now()}`,
    provider: ((data.provider as string) || 'custom') as AvatarProvider,
    name: (data.name as string) || 'Avatar',
    thumbnailUrl: (data.thumbnail_url as string) || (data.thumbnailUrl as string) || '/placeholder-avatar.png',
    previewVideoUrl: (data.preview_video_url as string) || (data.previewVideoUrl as string),
    gender: ((data.gender as string) || 'neutral') as AvatarGender,
    ethnicity: (data.ethnicity as AvatarEthnicity) || undefined,
    age: (data.age as string) || 'adult',
    style: (data.style as string) || 'professional',
    tags: (data.tags as string[]) || [],
    featured: (data.featured as boolean) || false,
    premium: (data.premium as boolean) || false,
    rating: (data.rating as number) || undefined,
    usageCount: (data.usage_count as number) || (data.usageCount as number) || 0,
    providerId: (data.provider_id as string) || (data.providerId as string) || (data.id as string) || '',
    providerMetadata: (data.provider_metadata as Record<string, unknown>) || undefined,
    voiceIds: (data.voice_ids as string[]) || (data.voiceIds as string[]) || [],
    supportedLanguages: (data.supported_languages as string[]) || (data.supportedLanguages as string[]) || ['pt'],
    customizable: (data.customizable as boolean) || false,
    emotions: (data.emotions as string[]) || ['neutral'],
  }
}

async function fetchAvatarsFromAPI(): Promise<Avatar[]> {
  try {
    const res = await fetch('/api/avatars')
    if (!res.ok) return []
    const data = await res.json()
    const list = data.avatars || data.data || (Array.isArray(data) ? data : [])
    return list.map((item: Record<string, unknown>) => mapApiAvatarToAvatar(item))
  } catch {
    return []
  }
}

// ============================================================================
// AVATAR CARD COMPONENT
// ============================================================================

interface AvatarCardProps {
  avatar: Avatar
  selected: boolean
  onSelect: (avatar: Avatar) => void
  onPreview?: (avatar: Avatar) => void
}

const AvatarCard: React.FC<AvatarCardProps> = ({
  avatar,
  selected,
  onSelect,
  onPreview
}) => {
  const [isHovered, setIsHovered] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ scale: 1.02 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <Card
        className={cn(
          "cursor-pointer transition-all duration-200 hover:shadow-lg",
          selected && "ring-2 ring-blue-500 shadow-xl"
        )}
        onClick={() => onSelect(avatar)}
      >
        {/* Thumbnail */}
        <div className="relative aspect-[3/4] overflow-hidden rounded-t-lg bg-gray-100">
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          )}

          <img
            src={avatar.thumbnailUrl}
            alt={avatar.name}
            className={cn(
              "h-full w-full object-cover transition-opacity duration-300",
              imageLoaded ? "opacity-100" : "opacity-0"
            )}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageLoaded(true)}
          />

          {/* Overlay on hover */}
          <AnimatePresence>
            {isHovered && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/50 flex items-center justify-center gap-2"
              >
                {onPreview && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation()
                      onPreview(avatar)
                    }}
                  >
                    <Play className="h-4 w-4 mr-1" />
                    Preview
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="default"
                  onClick={(e) => {
                    e.stopPropagation()
                    onSelect(avatar)
                  }}
                >
                  {selected ? (
                    <>
                      <Check className="h-4 w-4 mr-1" />
                      Selected
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-1" />
                      Select
                    </>
                  )}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {avatar.featured && (
              <Badge className="bg-yellow-500 text-white">
                <Star className="h-3 w-3 mr-1" />
                Featured
              </Badge>
            )}
            {avatar.premium && (
              <Badge className="bg-purple-500 text-white">
                <Sparkles className="h-3 w-3 mr-1" />
                Premium
              </Badge>
            )}
          </div>

          {/* Provider Badge */}
          <div className="absolute top-2 right-2">
            <Badge variant="secondary" className="uppercase text-xs">
              {avatar.provider}
            </Badge>
          </div>

          {/* Selected Indicator */}
          {selected && (
            <div className="absolute bottom-2 right-2">
              <div className="bg-blue-500 text-white rounded-full p-1">
                <Check className="h-4 w-4" />
              </div>
            </div>
          )}
        </div>

        {/* Info */}
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-semibold truncate">
            {avatar.name}
          </CardTitle>
          <CardDescription className="text-xs">
            {avatar.gender} • {avatar.age || 'adult'}
          </CardDescription>
        </CardHeader>

        <CardContent className="p-4 pt-0">
          {/* Stats */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            {avatar.rating && (
              <div className="flex items-center gap-1">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                <span>{avatar.rating}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              <span>{avatar.usageCount}</span>
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1 mt-2">
            {avatar.tags.slice(0, 2).map(tag => (
              <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">
                {tag}
              </Badge>
            ))}
            {avatar.tags.length > 2 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                +{avatar.tags.length - 2}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export interface AvatarLibraryPanelProps {
  onSelectAvatar: (avatar: Avatar) => void
  selectedAvatarId?: string
  className?: string
}

export const AvatarLibraryPanel: React.FC<AvatarLibraryPanelProps> = ({
  onSelectAvatar,
  selectedAvatarId,
  className
}) => {
  const [avatars, setAvatars] = useState<Avatar[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<AvatarFilters>({})
  const [selectedProvider, setSelectedProvider] = useState<string>('all')
  const [previewAvatar, setPreviewAvatar] = useState<Avatar | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Fetch real avatars from API on mount
  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    fetchAvatarsFromAPI()
      .then((apiAvatars) => {
        if (!cancelled) {
          setAvatars(apiAvatars)
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  // Filter avatars
  const filteredAvatars = avatars.filter(avatar => {
    // Search
    if (searchQuery && !avatar.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !avatar.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))) {
      return false
    }

    // Provider filter
    if (selectedProvider !== 'all' && avatar.provider !== selectedProvider) {
      return false
    }

    // Other filters
    if (filters.gender?.length && !filters.gender.includes(avatar.gender)) {
      return false
    }

    if (filters.featured !== undefined && avatar.featured !== filters.featured) {
      return false
    }

    return true
  })

  const handlePreview = useCallback((avatar: Avatar) => {
    setPreviewAvatar(avatar)
  }, [])

  const handleClosePreview = useCallback(() => {
    setPreviewAvatar(null)
  }, [])

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="border-b p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Avatar Library</h2>
            <p className="text-sm text-muted-foreground">
              {filteredAvatars.length} avatar{filteredAvatars.length !== 1 ? 's' : ''} available
            </p>
          </div>
          <Button size="sm" variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Upload Custom
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search avatars by name or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Provider Tabs */}
        <Tabs value={selectedProvider} onValueChange={setSelectedProvider}>
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="did">D-ID</TabsTrigger>
            <TabsTrigger value="heygen">HeyGen</TabsTrigger>
            <TabsTrigger value="rpm">RPM</TabsTrigger>
            <TabsTrigger value="custom">Custom</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Quick Filters */}
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={filters.featured ? "default" : "outline"}
            onClick={() => setFilters(prev => ({
              ...prev,
              featured: prev.featured ? undefined : true
            }))}
          >
            <Star className="h-3 w-3 mr-1" />
            Featured
          </Button>
          <Button
            size="sm"
            variant={filters.premium ? "default" : "outline"}
            onClick={() => setFilters(prev => ({
              ...prev,
              premium: prev.premium ? undefined : true
            }))}
          >
            <Sparkles className="h-3 w-3 mr-1" />
            Premium
          </Button>
          <Button
            size="sm"
            variant={filters.gender?.includes('female') ? "default" : "outline"}
            onClick={() => setFilters(prev => ({
              ...prev,
              gender: prev.gender?.includes('female') ? [] : ['female']
            }))}
          >
            Female
          </Button>
          <Button
            size="sm"
            variant={filters.gender?.includes('male') ? "default" : "outline"}
            onClick={() => setFilters(prev => ({
              ...prev,
              gender: prev.gender?.includes('male') ? [] : ['male']
            }))}
          >
            Male
          </Button>
        </div>
      </div>

      {/* Avatar Grid */}
      <ScrollArea className="flex-1 p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredAvatars.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <User className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No avatars found</p>
            <p className="text-sm text-muted-foreground">
              Try adjusting your filters or search query
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredAvatars.map(avatar => (
              <AvatarCard
                key={avatar.id}
                avatar={avatar}
                selected={avatar.id === selectedAvatarId}
                onSelect={onSelectAvatar}
                onPreview={handlePreview}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Preview Dialog */}
      <Dialog open={!!previewAvatar} onOpenChange={(open) => !open && handleClosePreview()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{previewAvatar?.name}</DialogTitle>
            <DialogDescription>
              Preview this avatar before adding to your scene
            </DialogDescription>
          </DialogHeader>

          {previewAvatar && (
            <div className="space-y-4">
              {/* Preview Video */}
              <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                <img
                  src={previewAvatar.thumbnailUrl}
                  alt={previewAvatar.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Provider</Label>
                  <p className="text-sm font-medium uppercase">{previewAvatar.provider}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Gender</Label>
                  <p className="text-sm font-medium capitalize">{previewAvatar.gender}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Age Group</Label>
                  <p className="text-sm font-medium capitalize">{previewAvatar.age || 'Adult'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Rating</Label>
                  <p className="text-sm font-medium">{previewAvatar.rating || 'N/A'} ⭐</p>
                </div>
              </div>

              {/* Emotions */}
              {previewAvatar.emotions && previewAvatar.emotions.length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground">Available Emotions</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {previewAvatar.emotions.map(emotion => (
                      <Badge key={emotion} variant="secondary">
                        {emotion}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleClosePreview}>
                  Cancel
                </Button>
                <Button onClick={() => {
                  onSelectAvatar(previewAvatar)
                  handleClosePreview()
                  toast.success(`${previewAvatar.name} added to scene`)
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add to Scene
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default AvatarLibraryPanel
