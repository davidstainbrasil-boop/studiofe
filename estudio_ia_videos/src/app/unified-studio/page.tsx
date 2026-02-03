'use client';

/**
 * 🎬 Unified Video Studio - Pro Editor
 * Layout profissional de 3 colunas: Sidebar | Painel | Canvas
 */

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Button } from '@/components/ui/button';
import { Loader2, Play, Pause, Square, Download, FolderOpen, Home, Undo2, Redo2 } from 'lucide-react';
import { toast } from 'sonner';

// Store
import { useTimelineStore } from '@/lib/stores/timeline-store';

// Components
import { SidebarNav, EditorTool } from '@/components/studio-unified/SidebarNav';
import { AvatarPanel } from '@/components/studio-unified/panels/AvatarPanel';
import { VoicePanel } from '@/components/studio-unified/panels/VoicePanel';
import { Avatar3DPreview } from '@/components/studio-unified/Avatar3DPreview';
import { Avatar } from '@/types/video-project';

// ============================================================================
// MAIN WRAPPER
// ============================================================================
export default function UnifiedStudioPageWrapper() {
  return (
    <Suspense fallback={<UnifiedStudioLoading />}>
      <UnifiedStudioPage />
    </Suspense>
  );
}

function UnifiedStudioLoading() {
  return (
    <div className="h-screen w-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Carregando Studio Pro...</p>
      </div>
    </div>
  );
}

// ============================================================================
// STUDIO PAGE
// ============================================================================
function UnifiedStudioPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('project');

  // State
  const [activeTool, setActiveTool] = useState<EditorTool>('avatars');
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeAvatarId, setActiveAvatarId] = useState<string>('presenter-1');
  const [activeVoiceId, setActiveVoiceId] = useState<string>('rachel');
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [avatarsLoading, setAvatarsLoading] = useState(true);

  // Default avatars using Real RPM Models
  const defaultAvatars: Avatar[] = [
    {
      id: 'presenter-1',
      name: 'Ana',
      gender: 'female',
      glbUrl: 'https://models.readyplayer.me/63db588c826622aa9826a7e5.glb',
      thumbnailUrl: '',
      category: 'professional'
    },
    {
      id: 'presenter-2',
      name: 'Carlos',
      gender: 'male',
      glbUrl: 'https://models.readyplayer.me/64b52e209805908ce98797ac.glb',
      thumbnailUrl: '',
      category: 'casual'
    },
    {
      id: 'presenter-3',
      name: 'Maria',
      gender: 'female',
      glbUrl: 'https://models.readyplayer.me/64b533479805908ce987a027.glb',
      thumbnailUrl: '',
      category: 'professional'
    },
  ];

  // Fetch avatars from API
  useEffect(() => {
    const fetchAvatars = async () => {
      try {
        const response = await fetch('/api/avatar-3d/avatars');
        if (response.ok) {
          const data = await response.json();
          if (data.avatars && data.avatars.length > 0) {
            const mappedAvatars = data.avatars.map((a: {
              id: string;
              name: string;
              gender?: string;
              preview_url?: string;
              thumbnail_url?: string;
            }) => ({
              id: a.id,
              name: a.name,
              gender: a.gender || 'neutral',
              style: 'Profissional',
              glbUrl: a.preview_url || '',
              thumbnailUrl: a.thumbnail_url || '',
              category: 'professional'
            }));
            setAvatars(mappedAvatars);
            if (mappedAvatars.length > 0) {
              setActiveAvatarId(mappedAvatars[0].id);
            }
            return;
          }
        }
      } catch {
        // Use defaults on error
      }
      setAvatars(defaultAvatars);
      setAvatarsLoading(false);
    };
    
    fetchAvatars().finally(() => setAvatarsLoading(false));
  }, []);

  const selectedAvatar = avatars.find(a => a.id === activeAvatarId) || avatars[0];

  // TTS Integration State
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null);
  const [lipSyncData, setLipSyncData] = useState<any[]>([]);

  const handlePreviewVoice = async () => {
    if (isPlaying) {
      setIsPlaying(false);
      return;
    }

    if (currentAudioUrl && lipSyncData.length > 0) {
      setIsPlaying(true);
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch('/api/tts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `Olá! Eu sou ${selectedAvatar?.name || 'seu avatar'}. Bem-vindo ao novo editor.`,
          voice: selectedAvatar?.gender === 'male' ? 'pt-BR-AntonioNeural' : 'pt-BR-FranciscaNeural',
          engine: 'edge-tts',
        }),
      });

      if (!response.ok) throw new Error('Falha na geração de voz');
      const data = await response.json();

      if (data.success && data.data) {
        setCurrentAudioUrl(data.data.audioUrl);
        setLipSyncData(data.data.visemes || []);
        setIsPlaying(true);
      } else {
        toast.error('Erro ao gerar áudio');
      }
    } catch (error) {
      console.error('TTS Error:', error);
      toast.error('Erro ao gerar voz.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Stop playback when avatar changes
  useEffect(() => {
    setIsPlaying(false);
    setCurrentAudioUrl(null);
    setLipSyncData([]);
  }, [activeAvatarId]);


  return (
    <div className="h-screen w-screen flex flex-col bg-background overflow-hidden text-foreground">

      {/* 1. Header (Compact) */}
      <header className="h-12 border-b bg-card flex items-center justify-between px-4 z-30 shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')}>
            <Home size={18} />
          </Button>
          <span className="font-semibold text-sm">Meu Projeto Incrível</span>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon">
            <Undo2 size={18} />
          </Button>
          <Button variant="ghost" size="icon">
            <Redo2 size={18} />
          </Button>
          <div className="h-4 w-px bg-border mx-2" />
          <Button size="sm" className="bg-primary hover:bg-primary/90 text-white">
            <Download size={16} className="mr-2" /> Exportar
          </Button>
        </div>
      </header>

      {/* 2. Main Workspace (3 Columns) */}
      <div className="flex-1 flex overflow-hidden">

        {/* Column 1: Collapsed Sidebar */}
        <SidebarNav activeTool={activeTool} onToolSelect={setActiveTool} />

        <ResizablePanelGroup direction="horizontal">

          {/* Column 2: Dynamic Asset Panel */}
          <ResizablePanel defaultSize={20} minSize={15} maxSize={30} className="border-r bg-card z-10 transition-all">
            {activeTool === 'avatars' && (
              <AvatarPanel
                avatars={avatars}
                selectedAvatarId={activeAvatarId}
                onSelectAvatar={setActiveAvatarId}
              />
            )}
            {activeTool === 'audio' && (
              <VoicePanel
                selectedVoiceId={activeVoiceId}
                onSelectVoice={setActiveVoiceId}
              />
            )}
            {/* Fallback for other tools */}
            {!['avatars', 'audio'].includes(activeTool) && (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm p-4 text-center">
                Ferramenta {activeTool} em desenvolvimento
              </div>
            )}
          </ResizablePanel>

          <ResizableHandle />

          {/* Column 3: Canvas (THE PERSISTENT STAGE) */}
          <ResizablePanel defaultSize={80}>
            <div className="h-full w-full bg-neutral-900 relative flex flex-col">

              {/* Canvas Area */}
              <div className="flex-1 relative overflow-hidden flex items-center justify-center p-8">
                <div className="relative aspect-video w-full max-w-5xl bg-black rounded-lg shadow-2xl overflow-hidden border border-neutral-800">

                  {/* The 3D Scene - Always mounted if an avatar is selected */}
                  {selectedAvatar ? (
                    <Avatar3DPreview
                      avatar={selectedAvatar}
                      autoRotate={false}
                      showControls={false} // Clean mode
                      isPlaying={isPlaying}
                      lipSyncData={lipSyncData}
                      audioUrl={currentAudioUrl}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-white/30">
                      Nenhum avatar selecionado
                    </div>
                  )}

                  {/* Overlay Controls */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/80 backdrop-blur rounded-full px-4 py-2 border border-white/10">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-white hover:bg-white/20 rounded-full"
                      onClick={() => setIsPlaying(!isPlaying)}
                    >
                      {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                    </Button>
                    <span className="text-xs text-white/50 font-mono">00:00 / 00:15</span>

                    <div className="h-4 w-px bg-white/20 mx-2" />

                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-7 text-xs"
                      onClick={handlePreviewVoice}
                      disabled={isGenerating}
                    >
                      {isGenerating ? <Loader2 size={12} className="animate-spin mr-1" /> : <Play size={12} className="mr-1" />}
                      {isGenerating ? 'Gerando...' : 'Testar Voz'}
                    </Button>
                  </div>

                </div>
              </div>

              {/* Timeline Area (Bottom of Canvas) */}
              <div className="h-48 border-t bg-card/50 backdrop-blur-sm">
                {/* Placeholder for Timeline */}
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground border-2 border-dashed border-white/10 m-2 rounded-lg">
                  Timeline Sequencer
                </div>
              </div>

            </div>
          </ResizablePanel>

        </ResizablePanelGroup>
      </div>
    </div>
  );
}
