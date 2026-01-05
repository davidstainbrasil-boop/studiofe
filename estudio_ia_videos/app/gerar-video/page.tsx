'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface NRTemplate {
  id: string;
  nrNumber: string;
  title: string;
  description: string;
  slideCount: number;
  durationSeconds: number;
  durationFormatted: string;
  config: {
    themeColor?: string;
    slides?: Array<{ title: string }>;
  };
}

interface Voice {
  id: string;
  name: string;
  gender: string;
}

interface GenerationJob {
  jobId: string;
  status: string;
  progress: number;
  step: string;
  videoUrl?: string;
}

export default function GerarVideoPage() {
  const [templates, setTemplates] = useState<NRTemplate[]>([]);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<NRTemplate | null>(null);
  const [selectedVoice, setSelectedVoice] = useState('pt-BR-FranciscaNeural');
  const [customSlides, setCustomSlides] = useState<Array<{ title: string; content: string; narration: string }>>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentJob, setCurrentJob] = useState<GenerationJob | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Carregar templates e vozes
  useEffect(() => {
    fetch('/api/templates/nr')
      .then(res => res.json())
      .then(data => {
        if (data.success) setTemplates(data.templates);
      });

    fetch('/api/tts/voices?brazilian=true')
      .then(res => res.json())
      .then(data => {
        if (data.success) setVoices(data.voices);
      });
  }, []);

  // Selecionar template
  const handleSelectTemplate = (template: NRTemplate) => {
    setSelectedTemplate(template);
    setError(null);
    
    // Criar slides a partir do config do template
    if (template.config?.slides) {
      setCustomSlides(
        template.config.slides.map(s => ({
          title: s.title,
          content: s.title,
          narration: `Vamos falar sobre: ${s.title}`,
        }))
      );
    }
  };

  // Atualizar slide
  const updateSlide = (index: number, field: string, value: string) => {
    const newSlides = [...customSlides];
    newSlides[index] = { ...newSlides[index], [field]: value };
    setCustomSlides(newSlides);
  };

  // Adicionar slide
  const addSlide = () => {
    setCustomSlides([
      ...customSlides,
      { title: 'Novo Slide', content: '', narration: '' },
    ]);
  };

  // Remover slide
  const removeSlide = (index: number) => {
    setCustomSlides(customSlides.filter((_, i) => i !== index));
  };

  // Gerar vídeo
  const generateVideo = async () => {
    if (customSlides.length === 0) {
      setError('Adicione pelo menos um slide');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/video/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slides: customSlides.map(s => ({
            title: s.title,
            content: s.content || s.title,
            narration: s.narration || s.title,
            duration: 8,
            backgroundColor: selectedTemplate?.config?.themeColor || '#1a1a2e',
          })),
          projectName: selectedTemplate?.title || 'Vídeo Personalizado',
          voice: selectedVoice,
          generateAudio: true,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setCurrentJob({
          jobId: data.jobId,
          status: 'processing',
          progress: 0,
          step: 'Iniciando...',
        });
        // Iniciar polling do status
        pollJobStatus(data.jobId);
      } else {
        setError(data.error || 'Erro ao iniciar geração');
        setIsGenerating(false);
      }
    } catch (err) {
      setError('Erro de conexão');
      setIsGenerating(false);
    }
  };

  // Polling do status do job
  const pollJobStatus = async (jobId: string) => {
    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/video/generate?jobId=${jobId}`);
        const data = await response.json();

        if (data.success) {
          setCurrentJob({
            jobId,
            status: data.status,
            progress: data.progress,
            step: data.step,
            videoUrl: data.videoUrl,
          });

          if (data.status === 'completed') {
            setIsGenerating(false);
          } else if (data.status === 'failed') {
            setError(data.error || 'Falha na geração');
            setIsGenerating(false);
          } else {
            // Continuar polling
            setTimeout(checkStatus, 2000);
          }
        }
      } catch (err) {
        setError('Erro ao verificar status');
        setIsGenerating(false);
      }
    };

    checkStatus();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-2xl font-bold text-cyan-400">
              🎬 Estúdio IA
            </Link>
            <span className="text-slate-400">|</span>
            <h1 className="text-xl font-semibold">Gerar Vídeo NR</h1>
          </div>
          <nav className="flex gap-4">
            <Link href="/dashboard" className="text-slate-300 hover:text-white transition">
              Dashboard
            </Link>
            <Link href="/api/templates/nr" className="text-slate-300 hover:text-white transition">
              API
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Grid de seleção */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Coluna 1: Templates */}
          <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              📋 Templates NR
            </h2>
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {templates.map(template => (
                <button
                  key={template.id}
                  onClick={() => handleSelectTemplate(template)}
                  className={`w-full text-left p-4 rounded-xl transition-all ${
                    selectedTemplate?.id === template.id
                      ? 'bg-cyan-600 border-cyan-400'
                      : 'bg-slate-700/50 hover:bg-slate-700 border-transparent'
                  } border`}
                >
                  <div className="flex items-center gap-3">
                    <span 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: template.config?.themeColor || '#06b6d4' }}
                    />
                    <div>
                      <div className="font-bold">{template.nrNumber}</div>
                      <div className="text-sm text-slate-300">{template.title}</div>
                      <div className="text-xs text-slate-400 mt-1">
                        {template.slideCount} slides • {template.durationFormatted}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Coluna 2: Editor de Slides */}
          <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                ✏️ Slides
              </h2>
              <button
                onClick={addSlide}
                className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-sm transition"
              >
                + Adicionar
              </button>
            </div>
            
            <div className="space-y-4 max-h-[500px] overflow-y-auto">
              {customSlides.map((slide, index) => (
                <div key={index} className="bg-slate-700/50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-slate-300">
                      Slide {index + 1}
                    </span>
                    <button
                      onClick={() => removeSlide(index)}
                      className="text-red-400 hover:text-red-300 text-sm"
                    >
                      ✕ Remover
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Título"
                    value={slide.title}
                    onChange={(e) => updateSlide(index, 'title', e.target.value)}
                    className="w-full bg-slate-600 rounded-lg px-3 py-2 mb-2 text-white placeholder-slate-400"
                  />
                  <textarea
                    placeholder="Narração (texto para TTS)"
                    value={slide.narration}
                    onChange={(e) => updateSlide(index, 'narration', e.target.value)}
                    rows={2}
                    className="w-full bg-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 resize-none"
                  />
                </div>
              ))}
              
              {customSlides.length === 0 && (
                <div className="text-center text-slate-400 py-8">
                  Selecione um template ou adicione slides manualmente
                </div>
              )}
            </div>
          </div>

          {/* Coluna 3: Configurações e Ação */}
          <div className="space-y-6">
            {/* Voz */}
            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                🎤 Voz
              </h2>
              <select
                value={selectedVoice}
                onChange={(e) => setSelectedVoice(e.target.value)}
                className="w-full bg-slate-700 rounded-lg px-4 py-3 text-white"
              >
                {voices.map(voice => (
                  <option key={voice.id} value={voice.id}>
                    {voice.name} ({voice.gender === 'female' ? '♀' : '♂'})
                  </option>
                ))}
              </select>
            </div>

            {/* Resumo */}
            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
              <h2 className="text-xl font-bold mb-4">📊 Resumo</h2>
              <div className="space-y-2 text-slate-300">
                <div className="flex justify-between">
                  <span>Template:</span>
                  <span className="font-medium text-white">
                    {selectedTemplate?.nrNumber || 'Personalizado'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Slides:</span>
                  <span className="font-medium text-white">{customSlides.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Duração estimada:</span>
                  <span className="font-medium text-white">
                    ~{Math.round(customSlides.length * 8 / 60)} min
                  </span>
                </div>
              </div>
            </div>

            {/* Botão de Gerar */}
            <button
              onClick={generateVideo}
              disabled={isGenerating || customSlides.length === 0}
              className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
                isGenerating
                  ? 'bg-slate-600 cursor-not-allowed'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500'
              }`}
            >
              {isGenerating ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⏳</span>
                  Gerando...
                </span>
              ) : (
                '🚀 Gerar Vídeo'
              )}
            </button>

            {/* Progresso */}
            {currentJob && isGenerating && (
              <div className="bg-slate-800/50 rounded-2xl p-6 border border-cyan-500/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-cyan-400 font-medium">{currentJob.step}</span>
                  <span className="text-white font-bold">{currentJob.progress}%</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-cyan-500 to-blue-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${currentJob.progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Resultado */}
            {currentJob?.videoUrl && (
              <div className="bg-green-900/30 rounded-2xl p-6 border border-green-500/50">
                <h3 className="text-green-400 font-bold mb-4 flex items-center gap-2">
                  ✅ Vídeo Gerado!
                </h3>
                <video
                  src={currentJob.videoUrl}
                  controls
                  className="w-full rounded-lg mb-4"
                />
                <a
                  href={currentJob.videoUrl}
                  download
                  className="block w-full py-3 bg-green-600 hover:bg-green-500 rounded-lg text-center font-medium transition"
                >
                  ⬇️ Download MP4
                </a>
              </div>
            )}

            {/* Erro */}
            {error && (
              <div className="bg-red-900/30 rounded-2xl p-4 border border-red-500/50">
                <p className="text-red-400">❌ {error}</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

