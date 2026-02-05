'use client';

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { VideoTemplate, VideoTemplateService } from '@/lib/templates/video-templates';
import elevenLabsService, { VoiceConfig } from '@/lib/audio/elevenlabs-service';

interface Slide {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  duration: number;
  voiceSettings: VoiceConfig;
  background?: string;
  transition?: string;
}

interface VideoProject {
  id: string;
  title: string;
  description: string;
  template: VideoTemplate;
  slides: Slide[];
  settings: {
    resolution: string;
    frameRate: number;
    quality: string;
    backgroundMusic: boolean;
    autoCaptions: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export default function VideoEditor() {
  const [project, setProject] = useState<VideoProject | null>(null);
  const [selectedSlide, setSelectedSlide] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [availableVoices, setAvailableVoices] = useState<any[]>([]);
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [mobileView, setMobileView] = useState<'slides' | 'properties' | 'editor'>('editor');
  const [isMobile, setIsMobile] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Detect mobile screen size and optimize performance
  useEffect(() => {
    loadVoices();
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      // Cleanup any remaining intervals
      const intervals = (window as any).__videoEditorIntervals || [];
      intervals.forEach(clearInterval);
      (window as any).__videoEditorIntervals = [];
    };
  }, []);

  // Memoize selected slide data to prevent unnecessary re-renders
  const selectedSlideData = useMemo(
    () => project?.slides.find((s) => s.id === selectedSlide),
    [project?.slides, selectedSlide],
  );

  // Memoize total duration calculation
  const totalDuration = useMemo(
    () => project?.slides.reduce((total, slide) => total + slide.duration, 0) || 30,
    [project?.slides],
  );

  // Inicializar componente
  useState(() => {
    loadVoices();
  });

  const loadVoices = async () => {
    try {
      const voices = await elevenLabsService.getVoices();
      setAvailableVoices(voices);
    } catch (error) {
      console.error('Erro ao carregar vozes:', error);
    }
  };

  const createNewProject = (template: VideoTemplate) => {
    const newProject: VideoProject = {
      id: `project-${Date.now()}`,
      title: 'Novo Projeto de Vídeo',
      description: '',
      template,
      slides: [
        {
          id: 'slide-1',
          title: 'Título do Vídeo',
          content: 'Adicione seu conteúdo aqui...',
          duration: 5,
          voiceSettings: {
            voiceId: 'rachel',
            text: 'Bem-vindo ao seu vídeo!',
            language: 'pt-BR',
            stability: 0.75,
            similarity_boost: 0.75,
          },
        },
      ],
      settings: {
        resolution: '1920x1080',
        frameRate: 30,
        quality: 'high',
        backgroundMusic: true,
        autoCaptions: true,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setProject(newProject);
    setSelectedSlide('slide-1');
  };

  const addSlide = () => {
    if (!project) return;

    const newSlide: Slide = {
      id: `slide-${Date.now()}`,
      title: 'Novo Slide',
      content: '',
      duration: 5,
      voiceSettings: {
        voiceId: 'rachel',
        text: '',
        language: 'pt-BR',
        stability: 0.75,
        similarity_boost: 0.75,
      },
    };

    setProject({
      ...project,
      slides: [...project.slides, newSlide],
      updatedAt: new Date().toISOString(),
    });
  };

  const updateSlide = (slideId: string, updates: Partial<Slide>) => {
    if (!project) return;

    setProject({
      ...project,
      slides: project.slides.map((slide) =>
        slide.id === slideId ? { ...slide, ...updates } : slide,
      ),
      updatedAt: new Date().toISOString(),
    });
  };

  const deleteSlide = (slideId: string) => {
    if (!project || project.slides.length <= 1) return;

    setProject({
      ...project,
      slides: project.slides.filter((slide) => slide.id !== slideId),
      updatedAt: new Date().toISOString(),
    });

    if (selectedSlide === slideId) {
      setSelectedSlide(project.slides[0]?.id || null);
    }
  };

  const generateAudioForSlide = async (slideId: string) => {
    if (!project) return;

    const slide = project.slides.find((s) => s.id === slideId);
    if (!slide || !slide.voiceSettings.text) return;

    try {
      const result = await elevenLabsService.generateAudio(slide.voiceSettings);

      if (result.success) {
        updateSlide(slideId, {
          voiceSettings: {
            ...slide.voiceSettings,
            audioPath: result.audioPath,
            duration: result.duration,
          },
        });
      }
    } catch (error) {
      console.error('Erro ao gerar áudio:', error);
    }
  };

  const renderVideo = async () => {
    if (!project) return;

    setIsRendering(true);
    setRenderProgress(0);

    try {
      const response = await fetch('/api/video/render', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(project),
      });

      const result = await response.json();

      if (response.ok) {
        // Iniciar polling do progresso
        pollRenderProgress(result.jobId);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Erro na renderização:', error);
      setIsRendering(false);
    }
  };

  const pollRenderProgress = (jobId: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/video/jobs/${jobId}`);
        const data = await response.json();

        setRenderProgress(data.job.progress);

        if (data.job.status === 'completed') {
          clearInterval(interval);
          setIsRendering(false);
          // Mostrar vídeo final
          if (data.job.data.videoUrl) {
            alert('Vídeo renderizado com sucesso!');
          }
        } else if (data.job.status === 'failed') {
          clearInterval(interval);
          setIsRendering(false);
          alert(`Erro na renderização: ${data.job.data.error}`);
        }
      } catch (error) {
        console.error('Erro no polling:', error);
        clearInterval(interval);
        setIsRendering(false);
      }
    }, 2000);

    // Store interval ID for cleanup
    return () => clearInterval(interval);
  };

  if (!project) {
    return <ProjectSelector onCreateProject={createNewProject} />;
  }

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-100">
      {/* Mobile Navigation */}
      {isMobile && (
        <div className="md:hidden bg-white border-b border-gray-200 p-2">
          <div className="flex space-x-1">
            <button
              onClick={() => setMobileView('editor')}
              className={`flex-1 px-3 py-2 text-sm rounded-lg transition-colors ${
                mobileView === 'editor'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Preview
            </button>
            <button
              onClick={() => setMobileView('slides')}
              className={`flex-1 px-3 py-2 text-sm rounded-lg transition-colors ${
                mobileView === 'slides'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Slides
            </button>
            <button
              onClick={() => setMobileView('properties')}
              className={`flex-1 px-3 py-2 text-sm rounded-lg transition-colors ${
                mobileView === 'properties'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Edit
            </button>
          </div>
        </div>
      )}

      {/* Sidebar - Hidden on mobile or shown conditionally */}
      {(!isMobile || mobileView === 'slides') && (
        <div
          className={`${isMobile ? 'w-full' : 'w-80'} bg-white border-r border-gray-200 overflow-y-auto ${isMobile ? '' : 'hidden md:block'}`}
        >
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold truncate">{project.title}</h2>
            <p className="text-sm text-gray-600 truncate">{project.template.name}</p>
          </div>

          <div className="p-4">
            <button
              onClick={addSlide}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mb-4 text-sm md:text-base"
            >
              + Adicionar Slide
            </button>

            <div className="space-y-2">
              {project.slides.map((slide, index) => (
                <div
                  key={slide.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedSlide === slide.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => {
                    setSelectedSlide(slide.id);
                    if (isMobile) setMobileView('properties');
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-sm md:text-base">Slide {index + 1}</h3>
                      <p className="text-sm text-gray-600 truncate">
                        {slide.title || 'Sem título'}
                      </p>
                    </div>
                    {project.slides.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSlide(slide.id);
                        }}
                        className="text-red-500 hover:text-red-700 ml-2 flex-shrink-0"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Editor Area */}
      {(!isMobile || mobileView === 'editor') && (
        <div
          className={`${isMobile ? 'w-full' : 'flex-1'} flex flex-col ${isMobile ? '' : 'hidden md:flex'}`}
        >
          {/* Preview Area */}
          <div className="flex-1 bg-black flex items-center justify-center relative">
            <div className="relative w-full h-full max-w-4xl aspect-video bg-white mx-auto">
              {/* Canvas for video preview */}
              <canvas
                ref={canvasRef}
                className="w-full h-full"
                style={{ display: isPlaying ? 'none' : 'block' }}
              />

              {/* Video element for playback */}
              <video
                ref={videoRef}
                className="w-full h-full"
                style={{ display: isPlaying ? 'block' : 'none' }}
                controls
              />

              {/* Slide Preview Overlay */}
              {!isPlaying && selectedSlideData && (
                <div
                  className="absolute inset-0 flex flex-col justify-center items-center text-center p-4 md:p-12"
                  style={{
                    backgroundColor: project.template.colors.background,
                    color: project.template.colors.text,
                    fontFamily: project.template.fonts.heading,
                  }}
                >
                  <h1 className="text-2xl md:text-4xl font-bold mb-4 md:mb-6">
                    {selectedSlideData.title}
                  </h1>
                  <p className="text-sm md:text-xl leading-relaxed px-2">
                    {selectedSlideData.content}
                  </p>
                </div>
              )}
            </div>
          </div>

        {/* Controls */}
        <div className="bg-white border-t border-gray-200 p-2 md:p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-3 md:space-y-0">
            {/* Playback Controls */}
            <div className="flex items-center justify-center md:justify-start space-x-3 md:space-x-4">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-3 md:p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors touch-manipulation"
                aria-label={isPlaying ? 'Pausar' : 'Play'}
              >
                {isPlaying ? (
                  <svg className="w-6 h-6 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </button>
            </div>

            {/* Progress Bar - Mobile with touch-friendly controls */}
            <div className="flex flex-col items-center space-y-2 w-full md:w-auto">
              <div className="flex items-center space-x-2 w-full md:w-auto px-2 md:px-0">
                <span className="text-xs md:text-sm text-gray-600 whitespace-nowrap">00:00</span>
                <div className="flex-1 md:w-32 md:flex-none bg-gray-200 rounded-full h-2 md:h-2 relative">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(currentTime / totalDuration) * 100}%` }}
                  />
                </div>
                <span className="text-xs md:text-sm text-gray-600 whitespace-nowrap">{formatTime(totalDuration)}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-center md:justify-end space-x-3 md:space-x-4">
              <button
                onClick={renderVideo}
                disabled={isRendering}
                className="px-4 py-2 md:px-6 py-2.5 md:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm md:text-sm font-medium touch-manipulation min-h-[44px] min-w-[120px]"
              >
                {isRendering ? `${renderProgress}%` : 'Renderizar'}
              </button>
            </div>
          </div>

          {/* Mobile Rendering Progress */}
          {isRendering && (
            <div className="mt-3 md:hidden">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-900">Renderizando vídeo...</span>
                  <span className="text-sm text-blue-700">{renderProgress}%</span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${renderProgress}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
                  <span className="text-xs md:text-sm text-gray-600 whitespace-nowrap">
                    {formatTime(totalDuration)}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-2 md:space-x-4">
                <button
                  onClick={renderVideo}
                  disabled={isRendering}
                  className="px-4 py-2 md:px-6 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  {isRendering ? `${renderProgress}%` : 'Renderizar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Properties Panel - Hidden on mobile or shown conditionally */}
      {(!isMobile || mobileView === 'properties') && (
        <div className="w-full md:w-80 bg-white border-t md:border-t-0 md:border-l border-gray-200">
          <div className="p-4 md:p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Propriedades</h3>
            
            <div className="space-y-4">
              {/* Slide Properties */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duração (segundos)
                </label>
                <input
                  type="number"
                  min="1"
                  max="300"
                  value={selectedSlideData?.duration || 5}
                  onChange={(e) => updateSlide(selectedSlide!, 'duration', parseInt(e.target.value) || 5)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function ProjectSelector({
  onCreateProject,
}: {
  onCreateProject: (template: VideoTemplate) => void;
}) {
  const templates = VideoTemplateService.getAllTemplates();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredTemplates =
    selectedCategory === 'all'
      ? templates
      : templates.filter((t) => t.category === selectedCategory);

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 md:p-8">
      <div className="max-w-6xl w-full">
        <div className="text-center mb-6 md:mb-8">
          <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-2 md:mb-4">
            TécnicoCursos Vídeo Editor
          </h1>
          <p className="text-base md:text-xl text-gray-600 px-4">
            Escolha um template para começar seu projeto
          </p>
        </div>

        <div className="mb-4 md:mb-6 flex justify-center px-4">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full max-w-xs px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
          >
            <option value="all">Todos os Templates</option>
            <option value="business">Negócios</option>
            <option value="education">Educação</option>
            <option value="marketing">Marketing</option>
            <option value="corporate">Corporativo</option>
            <option value="creative">Criativo</option>
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 px-2 md:px-0">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow cursor-pointer transform hover:scale-[1.02] transition-transform"
              onClick={() => onCreateProject(template)}
            >
              <div
                className="h-24 md:h-32 flex items-center justify-center"
                style={{ backgroundColor: template.colors.primary }}
              >
                <div
                  className="text-lg md:text-2xl font-bold px-3 md:px-4 py-2 rounded text-center"
                  style={{
                    backgroundColor: template.colors.secondary,
                    color: template.colors.text,
                  }}
                >
                  {template.name}
                </div>
              </div>
              <div className="p-3 md:p-4">
                <h3 className="font-semibold text-base md:text-lg mb-2">{template.name}</h3>
                <p className="text-gray-600 text-xs md:text-sm mb-3 line-clamp-2">
                  {template.description}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded truncate max-w-[45%]">
                    {template.category}
                  </span>
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded truncate max-w-[45%]">
                    {template.style}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SlideProperties({
  slide,
  onUpdate,
  availableVoices,
  onGenerateAudio,
}: {
  slide: Slide;
  onUpdate: (updates: Partial<Slide>) => void;
  availableVoices: any[];
  onGenerateAudio: () => void;
}) {
  return (
    <div className="p-3 md:p-4 space-y-4 md:space-y-6">
      <div className="sticky top-0 bg-white z-10 pb-2 md:pb-0">
        <h3 className="text-base md:text-lg font-semibold mb-2 md:mb-4">Propriedades do Slide</h3>
      </div>

      <div className="space-y-3 md:space-y-4">
        <div>
          <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">
            Título
          </label>
          <input
            type="text"
            value={slide.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            className="w-full px-2 md:px-3 py-1.5 md:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
            placeholder="Digite o título..."
          />
        </div>

        <div>
          <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">
            Conteúdo
          </label>
          <textarea
            value={slide.content}
            onChange={(e) => onUpdate({ content: e.target.value })}
            rows={3}
            className="w-full px-2 md:px-3 py-1.5 md:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base resize-none"
            placeholder="Digite o conteúdo..."
          />
        </div>

        <div>
          <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">
            Duração (segundos)
          </label>
          <input
            type="number"
            value={slide.duration}
            onChange={(e) => onUpdate({ duration: parseInt(e.target.value) })}
            min="1"
            max="60"
            className="w-full px-2 md:px-3 py-1.5 md:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
          />
        </div>

        <div className="border-t pt-3 md:pt-4">
          <h4 className="text-sm md:text-md font-medium text-gray-700 mb-2 md:mb-3">
            Configuração de Voz
          </h4>

          <div className="space-y-3">
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">Voz</label>
              <select
                value={slide.voiceSettings.voiceId}
                onChange={(e) =>
                  onUpdate({
                    voiceSettings: { ...slide.voiceSettings, voiceId: e.target.value },
                  })
                }
                className="w-full px-2 md:px-3 py-1.5 md:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
              >
                {availableVoices.map((voice) => (
                  <option key={voice.voice_id} value={voice.voice_id}>
                    {voice.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">
                Texto para narração
              </label>
              <textarea
                value={slide.voiceSettings.text}
                onChange={(e) =>
                  onUpdate({
                    voiceSettings: { ...slide.voiceSettings, text: e.target.value },
                  })
                }
                rows={2}
                className="w-full px-2 md:px-3 py-1.5 md:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base resize-none"
                placeholder="Texto para narração..."
              />
            </div>

            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">
                Estabilidade: {Math.round((slide.voiceSettings.stability || 0.75) * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={slide.voiceSettings.stability || 0.75}
                onChange={(e) =>
                  onUpdate({
                    voiceSettings: {
                      ...slide.voiceSettings,
                      stability: parseFloat(e.target.value),
                    },
                  })
                }
                className="w-full h-1.5 md:h-2"
              />
            </div>

            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">
                Similaridade: {Math.round((slide.voiceSettings.similarity_boost || 0.75) * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={slide.voiceSettings.similarity_boost || 0.75}
                onChange={(e) =>
                  onUpdate({
                    voiceSettings: {
                      ...slide.voiceSettings,
                      similarity_boost: parseFloat(e.target.value),
                    },
                  })
                }
                className="w-full h-1.5 md:h-2"
              />
            </div>

            <button
              onClick={onGenerateAudio}
              disabled={!slide.voiceSettings.text}
              className="w-full px-3 md:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm md:text-base font-medium"
            >
              Gerar Áudio
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function getTotalDuration(): number {
  // Calcular duração total do projeto
  return 30; // Placeholder
}
