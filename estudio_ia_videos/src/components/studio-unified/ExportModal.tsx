'use client';

import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@components/ui/dialog';
import { Button } from '@components/ui/button';
import { Label } from '@components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@components/ui/select';
import { Progress } from '@components/ui/progress';
import { Alert, AlertDescription } from '@components/ui/alert';
import { Download, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { useTimelineStore } from '@lib/stores/timeline-store';
import { logger } from '@lib/logger';
import { validateProjectForExport, EXPORT_PRESETS, ExportPreset } from '@lib/render/studio-render-adapter';

interface ExportModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

type ExportStatus = 'idle' | 'exporting' | 'completed' | 'error';

export function ExportModal({ open, onOpenChange }: ExportModalProps) {
    const project = useTimelineStore(state => state.project);

    // Default to first preset (YouTube 1080p)
    const [selectedPresetId, setSelectedPresetId] = useState<string>(EXPORT_PRESETS[0].id);
    const selectedPreset = EXPORT_PRESETS.find(p => p.id === selectedPresetId) || EXPORT_PRESETS[0];

    const [status, setStatus] = useState<ExportStatus>('idle');
    const [progress, setProgress] = useState(0);
    const [jobId, setJobId] = useState<string | null>(null);
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleExport = async () => {
        if (!project) {
            setError('Nenhum projeto carregado');
            return;
        }

        setStatus('exporting');
        setProgress(0);
        setError(null);

        // Validation Check
        const validation = validateProjectForExport(project);
        if (!validation.valid) {
            setError(validation.errors.join('\n'));
            setStatus('error'); // Show error state immediately
            return;
        }

        try {
            logger.info('Starting export', { projectId: project.id });

            // Chama API de export
            const response = await fetch('/api/studio/export', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    project,
                    config: {
                        quality: selectedPreset.quality,
                        width: selectedPreset.width,
                        height: selectedPreset.height,
                        bitrate: selectedPreset.bitrate
                    }
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Falha ao iniciar exportação');
            }

            const result = await response.json();
            setJobId(result.jobId);

            logger.info('Export started', { jobId: result.jobId });

            // Monitora progresso
            await monitorProgress(result.jobId);

        } catch (err) {
            logger.error('Export error', err as Error);
            setError(err instanceof Error ? err.message : 'Erro desconhecido');
            setStatus('error');
        }
    };

    const monitorProgress = async (jobId: string) => {
        const pollInterval = 2000; // 2 segundos
        const maxAttempts = 300; // 10 minutos máximo
        let attempts = 0;

        const poll = async () => {
            try {
                const response = await fetch(`/api/render/${jobId}/progress`);

                if (!response.ok) {
                    throw new Error('Falha ao consultar progresso');
                }

                const data = await response.json();

                // Atualiza progresso
                if (data.progress !== undefined) {
                    setProgress(data.progress);
                }

                // Verifica status
                if (data.status === 'completed') {
                    setStatus('completed');
                    setDownloadUrl(data.outputUrl || `/api/render/${jobId}/download`);
                    logger.info('Export completed', { jobId });
                    return;
                }

                if (data.status === 'failed' || data.status === 'error') {
                    throw new Error(data.error || 'Renderização falhou');
                }

                // Continua polling se ainda processando
                if (attempts < maxAttempts && (data.status === 'queued' || data.status === 'processing' || data.status === 'active')) {
                    attempts++;
                    setTimeout(poll, pollInterval);
                } else if (attempts >= maxAttempts) {
                    throw new Error('Tempo limite excedido');
                }

            } catch (err) {
                logger.error('Progress monitoring error', err as Error);
                setError(err instanceof Error ? err.message : 'Erro ao monitorar progresso');
                setStatus('error');
            }
        };

        poll();
    };

    const handleDownload = () => {
        if (downloadUrl) {
            window.open(downloadUrl, '_blank');
        }
    };

    const handleClose = () => {
        if (status !== 'exporting') {
            onOpenChange(false);
            // Reset state
            setTimeout(() => {
                setStatus('idle');
                setProgress(0);
                setJobId(null);
                setDownloadUrl(null);
                setError(null);
            }, 300);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Exportar Vídeo</DialogTitle>
                    <DialogDescription>
                        Configure as opções de exportação do seu projeto
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Configurações */}
                    {status === 'idle' && (
                        <>
                            <div className="space-y-2">
                                <Label htmlFor="preset">Formato de Saída</Label>
                                <Select value={selectedPresetId} onValueChange={setSelectedPresetId}>
                                    <SelectTrigger id="preset">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {EXPORT_PRESETS.map(preset => (
                                            <SelectItem key={preset.id} value={preset.id}>
                                                {preset.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">{selectedPreset.description}</p>
                            </div>

                            <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded border">
                                <div className="grid grid-cols-2 gap-2">
                                    <span>Resolução:</span>
                                    <span className="font-mono text-right">{selectedPreset.width}x{selectedPreset.height}</span>

                                    <span>Taxa de Bits:</span>
                                    <span className="font-mono text-right">{selectedPreset.bitrate}</span>

                                    <span>Duração:</span>
                                    <span className="font-mono text-right">{project?.duration.toFixed(1)}s</span>

                                    <span>FPS:</span>
                                    <span className="font-mono text-right">{project?.fps || 30}</span>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Progresso */}
                    {status === 'exporting' && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span className="text-sm">Renderizando vídeo...</span>
                            </div>
                            <Progress value={progress} />
                            <p className="text-xs text-muted-foreground text-center">
                                {progress.toFixed(0)}% concluído
                            </p>
                        </div>
                    )}

                    {/* Concluído */}
                    {status === 'completed' && (
                        <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <AlertDescription className="text-green-800 dark:text-green-200">
                                Vídeo exportado com sucesso!
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Erro */}
                    {status === 'error' && error && (
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription className="whitespace-pre-wrap">{error}</AlertDescription>
                        </Alert>
                    )}
                </div>

                {/* Ações */}
                <div className="flex justify-end gap-2">
                    {status === 'idle' && (
                        <>
                            <Button variant="outline" onClick={handleClose}>
                                Cancelar
                            </Button>
                            <Button onClick={handleExport}>
                                <Download className="mr-2 h-4 w-4" />
                                Exportar
                            </Button>
                        </>
                    )}

                    {status === 'exporting' && (
                        <Button disabled>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Exportando...
                        </Button>
                    )}

                    {status === 'completed' && (
                        <>
                            <Button variant="outline" onClick={handleClose}>
                                Fechar
                            </Button>
                            <Button onClick={handleDownload}>
                                <Download className="mr-2 h-4 w-4" />
                                Baixar Vídeo
                            </Button>
                        </>
                    )}

                    {status === 'error' && (
                        <>
                            <Button variant="outline" onClick={handleClose}>
                                Fechar
                            </Button>
                            <Button onClick={() => setStatus('idle')}>
                                Tentar Novamente
                            </Button>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
