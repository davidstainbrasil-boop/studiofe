/**
 * RealisticAvatarPicker - Seletor de Avatares Realistas
 *
 * Usa MuseTalk/SadTalker para gerar talking heads de qualquer foto
 */
'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  User,
  Upload,
  Sparkles,
  Play,
  Loader2,
  Check,
  Camera,
  Image as ImageIcon,
} from 'lucide-react';

// Avatares pré-definidos com fotos profissionais
const PRESET_AVATARS = [
  {
    id: 'avatar-professional-male-1',
    name: 'Carlos',
    description: 'Instrutor profissional',
    imageUrl: '/avatars/professional-male-1.jpg',
    gender: 'male',
  },
  {
    id: 'avatar-professional-female-1',
    name: 'Ana',
    description: 'Apresentadora corporativa',
    imageUrl: '/avatars/professional-female-1.jpg',
    gender: 'female',
  },
  {
    id: 'avatar-casual-male-1',
    name: 'Pedro',
    description: 'Estilo descontraído',
    imageUrl: '/avatars/casual-male-1.jpg',
    gender: 'male',
  },
  {
    id: 'avatar-casual-female-1',
    name: 'Julia',
    description: 'Estilo jovem',
    imageUrl: '/avatars/casual-female-1.jpg',
    gender: 'female',
  },
  {
    id: 'avatar-tech-male-1',
    name: 'Lucas',
    description: 'Tech & Inovação',
    imageUrl: '/avatars/tech-male-1.jpg',
    gender: 'male',
  },
  {
    id: 'avatar-tech-female-1',
    name: 'Marina',
    description: 'Tech & Inovação',
    imageUrl: '/avatars/tech-female-1.jpg',
    gender: 'female',
  },
];

export interface SelectedAvatar {
  id: string;
  name: string;
  imageUrl: string;
  isCustom?: boolean;
}

interface RealisticAvatarPickerProps {
  selected?: SelectedAvatar | null;
  onSelect: (avatar: SelectedAvatar | null) => void;
  showPreview?: boolean;
}

export function RealisticAvatarPicker({
  selected,
  onSelect,
  showPreview = true,
}: RealisticAvatarPickerProps) {
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [customImage, setCustomImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle custom image upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Convert to base64
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setCustomImage(base64);
      onSelect({
        id: 'custom-avatar',
        name: 'Meu Avatar',
        imageUrl: base64,
        isCustom: true,
      });
    };
    reader.readAsDataURL(file);
  };

  // Generate preview (talking head demo)
  const generatePreview = async (avatar: SelectedAvatar) => {
    setIsGeneratingPreview(true);
    try {
      // Use a short sample audio for preview
      const response = await fetch('/api/avatar/talking-head', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceImage: avatar.imageUrl,
          audioUrl: '/audio/avatar-preview-sample.mp3', // 3 second sample
          provider: 'auto',
        }),
      });

      const data = await response.json();
      if (data.success) {
        setPreviewUrl(data.videoUrl);
      }
    } catch (error) {
      console.error('Preview generation failed:', error);
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
        <Sparkles className="w-5 h-5 text-blue-500 mt-0.5" />
        <div>
          <div className="font-medium text-sm text-blue-900 dark:text-blue-100">
            Avatares com IA Realista
          </div>
          <div className="text-xs text-blue-700 dark:text-blue-300 mt-1">
            Escolha um avatar ou envie sua própria foto. A IA vai sincronizar os lábios
            com a narração automaticamente usando MuseTalk/SadTalker.
          </div>
        </div>
      </div>

      {/* Upload Custom Photo */}
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          className="w-full h-24 border-dashed"
        >
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              {customImage ? (
                <img
                  src={customImage}
                  alt="Custom"
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <Camera className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
            <span className="text-sm">
              {customImage ? 'Trocar minha foto' : 'Usar minha própria foto'}
            </span>
          </div>
        </Button>
      </div>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            ou escolha um avatar
          </span>
        </div>
      </div>

      {/* Preset Avatars Grid */}
      <div className="grid grid-cols-3 gap-3">
        {PRESET_AVATARS.map((avatar) => {
          const isSelected = selected?.id === avatar.id;

          return (
            <button
              key={avatar.id}
              onClick={() => {
                onSelect(isSelected ? null : {
                  id: avatar.id,
                  name: avatar.name,
                  imageUrl: avatar.imageUrl,
                });
                setPreviewUrl(null);
              }}
              className={cn(
                'relative rounded-xl overflow-hidden border-2 transition-all',
                'hover:shadow-lg hover:scale-[1.02]',
                isSelected
                  ? 'border-blue-500 ring-2 ring-blue-500/30'
                  : 'border-transparent hover:border-gray-300'
              )}
            >
              {/* Avatar Image */}
              <div className="aspect-square bg-muted">
                <img
                  src={avatar.imageUrl}
                  alt={avatar.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback to placeholder
                    e.currentTarget.src = '/avatars/placeholder.jpg';
                  }}
                />
              </div>

              {/* Selection Indicator */}
              {isSelected && (
                <div className="absolute top-2 right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
              )}

              {/* Name Label */}
              <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent">
                <div className="text-white text-xs font-medium">{avatar.name}</div>
                <div className="text-white/70 text-[10px]">{avatar.description}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* No Avatar Option */}
      <Button
        variant={selected === null ? 'secondary' : 'ghost'}
        onClick={() => {
          onSelect(null);
          setPreviewUrl(null);
        }}
        className="w-full"
      >
        <ImageIcon className="w-4 h-4 mr-2" />
        Sem avatar (apenas slides)
      </Button>

      {/* Preview Section */}
      {showPreview && selected && (
        <div className="p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <img
                src={selected.imageUrl}
                alt={selected.name}
                className="w-8 h-8 rounded-full object-cover"
              />
              <div>
                <div className="font-medium text-sm">{selected.name}</div>
                <div className="text-xs text-muted-foreground">
                  Avatar selecionado
                </div>
              </div>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => generatePreview(selected)}
              disabled={isGeneratingPreview}
            >
              {isGeneratingPreview ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-1" />
                  Ver Preview
                </>
              )}
            </Button>
          </div>

          {/* Video Preview */}
          {previewUrl && (
            <div className="rounded-lg overflow-hidden bg-black">
              <video
                src={previewUrl}
                controls
                autoPlay
                loop
                muted
                className="w-full"
              />
            </div>
          )}
        </div>
      )}

      {/* Tech Info */}
      <div className="text-xs text-center text-muted-foreground">
        Powered by{' '}
        <a
          href="https://github.com/TMElyralab/MuseTalk"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:underline"
        >
          MuseTalk
        </a>
        {' & '}
        <a
          href="https://github.com/OpenTalker/SadTalker"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:underline"
        >
          SadTalker
        </a>
      </div>
    </div>
  );
}

export default RealisticAvatarPicker;
