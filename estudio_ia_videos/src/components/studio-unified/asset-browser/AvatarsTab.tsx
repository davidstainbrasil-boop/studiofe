/**
 * 🎭 Avatars Tab
 * Seleção e configuração de avatares AI
 */

'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  UserCircle,
  Sparkles,
  Play,
  Settings2,
  Crown,
  Plus,
  Volume2,
  Mic,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AssetItem } from '../UnifiedAssetBrowser';

interface AvatarsTabProps {
  searchQuery: string;
  viewMode: 'grid' | 'list';
  sortBy: 'name' | 'date' | 'size' | 'type';
  showFavoritesOnly: boolean;
  onAssetSelect?: (asset: AssetItem) => void;
  onAssetDragStart?: (asset: AssetItem) => void;
}

interface Avatar {
  id: string;
  name: string;
  gender: 'male' | 'female' | 'neutral';
  style: 'realistic' | 'cartoon' | 'professional';
  thumbnail: string;
  isPremium: boolean;
  isCustom: boolean;
  voices: Voice[];
}

interface Voice {
  id: string;
  name: string;
  language: string;
  preview?: string;
}

// Mock avatars - replace with real data
const MOCK_AVATARS: Avatar[] = [
  {
    id: 'avatar-1',
    name: 'Ana',
    gender: 'female',
    style: 'professional',
    thumbnail: '/avatars/ana.jpg',
    isPremium: false,
    isCustom: false,
    voices: [
      { id: 'v1', name: 'Ana BR', language: 'pt-BR' },
      { id: 'v2', name: 'Ana EN', language: 'en-US' },
    ],
  },
  {
    id: 'avatar-2',
    name: 'Carlos',
    gender: 'male',
    style: 'professional',
    thumbnail: '/avatars/carlos.jpg',
    isPremium: false,
    isCustom: false,
    voices: [
      { id: 'v3', name: 'Carlos BR', language: 'pt-BR' },
    ],
  },
  {
    id: 'avatar-3',
    name: 'Sofia',
    gender: 'female',
    style: 'realistic',
    thumbnail: '/avatars/sofia.jpg',
    isPremium: true,
    isCustom: false,
    voices: [
      { id: 'v4', name: 'Sofia Premium', language: 'pt-BR' },
    ],
  },
  {
    id: 'avatar-4',
    name: 'Custom Avatar',
    gender: 'neutral',
    style: 'realistic',
    thumbnail: '/avatars/custom.jpg',
    isPremium: true,
    isCustom: true,
    voices: [],
  },
];

export function AvatarsTab({
  searchQuery,
  viewMode,
  showFavoritesOnly,
  onAssetSelect,
  onAssetDragStart,
}: AvatarsTabProps) {
  const [selectedAvatar, setSelectedAvatar] = useState<Avatar | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [showConfig, setShowConfig] = useState(false);

  // Avatar config state
  const [expressionIntensity, setExpressionIntensity] = useState(50);
  const [gestureFrequency, setGestureFrequency] = useState(50);
  const [speakingSpeed, setSpeakingSpeed] = useState(1.0);

  // Filter avatars
  const filteredAvatars = React.useMemo(() => {
    let result = [...MOCK_AVATARS];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (avatar) =>
          avatar.name.toLowerCase().includes(query) ||
          avatar.style.toLowerCase().includes(query)
      );
    }

    return result;
  }, [searchQuery]);

  const handleAvatarSelect = useCallback(
    (avatar: Avatar) => {
      setSelectedAvatar(avatar);
      if (avatar.voices.length > 0) {
        setSelectedVoice(avatar.voices[0].id);
      }

      // Convert to asset item for drag/drop
      const assetItem: AssetItem = {
        id: avatar.id,
        name: avatar.name,
        type: 'avatar',
        url: avatar.thumbnail,
        thumbnail: avatar.thumbnail,
        createdAt: new Date(),
        metadata: {
          gender: avatar.gender,
          style: avatar.style,
          isPremium: avatar.isPremium,
        },
      };
      onAssetSelect?.(assetItem);
    },
    [onAssetSelect]
  );

  const handleDragStart = useCallback(
    (e: React.DragEvent, avatar: Avatar) => {
      const assetItem: AssetItem = {
        id: avatar.id,
        name: avatar.name,
        type: 'avatar',
        url: avatar.thumbnail,
        thumbnail: avatar.thumbnail,
        createdAt: new Date(),
        metadata: {
          gender: avatar.gender,
          style: avatar.style,
          isPremium: avatar.isPremium,
          voice: selectedVoice,
          config: {
            expressionIntensity,
            gestureFrequency,
            speakingSpeed,
          },
        },
      };
      e.dataTransfer.setData('application/json', JSON.stringify(assetItem));
      e.dataTransfer.effectAllowed = 'copy';
      onAssetDragStart?.(assetItem);
    },
    [selectedVoice, expressionIntensity, gestureFrequency, speakingSpeed, onAssetDragStart]
  );

  return (
    <div className="space-y-4">
      {/* Quick Actions */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1">
          <Plus className="h-4 w-4 mr-2" />
          Create Custom
        </Button>
        <Dialog open={showConfig} onOpenChange={setShowConfig}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" disabled={!selectedAvatar}>
              <Settings2 className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Avatar Settings</DialogTitle>
              <DialogDescription>
                Configure {selectedAvatar?.name}'s behavior and appearance
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              {/* Voice Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Mic className="h-4 w-4" />
                  Voice
                </label>
                <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a voice" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedAvatar?.voices.map((voice) => (
                      <SelectItem key={voice.id} value={voice.id}>
                        {voice.name} ({voice.language})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Expression Intensity */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Expression Intensity: {expressionIntensity}%
                </label>
                <Slider
                  value={[expressionIntensity]}
                  onValueChange={([value]) => setExpressionIntensity(value)}
                  max={100}
                  step={1}
                />
              </div>

              {/* Gesture Frequency */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Gesture Frequency: {gestureFrequency}%
                </label>
                <Slider
                  value={[gestureFrequency]}
                  onValueChange={([value]) => setGestureFrequency(value)}
                  max={100}
                  step={1}
                />
              </div>

              {/* Speaking Speed */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Volume2 className="h-4 w-4" />
                  Speaking Speed: {speakingSpeed.toFixed(1)}x
                </label>
                <Slider
                  value={[speakingSpeed * 50]}
                  onValueChange={([value]) => setSpeakingSpeed(value / 50)}
                  max={100}
                  step={1}
                />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Style Filters */}
      <div className="flex gap-2 flex-wrap">
        <Badge variant="secondary" className="cursor-pointer hover:bg-primary/20">
          All
        </Badge>
        <Badge variant="outline" className="cursor-pointer hover:bg-primary/20">
          Professional
        </Badge>
        <Badge variant="outline" className="cursor-pointer hover:bg-primary/20">
          Realistic
        </Badge>
        <Badge variant="outline" className="cursor-pointer hover:bg-primary/20">
          Custom
        </Badge>
      </div>

      {/* Avatars Grid */}
      {filteredAvatars.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <UserCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No avatars found</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filteredAvatars.map((avatar) => (
            <Card
              key={avatar.id}
              className={cn(
                'group cursor-pointer overflow-hidden transition-all',
                selectedAvatar?.id === avatar.id
                  ? 'ring-2 ring-primary'
                  : 'hover:ring-2 hover:ring-primary/50'
              )}
              draggable
              onDragStart={(e) => handleDragStart(e, avatar)}
              onClick={() => handleAvatarSelect(avatar)}
            >
              <div className="aspect-square bg-gradient-to-br from-muted to-muted/50 relative flex items-center justify-center">
                {avatar.thumbnail ? (
                  <img
                    src={avatar.thumbnail}
                    alt={avatar.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <UserCircle className="h-16 w-16 text-muted-foreground" />
                )}

                {/* Premium Badge */}
                {avatar.isPremium && (
                  <Badge className="absolute top-2 right-2 bg-gradient-to-r from-yellow-500 to-amber-500 text-white border-0">
                    <Crown className="h-3 w-3 mr-1" />
                    Pro
                  </Badge>
                )}

                {/* Custom Badge */}
                {avatar.isCustom && (
                  <Badge variant="secondary" className="absolute top-2 left-2">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Custom
                  </Badge>
                )}

                {/* Preview Button */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="sm" variant="secondary">
                    <Play className="h-4 w-4 mr-1" fill="currentColor" />
                    Preview
                  </Button>
                </div>
              </div>

              <div className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{avatar.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {avatar.style} • {avatar.gender}
                    </p>
                  </div>
                </div>

                {/* Voice count */}
                {avatar.voices.length > 0 && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                    <Mic className="h-3 w-3" />
                    <span>{avatar.voices.length} voice{avatar.voices.length > 1 ? 's' : ''}</span>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Selected Avatar Info */}
      {selectedAvatar && (
        <div className="mt-4 p-3 bg-muted rounded-lg">
          <p className="text-sm font-medium mb-2">Selected: {selectedAvatar.name}</p>
          <p className="text-xs text-muted-foreground">
            Drag to timeline or canvas to add avatar to your project.
            Click settings to customize behavior.
          </p>
        </div>
      )}
    </div>
  );
}

export default AvatarsTab;
