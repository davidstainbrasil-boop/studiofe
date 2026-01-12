'use client';

import { Image, Layout, MonitorPlay } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface Step4ScenesProps {
    onNext: (data: { scenes: any[] }) => void;
    initialValue?: any[];
}

const templates = [
    { id: 'minimal', label: 'Minimalista', icon: Layout, color: 'bg-slate-100' },
    { id: 'corporate', label: 'Corporativo', icon: MonitorPlay, color: 'bg-blue-50' },
    { id: 'dynamic', label: 'Dinâmico', icon: Image, color: 'bg-indigo-50' }
];

export function Step4Scenes({ onNext }: Step4ScenesProps) {
    const [selectedTemplate, setSelectedTemplate] = useState('');

    const handleContinue = () => {
        onNext({ scenes: [{ template: selectedTemplate }] });
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
            <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Estilo Visual</h2>
                <p className="text-slate-500">Escolha o template visual para suas cenas.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                {templates.map((t) => (
                    <Card
                        key={t.id}
                        onClick={() => setSelectedTemplate(t.id)}
                        className={cn(
                            "cursor-pointer transition-all hover:shadow-lg border-2",
                            selectedTemplate === t.id ? "border-violet-600 ring-2 ring-violet-200" : "border-slate-200"
                        )}
                    >
                        <CardContent className="p-8 flex flex-col items-center gap-4">
                            <div className={cn("w-24 h-24 rounded-lg flex items-center justify-center", t.color)}>
                                <t.icon className="w-10 h-10 text-slate-700" />
                            </div>
                            <h3 className="font-semibold text-lg">{t.label}</h3>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="flex justify-end max-w-4xl mx-auto">
                <Button onClick={handleContinue} disabled={!selectedTemplate} size="lg">Continuar</Button>
            </div>
        </div>
    );
}
