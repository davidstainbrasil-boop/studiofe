'use client';

import { CheckCircle, Download, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useState, useEffect, useRef } from 'react';
import { useProjects } from '@/hooks/use-projects';
import { toast } from 'react-hot-toast';

export function Step6Export({ videoData }: { videoData: any }) {
    const [status, setStatus] = useState<'idle' | 'creating_project' | 'queued' | 'processing' | 'completed' | 'failed'>('idle');
    const [progress, setProgress] = useState(0);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [projectId, setProjectId] = useState<string | null>(null);

    // Use a ref to prevent double-firing in strict mode
    const hasStartedRef = useRef(false);

    const { createProject, updateProject } = useProjects();

    useEffect(() => {
        let pollInterval: NodeJS.Timeout;

        const startProcess = async () => {
            if (hasStartedRef.current) return;
            hasStartedRef.current = true;

            try {
                // 1. Create Project
                setStatus('creating_project');
                const project = await createProject({
                    name: videoData.title || "Novo Vídeo IA",
                    type: 'ai-generated',
                    description: videoData.goal || "Vídeo gerado via Wizard",
                    status: 'in-progress',
                    metadata: {
                        script: videoData.script,
                        avatarId: videoData.avatarId,
                        scenes: videoData.scenes
                    }
                });

                if (!project) throw new Error("Falha ao criar projeto");
                setProjectId(project.id);

                // 2. Start Render
                setStatus('queued');
                const payload = {
                    slides: videoData.scenes?.map((scene: any) => ({
                        content: scene.content || videoData.script?.slice(0, 100) || "Conteúdo",
                        duration: 5,
                        title: "Cena Gerada",
                        // Pass avatar config if needed
                    })) || [{ title: "Intro", content: videoData.script || "Olá", duration: 10 }],
                    projectName: project.name,
                    projectId: project.id // Associate render job with project
                };

                const res = await fetch('/api/render', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const data = await res.json();

                if (data.success) {
                    const jobId = data.jobId;

                    // 3. Poll for Status
                    pollInterval = setInterval(async () => {
                        const statusRes = await fetch(`/api/render?jobId=${jobId}`);
                        const statusData = await statusRes.json();

                        if (statusData.success) {
                            setStatus(statusData.status);
                            setProgress(statusData.progress || 0);

                            if (statusData.status === 'completed') {
                                clearInterval(pollInterval);
                                setVideoUrl(statusData.videoUrl);
                                setProgress(100);

                                // 4. Update Project on Completion
                                await updateProject(project.id, {
                                    status: 'completed',
                                    render_settings: { videoUrl: statusData.videoUrl } as any
                                });
                                toast.success("Projeto salvo e renderizado!");

                            } else if (statusData.status === 'failed') {
                                clearInterval(pollInterval);
                                setError(statusData.error || "Falha na renderização");
                                updateProject(project.id, { status: 'error' });
                            }
                        }
                    }, 2000);
                } else {
                    throw new Error(data.error);
                }
            } catch (e) {
                console.error(e);
                setError(e instanceof Error ? e.message : "Erro desconhecido");
                setStatus('failed');
                hasStartedRef.current = false; // Allow retry if needed?
            }
        };

        if (status === 'idle') {
            startProcess();
        }

        return () => clearInterval(pollInterval);
    }, [videoData, status, createProject, updateProject]);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500 max-w-2xl mx-auto text-center">
            {status !== 'completed' ? (
                <>
                    <h2 className="text-2xl font-bold">
                        {status === 'creating_project' && 'Criando projeto...'}
                        {status === 'queued' && 'Iniciando renderização...'}
                        {status === 'processing' && 'Renderizando seu vídeo...'}
                        {status === 'failed' && 'Erro na Renderização'}
                    </h2>

                    {error && (
                        <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm">
                            {error}
                            <Button variant="outline" size="sm" className="ml-4" onClick={() => {
                                setStatus('idle');
                                hasStartedRef.current = false;
                            }}>
                                Tentar Novamente
                            </Button>
                        </div>
                    )}

                    <Card>
                        <CardContent className="p-8 space-y-4">
                            <Progress value={progress} className="h-4" />
                            <p className="text-slate-500">
                                {status === 'creating_project' && 'Salvando rascunho...'}
                                {status === 'queued' && 'Na fila...'}
                                {status === 'processing' && `Processando: ${progress}%`}
                                {status === 'failed' && 'Falhou'}
                            </p>
                        </CardContent>
                    </Card>
                </>
            ) : (
                <>
                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                        <CheckCircle className="w-10 h-10" />
                    </div>
                    <h2 className="text-3xl font-bold">Vídeo Pronto!</h2>
                    <p className="text-slate-500">Seu vídeo foi renderizado e salvo em "Projetos Recentes".</p>

                    <div className="grid grid-cols-2 gap-4 mt-8">
                        <Button size="lg" variant="outline" className="h-14">
                            <Share2 className="mr-2 h-5 w-5" /> Compartilhar
                        </Button>
                        <a href={videoUrl || '#'} download target="_blank" className="w-full">
                            <Button size="lg" className="h-14 bg-green-600 hover:bg-green-700 w-full">
                                <Download className="mr-2 h-5 w-5" /> Baixar MP4
                            </Button>
                        </a>
                    </div>
                </>
            )}
        </div>
    );
}
