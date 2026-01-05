/**
 * 🧪 Teste PPTX - Interface Completa de Testes
 * Sistema integrado para validar funcionalidades PPTX
 */

'use client';

import React, { useState, useRef } from 'react';
import { usePPTX } from '../../hooks/use-pptx';
import { PPTXDocument, PPTXProcessingJob } from '../../types/pptx-types';

interface PreviewData {
  title: string;
  slideCount: number;
  author: string;
  slides: Array<{
    slideNumber: number;
    title: string;
    contentPreview: string;
  }>;
}

const PPTXTest: React.FC = () => {
  const {
    isUploading,
    isGenerating,
    currentJob,
    uploadProgress,
    error,
    documents,
    activeDocument,
    uploadPPTX,
    generatePPTX,
    getJobStatus,
    listJobs,
    cancelJob,
    loadDocument,
    getDocumentPreview,
    convertToVideo,
    getAvailableTemplates,
    clearError,
    validateFile
  } = usePPTX();

  const [jobs, setJobs] = useState<PPTXProcessingJob[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [generationData, setGenerationData] = useState<unknown>({});
  const [preview, setPreview] = useState<PreviewData | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dados de exemplo para geração rápida
  const exampleData = {
    'training-course': {
      title: 'Curso de Segurança Ocupacional',
      subtitle: 'Prevenção de Acidentes no Trabalho',
      objectives: [
        'Identificar principais riscos ocupacionais',
        'Conhecer equipamentos de proteção',
        'Aplicar procedimentos de segurança',
        'Desenvolver cultura preventiva'
      ],
      modules: [
        {
          title: 'Introdução à Segurança',
          topics: ['História da segurança', 'Legislação brasileira', 'Custos dos acidentes'],
          notes: 'Módulo introdutório fundamental'
        },
        {
          title: 'Identificação de Riscos',
          topics: ['Tipos de riscos', 'Mapeamento de riscos', 'Avaliação quantitativa'],
          notes: 'Identificação prática de perigos'
        },
        {
          title: 'Equipamentos de Proteção',
          topics: ['EPIs obrigatórios', 'Uso correto', 'Manutenção e higienização'],
          notes: 'Demonstração prática de EPIs'
        }
      ]
    },
    'safety-presentation': {
      title: 'NR-35: Trabalho em Altura',
      risks: [
        'Quedas de pessoas',
        'Quedas de materiais e ferramentas',
        'Acidentes com equipamentos',
        'Condições meteorológicas adversas',
        'Problemas estruturais'
      ]
    },
    'quick-slides': {
      title: 'Apresentação de Demonstração',
      slides: [
        {
          type: 'title',
          title: 'Sistema PPTX Integrado',
          subtitle: 'Demonstração Completa de Funcionalidades'
        },
        {
          type: 'content',
          title: 'Funcionalidades Implementadas',
          content: [
            'Upload e parsing de arquivos PPTX',
            'Geração automática de apresentações',
            'Templates personalizáveis',
            'Conversão para vídeo',
            'Sistema de jobs assíncronos'
          ]
        },
        {
          type: 'content',
          title: 'Tecnologias Utilizadas',
          content: [
            'Next.js 14 com App Router',
            'PptxGenJS para geração',
            'JSZip para parsing',
            'TypeScript para tipagem',
            'Sistema de hooks React'
          ]
        }
      ]
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const jobId = await uploadPPTX(file, {
        generateThumbnails: true,
        includeAnimations: true,
        optimizeImages: true
      });
      console.log('Upload iniciado:', jobId);
    } catch (err) {
      console.error('Erro no upload:', err);
    }
  };

  const handleGeneratePPTX = async (templateType: string) => {
    try {
      const data = exampleData[templateType as keyof typeof exampleData];
      if (!data) {
        alert('Dados de exemplo não encontrados para este template');
        return;
      }

      const blob = await generatePPTX(templateType, data);
      
      // Fazer download do arquivo gerado
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${data.title || 'apresentacao'}.pptx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log('Apresentação gerada e baixada com sucesso');
    } catch (err) {
      console.error('Erro na geração:', err);
    }
  };

  const handleListJobs = async () => {
    const jobList = await listJobs();
    setJobs(jobList);
  };

  const handleLoadTemplates = async () => {
    const templateList = await getAvailableTemplates();
    setTemplates(templateList);
  };

  const handleGetPreview = async () => {
    if (!currentJob) return;
    
    const previewData = await getDocumentPreview(currentJob.id);
    setPreview(previewData as unknown as PreviewData);
  };

  const handleConvertToVideo = async () => {
    if (!activeDocument) return;

    try {
      const videoJobId = await convertToVideo(activeDocument.id, {
        slideTransition: {
          type: 'fade',
          duration: 0.5
        },
        slideTiming: {
          auto: true,
          duration: 5 // 5 segundos por slide
        },
        videoSettings: {
          resolution: { width: 1920, height: 1080 },
          fps: 30,
          quality: 'high',
          format: 'mp4'
        },
        audio: {
          enabled: false,
          volume: 0.8
        }
      });

      console.log('Conversão para vídeo iniciada:', videoJobId);
      alert(`Conversão para vídeo iniciada! Job ID: ${videoJobId}`);
    } catch (err) {
      console.error('Erro na conversão para vídeo:', err);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto bg-white rounded-lg shadow-lg">
      <h1 className="text-3xl font-bold mb-6 text-center">
        🧪 Sistema PPTX - Teste Completo
      </h1>

      {/* Status do Sistema */}
      <div className="mb-6 p-4 bg-gray-100 rounded-lg">
        <h2 className="text-xl font-semibold mb-3">Status do Sistema</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <strong>Upload:</strong> {isUploading ? '🟡 Ativo' : '🟢 Pronto'}
          </div>
          <div>
            <strong>Geração:</strong> {isGenerating ? '🟡 Ativo' : '🟢 Pronto'}
          </div>
          <div>
            <strong>Progresso:</strong> {uploadProgress}%
          </div>
          <div>
            <strong>Documentos:</strong> {documents.length}
          </div>
        </div>
      </div>

      {/* Job Atual */}
      {currentJob && (
        <div className="mb-6 p-4 bg-blue-100 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Job Atual</h3>
          <div className="space-y-2">
            <div><strong>ID:</strong> {currentJob.id}</div>
            <div><strong>Tipo:</strong> {currentJob.type}</div>
            <div><strong>Status:</strong> {currentJob.status}</div>
            <div><strong>Progresso:</strong> {currentJob.progress}%</div>
            {currentJob.progress > 0 && (
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${currentJob.progress}%` }}
                />
              </div>
            )}
            {currentJob.status === 'processing' && (
              <button
                onClick={() => cancelJob(currentJob.id)}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Cancelar Job
              </button>
            )}
          </div>
        </div>
      )}

      {/* Erro */}
      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-300 rounded-lg">
          <h3 className="text-lg font-semibold text-red-800 mb-2">Erro</h3>
          <p className="text-red-700">{error}</p>
          <button
            onClick={clearError}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Limpar Erro
          </button>
        </div>
      )}

      {/* Upload de Arquivo */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">📤 Upload de Arquivo PPTX</h3>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pptx"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isUploading ? 'Fazendo Upload...' : 'Selecionar Arquivo PPTX'}
          </button>
          <p className="mt-2 text-sm text-gray-600">
            Arquivos suportados: .pptx (máximo 50MB)
          </p>
        </div>
      </div>

      {/* Geração de Apresentações */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">🎨 Geração de Apresentações</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => handleGeneratePPTX('training-course')}
            disabled={isGenerating}
            className="p-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
          >
            📚 Curso de Treinamento
          </button>
          <button
            onClick={() => handleGeneratePPTX('safety-presentation')}
            disabled={isGenerating}
            className="p-4 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400"
          >
            🦺 Segurança do Trabalho
          </button>
          <button
            onClick={() => handleGeneratePPTX('quick-slides')}
            disabled={isGenerating}
            className="p-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400"
          >
            ⚡ Slides Rápidos
          </button>
        </div>
      </div>

      {/* Controles Avançados */}
      <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          onClick={handleListJobs}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          📋 Listar Jobs
        </button>
        <button
          onClick={handleLoadTemplates}
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          📝 Carregar Templates
        </button>
        <button
          onClick={handleGetPreview}
          disabled={!currentJob || currentJob.status !== 'completed'}
          className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 disabled:bg-gray-400"
        >
          👁️ Preview
        </button>
        <button
          onClick={handleConvertToVideo}
          disabled={!activeDocument}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400"
        >
          🎬 Para Vídeo
        </button>
      </div>

      {/* Documento Ativo */}
      {activeDocument && (
        <div className="mb-6 p-4 bg-green-100 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">📄 Documento Ativo</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p><strong>Título:</strong> {activeDocument.title}</p>
              <p><strong>Autor:</strong> {activeDocument.author}</p>
              <p><strong>Slides:</strong> {activeDocument.slides.length}</p>
            </div>
            <div>
              <p><strong>Criado:</strong> {new Date(activeDocument.metadata.createdAt).toLocaleString()}</p>
              <p><strong>Tamanho:</strong> {(activeDocument.metadata.fileSize / 1024).toFixed(1)} KB</p>
              <p><strong>Orientação:</strong> {activeDocument.settings.orientation}</p>
            </div>
          </div>
        </div>
      )}

      {/* Preview */}
      {preview && (
        <div className="mb-6 p-4 bg-yellow-100 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">👁️ Preview do Documento</h3>
          <div className="space-y-2">
            <p><strong>Título:</strong> {preview.title}</p>
            <p><strong>Slides:</strong> {preview.slideCount}</p>
            <p><strong>Autor:</strong> {preview.author}</p>
            <div>
              <strong>Slides de Exemplo:</strong>
              <div className="mt-2 space-y-2">
                {preview.slides?.map((slide: { slideNumber: number; title: string; contentPreview?: string }, index: number) => (
                  <div key={index} className="p-2 bg-white rounded border">
                    <strong>Slide {slide.slideNumber}:</strong> {slide.title}
                    <p className="text-sm text-gray-600 mt-1">{slide.contentPreview}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lista de Jobs */}
      {jobs.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">📋 Histórico de Jobs</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {jobs.map((job) => (
              <div key={job.id} className="p-3 bg-gray-50 rounded-lg flex justify-between items-center">
                <div>
                  <strong>ID:</strong> {job.id.slice(0, 20)}... | 
                  <strong> Tipo:</strong> {job.type} | 
                  <strong> Status:</strong> {job.status} | 
                  <strong> Progresso:</strong> {job.progress}%
                </div>
                <div className="flex space-x-2">
                  {job.status === 'processing' && (
                    <button
                      onClick={() => cancelJob(job.id)}
                      className="px-2 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                    >
                      Cancelar
                    </button>
                  )}
                  {job.status === 'completed' && (
                    <button
                      onClick={() => loadDocument(job.documentId)}
                      className="px-2 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                    >
                      Carregar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Templates Disponíveis */}
      {templates.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">📝 Templates Disponíveis</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <div key={template.id} className="p-4 border rounded-lg">
                <h4 className="font-semibold">{template.name}</h4>
                <p className="text-sm text-gray-600 mb-2">{template.description}</p>
                <div className="text-xs text-gray-500">
                  <strong>Categoria:</strong> {template.category}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  <strong>Variáveis:</strong> {template.variables.length}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Informações do Sistema */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">ℹ️ Informações do Sistema</h3>
        <div className="text-sm text-gray-600 space-y-1">
          <p><strong>Funcionalidades Implementadas:</strong></p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Upload e parsing de arquivos PPTX</li>
            <li>Geração automática de apresentações</li>
            <li>Sistema de templates personalizáveis</li>
            <li>Jobs assíncronos com polling de status</li>
            <li>Preview de documentos processados</li>
            <li>Conversão para vídeo (integração com sistema de renderização)</li>
            <li>Validação de arquivos e tratamento de erros</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PPTXTest;