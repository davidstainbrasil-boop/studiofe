'use client';

import React from 'react';
import { Mic, Play, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';

interface VoicePanelProps {
    onSelectVoice: (id: string) => void;
    selectedVoiceId: string | null;
}

const VOICES = [
    { id: 'rachel', name: 'Rachel', gender: 'Feminino', accent: 'Brasileiro (Neutro)' },
    { id: 'josh', name: 'Josh', gender: 'Masculino', accent: 'Brasileiro (Promo)' },
    { id: 'bella', name: 'Bella', gender: 'Feminino', accent: 'Americano' },
    { id: 'adam', name: 'Adam', gender: 'Masculino', accent: 'Americano' },
];

export function VoicePanel({ onSelectVoice, selectedVoiceId }: VoicePanelProps) {
    return (
        <div className="h-full flex flex-col bg-card">
            <div className="p-4 border-b">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Mic size={18} />
                    Voz e Narração
                </h2>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Voices List */}
                <div className="space-y-3">
                    <h3 className="text-sm font-medium text-muted-foreground">Vozes Disponíveis</h3>
                    {VOICES.map((voice) => (
                        <button
                            key={voice.id}
                            onClick={() => onSelectVoice(voice.id)}
                            className={cn(
                                "w-full p-3 rounded-lg border text-left transition-all flex items-center justify-between group",
                                selectedVoiceId === voice.id
                                    ? "border-primary bg-primary/10"
                                    : "border-border hover:border-primary/30 bg-card"
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center">
                                    <span className="text-xs font-bold">{voice.name[0]}</span>
                                </div>
                                <div>
                                    <p className="text-sm font-medium">{voice.name}</p>
                                    <p className="text-[10px] text-muted-foreground">{voice.gender} • {voice.accent}</p>
                                </div>
                            </div>
                            <Button size="icon" variant="ghost" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                                <Play size={14} />
                            </Button>
                        </button>
                    ))}
                </div>

                {/* Settings */}
                <div className="space-y-4 pt-4 border-t">
                    <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Settings2 size={14} /> Ajustes
                    </h3>

                    <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                            <span>Velocidade</span>
                            <span>1.0x</span>
                        </div>
                        <Slider defaultValue={[1]} max={2} step={0.1} />
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                            <span>Estabilidade</span>
                            <span>75%</span>
                        </div>
                        <Slider defaultValue={[75]} max={100} step={1} />
                    </div>
                </div>
            </div>
        </div>
    );
}
