'use client';

/**
 * Audio Upload Component
 * 
 * Allows users to upload their own audio files (MP3, WAV, M4A)
 * for narration instead of using TTS.
 */

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  Music,
  Trash2,
  Play,
  Pause,
  Volume2,
  AlertCircle,
  CheckCircle,
  Loader2,
  FileAudio,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

// Types
interface AudioFile {
  id: string;
  name: string;
  size: number;
  duration: number;
  url: string;
  type: string;
  uploadedAt: Date;
}

interface AudioUploadProps {
  onAudioSelect: (audio: AudioFile | null) => void;
  selectedAudio?: AudioFile | null;
  maxSizeMB?: number;
  maxDurationSec?: number;
  className?: string;
}

// Supported formats
const SUPPORTED_FORMATS = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/m4a', 'audio/mp4'];
const SUPPORTED_EXTENSIONS = ['.mp3', '.wav', '.m4a'];

// Format bytes to human readable
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Format duration
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function AudioUpload({
  onAudioSelect,
  selectedAudio,
  maxSizeMB = 50,
  maxDurationSec = 600, // 10 minutes
  className,
}: AudioUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Handle file selection
  const handleFileSelect = useCallback(async (file: File) => {
    setError(null);

    // Validate file type
    if (!SUPPORTED_FORMATS.includes(file.type)) {
      setError(`Formato não suportado. Use: ${SUPPORTED_EXTENSIONS.join(', ')}`);
      return;
    }

    // Validate file size
    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      setError(`Arquivo muito grande. Máximo: ${maxSizeMB}MB`);
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Create object URL for preview
      const url = URL.createObjectURL(file);

      // Get audio duration
      const duration = await getAudioDuration(url);

      if (duration > maxDurationSec) {
        URL.revokeObjectURL(url);
        setError(`Áudio muito longo. Máximo: ${formatDuration(maxDurationSec)}`);
        setIsUploading(false);
        return;
      }

      // Simulate upload progress (in real app, this would be actual upload to storage)
      for (let i = 0; i <= 100; i += 10) {
        setUploadProgress(i);
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const audioFile: AudioFile = {
        id: `audio-${Date.now()}`,
        name: file.name,
        size: file.size,
        duration,
        url,
        type: file.type,
        uploadedAt: new Date(),
      };

      onAudioSelect(audioFile);
      setIsUploading(false);
      setUploadProgress(100);

    } catch (err) {
      setError('Erro ao processar o áudio. Tente novamente.');
      setIsUploading(false);
    }
  }, [maxSizeMB, maxDurationSec, onAudioSelect]);

  // Get audio duration from URL
  const getAudioDuration = (url: string): Promise<number> => {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      audio.addEventListener('loadedmetadata', () => {
        resolve(audio.duration);
      });
      audio.addEventListener('error', () => {
        reject(new Error('Failed to load audio'));
      });
      audio.src = url;
    });
  };

  // Handle drag events
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
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  // Handle file input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  // Toggle play/pause
  const togglePlayback = useCallback(() => {
    if (!audioRef.current || !selectedAudio) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying, selectedAudio]);

  // Remove selected audio
  const removeAudio = useCallback(() => {
    if (selectedAudio?.url) {
      URL.revokeObjectURL(selectedAudio.url);
    }
    onAudioSelect(null);
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [selectedAudio, onAudioSelect]);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Upload Area */}
      {!selectedAudio && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all',
            isDragging
              ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
              : 'border-slate-300 hover:border-violet-400 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50',
            isUploading && 'pointer-events-none opacity-50'
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={SUPPORTED_EXTENSIONS.join(',')}
            onChange={handleInputChange}
            className="hidden"
          />

          {isUploading ? (
            <div className="space-y-4">
              <Loader2 className="w-12 h-12 mx-auto text-violet-600 animate-spin" />
              <p className="text-sm text-slate-600 dark:text-slate-400">Processando áudio...</p>
              <Progress value={uploadProgress} className="w-48 mx-auto" />
            </div>
          ) : (
            <>
              <Upload className="w-12 h-12 mx-auto text-slate-400 mb-4" />
              <h3 className="font-medium text-slate-700 dark:text-slate-300 mb-2">
                Arraste seu áudio aqui
              </h3>
              <p className="text-sm text-slate-500 mb-4">
                ou clique para selecionar
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-slate-400">
                <span>Formatos: MP3, WAV, M4A</span>
                <span>•</span>
                <span>Máximo: {maxSizeMB}MB</span>
                <span>•</span>
                <span>Duração: até {formatDuration(maxDurationSec)}</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected Audio Preview */}
      <AnimatePresence>
        {selectedAudio && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 bg-white dark:bg-slate-900"
          >
            <div className="flex items-center gap-4">
              {/* Play/Pause Button */}
              <button
                onClick={togglePlayback}
                className="w-12 h-12 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-violet-600 hover:bg-violet-200 dark:hover:bg-violet-900/50 transition-colors"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5 ml-0.5" />
                )}
              </button>

              {/* Audio Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <FileAudio className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className="font-medium truncate">{selectedAudio.name}</span>
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDuration(selectedAudio.duration)}
                  </span>
                  <span>•</span>
                  <span>{formatBytes(selectedAudio.size)}</span>
                </div>
              </div>

              {/* Remove Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={removeAudio}
                className="text-slate-400 hover:text-red-500"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            {/* Hidden Audio Element */}
            <audio
              ref={audioRef}
              src={selectedAudio.url}
              onEnded={() => setIsPlaying(false)}
              className="hidden"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info Box */}
      <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-700 dark:text-blue-400 text-sm">
        <Volume2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-medium">Dica: Áudio de alta qualidade</p>
          <p className="text-blue-600 dark:text-blue-500 text-xs mt-1">
            Para melhores resultados, use áudio gravado em ambiente silencioso, 
            com taxa de amostragem de pelo menos 44.1kHz e formato MP3 ou WAV.
          </p>
        </div>
      </div>
    </div>
  );
}

export default AudioUpload;
