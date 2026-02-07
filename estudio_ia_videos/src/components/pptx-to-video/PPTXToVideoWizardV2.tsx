/**
 * PPTXToVideoWizard V2 - Interface Simplificada estilo HeyGen
 *
 * Design: Uma única tela com tudo visível
 * - Slides à esquerda
 * - Preview/Configuração à direita
 * - Dropdowns simples
 * - Um botão grande "Criar Vídeo"
 */
'use client';

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import {
  Upload,
  FileText,
  Play,
  Loader2,
  Download,
  Volume2,
  VolumeX,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Check,
  X,
  RefreshCw,
} from 'lucide-react';

// Vozes disponíveis (Edge-TTS gratuito)
const VOICES = [
  { id: 'pt-BR-FranciscaNeural', name: 'Francisca', gender: 'Feminino', lang: 'Português' },
  { id: 'pt-BR-AntonioNeural', name: 'Antonio', gender: 'Masculino', lang: 'Português' },
  { id: 'pt-BR-ThalitaNeural', name: 'Thalita', gender: 'Feminino', lang: 'Português' },
  { id: 'pt-BR-BrendaNeural', name: 'Brenda', gender: 'Feminino', lang: 'Português' },
  { id: 'pt-BR-DonatoNeural', name: 'Donato', gender: 'Masculino', lang: 'Português' },
  { id: 'pt-BR-GiovannaNeural', name: 'Giovanna', gender: 'Feminino', lang: 'Português' },
  { id: 'pt-BR-LeticiaNeural', name: 'Leticia', gender: 'Feminino', lang: 'Português' },
  { id: 'pt-BR-FabioNeural', name: 'Fabio', gender: 'Masculino', lang: 'Português' },
];

// Músicas de fundo
const MUSIC_OPTIONS = [
  { id: '', name: 'Sem música' },
  { id: 'corporate-1', name: 'Corporativo Suave' },
  { id: 'upbeat-1', name: 'Animado' },
  { id: 'calm-1', name: 'Calmo e Relaxante' },
  { id: 'inspiring-1', name: 'Inspirador' },
  { id: 'tech-1', name: 'Tecnologia' },
];

interface Slide {
  id: string;
  slideNumber: number;
  title: string;
  content: string;
  notes: string;
  duration: number;
}

interface UploadResult {
  success?: boolean;
  message?: string;
  projectId: string;
  slides: Slide[];
  metadata: {
    title: string;
    totalSlides: number;
  };
}

type WizardState = 'upload' | 'configure' | 'generating' | 'complete';

export function PPTXToVideoWizardV2() {
  // State
  const [state, setState] = useState<WizardState>('upload');
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Project data
  const [projectId, setProjectId] = useState<string | null>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [projectTitle, setProjectTitle] = useState('');
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  // Settings
  const [selectedVoice, setSelectedVoice] = useState('pt-BR-FranciscaNeural');
  const [selectedMusic, setSelectedMusic] = useState('');
  const [musicVolume, setMusicVolume] = useState(20);
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(true);

  // Generation
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStage, setGenerationStage] = useState('');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Handle file upload
  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.pptx')) {
      setError('Por favor, selecione um arquivo .pptx');
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch('/api/pptx/upload-and-extract', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        throw new Error('Falha ao processar arquivo');
      }

      const data: UploadResult = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Erro ao processar PPTX');
      }

      setProjectId(data.projectId);
      setSlides(data.slides.map((s, i) => ({
        ...s,
        id: `slide-${i + 1}`,
        slideNumber: i + 1,
      })));
      setProjectTitle(data.metadata?.title || file.name.replace('.pptx', ''));
      setState('configure');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao fazer upload');
    } finally {
      setIsUploading(false);
    }
  }, []);

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  // Generate video
  const handleGenerate = useCallback(async () => {
    if (!projectId || slides.length === 0) return;

    setState('generating');
    setGenerationProgress(0);
    setGenerationStage('Iniciando...');
    setError(null);

    try {
      const response = await fetch('/api/pptx-to-video/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          slides: slides.map(s => ({
            id: s.id,
            slideNumber: s.slideNumber,
            title: s.title,
            content: s.content,
            notes: s.notes || s.content,
            duration: s.duration,
          })),
          settings: {
            voiceId: selectedVoice,
            voiceProvider: 'edge',
            musicId: selectedMusic || undefined,
            musicVolume,
            subtitlesEnabled,
            subtitleStyle: 'netflix',
            quality: '720p',
            transitionType: 'fade',
            transitionDuration: 1,
          },
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Erro ao iniciar geração');
      }

      setJobId(data.jobId);

      // Poll for status
      pollingRef.current = setInterval(async () => {
        try {
          const statusResponse = await fetch(`/api/pptx-to-video/status/${data.jobId}`);
          const status = await statusResponse.json();

          setGenerationProgress(status.progress || 0);
          setGenerationStage(status.message || '');

          if (status.status === 'completed') {
            clearInterval(pollingRef.current!);
            setVideoUrl(status.videoUrl);
            setState('complete');
          } else if (status.status === 'failed') {
            clearInterval(pollingRef.current!);
            throw new Error(status.error || 'Falha na geração');
          }
        } catch (err) {
          clearInterval(pollingRef.current!);
          setError(err instanceof Error ? err.message : 'Erro ao verificar status');
          setState('configure');
        }
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar vídeo');
      setState('configure');
    }
  }, [projectId, slides, selectedVoice, selectedMusic, musicVolume, subtitlesEnabled]);

  // Download video
  const handleDownload = useCallback(() => {
    if (!videoUrl) return;
    const filename = videoUrl.split('/').pop() || 'video.mp4';
    window.open(`/api/videos/download/${filename}`, '_blank');
  }, [videoUrl]);

  // Reset wizard
  const handleReset = useCallback(() => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    setState('upload');
    setProjectId(null);
    setSlides([]);
    setProjectTitle('');
    setCurrentSlideIndex(0);
    setVideoUrl(null);
    setJobId(null);
    setError(null);
  }, []);

  // Slide navigation
  const currentSlide = slides[currentSlideIndex];
  const totalDuration = slides.reduce((acc, s) => acc + s.duration, 0);

  // ============================================
  // RENDER: Upload State
  // ============================================
  if (state === 'upload') {
    return (
      <div className="min-h-[600px] flex flex-col items-center justify-center p-8">
        <div className="max-w-xl w-full">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-blue-600 mb-4">
              <Sparkles className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Transforme seu PowerPoint em Vídeo</h1>
            <p className="text-muted-foreground">
              Arraste seu arquivo .pptx ou clique para selecionar
            </p>
          </div>

          {/* Upload Area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all',
              isDragging && 'border-blue-500 bg-blue-50',
              !isDragging && 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pptx"
              onChange={handleFileSelect}
              className="hidden"
            />

            {isUploading ? (
              <div className="space-y-4">
                <Loader2 className="w-12 h-12 mx-auto text-blue-500 animate-spin" />
                <div>
                  <p className="font-medium">Processando apresentação...</p>
                  <p className="text-sm text-muted-foreground">Extraindo slides e conteúdo</p>
                </div>
                <Progress value={uploadProgress} className="w-48 mx-auto" />
              </div>
            ) : (
              <>
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                  <Upload className="w-10 h-10 text-gray-400" />
                </div>
                <p className="font-medium text-lg mb-1">Arraste seu arquivo aqui</p>
                <p className="text-sm text-muted-foreground mb-4">ou clique para selecionar</p>
                <Button variant="outline" size="lg" className="rounded-full">
                  <FileText className="w-5 h-5 mr-2" />
                  Selecionar Arquivo
                </Button>
                <p className="text-xs text-muted-foreground mt-4">
                  Formato aceito: .pptx • Máximo: 100 MB
                </p>
              </>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-center">
              {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: Configure State (Main Interface)
  // ============================================
  if (state === 'configure') {
    return (
      <div className="min-h-[600px]">
        {/* Header */}
        <div className="border-b bg-muted/30 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={handleReset}>
                <ChevronLeft className="w-4 h-4 mr-1" />
                Voltar
              </Button>
              <div className="h-6 w-px bg-border" />
              <div>
                <h2 className="font-semibold">{projectTitle}</h2>
                <p className="text-xs text-muted-foreground">
                  {slides.length} slides • ~{totalDuration}s de vídeo
                </p>
              </div>
            </div>
            <Button
              size="lg"
              onClick={handleGenerate}
              className="rounded-full px-8 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Criar Vídeo
            </Button>
          </div>
        </div>

        {/* Main Content - Two Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 lg:divide-x min-h-[500px]">
          {/* Left: Slides */}
          <div className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-500" />
              Seus Slides
            </h3>

            {/* Current Slide Preview */}
            {currentSlide && (
              <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl p-6 text-white mb-4 min-h-[200px]">
                <div className="text-xs opacity-70 mb-2">Slide {currentSlide.slideNumber}</div>
                <h4 className="text-xl font-bold mb-3">{currentSlide.title}</h4>
                <p className="text-sm opacity-90 line-clamp-4">{currentSlide.content}</p>
              </div>
            )}

            {/* Slide Navigation */}
            <div className="flex items-center justify-between mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentSlideIndex(i => Math.max(0, i - 1))}
                disabled={currentSlideIndex === 0}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                {currentSlideIndex + 1} de {slides.length}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentSlideIndex(i => Math.min(slides.length - 1, i + 1))}
                disabled={currentSlideIndex === slides.length - 1}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Slide Thumbnails */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {slides.map((slide, index) => (
                <button
                  key={slide.id}
                  onClick={() => setCurrentSlideIndex(index)}
                  className={cn(
                    'flex-shrink-0 w-24 h-16 rounded-lg border-2 p-2 text-left transition-all',
                    index === currentSlideIndex
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <div className="text-[10px] font-medium truncate">{slide.title}</div>
                  <div className="text-[8px] text-muted-foreground">Slide {slide.slideNumber}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Right: Settings */}
          <div className="p-6 bg-muted/20">
            <h3 className="font-semibold mb-6">Configurações do Vídeo</h3>

            <div className="space-y-6">
              {/* Voice Selection */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  🎙️ Voz da Narração
                </label>
                <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VOICES.map(voice => (
                      <SelectItem key={voice.id} value={voice.id}>
                        <span className="flex items-center gap-2">
                          <span>{voice.name}</span>
                          <span className="text-xs text-muted-foreground">({voice.gender})</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Voz natural em português brasileiro
                </p>
              </div>

              {/* Music Selection */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  🎵 Música de Fundo
                </label>
                <Select value={selectedMusic} onValueChange={setSelectedMusic}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sem música" />
                  </SelectTrigger>
                  <SelectContent>
                    {MUSIC_OPTIONS.map(music => (
                      <SelectItem key={music.id} value={music.id}>
                        {music.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Volume Slider */}
                {selectedMusic && (
                  <div className="mt-3 flex items-center gap-3">
                    <VolumeX className="w-4 h-4 text-muted-foreground" />
                    <Slider
                      value={[musicVolume]}
                      onValueChange={([v]) => setMusicVolume(v)}
                      max={100}
                      step={5}
                      className="flex-1"
                    />
                    <Volume2 className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs w-8">{musicVolume}%</span>
                  </div>
                )}
              </div>

              {/* Subtitles Toggle */}
              <div className="flex items-center justify-between p-4 bg-background rounded-lg border">
                <div>
                  <div className="font-medium text-sm">📝 Legendas Automáticas</div>
                  <div className="text-xs text-muted-foreground">
                    Adiciona legendas no vídeo
                  </div>
                </div>
                <Switch
                  checked={subtitlesEnabled}
                  onCheckedChange={setSubtitlesEnabled}
                />
              </div>

              {/* Summary */}
              <div className="p-4 bg-background rounded-lg border">
                <div className="text-sm font-medium mb-2">Resumo</div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Slides:</span>
                    <span className="font-medium text-foreground">{slides.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Duração estimada:</span>
                    <span className="font-medium text-foreground">~{totalDuration}s</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Qualidade:</span>
                    <span className="font-medium text-foreground">HD (720p)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: Generating State
  // ============================================
  if (state === 'generating') {
    return (
      <div className="min-h-[600px] flex flex-col items-center justify-center p-8">
        <div className="max-w-md w-full text-center">
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-4 border-blue-100" />
            <div
              className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"
              style={{ animationDuration: '1.5s' }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold text-blue-600">{generationProgress}%</span>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-2">Criando seu vídeo...</h2>
          <p className="text-muted-foreground mb-6">{generationStage}</p>

          <Progress value={generationProgress} className="w-full h-2 mb-4" />

          <div className="flex justify-center gap-2 text-xs text-muted-foreground">
            <span className={cn(generationProgress >= 10 && 'text-green-600')}>
              {generationProgress >= 10 ? <Check className="w-3 h-3 inline" /> : '○'} Narração
            </span>
            <span>→</span>
            <span className={cn(generationProgress >= 50 && 'text-green-600')}>
              {generationProgress >= 50 ? <Check className="w-3 h-3 inline" /> : '○'} Vídeo
            </span>
            <span>→</span>
            <span className={cn(generationProgress >= 80 && 'text-green-600')}>
              {generationProgress >= 80 ? <Check className="w-3 h-3 inline" /> : '○'} Legendas
            </span>
            <span>→</span>
            <span className={cn(generationProgress >= 100 && 'text-green-600')}>
              {generationProgress >= 100 ? <Check className="w-3 h-3 inline" /> : '○'} Pronto
            </span>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: Complete State
  // ============================================
  if (state === 'complete') {
    return (
      <div className="min-h-[600px] flex flex-col items-center justify-center p-8">
        <div className="max-w-lg w-full text-center">
          {/* Success Icon */}
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
            <Check className="w-10 h-10 text-green-600" />
          </div>

          <h2 className="text-3xl font-bold mb-2">Vídeo Criado!</h2>
          <p className="text-muted-foreground mb-8">
            Seu vídeo está pronto para download
          </p>

          {/* Video Preview */}
          {videoUrl && (
            <div className="mb-6 rounded-xl overflow-hidden border shadow-lg">
              <video
                src={`/api/videos/download/${videoUrl.split('/').pop()}`}
                controls
                className="w-full"
                poster="/images/video-poster.jpg"
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              size="lg"
              onClick={handleDownload}
              className="rounded-full px-8 bg-gradient-to-r from-green-600 to-emerald-600"
            >
              <Download className="w-5 h-5 mr-2" />
              Baixar Vídeo
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={handleReset}
              className="rounded-full px-8"
            >
              <RefreshCw className="w-5 h-5 mr-2" />
              Criar Outro
            </Button>
          </div>

          {/* Stats */}
          <div className="mt-8 flex justify-center gap-6 text-sm text-muted-foreground">
            <div>
              <span className="font-medium text-foreground">{slides.length}</span> slides
            </div>
            <div>
              <span className="font-medium text-foreground">~{totalDuration}s</span> de duração
            </div>
            <div>
              <span className="font-medium text-foreground">HD</span> qualidade
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
