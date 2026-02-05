'use client';

import { useState, useRef } from 'react';

export default function PPTXUploader() {
  const [uploading, setUploading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string>('');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar arquivo
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-powerpoint',
    ];

    if (!allowedTypes.includes(file.type)) {
      alert('Por favor, selecione um arquivo PPTX ou PPT válido.');
      return;
    }

    await uploadFile(file);
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    setProgress(0);
    setStatus('Enviando arquivo...');
    setVideoUrl(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('voiceType', 'professional');
      formData.append('templateId', 'modern');
      formData.append('slideDuration', '5');

      const response = await fetch('/api/pptx/process', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro no upload');
      }

      setJobId(result.jobId);
      setStatus('Processando slides...');
      setProgress(10);

      // Iniciar polling do status
      pollJobStatus(result.jobId);
    } catch (error) {
      console.error('Erro no upload:', error);
      setStatus(`Erro: ${error.message}`);
      setUploading(false);
    }
  };

  const pollJobStatus = async (id: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/pptx/jobs/${id}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error);
        }

        setProgress(data.job.progress);
        setStatus(getStatusMessage(data.job.status));

        if (data.job.status === 'completed') {
          clearInterval(pollInterval);
          setVideoUrl(data.job.data.videoUrl);
          setUploading(false);
        } else if (data.job.status === 'failed') {
          clearInterval(pollInterval);
          setStatus(`Erro: ${data.job.data.error}`);
          setUploading(false);
        }
      } catch (error) {
        console.error('Erro ao verificar status:', error);
        clearInterval(pollInterval);
        setStatus('Erro ao verificar status do processamento');
        setUploading(false);
      }
    }, 2000); // Verificar a cada 2 segundos

    // Parar polling após 10 minutos
    setTimeout(
      () => {
        clearInterval(pollInterval);
        if (uploading) {
          setStatus('Timeout: Processamento demorou demais');
          setUploading(false);
        }
      },
      10 * 60 * 1000,
    );
  };

  const getStatusMessage = (status: string): string => {
    switch (status) {
      case 'processing':
        return 'Processando apresentação...';
      case 'completed':
        return 'Vídeo gerado com sucesso!';
      case 'failed':
        return 'Falha no processamento';
      case 'cancelled':
        return 'Processamento cancelado';
      default:
        return status;
    }
  };

  const handleCancel = async () => {
    if (!jobId) return;

    try {
      await fetch(`/api/pptx/jobs/${jobId}`, {
        method: 'DELETE',
      });
      setStatus('Processamento cancelado');
      setUploading(false);
      setJobId(null);
    } catch (error) {
      console.error('Erro ao cancelar:', error);
    }
  };

  const resetForm = () => {
    setJobId(null);
    setProgress(0);
    setStatus('');
    setVideoUrl(null);
    setUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-center">Converter PPTX para Vídeo</h2>

      {!uploading && !videoUrl && (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pptx,.ppt"
            onChange={handleFileSelect}
            className="hidden"
            id="pptx-input"
          />
          <label
            htmlFor="pptx-input"
            className="cursor-pointer inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            Selecionar Arquivo PPTX
          </label>
          <p className="mt-4 text-sm text-gray-600">
            Arraste um arquivo .pptx ou .ppt aqui ou clique para selecionar
          </p>
        </div>
      )}

      {uploading && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-800">{status}</span>
              <button onClick={handleCancel} className="text-sm text-red-600 hover:text-red-800">
                Cancelar
              </button>
            </div>

            <div className="w-full bg-blue-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>

            <div className="text-xs text-blue-600 mt-1">{progress}% completo</div>
          </div>

          <div className="text-sm text-gray-600 text-center">
            <p>Tempo estimado: 2-5 minutos</p>
            <p>Não feche esta página enquanto processa...</p>
          </div>
        </div>
      )}

      {videoUrl && (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="text-green-800 font-medium mb-2">✅ Vídeo Gerado!</h3>
            <p className="text-sm text-green-600 mb-4">Seu vídeo foi processado com sucesso.</p>

            <video src={videoUrl} controls className="w-full rounded-lg mb-4" preload="metadata">
              Seu navegador não suporta vídeo.
            </video>

            <div className="flex gap-2">
              <a
                href={videoUrl}
                download="video.mp4"
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Baixar Vídeo
              </a>

              <button
                onClick={resetForm}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Converter Outro Arquivo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
