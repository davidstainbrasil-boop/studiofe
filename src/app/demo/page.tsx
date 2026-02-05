'use client';

import { useState } from 'react';
import PPTXUploader from '@/components/PPTXUploader';
import VideoEditor from '@/components/VideoEditor';

export default function DemoPage() {
  const [activeTab, setActiveTab] = useState<'pptx' | 'editor' | 'avatar'>('pptx');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">TécnicoCursos MVP Vídeo</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Demonstração Funcional 100% Real</span>
              <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                Online
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('pptx')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'pptx'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
                <span>PPTX para Vídeo</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('editor')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'editor'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                  />
                </svg>
                <span>Editor de Vídeo</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('avatar')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'avatar'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                <span>Avatar IA</span>
              </div>
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Info Banner */}
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                🚀 MVP funcionando com APIs reais • Upload para S3 • ElevenLabs integrado •
                Processamento FFmpeg • Legendas automáticas
              </p>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === 'pptx' && (
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Conversor de PPTX para Vídeo</h2>
                <p className="mt-1 text-sm text-gray-600">
                  Converta apresentações PowerPoint em vídeos profissionais com narração automática
                </p>
              </div>
              <div className="p-6">
                <PPTXUploader />
              </div>
            </div>
          )}

          {activeTab === 'editor' && (
            <div className="bg-white rounded-lg shadow h-full">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Editor de Vídeo Completo</h2>
                <p className="mt-1 text-sm text-gray-600">
                  Crie vídeos profissionais com templates personalizados e avatares IA
                </p>
              </div>
              <div className="h-[calc(100vh-200px)]">
                <VideoEditor />
              </div>
            </div>
          )}

          {activeTab === 'avatar' && (
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Geração de Avatar IA</h2>
                <p className="mt-1 text-sm text-gray-600">
                  Crie avatares 3D realistas para apresentações em vídeo
                </p>
              </div>
              <div className="p-6">
                <AvatarGenerator />
              </div>
            </div>
          )}
        </div>

        {/* Features Grid */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
              </div>
              <h3 className="ml-3 text-lg font-medium text-gray-900">Processamento Rápido</h3>
            </div>
            <p className="text-gray-600">
              Renderização otimizada com FFmpeg e processamento paralelo para resultados em minutos
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
              <h3 className="ml-3 text-lg font-medium text-gray-900">Qualidade Profissional</h3>
            </div>
            <p className="text-gray-600">
              Templates personalizados, legendas automáticas e áudio em alta resolução
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                </div>
              </div>
              <h3 className="ml-3 text-lg font-medium text-gray-900">Cloud Storage</h3>
            </div>
            <p className="text-gray-600">
              Upload automático para AWS S3 com URLs públicas e CDN integrado
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

function AvatarGenerator() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [config, setConfig] = useState({
    modelId: 'professional-male-01',
    appearance: {
      gender: 'male' as const,
      age: 30,
      ethnicity: 'caucasian',
      hairStyle: 'professional',
      clothing: 'business',
    },
    voice: {
      voiceId: 'rachel',
      text: 'Olá! Seja bem-vindo ao TécnicoCursos.',
      language: 'pt-BR' as const,
    },
    rendering: {
      quality: 'high' as const,
      resolution: '1920x1080',
      format: 'mp4' as const,
    },
  });

  const generateAvatar = async () => {
    setIsGenerating(true);

    try {
      const response = await fetch('/api/avatar/render', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      const result = await response.json();

      if (response.ok) {
        alert(`Avatar gerado com sucesso! Job ID: ${result.jobId}`);
      } else {
        alert(`Erro: ${result.error}`);
      }
    } catch (error) {
      alert('Erro ao gerar avatar');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-medium mb-4">Configuração do Avatar</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gênero</label>
              <select
                value={config.appearance.gender}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    appearance: {
                      ...config.appearance,
                      gender: e.target.value as 'male' | 'female',
                    },
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="male">Masculino</option>
                <option value="female">Feminino</option>
                <option value="neutral">Neutro</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Idade</label>
              <input
                type="range"
                min="18"
                max="80"
                value={config.appearance.age}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    appearance: { ...config.appearance, age: parseInt(e.target.value) },
                  })
                }
                className="w-full"
              />
              <div className="text-sm text-gray-600 text-center">{config.appearance.age} anos</div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Voz</label>
              <select
                value={config.voice.voiceId}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    voice: { ...config.voice, voiceId: e.target.value },
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="rachel">Rachel (Profissional)</option>
                <option value="domi">Domi (Casual)</option>
                <option value="bella">Bella (Amigável)</option>
                <option value="adam">Adam (Autoritário)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Texto para Fala
              </label>
              <textarea
                value={config.voice.text}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    voice: { ...config.voice, text: e.target.value },
                  })
                }
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Digite o texto que o avatar vai falar..."
              />
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium mb-4">Renderização</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Qualidade</label>
              <select
                value={config.rendering.quality}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    rendering: {
                      ...config.rendering,
                      quality: e.target.value as 'low' | 'medium' | 'high' | 'ultra',
                    },
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">Baixa</option>
                <option value="medium">Média</option>
                <option value="high">Alta</option>
                <option value="ultra">Ultra</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Resolução</label>
              <select
                value={config.rendering.resolution}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    rendering: { ...config.rendering, resolution: e.target.value },
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="1280x720">720p HD</option>
                <option value="1920x1080">1080p Full HD</option>
                <option value="3840x2160">4K Ultra HD</option>
              </select>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Tempo Estimado</h4>
              <p className="text-sm text-gray-600">
                {config.rendering.quality === 'ultra'
                  ? '15-20 minutos'
                  : config.rendering.quality === 'high'
                    ? '8-12 minutos'
                    : config.rendering.quality === 'medium'
                      ? '4-6 minutos'
                      : '2-3 minutos'}
              </p>
            </div>

            <button
              onClick={generateAvatar}
              disabled={isGenerating || !config.voice.text.trim()}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isGenerating ? 'Gerando Avatar...' : 'Gerar Avatar'}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium mb-2">Status da Renderização</h4>
        <p className="text-sm text-gray-600">
          {isGenerating ? 'Processando avatar...' : 'Aguardando configuração'}
        </p>
      </div>
    </div>
  );
}
