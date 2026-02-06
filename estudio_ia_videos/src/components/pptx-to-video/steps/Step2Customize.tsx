/**
 * Step2Customize - Passo 2: Personalização do vídeo
 *
 * Features:
 * - Seleção de Avatar (grid com preview)
 * - Seleção de Voz (lista com preview de áudio)
 * - Seleção de Música de fundo (com controle de volume)
 * - Toggle de Legendas (com preview de estilo)
 */
'use client';

import { useState, useEffect } from 'react';
import { UsePPTXToVideoReturn, SelectedAvatar, SelectedVoice } from '../hooks/usePPTXToVideo';
import { AvatarPicker } from '../components/AvatarPicker';
import { RealisticAvatarPicker } from '../components/RealisticAvatarPicker';
import type { SelectedAvatar as RealisticSelectedAvatar } from '../components/RealisticAvatarPicker';
import { VoicePicker } from '../components/VoicePicker';
import { MusicPicker } from '../components/MusicPicker';
import { SubtitleToggle } from '../components/SubtitleToggle';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  User,
  Mic,
  Music,
  Subtitles,
  ChevronLeft,
  ChevronRight,
  Check,
  Settings2,
  Sparkles,
} from 'lucide-react';

interface Step2CustomizeProps {
  wizard: UsePPTXToVideoReturn;
}

type CustomizeTab = 'avatar' | 'voice' | 'music' | 'subtitles';

const TABS: { id: CustomizeTab; label: string; icon: typeof User; required?: boolean }[] = [
  { id: 'avatar', label: 'Avatar', icon: User },
  { id: 'voice', label: 'Voz', icon: Mic, required: true },
  { id: 'music', label: 'Música', icon: Music },
  { id: 'subtitles', label: 'Legendas', icon: Subtitles },
];

type AvatarMode = 'generic' | 'realistic';

export function Step2Customize({ wizard }: Step2CustomizeProps) {
  const [activeTab, setActiveTab] = useState<CustomizeTab>('avatar');
  const [avatarMode, setAvatarMode] = useState<AvatarMode>(
    wizard.settings.avatar?.mode === 'realistic' ? 'realistic' : 'generic'
  );

  // Adapter: convert RealisticAvatarPicker's selection to unified SelectedAvatar
  const handleRealisticSelect = (avatar: RealisticSelectedAvatar | null) => {
    if (!avatar) {
      wizard.setAvatar(null);
      return;
    }
    wizard.setAvatar({
      id: avatar.id,
      name: avatar.name,
      mode: 'realistic',
      imageUrl: avatar.imageUrl,
      isCustom: avatar.isCustom,
      realisticProvider: 'auto',
    });
  };

  // Check which tabs have selections
  const tabStatus = {
    avatar: !!wizard.settings.avatar,
    voice: !!wizard.settings.voice,
    music: !!wizard.settings.music,
    subtitles: wizard.settings.subtitlesEnabled,
  };

  return (
    <div className="p-6">
      {/* Header Summary */}
      <div className="mb-6 p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Settings2 className="w-5 h-5 text-muted-foreground" />
            <div>
              <div className="font-medium">
                {wizard.selectedSlidesCount} slides selecionados
              </div>
              <div className="text-sm text-muted-foreground">
                Duração: {wizard.totalDuration}s
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            {wizard.settings.avatar && (
              <div className="flex items-center gap-1 text-green-600">
                <Check className="w-4 h-4" />
                <span>Avatar</span>
              </div>
            )}
            {wizard.settings.voice && (
              <div className="flex items-center gap-1 text-green-600">
                <Check className="w-4 h-4" />
                <span>Voz</span>
              </div>
            )}
            {wizard.settings.music && (
              <div className="flex items-center gap-1 text-green-600">
                <Check className="w-4 h-4" />
                <span>Música</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as CustomizeTab)}>
        <TabsList className="grid grid-cols-4 mb-6">
          {TABS.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="flex items-center gap-2 relative"
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.required && !tabStatus[tab.id] && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-500 rounded-full" />
              )}
              {tabStatus[tab.id] && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Avatar Tab */}
        <TabsContent value="avatar" className="mt-0">
          <div className="min-h-[400px]">
            <div className="mb-4">
              <h3 className="font-semibold text-lg">Escolha um Avatar</h3>
              <p className="text-sm text-muted-foreground">
                Selecione um apresentador para narrar seu vídeo (opcional)
              </p>
            </div>

            {/* Avatar Mode Toggle */}
            <div className="flex gap-2 mb-4">
              <Button
                variant={avatarMode === 'generic' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setAvatarMode('generic');
                  wizard.setAvatar(null);
                }}
              >
                <User className="w-4 h-4 mr-1" />
                Avatares Padr&atilde;o
              </Button>
              <Button
                variant={avatarMode === 'realistic' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setAvatarMode('realistic');
                  wizard.setAvatar(null);
                }}
              >
                <Sparkles className="w-4 h-4 mr-1" />
                IA Realista (Lip-Sync)
              </Button>
            </div>

            {avatarMode === 'generic' ? (
              <AvatarPicker
                selected={wizard.settings.avatar}
                onSelect={wizard.setAvatar}
              />
            ) : (
              <RealisticAvatarPicker
                selected={
                  wizard.settings.avatar?.mode === 'realistic'
                    ? {
                        id: wizard.settings.avatar.id,
                        name: wizard.settings.avatar.name,
                        imageUrl: wizard.settings.avatar.imageUrl || '',
                        isCustom: wizard.settings.avatar.isCustom,
                      }
                    : null
                }
                onSelect={handleRealisticSelect}
              />
            )}
          </div>
        </TabsContent>

        {/* Voice Tab */}
        <TabsContent value="voice" className="mt-0">
          <div className="min-h-[400px]">
            <div className="mb-4">
              <h3 className="font-semibold text-lg">
                Escolha uma Voz{' '}
                <span className="text-red-500 text-sm font-normal">*obrigatório</span>
              </h3>
              <p className="text-sm text-muted-foreground">
                A voz será usada para narrar o conteúdo dos slides
              </p>
            </div>
            <VoicePicker
              selected={wizard.settings.voice}
              onSelect={wizard.setVoice}
            />
          </div>
        </TabsContent>

        {/* Music Tab */}
        <TabsContent value="music" className="mt-0">
          <div className="min-h-[400px]">
            <div className="mb-4">
              <h3 className="font-semibold text-lg">Música de Fundo</h3>
              <p className="text-sm text-muted-foreground">
                Adicione uma trilha sonora ao seu vídeo (opcional)
              </p>
            </div>
            <MusicPicker
              selected={wizard.settings.music}
              onSelect={wizard.setMusic}
              volume={wizard.settings.musicVolume}
              onVolumeChange={wizard.setMusicVolume}
            />
          </div>
        </TabsContent>

        {/* Subtitles Tab */}
        <TabsContent value="subtitles" className="mt-0">
          <div className="min-h-[400px]">
            <div className="mb-4">
              <h3 className="font-semibold text-lg">Legendas</h3>
              <p className="text-sm text-muted-foreground">
                Configure legendas automáticas no vídeo
              </p>
            </div>
            <SubtitleToggle
              enabled={wizard.settings.subtitlesEnabled}
              onToggle={wizard.toggleSubtitles}
              style={wizard.settings.subtitleStyle}
              onStyleChange={wizard.setSubtitleStyle}
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <div className="mt-6 pt-6 border-t flex justify-between items-center">
        <Button variant="ghost" onClick={wizard.prevStep}>
          <ChevronLeft className="w-5 h-5 mr-1" />
          Voltar
        </Button>

        <div className="flex items-center gap-3">
          {!wizard.canProceedToGenerate && (
            <span className="text-sm text-muted-foreground">
              Selecione uma voz para continuar
            </span>
          )}
          <Button
            onClick={wizard.nextStep}
            disabled={!wizard.canProceedToGenerate}
            size="lg"
          >
            Continuar
            <ChevronRight className="w-5 h-5 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
