'use client';

/**
 * Scene Configuration Panel
 * Per-scene configuration: Script/Narration, Voice (TTS), Avatar, Background Music
 * Connects to REAL APIs: /api/tts, /api/avatars, /api/voice-library, /api/audio/upload
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@components/ui/button';
import { Textarea } from '@components/ui/textarea';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { Slider } from '@components/ui/slider';
import { Badge } from '@components/ui/badge';
import { ScrollArea } from '@components/ui/scroll-area';
import { Separator } from '@components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@components/ui/accordion';
import {
  Mic,
  Play,
  Square,
  Loader2,
  Volume2,
  VolumeX,
  User,
  Music,
  FileText,
  Upload,
  Trash2,
  RefreshCw,
  Check,
  AlertCircle,
  Sparkles,
  Download,
} from 'lucide-react';
import { cn } from '@lib/utils';
import { toast } from 'sonner';
import type {
  Scene,
  SceneVoiceConfig,
  SceneAvatarConfig,
  SceneMusicConfig,
  TTSState,
} from '@/types/scene';

// ============================================================================
// TYPES
// ============================================================================

interface VoiceOption {
  id: string;
  name: string;
  language: string;
  gender: string;
  provider: string;
  preview?: string;
}

interface AvatarOption {
  id: string;
  name: string;
  thumbnailUrl: string;
  provider: string;
  gender: string;
  premium: boolean;
}

interface SceneConfigPanelProps {
  scene: Scene | null;
  onUpdateScene: (sceneId: string, updates: Partial<Scene>) => void;
  className?: string;
}

// ============================================================================
// DEFAULT VOICES (edge-tts, always available, no API key needed)
// ============================================================================

const DEFAULT_VOICES: VoiceOption[] = [
  { id: 'pt-BR-FranciscaNeural', name: 'Francisca', language: 'pt-BR', gender: 'female', provider: 'edge-tts' },
  { id: 'pt-BR-AntonioNeural', name: 'Antonio', language: 'pt-BR', gender: 'male', provider: 'edge-tts' },
  { id: 'pt-BR-ThalitaNeural', name: 'Thalita', language: 'pt-BR', gender: 'female', provider: 'edge-tts' },
  { id: 'pt-BR-BrendaNeural', name: 'Brenda', language: 'pt-BR', gender: 'female', provider: 'edge-tts' },
  { id: 'pt-BR-DonatoNeural', name: 'Donato', language: 'pt-BR', gender: 'male', provider: 'edge-tts' },
  { id: 'en-US-JennyNeural', name: 'Jenny (EN)', language: 'en-US', gender: 'female', provider: 'edge-tts' },
  { id: 'en-US-GuyNeural', name: 'Guy (EN)', language: 'en-US', gender: 'male', provider: 'edge-tts' },
  { id: 'es-ES-ElviraNeural', name: 'Elvira (ES)', language: 'es-ES', gender: 'female', provider: 'edge-tts' },
];

// ============================================================================
// BACKGROUND MUSIC PRESETS (royalty-free)
// ============================================================================

const MUSIC_PRESETS: { id: string; name: string; category: string; duration: string }[] = [
  { id: 'corporate-upbeat', name: 'Corporate Upbeat', category: 'Corporativo', duration: '2:30' },
  { id: 'tech-innovation', name: 'Tech Innovation', category: 'Tecnologia', duration: '3:00' },
  { id: 'calm-ambient', name: 'Calm Ambient', category: 'Ambiente', duration: '4:00' },
  { id: 'motivational', name: 'Motivational Rise', category: 'Motivacional', duration: '2:45' },
  { id: 'training-focus', name: 'Training Focus', category: 'Treinamento', duration: '3:15' },
  { id: 'safety-awareness', name: 'Safety Awareness', category: 'Segurança NR', duration: '2:00' },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function SceneConfigPanel({ scene, onUpdateScene, className }: SceneConfigPanelProps) {
  const [voices, setVoices] = useState<VoiceOption[]>(DEFAULT_VOICES);
  const [avatars, setAvatars] = useState<AvatarOption[]>([]);
  const [loadingVoices, setLoadingVoices] = useState(false);
  const [loadingAvatars, setLoadingAvatars] = useState(false);
  const [ttsGenerating, setTtsGenerating] = useState(false);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const musicAudioRef = useRef<HTMLAudioElement | null>(null);

  // -----------------------------------------------
  // Fetch real voices from API
  // -----------------------------------------------
  const fetchVoices = useCallback(async () => {
    setLoadingVoices(true);
    try {
      const res = await fetch('/api/voice-library');
      if (res.ok) {
        const data = await res.json();
        const apiVoices: VoiceOption[] = (data.voices || data || []).map((v: Record<string, unknown>) => ({
          id: v.id || v.voice_id,
          name: v.name || v.display_name,
          language: (v.language as string) || 'pt-BR',
          gender: (v.gender as string) || 'neutral',
          provider: (v.provider as string) || 'custom',
          preview: v.preview_url as string | undefined,
        }));
        // Merge with defaults (edge-tts always available)
        setVoices([...DEFAULT_VOICES, ...apiVoices]);
      }
    } catch {
      // Fallback to defaults silently
    } finally {
      setLoadingVoices(false);
    }
  }, []);

  // -----------------------------------------------
  // Fetch real avatars from API
  // -----------------------------------------------
  const fetchAvatars = useCallback(async () => {
    setLoadingAvatars(true);
    try {
      const res = await fetch('/api/avatars');
      if (res.ok) {
        const data = await res.json();
        const apiAvatars: AvatarOption[] = (data.avatars || data || []).map((a: Record<string, unknown>) => ({
          id: a.id as string,
          name: (a.name as string) || 'Avatar',
          thumbnailUrl: (a.thumbnail_url as string) || (a.thumbnailUrl as string) || '/placeholder-avatar.png',
          provider: (a.provider as string) || 'custom',
          gender: (a.gender as string) || 'neutral',
          premium: (a.premium as boolean) || false,
        }));
        setAvatars(apiAvatars);
      }
    } catch {
      // Empty list - user can still configure manually
    } finally {
      setLoadingAvatars(false);
    }
  }, []);

  useEffect(() => {
    fetchVoices();
    fetchAvatars();
  }, [fetchVoices, fetchAvatars]);

  // Cleanup audio
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // -----------------------------------------------
  // TTS Generation (REAL - calls /api/tts)
  // -----------------------------------------------
  const handleGenerateTTS = useCallback(async () => {
    if (!scene?.script?.trim()) {
      toast.error('Escreva um roteiro primeiro');
      return;
    }
    if (!scene.id) return;

    setTtsGenerating(true);
    onUpdateScene(scene.id, { ttsState: 'generating' });

    try {
      const voiceId = scene.voiceConfig?.voiceId || 'pt-BR-FranciscaNeural';
      const provider = scene.voiceConfig?.provider || 'edge-tts';

      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: scene.script,
          voiceId,
          provider,
          speed: scene.voiceConfig?.speed || 1.0,
          slideId: scene.id,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `TTS failed (${res.status})`);
      }

      const result = await res.json();
      const audioUrl = result.audioUrl || result.url;

      onUpdateScene(scene.id, {
        audioUrl,
        ttsState: 'ready',
      });
      setAudioPreviewUrl(audioUrl);
      toast.success('Narração gerada com sucesso!');
    } catch (error) {
      onUpdateScene(scene.id, { ttsState: 'error' });
      toast.error(error instanceof Error ? error.message : 'Erro ao gerar narração');
    } finally {
      setTtsGenerating(false);
    }
  }, [scene, onUpdateScene]);

  // -----------------------------------------------
  // Audio preview
  // -----------------------------------------------
  const handlePlayAudio = useCallback((url: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.onended = () => setIsPlayingAudio(false);
    audio.play();
    setIsPlayingAudio(true);
  }, []);

  const handleStopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlayingAudio(false);
  }, []);

  // -----------------------------------------------
  // Music upload
  // -----------------------------------------------
  const handleMusicUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !scene) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'background-music');

    try {
      const res = await fetch('/api/audio/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Upload failed');

      const result = await res.json();
      onUpdateScene(scene.id, {
        musicConfig: {
          trackId: `custom-${Date.now()}`,
          trackName: file.name,
          url: result.url || result.audioUrl,
          volume: 30,
        },
      });
      toast.success(`Música "${file.name}" adicionada`);
    } catch {
      toast.error('Erro ao fazer upload da música');
    }
  }, [scene, onUpdateScene]);

  if (!scene) {
    return (
      <div className={cn('flex items-center justify-center h-full text-muted-foreground', className)}>
        <div className="text-center">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-sm">Selecione uma cena para configurar</p>
        </div>
      </div>
    );
  }

  const ttsState = scene.ttsState || 'idle';

  return (
    <ScrollArea className={cn('h-full', className)}>
      <div className="p-4 space-y-1">
        {/* Scene Title */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">{scene.name}</h3>
          <Badge variant="outline" className="text-xs">
            {scene.duration}s
          </Badge>
        </div>

        <Accordion type="multiple" defaultValue={['script', 'voice', 'avatar', 'music']} className="space-y-1">
          {/* ============================================ */}
          {/* SCRIPT / NARRATION */}
          {/* ============================================ */}
          <AccordionItem value="script" className="border rounded-lg px-3">
            <AccordionTrigger className="py-2 text-sm hover:no-underline">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-500" />
                <span>Roteiro / Narração</span>
                {scene.script && (
                  <Badge variant="secondary" className="text-[10px] ml-1">
                    {scene.script.split(/\s+/).length} palavras
                  </Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-3">
              <div className="space-y-3">
                <Textarea
                  placeholder="Escreva o roteiro de narração para esta cena...&#10;&#10;Ex: Nesta cena, vamos abordar os principais riscos de segurança no ambiente de trabalho conforme a NR-12..."
                  value={scene.script || ''}
                  onChange={(e) => onUpdateScene(scene.id, { script: e.target.value })}
                  className="min-h-[120px] text-sm resize-y"
                />
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {scene.script ? `~${Math.ceil((scene.script.split(/\s+/).length / 150) * 60)}s de narração` : 'Escreva o texto que será narrado'}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (scene.notes) {
                        onUpdateScene(scene.id, { script: scene.notes });
                        toast.success('Notas copiadas para o roteiro');
                      }
                    }}
                    disabled={!scene.notes}
                  >
                    <Sparkles className="h-3 w-3 mr-1" />
                    Usar notas
                  </Button>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* ============================================ */}
          {/* VOICE / TTS */}
          {/* ============================================ */}
          <AccordionItem value="voice" className="border rounded-lg px-3">
            <AccordionTrigger className="py-2 text-sm hover:no-underline">
              <div className="flex items-center gap-2">
                <Mic className="h-4 w-4 text-green-500" />
                <span>Voz / TTS</span>
                {ttsState === 'ready' && <Check className="h-3 w-3 text-green-500" />}
                {ttsState === 'generating' && <Loader2 className="h-3 w-3 animate-spin text-yellow-500" />}
                {ttsState === 'error' && <AlertCircle className="h-3 w-3 text-red-500" />}
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-3">
              <div className="space-y-3">
                {/* Voice Selection */}
                <div>
                  <Label className="text-xs mb-1 block">Voz</Label>
                  <Select
                    value={scene.voiceConfig?.voiceId || 'pt-BR-FranciscaNeural'}
                    onValueChange={(voiceId) => {
                      const voice = voices.find((v) => v.id === voiceId);
                      if (voice) {
                        onUpdateScene(scene.id, {
                          voiceConfig: {
                            voiceId: voice.id,
                            voiceName: voice.name,
                            provider: voice.provider as SceneVoiceConfig['provider'],
                            speed: scene.voiceConfig?.speed || 1.0,
                            language: voice.language,
                          },
                        });
                      }
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Selecione uma voz" />
                    </SelectTrigger>
                    <SelectContent>
                      {voices.map((voice) => (
                        <SelectItem key={voice.id} value={voice.id} className="text-xs">
                          <div className="flex items-center gap-2">
                            <span>{voice.name}</span>
                            <Badge variant="outline" className="text-[9px]">
                              {voice.language}
                            </Badge>
                            <Badge variant="secondary" className="text-[9px]">
                              {voice.provider}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Speed Control */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-xs">Velocidade</Label>
                    <span className="text-xs text-muted-foreground">
                      {(scene.voiceConfig?.speed || 1.0).toFixed(1)}x
                    </span>
                  </div>
                  <Slider
                    value={[scene.voiceConfig?.speed || 1.0]}
                    min={0.5}
                    max={2.0}
                    step={0.1}
                    onValueChange={([speed]) => {
                      onUpdateScene(scene.id, {
                        voiceConfig: {
                          ...(scene.voiceConfig || {
                            voiceId: 'pt-BR-FranciscaNeural',
                            voiceName: 'Francisca',
                            provider: 'edge-tts' as const,
                          }),
                          speed,
                        },
                      });
                    }}
                  />
                </div>

                {/* Generate TTS Button */}
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    size="sm"
                    onClick={handleGenerateTTS}
                    disabled={ttsGenerating || !scene.script?.trim()}
                  >
                    {ttsGenerating ? (
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                      <Mic className="h-3 w-3 mr-1" />
                    )}
                    {ttsGenerating ? 'Gerando...' : 'Gerar Narração'}
                  </Button>

                  {scene.audioUrl && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          isPlayingAudio ? handleStopAudio() : handlePlayAudio(scene.audioUrl!)
                        }
                      >
                        {isPlayingAudio ? (
                          <Square className="h-3 w-3" />
                        ) : (
                          <Play className="h-3 w-3" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          onUpdateScene(scene.id, { audioUrl: undefined, ttsState: 'idle' });
                          setAudioPreviewUrl(null);
                          toast.info('Narração removida');
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                </div>

                {/* Status */}
                {ttsState === 'ready' && scene.audioUrl && (
                  <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 dark:bg-green-950/20 p-2 rounded">
                    <Check className="h-3 w-3" />
                    Narração pronta
                  </div>
                )}
                {ttsState === 'error' && (
                  <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 dark:bg-red-950/20 p-2 rounded">
                    <AlertCircle className="h-3 w-3" />
                    Erro na geração. Tente novamente.
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* ============================================ */}
          {/* AVATAR */}
          {/* ============================================ */}
          <AccordionItem value="avatar" className="border rounded-lg px-3">
            <AccordionTrigger className="py-2 text-sm hover:no-underline">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-purple-500" />
                <span>Avatar / Apresentador</span>
                {scene.avatarConfig && (
                  <Badge variant="secondary" className="text-[10px]">
                    {scene.avatarConfig.avatarName}
                  </Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-3">
              <div className="space-y-3">
                {/* Current Avatar */}
                {scene.avatarConfig ? (
                  <div className="flex items-center gap-3 p-2 border rounded-lg bg-muted/30">
                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                      {scene.avatarConfig.thumbnailUrl ? (
                        <img
                          src={scene.avatarConfig.thumbnailUrl}
                          alt={scene.avatarConfig.avatarName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{scene.avatarConfig.avatarName}</p>
                      <p className="text-xs text-muted-foreground">{scene.avatarConfig.provider}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        onUpdateScene(scene.id, { avatarConfig: undefined });
                        toast.info('Avatar removido da cena');
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Nenhum avatar selecionado para esta cena
                  </p>
                )}

                {/* Avatar Position */}
                {scene.avatarConfig && (
                  <div>
                    <Label className="text-xs mb-1 block">Posição do Avatar</Label>
                    <Select
                      value={scene.avatarConfig.position || 'bottom-right'}
                      onValueChange={(position) => {
                        onUpdateScene(scene.id, {
                          avatarConfig: {
                            ...scene.avatarConfig!,
                            position: position as SceneAvatarConfig['position'],
                          },
                        });
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="left">Esquerda</SelectItem>
                        <SelectItem value="center">Centro</SelectItem>
                        <SelectItem value="right">Direita</SelectItem>
                        <SelectItem value="bottom-right">Inferior Direito</SelectItem>
                        <SelectItem value="bottom-left">Inferior Esquerdo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Avatar Gallery */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs">Biblioteca de Avatares</Label>
                    {loadingAvatars && <Loader2 className="h-3 w-3 animate-spin" />}
                    <Button size="sm" variant="ghost" onClick={fetchAvatars} className="h-6 text-[10px]">
                      <RefreshCw className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 max-h-[200px] overflow-y-auto">
                    {avatars.length > 0 ? (
                      avatars.map((avatar) => (
                        <button
                          key={avatar.id}
                          className={cn(
                            'relative group border rounded-lg p-1 hover:border-primary transition-colors cursor-pointer',
                            scene.avatarConfig?.avatarId === avatar.id && 'border-primary ring-1 ring-primary',
                          )}
                          onClick={() => {
                            onUpdateScene(scene.id, {
                              avatarConfig: {
                                avatarId: avatar.id,
                                avatarName: avatar.name,
                                thumbnailUrl: avatar.thumbnailUrl,
                                provider: avatar.provider as SceneAvatarConfig['provider'],
                                position: scene.avatarConfig?.position || 'bottom-right',
                              },
                            });
                            toast.success(`Avatar "${avatar.name}" selecionado`);
                          }}
                        >
                          <div className="aspect-square rounded bg-muted flex items-center justify-center overflow-hidden">
                            <img
                              src={avatar.thumbnailUrl}
                              alt={avatar.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          </div>
                          <p className="text-[10px] text-center mt-1 truncate">{avatar.name}</p>
                          {avatar.premium && (
                            <Badge className="absolute top-0 right-0 text-[8px] px-1">PRO</Badge>
                          )}
                        </button>
                      ))
                    ) : (
                      <div className="col-span-3 text-center py-4 text-xs text-muted-foreground">
                        {loadingAvatars ? 'Carregando avatares...' : 'Nenhum avatar disponível. Configure avatares na área de administração.'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* ============================================ */}
          {/* BACKGROUND MUSIC */}
          {/* ============================================ */}
          <AccordionItem value="music" className="border rounded-lg px-3">
            <AccordionTrigger className="py-2 text-sm hover:no-underline">
              <div className="flex items-center gap-2">
                <Music className="h-4 w-4 text-orange-500" />
                <span>Música de Fundo</span>
                {scene.musicConfig && (
                  <Badge variant="secondary" className="text-[10px]">
                    {scene.musicConfig.trackName}
                  </Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-3">
              <div className="space-y-3">
                {/* Current Track */}
                {scene.musicConfig ? (
                  <div className="flex items-center gap-3 p-2 border rounded-lg bg-muted/30">
                    <Music className="h-5 w-5 text-orange-500" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{scene.musicConfig.trackName}</p>
                      <p className="text-xs text-muted-foreground">
                        Volume: {scene.musicConfig.volume}%
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        onUpdateScene(scene.id, { musicConfig: undefined });
                        toast.info('Música removida');
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ) : null}

                {/* Volume Control */}
                {scene.musicConfig && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-xs flex items-center gap-1">
                        {scene.musicConfig.volume === 0 ? (
                          <VolumeX className="h-3 w-3" />
                        ) : (
                          <Volume2 className="h-3 w-3" />
                        )}
                        Volume
                      </Label>
                      <span className="text-xs text-muted-foreground">
                        {scene.musicConfig.volume}%
                      </span>
                    </div>
                    <Slider
                      value={[scene.musicConfig.volume]}
                      min={0}
                      max={100}
                      step={5}
                      onValueChange={([volume]) => {
                        onUpdateScene(scene.id, {
                          musicConfig: { ...scene.musicConfig!, volume },
                        });
                      }}
                    />
                  </div>
                )}

                <Separator />

                {/* Upload Custom Music */}
                <div>
                  <Label className="text-xs mb-2 block">Fazer upload de música</Label>
                  <div className="relative">
                    <Input
                      type="file"
                      accept="audio/*"
                      onChange={handleMusicUpload}
                      className="text-xs h-8"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    MP3, WAV, OGG (máx. 50MB)
                  </p>
                </div>

                <Separator />

                {/* Preset Tracks */}
                <div>
                  <Label className="text-xs mb-2 block">Trilhas pré-definidas</Label>
                  <div className="space-y-1">
                    {MUSIC_PRESETS.map((track) => (
                      <button
                        key={track.id}
                        className={cn(
                          'w-full flex items-center gap-2 p-2 rounded-lg border text-left hover:bg-muted/50 transition-colors text-xs',
                          scene.musicConfig?.trackId === track.id && 'border-primary bg-primary/5',
                        )}
                        onClick={() => {
                          onUpdateScene(scene.id, {
                            musicConfig: {
                              trackId: track.id,
                              trackName: track.name,
                              url: `/audio/presets/${track.id}.mp3`,
                              volume: scene.musicConfig?.volume || 30,
                            },
                          });
                          toast.success(`Trilha "${track.name}" selecionada`);
                        }}
                      >
                        <Music className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1">
                          <span className="font-medium">{track.name}</span>
                          <span className="text-muted-foreground ml-2">{track.category}</span>
                        </div>
                        <span className="text-muted-foreground">{track.duration}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* ============================================ */}
        {/* SCENE SUMMARY */}
        {/* ============================================ */}
        <div className="mt-4 p-3 border rounded-lg bg-muted/20">
          <h4 className="text-xs font-semibold mb-2">Resumo da Cena</h4>
          <div className="space-y-1 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Roteiro:</span>
              <span className={scene.script ? 'text-green-600' : 'text-red-400'}>
                {scene.script ? `${scene.script.split(/\s+/).length} palavras` : 'Não definido'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Narração:</span>
              <span className={scene.audioUrl ? 'text-green-600' : 'text-yellow-500'}>
                {scene.audioUrl ? 'Gerada' : 'Pendente'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Avatar:</span>
              <span className={scene.avatarConfig ? 'text-green-600' : 'text-muted-foreground'}>
                {scene.avatarConfig?.avatarName || 'Nenhum'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Música:</span>
              <span className={scene.musicConfig ? 'text-green-600' : 'text-muted-foreground'}>
                {scene.musicConfig?.trackName || 'Nenhuma'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
