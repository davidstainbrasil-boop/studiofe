'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@components/ui/button';
import { Badge } from '@components/ui/badge';
import { Slider } from '@components/ui/slider';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@components/ui/tabs';
import { ScrollArea } from '@components/ui/scroll-area';
import { Separator } from '@components/ui/separator';
import { Textarea } from '@components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@components/ui/card';
import { Progress } from '@components/ui/progress';
import {
    Play,
    Pause,
    User,
    UserPlus,
    Upload,
    Download,
    Settings,
    Mic,
    Video,
    Sparkles,
    Wand2,
    Camera,
    Image,
    ChevronLeft,
    ChevronRight,
    Check,
    Star,
    Crown,
    Zap,
    Palette,
    Volume2,
    Languages,
    Clock,
    RotateCcw,
    Search,
    Filter,
    Grid3X3,
    List,
    Heart,
    Plus,
    RefreshCw,
    AlertCircle,
    Info,
    Loader2
} from 'lucide-react';
import { cn } from '@lib/utils';
import Link from 'next/link';
import { useAIAvatars, Avatar as APIAvatar } from '@/hooks/use-ai-avatars';
import { toast } from 'sonner';

// Types - Extended for UI
interface AvatarUI {
    id: string;
    name: string;
    gender: 'male' | 'female';
    style: string;
    thumbnail: string;
    thumbnailUrl?: string;
    languages?: string[];
    premium?: boolean;
    new?: boolean;
    popular?: boolean;
    provider?: string;
    tags?: string[];
}

interface VoiceUI {
    id: string;
    name: string;
    language: string;
    style: string;
    gender: 'male' | 'female';
    sample?: string;
}

// Fallback avatars if API fails
const FALLBACK_AVATARS: AvatarUI[] = [
    { id: 'julia', name: 'Julia', gender: 'female', style: 'Corporativo', thumbnail: '👩‍💼', languages: ['PT-BR', 'EN'], premium: false, popular: true },
    { id: 'carlos', name: 'Carlos', gender: 'male', style: 'Executivo', thumbnail: '👨‍💼', languages: ['PT-BR', 'EN', 'ES'], premium: false },
    { id: 'ana', name: 'Ana', gender: 'female', style: 'Casual', thumbnail: '👩', languages: ['PT-BR'], premium: false, new: true },
    { id: 'pedro', name: 'Pedro', gender: 'male', style: 'Técnico', thumbnail: '👷', languages: ['PT-BR'], premium: false },
    { id: 'marina', name: 'Marina', gender: 'female', style: 'Professora', thumbnail: '👩‍🏫', languages: ['PT-BR', 'EN'], premium: true },
    { id: 'roberto', name: 'Roberto', gender: 'male', style: 'Médico', thumbnail: '👨‍⚕️', languages: ['PT-BR'], premium: true, popular: true },
];

// Fallback voices
const FALLBACK_VOICES: VoiceUI[] = [
    { id: 'pt-BR-FranciscaNeural', name: 'Francisca', language: 'PT-BR', style: 'Natural', gender: 'female' },
    { id: 'pt-BR-AntonioNeural', name: 'Antonio', language: 'PT-BR', style: 'Dinâmico', gender: 'male' },
    { id: 'pt-BR-ThalitaNeural', name: 'Thalita', language: 'PT-BR', style: 'Suave', gender: 'female' },
    { id: 'pt-BR-ValerioNeural', name: 'Valerio', language: 'PT-BR', style: 'Formal', gender: 'male' },
];

const BACKGROUNDS = [
    { id: 'office', name: 'Escritório', color: '#1e293b' },
    { id: 'studio', name: 'Estúdio', color: '#0f172a' },
    { id: 'green', name: 'Verde', color: '#16a34a' },
    { id: 'blue', name: 'Azul Corp', color: '#2563eb' },
    { id: 'gradient', name: 'Gradiente', color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
    { id: 'custom', name: 'Personalizado', color: '#8b5cf6' },
];

export default function AIAvatarsPage() {
    // Use REAL hook for AI Avatars
    const {
        avatars: apiAvatars,
        isLoading,
        isGenerating,
        generationProgress,
        generatedVideo,
        error: apiError,
        fetchAvatars,
        generateAvatarVideo,
    } = useAIAvatars();

    // Map API avatars to UI format
    const avatars: AvatarUI[] = apiAvatars.length > 0
        ? apiAvatars.map(a => ({
            id: a.id,
            name: a.name,
            gender: a.gender,
            style: a.style || 'Profissional',
            thumbnail: a.thumbnailUrl || '👤',
            languages: ['PT-BR'],
            premium: a.provider === 'heygen',
            popular: false,
        }))
        : FALLBACK_AVATARS;

    // State
    const [selectedAvatar, setSelectedAvatar] = useState<AvatarUI | null>(null);
    const [selectedVoice, setSelectedVoice] = useState<VoiceUI | null>(null);
    const [voices, setVoices] = useState<VoiceUI[]>([]);
    const [loadingVoices, setLoadingVoices] = useState(false);
    const [selectedBackground, setSelectedBackground] = useState(BACKGROUNDS[0]);
    const [scriptText, setScriptText] = useState('Olá! Bem-vindo ao nosso treinamento sobre segurança no trabalho. Hoje vamos abordar os principais conceitos da NR-35.');
    const [previewPlaying, setPreviewPlaying] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterGender, setFilterGender] = useState<'all' | 'male' | 'female'>('all');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [voiceSpeed, setVoiceSpeed] = useState([1]);
    const [voicePitch, setVoicePitch] = useState([0]);

    // Fetch voices from real API
    useEffect(() => {
        async function loadVoices() {
            setLoadingVoices(true);
            try {
                const response = await fetch('/api/voice/generate');
                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.data?.length > 0) {
                        const mappedVoices: VoiceUI[] = data.data.map((v: any) => ({
                            id: v.id || v.voiceId,
                            name: v.name || v.displayName,
                            language: v.language || 'PT-BR',
                            style: v.style || 'Natural',
                            gender: v.gender === 'Female' || v.gender === 'F' ? 'female' : 'male',
                        }));
                        setVoices(mappedVoices);
                        setSelectedVoice(mappedVoices[0]);
                    } else {
                        setVoices(FALLBACK_VOICES);
                        setSelectedVoice(FALLBACK_VOICES[0]);
                    }
                } else {
                    setVoices(FALLBACK_VOICES);
                    setSelectedVoice(FALLBACK_VOICES[0]);
                }
            } catch (err) {
                setVoices(FALLBACK_VOICES);
                setSelectedVoice(FALLBACK_VOICES[0]);
            } finally {
                setLoadingVoices(false);
            }
        }
        loadVoices();
    }, []);

    // Set initial avatar when loaded
    useEffect(() => {
        if (avatars.length > 0 && !selectedAvatar) {
            setSelectedAvatar(avatars[0]);
        }
    }, [avatars, selectedAvatar]);

    // Filter avatars
    const filteredAvatars = avatars.filter(avatar => {
        const matchesSearch = avatar.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            avatar.style.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesGender = filterGender === 'all' || avatar.gender === filterGender;
        return matchesSearch && matchesGender;
    });

    // REAL Generate video via API
    const handleGenerate = useCallback(async () => {
        if (!selectedAvatar || !selectedVoice || !scriptText.trim()) {
            toast.error('Selecione um avatar, voz e digite um texto');
            return;
        }

        const result = await generateAvatarVideo({
            avatarId: selectedAvatar.id,
            script: scriptText,
            voiceId: selectedVoice.id,
            language: selectedVoice.language,
        });

        if (result?.status === 'completed') {
            toast.success('Vídeo gerado com sucesso!');
        }
    }, [selectedAvatar, selectedVoice, scriptText, generateAvatarVideo]);

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            {/* Header */}
            <header className="h-16 bg-slate-900/80 backdrop-blur-lg border-b border-slate-800 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto h-full px-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/projects" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
                            <ChevronLeft className="w-4 h-4" />
                            <span className="text-sm">Voltar</span>
                        </Link>
                        <Separator orientation="vertical" className="h-6 bg-slate-700" />
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-600 to-purple-600 flex items-center justify-center">
                                <User className="w-4 h-4" />
                            </div>
                            <div>
                                <h1 className="font-bold text-lg">AI Avatars</h1>
                                <p className="text-xs text-slate-400">Talking Heads com Lip-Sync</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="bg-pink-500/20 text-pink-400">
                            <Zap className="w-3 h-3 mr-1" />
                            12 créditos
                        </Badge>
                        <Button variant="outline" size="sm" className="border-slate-700">
                            <Settings className="w-4 h-4 mr-2" />
                            Configurações
                        </Button>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto p-6">
                <div className="grid grid-cols-12 gap-6">
                    {/* Left Panel - Avatar Selection */}
                    <div className="col-span-4 space-y-4">
                        <Card className="bg-slate-900 border-slate-800">
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-lg">Escolha seu Avatar</CardTitle>
                                    <Button variant="ghost" size="sm" className="text-violet-400 hover:text-violet-300">
                                        <UserPlus className="w-4 h-4 mr-1" />
                                        Criar Custom
                                    </Button>
                                </div>
                                <CardDescription>
                                    Selecione um avatar para representar você no vídeo
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Search & Filter */}
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                        <Input
                                            placeholder="Buscar avatares..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="pl-9 bg-slate-800 border-slate-700"
                                        />
                                    </div>
                                    <div className="flex gap-1 p-1 bg-slate-800 rounded-lg">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className={cn("h-8 px-3", filterGender === 'all' && "bg-slate-700")}
                                            onClick={() => setFilterGender('all')}
                                        >
                                            Todos
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className={cn("h-8 px-3", filterGender === 'female' && "bg-slate-700")}
                                            onClick={() => setFilterGender('female')}
                                        >
                                            ♀
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className={cn("h-8 px-3", filterGender === 'male' && "bg-slate-700")}
                                            onClick={() => setFilterGender('male')}
                                        >
                                            ♂
                                        </Button>
                                    </div>
                                </div>

                                {/* Avatar Grid */}
                                <ScrollArea className="h-[400px]">
                                    <div className="grid grid-cols-3 gap-3 pr-4">
                                        {filteredAvatars.map(avatar => (
                                            <motion.div
                                                key={avatar.id}
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                className={cn(
                                                    "relative aspect-square rounded-xl cursor-pointer transition-all overflow-hidden",
                                                    selectedAvatar?.id === avatar.id
                                                        ? "ring-2 ring-pink-500 bg-slate-800"
                                                        : "bg-slate-800/50 hover:bg-slate-800"
                                                )}
                                                onClick={() => setSelectedAvatar(avatar)}
                                            >
                                                <div className="absolute inset-0 flex flex-col items-center justify-center p-2">
                                                    <span className="text-4xl mb-1">{avatar.thumbnail}</span>
                                                    <span className="text-xs font-medium">{avatar.name}</span>
                                                    <span className="text-[10px] text-slate-500">{avatar.style}</span>
                                                </div>

                                                {/* Badges */}
                                                {avatar.premium && (
                                                    <div className="absolute top-1 right-1">
                                                        <Crown className="w-4 h-4 text-amber-400" />
                                                    </div>
                                                )}
                                                {avatar.new && (
                                                    <Badge className="absolute top-1 left-1 bg-emerald-500 text-[8px] px-1 py-0">
                                                        NOVO
                                                    </Badge>
                                                )}
                                                {avatar.popular && (
                                                    <Badge className="absolute bottom-1 left-1 bg-pink-500/80 text-[8px] px-1 py-0">
                                                        <Star className="w-2 h-2 mr-0.5" />
                                                        Popular
                                                    </Badge>
                                                )}

                                                {/* Selected Check */}
                                                {selectedAvatar?.id === avatar.id && (
                                                    <motion.div
                                                        initial={{ scale: 0 }}
                                                        animate={{ scale: 1 }}
                                                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-pink-500 flex items-center justify-center"
                                                    >
                                                        <Check className="w-3 h-3" />
                                                    </motion.div>
                                                )}
                                            </motion.div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </Card>

                        {/* Voice Selection */}
                        <Card className="bg-slate-900 border-slate-800">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Mic className="w-4 h-4 text-emerald-400" />
                                    Voz do Avatar
                                    {loadingVoices && <Loader2 className="w-3 h-3 animate-spin text-slate-400" />}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-2">
                                    {voices.map(voice => (
                                        <motion.div
                                            key={voice.id}
                                            whileHover={{ scale: 1.02 }}
                                            className={cn(
                                                "p-3 rounded-lg cursor-pointer transition-all flex items-center gap-2",
                                                selectedVoice?.id === voice.id
                                                    ? "bg-emerald-500/20 ring-1 ring-emerald-500"
                                                    : "bg-slate-800 hover:bg-slate-700"
                                            )}
                                            onClick={() => setSelectedVoice(voice)}
                                        >
                                            <div className={cn(
                                                "w-8 h-8 rounded-full flex items-center justify-center",
                                                voice.gender === 'female' ? "bg-pink-500/20" : "bg-blue-500/20"
                                            )}>
                                                <Mic className={cn(
                                                    "w-3 h-3",
                                                    voice.gender === 'female' ? "text-pink-400" : "text-blue-400"
                                                )} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">{voice.name}</p>
                                                <p className="text-[10px] text-slate-500">{voice.style}</p>
                                            </div>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                                                <Play className="w-3 h-3" />
                                            </Button>
                                        </motion.div>
                                    ))}
                                </div>

                                <Separator className="bg-slate-800" />

                                {/* Voice Controls */}
                                <div className="space-y-3">
                                    <div>
                                        <div className="flex justify-between mb-2">
                                            <Label className="text-xs text-slate-400">Velocidade</Label>
                                            <span className="text-xs text-slate-400">{voiceSpeed[0]}x</span>
                                        </div>
                                        <Slider
                                            value={voiceSpeed}
                                            onValueChange={setVoiceSpeed}
                                            min={0.5}
                                            max={2}
                                            step={0.1}
                                            className="cursor-pointer"
                                        />
                                    </div>
                                    <div>
                                        <div className="flex justify-between mb-2">
                                            <Label className="text-xs text-slate-400">Tom</Label>
                                            <span className="text-xs text-slate-400">{voicePitch[0] > 0 ? '+' : ''}{voicePitch[0]}</span>
                                        </div>
                                        <Slider
                                            value={voicePitch}
                                            onValueChange={setVoicePitch}
                                            min={-5}
                                            max={5}
                                            step={1}
                                            className="cursor-pointer"
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Center Panel - Preview & Script */}
                    <div className="col-span-5 space-y-4">
                        {/* Preview */}
                        <Card className="bg-slate-900 border-slate-800">
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-lg">Preview</CardTitle>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="secondary" className="text-xs">
                                            1080p
                                        </Badge>
                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                            <RotateCcw className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div
                                    className="aspect-video rounded-xl overflow-hidden relative"
                                    style={{ background: selectedBackground.color.startsWith('linear') ? selectedBackground.color : selectedBackground.color }}
                                >
                                    {/* Avatar Preview */}
                                    {selectedAvatar && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="absolute inset-0 flex items-center justify-center"
                                        >
                                            <div className="relative">
                                                <div className="text-9xl">{selectedAvatar.thumbnail}</div>
                                                {previewPlaying && (
                                                    <motion.div
                                                        animate={{ scale: [1, 1.2, 1] }}
                                                        transition={{ repeat: Infinity, duration: 0.5 }}
                                                        className="absolute -bottom-2 left-1/2 -translate-x-1/2"
                                                    >
                                                        <Volume2 className="w-6 h-6 text-white/80" />
                                                    </motion.div>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}

                                    {/* Play/Pause Overlay */}
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/30">
                                        <Button
                                            size="lg"
                                            className="rounded-full w-16 h-16 bg-white/20 backdrop-blur hover:bg-white/30"
                                            onClick={() => setPreviewPlaying(!previewPlaying)}
                                        >
                                            {previewPlaying ? (
                                                <Pause className="w-8 h-8" />
                                            ) : (
                                                <Play className="w-8 h-8 ml-1" />
                                            )}
                                        </Button>
                                    </div>

                                    {/* Info overlay */}
                                    <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                                        <Badge className="bg-black/50 backdrop-blur">
                                            {selectedAvatar?.name} • {selectedVoice?.name}
                                        </Badge>
                                        <Badge className="bg-black/50 backdrop-blur">
                                            <Clock className="w-3 h-3 mr-1" />
                                            ~15s
                                        </Badge>
                                    </div>
                                </div>

                                {/* Background Selection */}
                                <div className="mt-4">
                                    <Label className="text-xs text-slate-400 mb-2 block">Fundo</Label>
                                    <div className="flex gap-2">
                                        {BACKGROUNDS.map(bg => (
                                            <motion.button
                                                key={bg.id}
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.9 }}
                                                className={cn(
                                                    "w-10 h-10 rounded-lg transition-all",
                                                    selectedBackground.id === bg.id && "ring-2 ring-white"
                                                )}
                                                style={{ background: bg.color.startsWith('linear') ? bg.color : bg.color }}
                                                onClick={() => setSelectedBackground(bg)}
                                                title={bg.name}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Script Input */}
                        <Card className="bg-slate-900 border-slate-800">
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Wand2 className="w-4 h-4 text-violet-400" />
                                        Texto do Avatar
                                    </CardTitle>
                                    <Button variant="ghost" size="sm" className="text-violet-400 hover:text-violet-300">
                                        <Sparkles className="w-4 h-4 mr-1" />
                                        Gerar com IA
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <Textarea
                                    value={scriptText}
                                    onChange={(e) => setScriptText(e.target.value)}
                                    placeholder="Digite o que o avatar irá falar..."
                                    className="min-h-[150px] bg-slate-800 border-slate-700 resize-none"
                                />

                                <div className="flex items-center justify-between text-xs text-slate-500">
                                    <span>{scriptText.length} caracteres</span>
                                    <span>~{Math.ceil(scriptText.length / 15)}s de vídeo</span>
                                </div>

                                <div className="flex gap-2">
                                    <Button
                                        className="flex-1 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500"
                                        onClick={handleGenerate}
                                        disabled={isGenerating || !scriptText.trim()}
                                    >
                                        {isGenerating ? (
                                            <>
                                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                                Gerando...
                                            </>
                                        ) : (
                                            <>
                                                <Video className="w-4 h-4 mr-2" />
                                                Gerar Vídeo
                                            </>
                                        )}
                                    </Button>
                                    <Button variant="outline" className="border-slate-700">
                                        <Play className="w-4 h-4 mr-2" />
                                        Preview Áudio
                                    </Button>
                                </div>

                                {/* Generation Progress */}
                                {isGenerating && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="space-y-2"
                                    >
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-slate-400">Gerando vídeo...</span>
                                            <span className="text-violet-400">{Math.round(generationProgress)}%</span>
                                        </div>
                                        <Progress value={generationProgress} className="h-2" />
                                        <p className="text-xs text-slate-500 flex items-center gap-1">
                                            <Info className="w-3 h-3" />
                                            Sincronizando lip-sync com IA
                                        </p>
                                    </motion.div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Panel - Details & Settings */}
                    <div className="col-span-3 space-y-4">
                        {/* Selected Avatar Details */}
                        {selectedAvatar && (
                            <Card className="bg-slate-900 border-slate-800">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-lg">Avatar Selecionado</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-20 h-20 rounded-2xl bg-slate-800 flex items-center justify-center text-5xl">
                                            {selectedAvatar.thumbnail}
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-bold text-lg">{selectedAvatar.name}</h3>
                                            <p className="text-sm text-slate-400">{selectedAvatar.style}</p>
                                            <div className="flex gap-1 mt-2">
                                                {(selectedAvatar.languages || ['PT-BR']).map(lang => (
                                                    <Badge key={lang} variant="secondary" className="text-xs">
                                                        {lang}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <Separator className="bg-slate-800" />

                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-400">Gênero</span>
                                            <span>{selectedAvatar.gender === 'female' ? 'Feminino' : 'Masculino'}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-400">Tipo</span>
                                            <span className="flex items-center gap-1">
                                                {selectedAvatar.premium ? (
                                                    <>
                                                        <Crown className="w-3 h-3 text-amber-400" />
                                                        Premium
                                                    </>
                                                ) : (
                                                    'Gratuito'
                                                )}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-400">Lip-Sync</span>
                                            <span className="text-emerald-400">Ativo</span>
                                        </div>
                                    </div>

                                    <Button variant="outline" className="w-full border-slate-700">
                                        <Heart className="w-4 h-4 mr-2" />
                                        Adicionar aos Favoritos
                                    </Button>
                                </CardContent>
                            </Card>
                        )}

                        {/* Quick Tips */}
                        <Card className="bg-slate-900 border-slate-800">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-amber-400" />
                                    Dicas Pro
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {[
                                    'Use frases curtas para melhor lip-sync',
                                    'Evite siglas - escreva por extenso',
                                    'Pause com vírgulas para naturalidade',
                                    'Teste diferentes vozes para o mesmo texto',
                                ].map((tip, i) => (
                                    <div key={i} className="flex items-start gap-2 text-xs text-slate-400">
                                        <Check className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" />
                                        <span>{tip}</span>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>

                        {/* Recent Generations */}
                        <Card className="bg-slate-900 border-slate-800">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm">Gerações Recentes</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {[
                                    { name: 'Intro NR-35', time: 'Há 2 min', status: 'done' },
                                    { name: 'EPIs Obrigatórios', time: 'Há 15 min', status: 'done' },
                                    { name: 'Conclusão', time: 'Há 1 hora', status: 'done' },
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center justify-between p-2 bg-slate-800 rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded bg-slate-700 flex items-center justify-center">
                                                <Video className="w-3 h-3" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-medium">{item.name}</p>
                                                <p className="text-[10px] text-slate-500">{item.time}</p>
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="icon" className="h-6 w-6">
                                            <Download className="w-3 h-3" />
                                        </Button>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
