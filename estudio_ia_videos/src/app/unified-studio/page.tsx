'use client';

/**
 * 🎬 Unified Video Studio
 * Workspace profissional integrado para produção de vídeos NR
 * Combina: Asset Browser, Canvas, Inspector, Timeline, AI Assistant
 */

import React, { useState, useCallback, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@components/ui/tabs';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@components/ui/resizable';
import { Badge } from '@components/ui/badge';
import { Progress } from '@components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@components/ui/tooltip';
import {
  Play, Pause, Square, Save, Download, Settings, Layers, User, Image,
  Music, Type, Sparkles, Upload, Undo2, Redo2, Wand2, MessageSquare,
  Video, Mic, FileText, ChevronRight, ChevronLeft, Home, FolderOpen,
  Monitor, Smartphone, Tablet, ZoomIn, ZoomOut, Maximize2, Grid3X3,
  Clock, CheckCircle2, AlertCircle, Loader2, X
} from 'lucide-react';
import { cn } from '@lib/utils';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

// Store
import { useTimelineStore } from '@/lib/stores/timeline-store';

// Components
import { UnifiedAssetBrowser } from '@/components/studio-unified/UnifiedAssetBrowser';
import { AIAssistantSidebar } from '@/components/studio-unified/AIAssistantSidebar';
import { ExportModal } from '@/components/studio-unified/export/ExportModal';
import { RenderQueuePanel } from '@/components/studio-unified/export/RenderQueuePanel';
import { EnhancementToolsModal } from '@/components/studio-unified/modals/EnhancementToolsModal';
import { TemplateBrowser } from '@/components/studio-unified/TemplateBrowser';

// Types
type WorkflowStep = 'import' | 'edit' | 'voice' | 'avatar' | 'preview' | 'export';
type ViewMode = 'desktop' | 'tablet' | 'mobile';
type PanelTab = 'assets' | 'templates' | 'ai' | 'layers';

interface ProjectState {
  id: string | null;
  name: string;
  isDirty: boolean;
  lastSaved: Date | null;
}

// ============================================================================
// WORKFLOW STEPS CONFIG
// ============================================================================
const WORKFLOW_STEPS: { id: WorkflowStep; label: string; icon: React.ReactNode; description: string }[] = [
  { id: 'import', label: 'Importar', icon: <Upload size={18} />, description: 'Upload PPTX ou criar do zero' },
  { id: 'edit', label: 'Editar', icon: <Type size={18} />, description: 'Editar slides e conteúdo' },
  { id: 'voice', label: 'Voz', icon: <Mic size={18} />, description: 'Configurar narração TTS' },
  { id: 'avatar', label: 'Avatar', icon: <User size={18} />, description: 'Escolher avatar apresentador' },
  { id: 'preview', label: 'Preview', icon: <Play size={18} />, description: 'Visualizar resultado' },
  { id: 'export', label: 'Exportar', icon: <Download size={18} />, description: 'Renderizar e baixar' },
];

// ============================================================================
// MAIN COMPONENT (with Suspense wrapper for useSearchParams)
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
        <p className="text-muted-foreground">Carregando Studio...</p>
      </div>
    </div>
  );
}

function UnifiedStudioPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('project');

  // State
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('import');
  const [viewMode, setViewMode] = useState<ViewMode>('desktop');
  const [leftPanelTab, setLeftPanelTab] = useState<PanelTab>('assets');
  const [showAI, setShowAI] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showEnhancements, setShowEnhancements] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [showRenderQueue, setShowRenderQueue] = useState(false);
  
  // Project state
  const [project, setProject] = useState<ProjectState>({
    id: projectId,
    name: 'Novo Projeto',
    isDirty: false,
    lastSaved: null,
  });

  // Timeline store
  const timelineStore = useTimelineStore();

  // Load project if ID provided
  useEffect(() => {
    if (projectId) {
      loadProject(projectId);
    }
  }, [projectId]);

  const loadProject = async (id: string) => {
    try {
      const response = await fetch(`/api/projects/${id}`);
      if (!response.ok) throw new Error('Projeto não encontrado');
      const data = await response.json();
      setProject({
        id: data.id,
        name: data.name,
        isDirty: false,
        lastSaved: new Date(data.updatedAt),
      });
      // Advance to edit step if project exists
      setCurrentStep('edit');
      toast.success('Projeto carregado');
    } catch (error) {
      logger.error('Erro ao carregar projeto', error instanceof Error ? error : new Error(String(error)));
      toast.error('Erro ao carregar projeto');
    }
  };

  const saveProject = useCallback(async () => {
    try {
      const endpoint = project.id ? `/api/projects/${project.id}` : '/api/projects';
      const method = project.id ? 'PUT' : 'POST';
      
      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: project.name,
          // Add timeline data here
        }),
      });

      if (!response.ok) throw new Error('Erro ao salvar');
      const data = await response.json();
      
      setProject(prev => ({
        ...prev,
        id: data.id,
        isDirty: false,
        lastSaved: new Date(),
      }));
      toast.success('Projeto salvo');
    } catch (error) {
      logger.error('Erro ao salvar projeto', error instanceof Error ? error : new Error(String(error)));
      toast.error('Erro ao salvar projeto');
    }
  }, [project]);

  const goToStep = (step: WorkflowStep) => {
    setCurrentStep(step);
  };

  const nextStep = () => {
    const currentIndex = WORKFLOW_STEPS.findIndex(s => s.id === currentStep);
    if (currentIndex < WORKFLOW_STEPS.length - 1) {
      setCurrentStep(WORKFLOW_STEPS[currentIndex + 1].id);
    }
  };

  const prevStep = () => {
    const currentIndex = WORKFLOW_STEPS.findIndex(s => s.id === currentStep);
    if (currentIndex > 0) {
      setCurrentStep(WORKFLOW_STEPS[currentIndex - 1].id);
    }
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
    if (isPlaying) {
      timelineStore.pause();
    } else {
      timelineStore.play();
    }
  };

  const handleStop = () => {
    setIsPlaying(false);
    timelineStore.stop();
  };

  const handleExport = () => {
    setShowExport(true);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 's':
            e.preventDefault();
            saveProject();
            break;
          case 'z':
            e.preventDefault();
            timelineStore.undo();
            break;
          case 'y':
            e.preventDefault();
            timelineStore.redo();
            break;
        }
      }
      if (e.key === ' ' && !['INPUT', 'TEXTAREA'].includes((e.target as Element).tagName)) {
        e.preventDefault();
        handlePlayPause();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saveProject, timelineStore]);

  return (
    <TooltipProvider>
      <div className="h-screen w-screen flex flex-col bg-background overflow-hidden">
        {/* ================================================================
            TOP BAR - Navigation + Actions
        ================================================================ */}
        <header className="h-14 border-b flex items-center justify-between px-4 bg-card shrink-0">
          {/* Left: Logo + Project */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')}>
              <Home size={18} className="mr-2" />
              Dashboard
            </Button>
            <div className="h-6 w-px bg-border" />
            <div className="flex items-center gap-2">
              <FolderOpen size={18} className="text-muted-foreground" />
              <span className="font-medium">{project.name}</span>
              {project.isDirty && <Badge variant="secondary" className="text-xs">Não salvo</Badge>}
            </div>
          </div>

          {/* Center: Workflow Steps */}
          <div className="flex items-center gap-1">
            {WORKFLOW_STEPS.map((step, index) => (
              <React.Fragment key={step.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={currentStep === step.id ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => goToStep(step.id)}
                      className={cn(
                        'gap-2',
                        currentStep === step.id && 'bg-primary text-primary-foreground'
                      )}
                    >
                      {step.icon}
                      <span className="hidden md:inline">{step.label}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{step.description}</TooltipContent>
                </Tooltip>
                {index < WORKFLOW_STEPS.length - 1 && (
                  <ChevronRight size={16} className="text-muted-foreground" />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => timelineStore.undo()} disabled={!timelineStore.canUndo}>
              <Undo2 size={18} />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => timelineStore.redo()} disabled={!timelineStore.canRedo}>
              <Redo2 size={18} />
            </Button>
            <div className="h-6 w-px bg-border" />
            <Button variant="ghost" size="sm" onClick={saveProject}>
              <Save size={18} className="mr-2" />
              Salvar
            </Button>
            <Button variant="default" size="sm" onClick={handleExport}>
              <Download size={18} className="mr-2" />
              Exportar
            </Button>
          </div>
        </header>

        {/* ================================================================
            MAIN WORKSPACE
        ================================================================ */}
        <div className="flex-1 flex overflow-hidden">
          <ResizablePanelGroup direction="horizontal">
            {/* ============================================================
                LEFT PANEL - Assets / Templates / AI
            ============================================================ */}
            <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
              <div className="h-full flex flex-col bg-card border-r">
                <Tabs value={leftPanelTab} onValueChange={(v) => setLeftPanelTab(v as PanelTab)} className="flex-1 flex flex-col">
                  <TabsList className="w-full justify-start rounded-none border-b px-2">
                    <TabsTrigger value="assets" className="gap-2">
                      <Image size={16} />
                      Assets
                    </TabsTrigger>
                    <TabsTrigger value="templates" className="gap-2">
                      <Grid3X3 size={16} />
                      Templates
                    </TabsTrigger>
                    <TabsTrigger value="ai" className="gap-2">
                      <Wand2 size={16} />
                      AI
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="assets" className="flex-1 m-0 overflow-hidden">
                    <UnifiedAssetBrowser />
                  </TabsContent>

                  <TabsContent value="templates" className="flex-1 m-0 overflow-hidden">
                    <TemplateBrowser />
                  </TabsContent>

                  <TabsContent value="ai" className="flex-1 m-0 overflow-hidden">
                    <AIAssistantSidebar />
                  </TabsContent>
                </Tabs>
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* ============================================================
                CENTER - Canvas + Step Content
            ============================================================ */}
            <ResizablePanel defaultSize={55}>
              <div className="h-full flex flex-col">
                {/* Canvas Toolbar */}
                <div className="h-10 border-b flex items-center justify-between px-4 bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewMode('desktop')}>
                      <Monitor size={16} className={viewMode === 'desktop' ? 'text-primary' : ''} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewMode('tablet')}>
                      <Tablet size={16} className={viewMode === 'tablet' ? 'text-primary' : ''} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewMode('mobile')}>
                      <Smartphone size={16} className={viewMode === 'mobile' ? 'text-primary' : ''} />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setZoom(Math.max(25, zoom - 25))}>
                      <ZoomOut size={16} />
                    </Button>
                    <span className="text-sm text-muted-foreground w-12 text-center">{zoom}%</span>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setZoom(Math.min(200, zoom + 25))}>
                      <ZoomIn size={16} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Maximize2 size={16} />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setShowEnhancements(true)}>
                      <Sparkles size={16} className="mr-2" />
                      Melhorar
                    </Button>
                  </div>
                </div>

                {/* Canvas Area - Step Specific Content */}
                <div className="flex-1 bg-neutral-900 flex items-center justify-center overflow-hidden relative">
                  <StepContent 
                    step={currentStep} 
                    viewMode={viewMode} 
                    zoom={zoom}
                    onNext={nextStep}
                    onProjectCreated={(id) => setProject(prev => ({ ...prev, id }))}
                  />
                </div>

                {/* Playback Controls */}
                <div className="h-12 border-t flex items-center justify-center gap-4 bg-card">
                  <Button variant="ghost" size="icon" onClick={handleStop}>
                    <Square size={18} />
                  </Button>
                  <Button variant="default" size="icon" onClick={handlePlayPause}>
                    {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                  </Button>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock size={14} />
                    <span>00:00 / {timelineStore.duration ? `${Math.floor(timelineStore.duration / 60)}:${(timelineStore.duration % 60).toString().padStart(2, '0')}` : '00:00'}</span>
                  </div>
                </div>
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* ============================================================
                RIGHT PANEL - Inspector / Properties
            ============================================================ */}
            <ResizablePanel defaultSize={25} minSize={15} maxSize={35}>
              <div className="h-full bg-card border-l overflow-y-auto">
                <InspectorPanel step={currentStep} />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>

        {/* ================================================================
            BOTTOM - Timeline
        ================================================================ */}
        <div className="h-48 border-t bg-card shrink-0">
          <StudioTimeline />
        </div>

        {/* ================================================================
            MODALS
        ================================================================ */}
        <ExportModal 
          open={showExport} 
          onOpenChange={setShowExport}
          projectName={project.name}
        />

        <EnhancementToolsModal 
          open={showEnhancements}
          onOpenChange={setShowEnhancements}
        />

        {showRenderQueue && (
          <div className="fixed bottom-52 right-4 w-96 z-50">
            <RenderQueuePanel />
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

// ============================================================================
// STEP CONTENT COMPONENT
// ============================================================================
interface StepContentProps {
  step: WorkflowStep;
  viewMode: ViewMode;
  zoom: number;
  onNext: () => void;
  onProjectCreated: (id: string) => void;
}

function StepContent({ step, viewMode, zoom, onNext, onProjectCreated }: StepContentProps) {
  switch (step) {
    case 'import':
      return <ImportStep onNext={onNext} onProjectCreated={onProjectCreated} />;
    case 'edit':
      return <EditStep viewMode={viewMode} zoom={zoom} />;
    case 'voice':
      return <VoiceStep onNext={onNext} />;
    case 'avatar':
      return <AvatarStep onNext={onNext} />;
    case 'preview':
      return <PreviewStep />;
    case 'export':
      return <ExportStep />;
    default:
      return null;
  }
}

// ============================================================================
// IMPORT STEP
// ============================================================================
function ImportStep({ onNext, onProjectCreated }: { onNext: () => void; onProjectCreated: (id: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleUpload = async (file: File) => {
    if (!file.name.endsWith('.pptx')) {
      toast.error('Apenas arquivos PPTX são aceitos');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', file.name.replace('.pptx', ''));

      const response = await fetch('/api/pptx/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Erro no upload');
      const data = await response.json();
      
      toast.success('PPTX importado com sucesso!');
      onProjectCreated(data.projectId);
      onNext();
    } catch (error) {
      logger.error('Erro no upload', error instanceof Error ? error : new Error(String(error)));
      toast.error('Erro ao importar arquivo');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  };

  return (
    <div className="flex flex-col items-center justify-center gap-8 p-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Criar Novo Vídeo</h2>
        <p className="text-muted-foreground">Importe um PPTX ou comece do zero</p>
      </div>

      <div
        className={cn(
          'w-full max-w-md border-2 border-dashed rounded-xl p-8 text-center transition-colors',
          dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25',
          uploading && 'opacity-50 pointer-events-none'
        )}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p>Processando PPTX...</p>
          </div>
        ) : (
          <>
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="mb-4">Arraste um arquivo PPTX aqui</p>
            <p className="text-sm text-muted-foreground mb-4">ou</p>
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".pptx"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
              />
              <Button variant="outline" asChild>
                <span>Selecionar Arquivo</span>
              </Button>
            </label>
          </>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="h-px w-20 bg-border" />
        <span className="text-sm text-muted-foreground">ou</span>
        <div className="h-px w-20 bg-border" />
      </div>

      <Button variant="secondary" size="lg" onClick={onNext}>
        <FileText className="mr-2" />
        Criar Projeto em Branco
      </Button>
    </div>
  );
}

// ============================================================================
// EDIT STEP
// ============================================================================
function EditStep({ viewMode, zoom }: { viewMode: ViewMode; zoom: number }) {
  const viewportSize = useMemo(() => {
    switch (viewMode) {
      case 'mobile': return { width: 375, height: 667 };
      case 'tablet': return { width: 768, height: 1024 };
      default: return { width: 1920, height: 1080 };
    }
  }, [viewMode]);

  const scale = zoom / 100;

  return (
    <div 
      className="bg-neutral-800 rounded-lg shadow-2xl overflow-hidden transition-transform"
      style={{
        width: viewportSize.width * scale * 0.4,
        height: viewportSize.height * scale * 0.4,
      }}
    >
      <div className="w-full h-full flex items-center justify-center text-white/50">
        <div className="text-center">
          <Video className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <p>Canvas de Edição</p>
          <p className="text-sm mt-2">{viewportSize.width} x {viewportSize.height}</p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// VOICE STEP
// ============================================================================
function VoiceStep({ onNext }: { onNext: () => void }) {
  const [selectedVoice, setSelectedVoice] = useState<string | null>(null);
  const voices = [
    { id: 'rachel', name: 'Rachel', gender: 'Feminino', accent: 'Brasileiro' },
    { id: 'josh', name: 'Josh', gender: 'Masculino', accent: 'Brasileiro' },
    { id: 'bella', name: 'Bella', gender: 'Feminino', accent: 'Americano' },
    { id: 'adam', name: 'Adam', gender: 'Masculino', accent: 'Americano' },
  ];

  return (
    <div className="flex flex-col items-center justify-center gap-6 p-8 max-w-2xl">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2 text-white">Escolha a Voz</h2>
        <p className="text-white/60">Selecione a voz para narração do vídeo</p>
      </div>

      <div className="grid grid-cols-2 gap-4 w-full">
        {voices.map((voice) => (
          <button
            key={voice.id}
            onClick={() => setSelectedVoice(voice.id)}
            className={cn(
              'p-4 rounded-lg border-2 text-left transition-all',
              selectedVoice === voice.id
                ? 'border-primary bg-primary/10'
                : 'border-white/10 bg-white/5 hover:border-white/20'
            )}
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Mic className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-medium text-white">{voice.name}</p>
                <p className="text-sm text-white/60">{voice.gender} • {voice.accent}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      <Button 
        size="lg" 
        onClick={onNext}
        disabled={!selectedVoice}
        className="mt-4"
      >
        Continuar
        <ChevronRight className="ml-2" />
      </Button>
    </div>
  );
}

// ============================================================================
// AVATAR STEP
// ============================================================================
function AvatarStep({ onNext }: { onNext: () => void }) {
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const avatars = [
    { id: 'presenter-1', name: 'Ana', style: 'Profissional' },
    { id: 'presenter-2', name: 'Carlos', style: 'Casual' },
    { id: 'presenter-3', name: 'Maria', style: 'Corporativo' },
    { id: 'none', name: 'Sem Avatar', style: 'Apenas narração' },
  ];

  return (
    <div className="flex flex-col items-center justify-center gap-6 p-8 max-w-2xl">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2 text-white">Escolha o Avatar</h2>
        <p className="text-white/60">Selecione um apresentador virtual ou continue sem avatar</p>
      </div>

      <div className="grid grid-cols-2 gap-4 w-full">
        {avatars.map((avatar) => (
          <button
            key={avatar.id}
            onClick={() => setSelectedAvatar(avatar.id)}
            className={cn(
              'p-4 rounded-lg border-2 text-left transition-all',
              selectedAvatar === avatar.id
                ? 'border-primary bg-primary/10'
                : 'border-white/10 bg-white/5 hover:border-white/20'
            )}
          >
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <User className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="font-medium text-white">{avatar.name}</p>
                <p className="text-sm text-white/60">{avatar.style}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      <Button 
        size="lg" 
        onClick={onNext}
        disabled={!selectedAvatar}
        className="mt-4"
      >
        Continuar
        <ChevronRight className="ml-2" />
      </Button>
    </div>
  );
}

// ============================================================================
// PREVIEW STEP
// ============================================================================
function PreviewStep() {
  return (
    <div className="flex flex-col items-center justify-center gap-6 p-8">
      <div className="w-full max-w-3xl aspect-video bg-black rounded-lg flex items-center justify-center">
        <div className="text-center text-white/50">
          <Play className="h-16 w-16 mx-auto mb-4" />
          <p>Clique em Play para visualizar</p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// EXPORT STEP
// ============================================================================
function ExportStep() {
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const startExport = async () => {
    setExporting(true);
    // Simulate progress
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(r => setTimeout(r, 500));
      setProgress(i);
    }
    toast.success('Vídeo exportado com sucesso!');
    setExporting(false);
  };

  return (
    <div className="flex flex-col items-center justify-center gap-6 p-8 max-w-md">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2 text-white">Exportar Vídeo</h2>
        <p className="text-white/60">Configure e inicie a renderização</p>
      </div>

      {exporting ? (
        <div className="w-full space-y-4">
          <Progress value={progress} className="h-3" />
          <p className="text-center text-white/60">Renderizando... {progress}%</p>
        </div>
      ) : (
        <div className="w-full space-y-4">
          <div className="p-4 rounded-lg bg-white/5 border border-white/10">
            <p className="font-medium text-white mb-2">Configurações</p>
            <div className="space-y-2 text-sm text-white/60">
              <p>• Resolução: 1920x1080 (Full HD)</p>
              <p>• Formato: MP4 (H.264)</p>
              <p>• Qualidade: Alta</p>
            </div>
          </div>
          <Button size="lg" className="w-full" onClick={startExport}>
            <Download className="mr-2" />
            Iniciar Renderização
          </Button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// INSPECTOR PANEL
// ============================================================================
function InspectorPanel({ step }: { step: WorkflowStep }) {
  return (
    <div className="p-4">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Settings size={16} />
        Propriedades
      </h3>

      {step === 'import' && (
        <div className="text-sm text-muted-foreground">
          <p>Importe um arquivo PPTX para começar a editar.</p>
          <ul className="mt-4 space-y-2">
            <li className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-green-500" />
              Suporte a imagens e textos
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-green-500" />
              Extração de notas do apresentador
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-green-500" />
              Preservação de layouts
            </li>
          </ul>
        </div>
      )}

      {step === 'edit' && (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Duração do Slide</label>
            <p className="text-xs text-muted-foreground mt-1">Ajuste na timeline abaixo</p>
          </div>
          <div>
            <label className="text-sm font-medium">Transição</label>
            <select className="w-full mt-1 p-2 rounded border bg-background text-sm">
              <option>Fade</option>
              <option>Slide</option>
              <option>Zoom</option>
              <option>Nenhuma</option>
            </select>
          </div>
        </div>
      )}

      {step === 'voice' && (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Velocidade</label>
            <input type="range" min="0.5" max="2" step="0.1" defaultValue="1" className="w-full mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium">Tom</label>
            <input type="range" min="-10" max="10" step="1" defaultValue="0" className="w-full mt-1" />
          </div>
        </div>
      )}

      {step === 'avatar' && (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Posição</label>
            <select className="w-full mt-1 p-2 rounded border bg-background text-sm">
              <option>Inferior Direito</option>
              <option>Inferior Esquerdo</option>
              <option>Tela Cheia</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Tamanho</label>
            <input type="range" min="10" max="50" step="5" defaultValue="25" className="w-full mt-1" />
          </div>
        </div>
      )}

      {step === 'preview' && (
        <div className="text-sm text-muted-foreground">
          <p>Visualize o resultado final antes de exportar.</p>
          <ul className="mt-4 space-y-2">
            <li className="flex items-center gap-2">
              <AlertCircle size={14} className="text-yellow-500" />
              Preview em tempo real
            </li>
          </ul>
        </div>
      )}

      {step === 'export' && (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Qualidade</label>
            <select className="w-full mt-1 p-2 rounded border bg-background text-sm">
              <option>Alta (1080p)</option>
              <option>Média (720p)</option>
              <option>Baixa (480p)</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Formato</label>
            <select className="w-full mt-1 p-2 rounded border bg-background text-sm">
              <option>MP4 (H.264)</option>
              <option>WebM</option>
              <option>MOV</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// STUDIO TIMELINE (Standalone component using store)
// ============================================================================
interface TimelineScene {
  id: string;
  name: string;
  duration: number;
  thumbnailUrl?: string;
}

function StudioTimeline() {
  const { currentTime, duration, project, selectElement, addElement, removeElement, selection } = useTimelineStore();
  const [localScenes, setLocalScenes] = useState<TimelineScene[]>([]);

  // Convert project layers/elements to visual scenes
  useEffect(() => {
    if (project?.layers) {
      const scenes: TimelineScene[] = project.layers.map((layer, idx) => ({
        id: layer.id,
        name: layer.name || `Cena ${idx + 1}`,
        duration: layer.elements?.reduce((acc, el) => Math.max(acc, (el.start || 0) + (el.duration || 5)), 0) || 5,
      }));
      setLocalScenes(scenes);
    }
  }, [project]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const addNewScene = () => {
    const newScene: TimelineScene = {
      id: `scene-${Date.now()}`,
      name: `Cena ${localScenes.length + 1}`,
      duration: 5,
    };
    setLocalScenes([...localScenes, newScene]);
  };

  const removeSceneById = (id: string) => {
    setLocalScenes(localScenes.filter(s => s.id !== id));
  };

  // Calculate total duration from scenes
  const totalDuration = useMemo(() => {
    return localScenes.reduce((acc: number, scene: TimelineScene) => acc + (scene.duration || 5), 0);
  }, [localScenes]);

  const selectedSceneId = selection.layerIds[0] || null;

  return (
    <div className="h-full flex flex-col">
      {/* Timeline Header */}
      <div className="h-10 border-b flex items-center justify-between px-4 bg-muted/30">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">Timeline</span>
          <Badge variant="secondary" className="text-xs">
            {localScenes.length} {localScenes.length === 1 ? 'cena' : 'cenas'}
          </Badge>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {formatTime(currentTime)} / {formatTime(totalDuration || duration || 0)}
          </span>
          <Button variant="outline" size="sm" onClick={addNewScene}>
            <Layers size={14} className="mr-1" />
            Nova Cena
          </Button>
        </div>
      </div>

      {/* Timeline Content */}
      <div className="flex-1 flex items-stretch overflow-x-auto p-4 gap-3">
        {localScenes.length === 0 ? (
          <div className="flex-1 flex items-center justify-center border-2 border-dashed rounded-lg text-muted-foreground">
            <div className="text-center">
              <Layers className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhuma cena ainda</p>
              <p className="text-xs mt-1">Clique em &quot;Nova Cena&quot; para começar</p>
            </div>
          </div>
        ) : (
          localScenes.map((scene: TimelineScene, index: number) => (
            <div
              key={scene.id}
              onClick={() => selectElement(scene.id)}
              className={cn(
                'min-w-[180px] rounded-lg border-2 p-3 cursor-pointer transition-all',
                'hover:border-primary/50',
                selectedSceneId === scene.id
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-card'
              )}
            >
              {/* Scene Preview */}
              <div className="aspect-video bg-neutral-800 rounded mb-2 flex items-center justify-center">
                <span className="text-2xl font-bold text-white/30">{index + 1}</span>
              </div>
              
              {/* Scene Info */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium truncate">
                  {scene.name || `Cena ${index + 1}`}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-50 hover:opacity-100 hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeSceneById(scene.id);
                  }}
                >
                  <X size={14} />
                </Button>
              </div>
              
              {/* Duration */}
              <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                <Clock size={12} />
                <span>{formatTime(scene.duration || 5)}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Playhead / Scrubber */}
      <div className="h-6 border-t bg-muted/50 flex items-center px-4">
        <div className="flex-1 h-1 bg-muted rounded-full relative">
          <div 
            className="absolute h-full bg-primary rounded-full transition-all"
            style={{ width: `${(currentTime / (totalDuration || 1)) * 100}%` }}
          />
          <div 
            className="absolute h-3 w-3 bg-primary rounded-full -translate-y-1 cursor-pointer"
            style={{ left: `${(currentTime / (totalDuration || 1)) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
