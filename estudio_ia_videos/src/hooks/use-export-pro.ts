'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';

export type SCORMVersion = 'scorm12' | 'scorm2004' | 'xapi' | 'aicc';
export type ExportFormat = 'mp4' | 'webm' | 'mov' | 'gif';
export type ExportResolution = '720p' | '1080p' | '4K';

export interface SCORMExportParams {
    projectId: string;
    videoUrl: string;
    title: string;
    version: SCORMVersion;
    settings: {
        trackCompletion: boolean;
        requireFullView: boolean;
        passScore: number;
        courseVersion?: string;
    };
}

export interface VideoExportParams {
    projectId: string;
    format: ExportFormat;
    resolution: ExportResolution;
    options?: {
        includeSubtitles?: boolean;
        includeThumbnail?: boolean;
        watermark?: boolean;
    };
}

export interface ExportJob {
    id: string;
    type: 'video' | 'scorm';
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress: number;
    downloadUrl?: string;
    error?: string;
    createdAt: string;
}

interface UseExportProReturn {
    isExporting: boolean;
    exportProgress: number;
    currentJob: ExportJob | null;
    exportHistory: ExportJob[];
    error: string | null;
    exportVideo: (params: VideoExportParams) => Promise<ExportJob | null>;
    exportSCORM: (params: SCORMExportParams) => Promise<ExportJob | null>;
    pollExportStatus: (jobId: string) => Promise<ExportJob | null>;
    fetchExportHistory: (projectId: string) => Promise<void>;
    downloadExport: (jobId: string) => Promise<void>;
}

export function useExportPro(): UseExportProReturn {
    const [isExporting, setIsExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState(0);
    const [currentJob, setCurrentJob] = useState<ExportJob | null>(null);
    const [exportHistory, setExportHistory] = useState<ExportJob[]>([]);
    const [error, setError] = useState<string | null>(null);

    const pollExportStatus = useCallback(async (jobId: string): Promise<ExportJob | null> => {
        try {
            const response = await fetch(`/api/export/create?jobId=${jobId}`);
            if (!response.ok) throw new Error('Failed to get export status');
            
            const data = await response.json();
            const job: ExportJob = {
                id: jobId,
                type: data.type || 'video',
                status: data.status,
                progress: data.progress || 0,
                downloadUrl: data.downloadUrl,
                error: data.error,
                createdAt: data.createdAt || new Date().toISOString(),
            };
            
            setExportProgress(job.progress);
            setCurrentJob(job);
            
            if (job.status === 'completed' || job.status === 'failed') {
                return job;
            }
            
            return null; // Still processing
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Erro ao verificar status';
            setError(message);
            return null;
        }
    }, []);

    const exportVideo = useCallback(async (params: VideoExportParams): Promise<ExportJob | null> => {
        setIsExporting(true);
        setExportProgress(0);
        setError(null);
        
        try {
            const response = await fetch('/api/export/mp4', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: params.projectId,
                    format: params.format,
                    resolution: params.resolution,
                    ...params.options,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to start export');
            }

            const data = await response.json();
            const jobId = data.jobId || data.id;
            
            if (!jobId) throw new Error('No job ID returned');
            
            toast.info('Exportação iniciada!');
            
            // Poll for completion
            const maxAttempts = 120; // 10 minutes max
            for (let i = 0; i < maxAttempts; i++) {
                await new Promise(resolve => setTimeout(resolve, 5000));
                
                const result = await pollExportStatus(jobId);
                if (result) {
                    setIsExporting(false);
                    if (result.status === 'completed') {
                        toast.success('Vídeo exportado com sucesso!');
                    } else {
                        toast.error(result.error || 'Export failed');
                    }
                    return result;
                }
            }
            
            throw new Error('Export timed out');
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Erro ao exportar vídeo';
            setError(message);
            toast.error(message);
            return null;
        } finally {
            setIsExporting(false);
        }
    }, [pollExportStatus]);

    const exportSCORM = useCallback(async (params: SCORMExportParams): Promise<ExportJob | null> => {
        setIsExporting(true);
        setExportProgress(0);
        setError(null);
        
        try {
            const response = await fetch('/api/export/scorm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: params.projectId,
                    videoUrl: params.videoUrl,
                    title: params.title,
                    scormVersion: params.version,
                    trackCompletion: params.settings.trackCompletion,
                    requireFullView: params.settings.requireFullView,
                    passingScore: params.settings.passScore,
                    courseVersion: params.settings.courseVersion || '1.0.0',
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create SCORM package');
            }

            const data = await response.json();
            
            const job: ExportJob = {
                id: data.packageId || data.id,
                type: 'scorm',
                status: 'completed',
                progress: 100,
                downloadUrl: data.downloadUrl,
                createdAt: new Date().toISOString(),
            };
            
            setCurrentJob(job);
            setIsExporting(false);
            toast.success('Pacote SCORM gerado com sucesso!');
            
            return job;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Erro ao criar pacote SCORM';
            setError(message);
            toast.error(message);
            return null;
        } finally {
            setIsExporting(false);
        }
    }, []);

    const fetchExportHistory = useCallback(async (projectId: string) => {
        try {
            const response = await fetch(`/api/export/create?projectId=${projectId}`);
            if (!response.ok) throw new Error('Failed to fetch export history');
            
            const data = await response.json();
            setExportHistory(data.exports || []);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Erro ao carregar histórico';
            setError(message);
        }
    }, []);

    const downloadExport = useCallback(async (jobId: string) => {
        try {
            const job = exportHistory.find(j => j.id === jobId) || currentJob;
            if (!job?.downloadUrl) {
                throw new Error('Download URL not available');
            }
            
            // Trigger download
            const link = document.createElement('a');
            link.href = job.downloadUrl;
            link.download = `export-${jobId}.${job.type === 'scorm' ? 'zip' : 'mp4'}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            toast.success('Download iniciado!');
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Erro ao fazer download';
            toast.error(message);
        }
    }, [exportHistory, currentJob]);

    return {
        isExporting,
        exportProgress,
        currentJob,
        exportHistory,
        error,
        exportVideo,
        exportSCORM,
        pollExportStatus,
        fetchExportHistory,
        downloadExport,
    };
}
