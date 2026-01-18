'use client';

/**
 * SPRINT 6: Avatar Library Component
 *
 * Features:
 * - Grid view of available avatars
 * - 3D preview with Three.js
 * - Avatar customization (skin tone, hair, outfit)
 * - Drag & drop to timeline
 * - Filter by gender, category
 * - Search functionality
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Search,
  User,
  Users,
  Sparkles,
  Download,
  Star,
  Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Avatar } from '@/types/video-project';

export interface AvatarLibraryProps {
  avatars: Avatar[];
  selectedAvatarId?: string;
  onSelectAvatar: (avatar: Avatar) => void;
  onAddToTimeline: (avatar: Avatar) => void;
  className?: string;
}

/**
 * Mock avatar data for demonstration
 */
const MOCK_AVATARS: Avatar[] = [
  {
    id: 'avatar-professional-male-1',
    name: 'João Silva',
    gender: 'male',
    glbUrl: '/avatars/male-professional-1.glb',
    thumbnailUrl: '/avatars/thumbnails/male-professional-1.jpg',
    category: 'professional',
    customization: {
      skinTone: '#f5d0b5',
      hairStyle: 'short',
      hairColor: '#2c1810',
      outfit: 'business-suit',
    },
  },
  {
    id: 'avatar-professional-female-1',
    name: 'Maria Santos',
    gender: 'female',
    glbUrl: '/avatars/female-professional-1.glb',
    thumbnailUrl: '/avatars/thumbnails/female-professional-1.jpg',
    category: 'professional',
    customization: {
      skinTone: '#e8c4a8',
      hairStyle: 'long',
      hairColor: '#1a1410',
      outfit: 'business-suit',
    },
  },
  {
    id: 'avatar-casual-male-1',
    name: 'Pedro Costa',
    gender: 'male',
    glbUrl: '/avatars/male-casual-1.glb',
    thumbnailUrl: '/avatars/thumbnails/male-casual-1.jpg',
    category: 'casual',
    customization: {
      skinTone: '#d4a78a',
      hairStyle: 'medium',
      hairColor: '#3d2817',
      outfit: 'casual-shirt',
    },
  },
  {
    id: 'avatar-casual-female-1',
    name: 'Ana Oliveira',
    gender: 'female',
    glbUrl: '/avatars/female-casual-1.glb',
    thumbnailUrl: '/avatars/thumbnails/female-casual-1.jpg',
    category: 'casual',
    customization: {
      skinTone: '#c89872',
      hairStyle: 'medium',
      hairColor: '#251812',
      outfit: 'casual-dress',
    },
  },
  {
    id: 'avatar-character-1',
    name: 'Técnico NR',
    gender: 'male',
    glbUrl: '/avatars/character-technician.glb',
    thumbnailUrl: '/avatars/thumbnails/character-technician.jpg',
    category: 'character',
    customization: {
      skinTone: '#f0c9a8',
      hairStyle: 'short',
      hairColor: '#4a3528',
      outfit: 'safety-vest',
    },
  },
  {
    id: 'avatar-character-2',
    name: 'Instrutora NR',
    gender: 'female',
    glbUrl: '/avatars/character-instructor.glb',
    thumbnailUrl: '/avatars/thumbnails/character-instructor.jpg',
    category: 'character',
    customization: {
      skinTone: '#d9b08c',
      hairStyle: 'medium',
      hairColor: '#2d1f15',
      outfit: 'instructor-uniform',
    },
  },
];

export function AvatarLibrary({
  avatars = MOCK_AVATARS,
  selectedAvatarId,
  onSelectAvatar,
  onAddToTimeline,
  className,
}: AvatarLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female' | 'neutral'>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'professional' | 'casual' | 'character'>('all');
  const [activeTab, setActiveTab] = useState('library');

  // Filter avatars based on search and filters
  const filteredAvatars = useMemo(() => {
    return avatars.filter((avatar) => {
      const matchesSearch = avatar.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesGender = genderFilter === 'all' || avatar.gender === genderFilter;
      const matchesCategory = categoryFilter === 'all' || avatar.category === categoryFilter;
      return matchesSearch && matchesGender && matchesCategory;
    });
  }, [avatars, searchQuery, genderFilter, categoryFilter]);

  // Handle avatar selection
  const handleSelectAvatar = useCallback(
    (avatar: Avatar) => {
      onSelectAvatar(avatar);
    },
    [onSelectAvatar]
  );

  // Handle drag start for timeline integration
  const handleDragStart = useCallback((e: React.DragEvent, avatar: Avatar) => {
    e.dataTransfer.setData('application/json', JSON.stringify(avatar));
    e.dataTransfer.effectAllowed = 'copy';
  }, []);

  return (
    <div className={cn('flex flex-col h-full bg-background', className)}>
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-lg">Avatar Library</h2>
          <Badge variant="secondary" className="ml-auto">
            {filteredAvatars.length} avatars
          </Badge>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search avatars..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        {/* Filters */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Gender</Label>
            <Select value={genderFilter} onValueChange={(val) => setGenderFilter(val as typeof genderFilter)}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="neutral">Neutral</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Category</Label>
            <Select value={categoryFilter} onValueChange={(val) => setCategoryFilter(val as typeof categoryFilter)}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="casual">Casual</SelectItem>
                <SelectItem value="character">Character</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="mx-4 mt-2">
          <TabsTrigger value="library" className="text-xs flex-1">
            <Users className="h-3 w-3 mr-1" />
            Library
          </TabsTrigger>
          <TabsTrigger value="customize" className="text-xs flex-1" disabled={!selectedAvatarId}>
            <Sparkles className="h-3 w-3 mr-1" />
            Customize
          </TabsTrigger>
        </TabsList>

        {/* Library Tab */}
        <TabsContent value="library" className="flex-1 mt-0">
          <ScrollArea className="h-full">
            <div className="p-4 grid grid-cols-2 gap-3">
              {filteredAvatars.map((avatar) => (
                <Card
                  key={avatar.id}
                  className={cn(
                    'relative group cursor-pointer overflow-hidden transition-all hover:shadow-lg',
                    selectedAvatarId === avatar.id && 'ring-2 ring-primary'
                  )}
                  onClick={() => handleSelectAvatar(avatar)}
                  draggable
                  onDragStart={(e) => handleDragStart(e, avatar)}
                >
                  {/* Avatar Thumbnail */}
                  <div className="aspect-[3/4] bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center overflow-hidden">
                    {avatar.thumbnailUrl ? (
                      <img
                        src={avatar.thumbnailUrl}
                        alt={avatar.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Fallback to icon if image fails to load
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <User className="h-16 w-16 text-muted-foreground" />
                    )}

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddToTimeline(avatar);
                        }}
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Add
                      </Button>
                    </div>
                  </div>

                  {/* Avatar Info */}
                  <div className="p-2 border-t">
                    <h4 className="font-medium text-sm truncate">{avatar.name}</h4>
                    <div className="flex items-center gap-1 mt-1">
                      <Badge variant="outline" className="text-xs capitalize">
                        {avatar.category}
                      </Badge>
                      {avatar.gender === 'male' && (
                        <Badge variant="secondary" className="text-xs">
                          ♂
                        </Badge>
                      )}
                      {avatar.gender === 'female' && (
                        <Badge variant="secondary" className="text-xs">
                          ♀
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Premium badge */}
                  {avatar.category === 'character' && (
                    <div className="absolute top-2 right-2">
                      <Badge variant="default" className="text-xs">
                        <Star className="h-2.5 w-2.5 mr-0.5 fill-current" />
                        Premium
                      </Badge>
                    </div>
                  )}
                </Card>
              ))}
            </div>

            {filteredAvatars.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <Filter className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-sm font-medium">No avatars found</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Try adjusting your search or filters
                </p>
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        {/* Customize Tab */}
        <TabsContent value="customize" className="flex-1 mt-0">
          <ScrollArea className="h-full">
            <div className="p-4">
              {selectedAvatarId ? (
                <AvatarCustomization
                  avatar={avatars.find((a) => a.id === selectedAvatarId)!}
                  onUpdate={(updates) => {
                    const updatedAvatar = {
                      ...avatars.find((a) => a.id === selectedAvatarId)!,
                      customization: {
                        ...avatars.find((a) => a.id === selectedAvatarId)!.customization,
                        ...updates,
                      },
                    };
                    onSelectAvatar(updatedAvatar);
                  }}
                />
              ) : (
                <div className="text-center text-sm text-muted-foreground py-8">
                  Select an avatar to customize
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/**
 * Avatar Customization Component
 */
interface AvatarCustomizationProps {
  avatar: Avatar;
  onUpdate: (updates: Partial<Avatar['customization']>) => void;
}

function AvatarCustomization({ avatar, onUpdate }: AvatarCustomizationProps) {
  if (!avatar.customization) return null;

  const skinTones = [
    { name: 'Light', color: '#f5d0b5' },
    { name: 'Medium Light', color: '#e8c4a8' },
    { name: 'Medium', color: '#d4a78a' },
    { name: 'Medium Dark', color: '#c89872' },
    { name: 'Dark', color: '#9d7a54' },
  ];

  const hairColors = [
    { name: 'Black', color: '#1a1410' },
    { name: 'Dark Brown', color: '#2c1810' },
    { name: 'Brown', color: '#3d2817' },
    { name: 'Light Brown', color: '#4a3528' },
    { name: 'Blonde', color: '#8b7355' },
  ];

  return (
    <div className="space-y-6">
      {/* 3D Preview Placeholder */}
      <Card className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <User className="h-24 w-24 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">3D Preview</p>
          <p className="text-xs text-muted-foreground">Coming soon</p>
        </div>
      </Card>

      {/* Skin Tone */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Skin Tone</Label>
        <div className="grid grid-cols-5 gap-2">
          {skinTones.map((tone) => (
            <button
              key={tone.name}
              className={cn(
                'aspect-square rounded-full border-2 transition-all hover:scale-110',
                avatar.customization?.skinTone === tone.color
                  ? 'border-primary ring-2 ring-primary/20'
                  : 'border-gray-300 dark:border-gray-600'
              )}
              style={{ backgroundColor: tone.color }}
              onClick={() => onUpdate({ skinTone: tone.color })}
              title={tone.name}
            />
          ))}
        </div>
      </div>

      {/* Hair Style */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Hair Style</Label>
        <Select
          value={avatar.customization.hairStyle}
          onValueChange={(val) => onUpdate({ hairStyle: val })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="short">Short</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="long">Long</SelectItem>
            <SelectItem value="bald">Bald</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Hair Color */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Hair Color</Label>
        <div className="grid grid-cols-5 gap-2">
          {hairColors.map((color) => (
            <button
              key={color.name}
              className={cn(
                'aspect-square rounded-full border-2 transition-all hover:scale-110',
                avatar.customization?.hairColor === color.color
                  ? 'border-primary ring-2 ring-primary/20'
                  : 'border-gray-300 dark:border-gray-600'
              )}
              style={{ backgroundColor: color.color }}
              onClick={() => onUpdate({ hairColor: color.color })}
              title={color.name}
            />
          ))}
        </div>
      </div>

      {/* Outfit */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Outfit</Label>
        <Select
          value={avatar.customization.outfit}
          onValueChange={(val) => onUpdate({ outfit: val })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="business-suit">Business Suit</SelectItem>
            <SelectItem value="casual-shirt">Casual Shirt</SelectItem>
            <SelectItem value="casual-dress">Casual Dress</SelectItem>
            <SelectItem value="safety-vest">Safety Vest</SelectItem>
            <SelectItem value="instructor-uniform">Instructor Uniform</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Add to Timeline Button */}
      <Button className="w-full" onClick={() => onUpdate({})}>
        <Download className="h-4 w-4 mr-2" />
        Add to Timeline
      </Button>
    </div>
  );
}

export default AvatarLibrary;
