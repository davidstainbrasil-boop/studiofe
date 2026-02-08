'use client';
import { logger } from '@/lib/logger';

import { useState } from 'react';
import { Sparkles, PenTool, Eraser, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';

interface Step2ScriptProps {
    onNext: (data: { script: string, title: string }) => void;
    initialValue?: string;
}

export function Step2Script({ onNext, initialValue }: Step2ScriptProps) {
    const [script, setScript] = useState(initialValue || '');
    const [title, setTitle] = useState('');
    const [topic, setTopic] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    // Mock AI Generation
    const handleGenerate = () => {
        setIsGenerating(true);
        setTimeout(() => {
            setScript(`Olá e bem-vindo a este treinamento sobre ${topic || 'nosso novo produto'}. \n\nHoje vamos aprender como maximizar sua produtividade utilizando nossas ferramentas de IA.\n\nPrimeiro, comece definindo seu objetivo claro...`);
            setIsGenerating(false);
        }, 1500);
    };

    const handleContinue = () => {
        if (script.trim()) {
            onNext({ script, title: title || 'Sem título' });
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
            <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Roteiro do Vídeo</h2>
                <p className="text-slate-500">Escreva seu próprio conteúdo ou deixe nossa IA ajudar.</p>
            </div>

            <div className="max-w-4xl mx-auto">
                <Tabs defaultValue="write" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-8">
                        <TabsTrigger value="write" className="flex items-center gap-2">
                            <PenTool className="w-4 h-4" />
                            Escrever Manualmente
                        </TabsTrigger>
                        <TabsTrigger value="ai" className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4" />
                            Gerar com IA
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="write" className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="title">Título do Vídeo</Label>
                            <Input
                                id="title"
                                placeholder="Ex: Treinamento de Segurança"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="script">Conteúdo do Roteiro</Label>
                            <Textarea
                                id="script"
                                placeholder="Digite o texto que o avatar irá falar..."
                                className="min-h-[300px] text-base leading-relaxed p-6 resize-y"
                                value={script}
                                onChange={(e) => setScript(e.target.value)}
                            />
                            <p className="text-xs text-slate-500 text-right">
                                {script.length} caracteres
                            </p>
                        </div>
                    </TabsContent>

                    <TabsContent value="ai" className="space-y-6">
                        <div className="bg-violet-50 dark:bg-violet-900/20 p-6 rounded-xl border border-violet-100 dark:border-violet-800 space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="topic">Sobre o que é o vídeo?</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="topic"
                                        placeholder="Ex: Como dar feedback construtivo"
                                        value={topic}
                                        onChange={(e) => setTopic(e.target.value)}
                                        className="flex-1"
                                    />
                                    <Button
                                        onClick={async () => {
                                            if (!topic) return;
                                            setIsGenerating(true);
                                            try {
                                                const response = await fetch('/api/ai/generate-script', {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({
                                                        topics: [topic],
                                                        nr: 'geral',
                                                        duration: 120 // 2 minutes goal
                                                    })
                                                });
                                                const data = await response.json();
                                                if (data.success) {
                                                    setScript(data.data.scriptContent || data.data);
                                                } else {
                                                    logger.error(data.error);
                                                    setScript("Erro ao gerar roteiro. Tente novamente.");
                                                }
                                            } catch (e) {
                                                logger.error(String(e));
                                                setScript("Erro de conexão. Verifique sua internet.");
                                            } finally {
                                                setIsGenerating(false);
                                            }
                                        }}
                                        disabled={!topic || isGenerating}
                                        className="bg-violet-600 hover:bg-violet-700 text-white min-w-[140px]"
                                    >
                                        {isGenerating ? (
                                            <span className="flex items-center gap-2">
                                                <Sparkles className="w-4 h-4 animate-spin" /> Gerando...
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-2">
                                                <Sparkles className="w-4 h-4" /> Gerar Roteiro
                                            </span>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {script && (
                            <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4">
                                <Label>Roteiro Gerado</Label>
                                <Textarea
                                    value={script}
                                    onChange={(e) => setScript(e.target.value)}
                                    className="min-h-[300px] text-base leading-relaxed p-6 bg-white dark:bg-slate-900"
                                />
                            </div>
                        )}
                    </TabsContent>
                </Tabs>

                <div className="flex justify-end pt-8">
                    <Button
                        size="lg"
                        onClick={handleContinue}
                        disabled={!script.trim()}
                        className="px-8"
                    >
                        Continuar
                        <Check className="w-4 h-4 ml-2" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
