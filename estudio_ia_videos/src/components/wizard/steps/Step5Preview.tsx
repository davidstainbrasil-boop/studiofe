'use client';

import { Play } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Step5PreviewProps {
    onNext: (data: any) => void;
}

export function Step5Preview({ onNext }: Step5PreviewProps) {
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500 text-center">
            <h2 className="text-2xl font-bold">Preview do Vídeo</h2>

            <div className="max-w-3xl mx-auto aspect-video bg-black rounded-lg relative overflow-hidden group items-center justify-center flex">
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <Button className="w-16 h-16 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm z-10 p-0 flex items-center justify-center">
                    <Play className="w-8 h-8 text-white fill-white ml-1" />
                </Button>
            </div>

            <div className="flex justify-end max-w-3xl mx-auto pt-4">
                <Button onClick={() => onNext({})} size="lg" className="px-8">Aprovar e Renderizar</Button>
            </div>
        </div>
    );
}
