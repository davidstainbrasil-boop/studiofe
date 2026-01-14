'use client';

import { useState } from 'react';
import { Check, User } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Mock data (replace with API later)
const avatarModels = [
    { id: '1', name: 'Ana Silva', type: 'Professional', gender: 'female', image: '/avatars/ana.svg' },
    { id: '2', name: 'Carlos Mendes', type: 'Corporate', gender: 'male', image: '/avatars/carlos.svg' },
    { id: '3', name: 'Julia Chen', type: 'Creative', gender: 'female', image: '/avatars/julia.svg' },
    { id: '4', name: 'Roberto Luz', type: 'Casual', gender: 'male', image: '/avatars/roberto.svg' },
    { id: '5', name: 'Sofia Costa', type: 'Medical', gender: 'female', image: '/avatars/sofia.svg' },
    { id: '6', name: 'Pedro Santos', type: 'Tech', gender: 'male', image: '/avatars/pedro.svg' },
];

interface Step3AvatarProps {
    onNext: (data: { avatarId: string }) => void;
    initialValue?: string;
}

export function Step3Avatar({ onNext, initialValue }: Step3AvatarProps) {
    const [selectedId, setSelectedId] = useState(initialValue || '');
    const [category, setCategory] = useState('all');
    const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

    const filteredAvatars = category === 'all'
        ? avatarModels
        : avatarModels.filter(a => a.gender === category); // Simplified filter logic

    const handleContinue = () => {
        if (selectedId) {
            onNext({ avatarId: selectedId });
        }
    };

    const handleImageError = (id: string) => {
        setImageErrors(prev => ({ ...prev, [id]: true }));
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
            <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Escolha um Apresentador</h2>
                <p className="text-slate-500">Selecione o avatar que melhor representa sua marca.</p>
            </div>

            <div className="max-w-5xl mx-auto space-y-6">
                <div className="flex justify-center">
                    <Tabs defaultValue="all" className="w-[400px]" onValueChange={setCategory}>
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="all">Todos</TabsTrigger>
                            <TabsTrigger value="female">Feminino</TabsTrigger>
                            <TabsTrigger value="male">Masculino</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {filteredAvatars.map((avatar) => {
                        const isSelected = selectedId === avatar.id;

                        return (
                            <Card
                                key={avatar.id}
                                className={cn(
                                    "cursor-pointer transition-all border-2 overflow-hidden group hover:shadow-lg",
                                    isSelected
                                        ? "border-violet-600 shadow-violet-200 dark:shadow-violet-900/20"
                                        : "border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                                )}
                                onClick={() => setSelectedId(avatar.id)}
                            >
                                <div className="aspect-[3/4] bg-slate-100 dark:bg-slate-800 relative overflow-hidden">
                                    {!imageErrors[avatar.id] ? (
                                        <img 
                                            src={avatar.image} 
                                            alt={avatar.name}
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                            onError={() => handleImageError(avatar.id)}
                                        />
                                    ) : (
                                        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-slate-200 to-slate-100 dark:from-slate-800 dark:to-slate-700">
                                            <User className="w-20 h-20 text-slate-300 dark:text-slate-600" />
                                        </div>
                                    )}

                                    {isSelected && (
                                        <div className="absolute inset-0 bg-violet-600/10 flex items-center justify-center animate-in fade-in">
                                            <div className="bg-violet-600 text-white p-2 rounded-full shadow-lg">
                                                <Check className="w-6 h-6" />
                                            </div>
                                        </div>
                                    )}

                                    <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
                                        <h3 className="text-white font-semibold truncate">{avatar.name}</h3>
                                        <p className="text-white/80 text-xs">{avatar.type}</p>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>

                <div className="flex justify-end pt-4">
                    <Button
                        size="lg"
                        onClick={handleContinue}
                        disabled={!selectedId}
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
