'use client';

import { Check, Presentation, GraduationCap, Megaphone, Rocket, User } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface Step1GoalProps {
    onNext: (data: { goal: string }) => void;
    initialValue?: string;
}

const goals = [
    { id: 'training', label: 'Treinamento / Curso', icon: GraduationCap, description: 'Vídeos educativos e tutoriais' },
    { id: 'marketing', label: 'Marketing / Promo', icon: Megaphone, description: 'Anúncios e divulgação' },
    { id: 'onboarding', label: 'Onboarding', icon: Rocket, description: 'Boas vindas para novos times' },
    { id: 'corporate', label: 'Corporativo', icon: Presentation, description: 'Comunicados internos' },
    { id: 'personal', label: 'Marca Pessoal', icon: User, description: 'Conteúdo para redes sociais' },
];

export function Step1Goal({ onNext, initialValue }: Step1GoalProps) {
    const selectedGoal = initialValue || '';

    const handleSelect = (id: string) => {
        onNext({ goal: id });
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Qual o objetivo do seu vídeo?</h2>
                <p className="text-slate-500">Isso nos ajuda a personalizar o roteiro e o estilo.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
                {goals.map((goal) => {
                    const Icon = goal.icon;
                    const isSelected = selectedGoal === goal.id;

                    return (
                        <Card
                            key={goal.id}
                            className={cn(
                                "cursor-pointer transition-all border-2 hover:border-violet-400 dark:hover:border-violet-700",
                                isSelected
                                    ? "border-violet-600 bg-violet-50 dark:bg-violet-900/20 shadow-md transform scale-[1.02]"
                                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                            )}
                            onClick={() => handleSelect(goal.id)}
                        >
                            <CardContent className="p-6 flex flex-col items-center text-center gap-4">
                                <div className={cn(
                                    "w-12 h-12 rounded-full flex items-center justify-center transition-colors",
                                    isSelected ? "bg-violet-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                                )}>
                                    <Icon className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className={cn("font-semibold mb-1", isSelected ? "text-violet-900 dark:text-violet-100" : "text-slate-900 dark:text-white")}>
                                        {goal.label}
                                    </h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                        {goal.description}
                                    </p>
                                </div>
                                {isSelected && (
                                    <div className="absolute top-4 right-4 text-violet-600">
                                        <Check className="w-5 h-5" />
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
