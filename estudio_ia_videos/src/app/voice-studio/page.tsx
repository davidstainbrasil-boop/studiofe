'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
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
import { Switch } from '@components/ui/switch';
import {
    Play,
    Pause,
    Mic,
    MicOff,
    Volume2,
    VolumeX,
    Download,
    Upload,
    Settings,
    Sparkles,
    Wand2,
    ChevronLeft,
    Check,
    Star,
    Crown,
    Zap,
    Clock,
    Search,
    Filter,
    Heart,
    Plus,
    RefreshCw,
    Info,
    Copy,
    Trash2,
    Languages,
    Music2,
    Waves,
    Square,
    StopCircle,
    SkipBack,
    SkipForward,
    Repeat,
    Shuffle,
    History,
    FileAudio,
    Save,
    Share2,
    Headphones,
    Loader2
} from 'lucide-react';
import { cn } from '@lib/utils';
import Link from 'next/link';
import { useVoiceStudio, Voice } from '@/hooks/use-voice-studio';
import { toast } from 'sonner';

// Types - Extended with UI properties
interface VoiceUI extends Voice {
    style?: string;
    accent?: string;
    premium?: boolean;
    new?: boolean;
    popular?: boolean;
    category?: string;
}

// Fallback voices (used if API fails)
const FALLBACK_VOICES: VoiceUI[] = [
    { id: 'pt-BR-FranciscaNeural', name: 'Francisca', language: 'PT-BR', gender: 'female', provider: 'azure', style: 'Natural e Amigável', premium: false, popular: true, category: 'natural' },
    { id: 'pt-BR-AntonioNeural', name: 'Antonio', language: 'PT-BR', gender: 'male', provider: 'azure', style: 'Claro e Articulado', premium: false, category: 'natural' },
    { id: 'pt-BR-ThalitaNeural', name: 'Thalita', language: 'PT-BR', gender: 'female', provider: 'azure', style: 'Suave e Calma', premium: false, new: true, category: 'natural' },
    { id: 'pt-BR-ValerioNeural', name: 'Valerio', language: 'PT-BR', gender: 'male', provider: 'azure', style: 'Jovem e Dinâmico', premium: false, category: 'natural' },
    { id: 'pt-PT-RaquelNeural', name: 'Raquel', language: 'PT-PT', gender: 'female', provider: 'azure', style: 'Europeu Formal', premium: true, category: 'natural' },
    { id: 'pt-PT-DuarteNeural', name: 'Duarte', language: 'PT-PT', gender: 'male', provider: 'azure', style: 'Europeu Casual', premium: true, category: 'natural' },
    { id: 'en-US-JennyNeural', name: 'Jenny', language: 'EN-US', gender: 'female', provider: 'azure', style: 'American Clear', premium: true, category: 'natural' },
    { id: 'en-US-GuyNeural', name: 'Guy', language: 'EN-US', gender: 'male', provider: 'azure', style: 'American Professional', premium: true, category: 'natural' },
    { id: 'en-GB-SoniaNeural', name: 'Sonia', language: 'EN-GB', gender: 'female', provider: 'azure', style: 'British Elegant', premium: true, category: 'natural' },
    { id: 'es-ES-ElviraNeural', name: 'Elvira', language: 'ES', gender: 'female', provider: 'azure', style: 'Español Neutro', premium: true, category: 'natural' },
];

const CATEGORIES = [
    { id: 'all', name: 'Todas' },
    { id: 'natural', name: 'Natural' },
    { id: 'professional', name: 'Profissional' },
    { id: 'character', name: 'Personagem' },
    { id: 'cloned', name: 'Clonadas' },
];

const LANGUAGES = [
    { id: 'all', name: 'Todos idiomas' },
    { id: 'PT-BR', name: 'Português (Brasil)' },
    { id: 'PT-PT', name: 'Português (Portugal)' },
    { id: 'ES', name: 'Español' },
    { id: 'EN-US', name: 'English (US)' },
    { id: 'EN-GB', name: 'English (UK)' },
];

export default function VoiceStudioPage() {
    // Use REAL hook for voice studio
    const {
        voices: apiVoices,
        isLoading,
        isGenerating,
        generatedAudio,
        error: apiError,
        fetchVoices,
        generateVoice,
        cloneVoice,
    } = useVoiceStudio();

    // Map API voices to UI format
    const voices: VoiceUI[] = apiVoices.length > 0 
        ? apiVoices.map(v => ({
            ...v,
            style: v.tags?.join(', ') || 'Natural',
            category: 'natural',
            premium: v.provider === 'elevenlabs',
            popular: v.language?.includes('pt-BR'),
        }))
        : FALLBACK_VOICES;

    // State
    const [selectedVoice, setSelectedVoice] = useState<VoiceUI | null>(null);
    const [scriptText, setScriptText] = useState('Olá! Bem-vindo ao nosso treinamento sobre segurança no trabalho. Hoje vamos aprender sobre os principais conceitos da NR-35, que trata de trabalho em altura.');
    const [isPlaying, setIsPlaying] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [generationProgress, setGenerationProgress] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [selectedLanguage, setSelectedLanguage] = useState('all');
    const [filterGender, setFilterGender] = useState<'all' | 'male' | 'female'>('all');
    const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null);

    // Voice settings
    const [voiceSpeed, setVoiceSpeed] = useState([1.0]);
    const [voicePitch, setVoicePitch] = useState([0]);
    const [voiceVolume, setVoiceVolume] = useState([100]);
    const [voiceStability, setVoiceStability] = useState([75]);
    const [voiceClarity, setVoiceClarity] = useState([85]);
    const [addPauses, setAddPauses] = useState(true);
    const [enhanceAudio, setEnhanceAudio] = useState(true);

    // Audio ref
    const audioRef = useRef<HTMLAudioElement>(null);

    // Set initial voice when voices load
    useEffect(() => {
        if (voices.length > 0 && !selectedVoice) {
            setSelectedVoice(voices[0]);
        }
    }, [voices, selectedVoice]);

    // Update current audio when generated
    useEffect(() => {
        if (generatedAudio) {
            setCurrentAudioUrl(generatedAudio);
        }
    }, [generatedAudio]);

    // Filter voices
    const filteredVoices = voices.filter(voice => {
        const matchesSearch = voice.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (voice.style?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
        const matchesCategory = selectedCategory === 'all' || voice.category === selectedCategory;
        const matchesLanguage = selectedLanguage === 'all' || voice.language === selectedLanguage;
        const matchesGender = filterGender === 'all' || voice.gender === filterGender;
        return matchesSearch && matchesCategory && matchesLanguage && matchesGender;
    });

    // REAL Generate audio via API
    const handleGenerate = useCallback(async () => {
        if (!scriptText.trim() || !selectedVoice) {
            toast.error('Selecione uma voz e digite um texto');
            return;
        }

        setGenerationProgress(0);
        
        // Simulate progress while generating
        const progressInterval = setInterval(() => {
            setGenerationProgress(prev => Math.min(prev + 10, 90));
        }, 200);

        const audioUrl = await generateVoice({
            text: scriptText,
            voiceId: selectedVoice.id,
            speed: voiceSpeed[0],
            pitch: voicePitch[0],
            stability: voiceStability[0] / 100,
        });

        clearInterval(progressInterval);
        setGenerationProgress(100);

        if (audioUrl) {
            setCurrentAudioUrl(audioUrl);
            // Auto-play the generated audio
            setTimeout(() => {
                if (audioRef.current) {
                    audioRef.current.play();
                    setIsPlaying(true);
                }
            }, 100);
        }
    }, [scriptText, selectedVoice, voiceSpeed, voicePitch, voiceStability, generateVoice]);

    // Start voice cloning recording
    const handleStartRecording = () => {
        setIsRecording(true);
    };

    const handleStopRecording = () => {
        setIsRecording(false);
    };

    const estimatedDuration = Math.ceil(scriptText.length / 15);

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
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center">
                                <Mic className="w-4 h-4" />
                            </div>
                            <div>
                                <h1 className="font-bold text-lg">Voice Studio</h1>
                                <p className="text-xs text-slate-400">30+ Vozes IA • Text-to-Speech</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-400">
                            <Zap className="w-3 h-3 mr-1" />
                            {scriptText.length} caracteres
                        </Badge>
                        <Button variant="outline" size="sm" className="border-slate-700">
                            <History className="w-4 h-4 mr-2" />
                            Histórico
                        </Button>
                        <Button variant="outline" size="sm" className="border-slate-700">
                            <Settings className="w-4 h-4 mr-2" />
                            Config
                        </Button>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto p-6">
                <div className="grid grid-cols-12 gap-6">
                    {/* Left Panel - Voice Selection */}
                    <div className="col-span-4 space-y-4">
                        <Card className="bg-slate-900 border-slate-800">
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Volume2 className="w-4 h-4 text-emerald-400" />
                                        Biblioteca de Vozes
                                        {isLoading && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
                                    </CardTitle>
                                    <Badge variant="secondary" className="text-xs">
                                        {voices.length} vozes
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Search */}
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <Input
                                        placeholder="Buscar vozes..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-9 bg-slate-800 border-slate-700"
                                    />
                                </div>

                                {/* Category Tabs */}
                                <div className="flex gap-1 flex-wrap">
                                    {CATEGORIES.map(cat => {
                                        const count = cat.id === 'all' 
                                            ? voices.length 
                                            : voices.filter(v => v.category === cat.id).length;
                                        return (
                                            <Button
                                                key={cat.id}
                                                variant="ghost"
                                                size="sm"
                                                className={cn(
                                                    "h-7 text-xs",
                                                    selectedCategory === cat.id && "bg-emerald-500/20 text-emerald-400"
                                                )}
                                                onClick={() => setSelectedCategory(cat.id)}
                                            >
                                                {cat.name}
                                                <span className="ml-1 text-slate-500">({count})</span>
                                            </Button>
                                        );
                                    })}
                                </div>

                                {/* Filters */}
                                <div className="flex gap-2">
                                    <select
                                        value={selectedLanguage}
                                        onChange={(e) => setSelectedLanguage(e.target.value)}
                                        className="flex-1 h-8 text-xs bg-slate-800 border border-slate-700 rounded-md px-2"
                                    >
                                        {LANGUAGES.map(lang => (
                                            <option key={lang.id} value={lang.id}>{lang.name}</option>
                                        ))}
                                    </select>
                                    <div className="flex gap-1 p-1 bg-slate-800 rounded-md">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className={cn("h-6 px-2 text-xs", filterGender === 'all' && "bg-slate-700")}
                                            onClick={() => setFilterGender('all')}
                                        >
                                            Todos
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className={cn("h-6 px-2 text-xs", filterGender === 'female' && "bg-slate-700")}
                                            onClick={() => setFilterGender('female')}
                                        >
                                            ♀
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className={cn("h-6 px-2 text-xs", filterGender === 'male' && "bg-slate-700")}
                                            onClick={() => setFilterGender('male')}
                                        >
                                            ♂
                                        </Button>
                                    </div>
                                </div>

                                {/* Voice List */}
                                <ScrollArea className="h-[350px]">
                                    <div className="space-y-2 pr-4">
                                        {filteredVoices.map(voice => (
                                            <motion.div
                                                key={voice.id}
                                                whileHover={{ scale: 1.01 }}
                                                className={cn(
                                                    "p-3 rounded-lg cursor-pointer transition-all flex items-center gap-3",
                                                    selectedVoice?.id === voice.id
                                                        ? "bg-emerald-500/20 ring-1 ring-emerald-500"
                                                        : "bg-slate-800/50 hover:bg-slate-800"
                                                )}
                                                onClick={() => setSelectedVoice(voice)}
                                            >
                                                <div className={cn(
                                                    "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                                                    voice.gender === 'female' ? "bg-pink-500/20" : "bg-blue-500/20"
                                                )}>
                                                    <Mic className={cn(
                                                        "w-4 h-4",
                                                        voice.gender === 'female' ? "text-pink-400" : "text-blue-400"
                                                    )} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-medium">{voice.name}</span>
                                                        {voice.premium && <Crown className="w-3 h-3 text-amber-400" />}
                                                        {voice.new && (
                                                            <Badge className="bg-emerald-500 text-[8px] px-1 py-0">NOVO</Badge>
                                                        )}
                                                        {voice.popular && (
                                                            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-slate-500 truncate">{voice.style}</p>
                                                    <div className="flex items-center gap-1 mt-1">
                                                        <Badge variant="secondary" className="text-[10px] px-1 py-0">
                                                            {voice.language}
                                                        </Badge>
                                                        {voice.accent && (
                                                            <Badge variant="secondary" className="text-[10px] px-1 py-0">
                                                                {voice.accent}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 shrink-0"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        // Play preview
                                                    }}
                                                >
                                                    <Play className="w-3 h-3" />
                                                </Button>
                                            </motion.div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </Card>

                        {/* Voice Cloning */}
                        <Card className="bg-gradient-to-br from-violet-900/30 to-purple-900/30 border-violet-500/30">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-violet-400" />
                                    Clonar sua Voz
                                    <Badge className="bg-violet-500/20 text-violet-400 text-xs">PRO</Badge>
                                </CardTitle>
                                <CardDescription className="text-slate-400">
                                    Grave 30 segundos e crie um clone da sua voz
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="relative">
                                    <div className={cn(
                                        "aspect-[3/1] rounded-xl flex items-center justify-center transition-all",
                                        isRecording
                                            ? "bg-red-500/20 border-2 border-red-500"
                                            : "bg-slate-800 border-2 border-dashed border-slate-700"
                                    )}>
                                        {isRecording ? (
                                            <div className="flex items-center gap-4">
                                                <motion.div
                                                    animate={{ scale: [1, 1.2, 1] }}
                                                    transition={{ repeat: Infinity, duration: 1 }}
                                                    className="w-4 h-4 rounded-full bg-red-500"
                                                />
                                                <Waves className="w-8 h-8 text-red-400" />
                                                <span className="text-sm font-mono">00:12 / 00:30</span>
                                            </div>
                                        ) : (
                                            <div className="text-center">
                                                <Mic className="w-8 h-8 mx-auto text-slate-500 mb-2" />
                                                <p className="text-sm text-slate-400">Clique para gravar</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    {isRecording ? (
                                        <Button
                                            variant="destructive"
                                            className="flex-1"
                                            onClick={handleStopRecording}
                                        >
                                            <StopCircle className="w-4 h-4 mr-2" />
                                            Parar Gravação
                                        </Button>
                                    ) : (
                                        <Button
                                            variant="outline"
                                            className="flex-1 border-violet-500/50 text-violet-400 hover:bg-violet-500/10"
                                            onClick={handleStartRecording}
                                        >
                                            <Mic className="w-4 h-4 mr-2" />
                                            Iniciar Gravação
                                        </Button>
                                    )}
                                    <Button variant="ghost" size="icon" className="shrink-0">
                                        <Upload className="w-4 h-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Center Panel - Text & Preview */}
                    <div className="col-span-5 space-y-4">
                        {/* Text Input */}
                        <Card className="bg-slate-900 border-slate-800">
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Wand2 className="w-4 h-4 text-violet-400" />
                                        Texto para Áudio
                                    </CardTitle>
                                    <div className="flex items-center gap-2">
                                        <Button variant="ghost" size="sm" className="text-violet-400 hover:text-violet-300">
                                            <Sparkles className="w-4 h-4 mr-1" />
                                            Melhorar com IA
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <Textarea
                                    value={scriptText}
                                    onChange={(e) => setScriptText(e.target.value)}
                                    placeholder="Digite ou cole o texto que será convertido em áudio..."
                                    className="min-h-[200px] bg-slate-800 border-slate-700 resize-none font-mono text-sm"
                                />

                                <div className="flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-4 text-slate-500">
                                        <span>{scriptText.length} caracteres</span>
                                        <span>{scriptText.split(/\s+/).filter(Boolean).length} palavras</span>
                                        <span>~{estimatedDuration}s de áudio</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button variant="ghost" size="sm" className="h-7 text-xs">
                                            <Copy className="w-3 h-3 mr-1" />
                                            Copiar
                                        </Button>
                                        <Button variant="ghost" size="sm" className="h-7 text-xs text-red-400 hover:text-red-300">
                                            <Trash2 className="w-3 h-3 mr-1" />
                                            Limpar
                                        </Button>
                                    </div>
                                </div>

                                <Separator className="bg-slate-800" />

                                {/* SSML Tags help */}
                                <div className="p-3 bg-slate-800/50 rounded-lg">
                                    <p className="text-xs text-slate-400 flex items-center gap-2 mb-2">
                                        <Info className="w-3 h-3" />
                                        Dicas de formatação
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {[
                                            { tag: '...', desc: 'Pausa longa' },
                                            { tag: ',', desc: 'Pausa curta' },
                                            { tag: '?', desc: 'Tom de pergunta' },
                                            { tag: '!', desc: 'Ênfase' },
                                        ].map(({ tag, desc }) => (
                                            <Badge key={tag} variant="secondary" className="text-[10px] cursor-pointer hover:bg-slate-700">
                                                <code className="mr-1">{tag}</code>
                                                {desc}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Audio Preview / Player */}
                        <Card className="bg-slate-900 border-slate-800">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Headphones className="w-4 h-4 text-amber-400" />
                                    Preview
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Waveform placeholder */}
                                <div className="h-24 bg-slate-800 rounded-lg flex items-center justify-center relative overflow-hidden">
                                    {/* Hidden audio element for playback */}
                                    {currentAudioUrl && (
                                        <audio
                                            ref={audioRef}
                                            src={currentAudioUrl}
                                            onEnded={() => setIsPlaying(false)}
                                            onPlay={() => setIsPlaying(true)}
                                            onPause={() => setIsPlaying(false)}
                                            className="hidden"
                                        />
                                    )}
                                    <div className="absolute inset-0 flex items-center justify-center gap-1">
                                        {Array.from({ length: 50 }).map((_, i) => (
                                            <motion.div
                                                key={i}
                                                className="w-1 bg-emerald-500/30 rounded-full"
                                                animate={{
                                                    height: isPlaying ? [20, Math.random() * 60 + 20, 20] : 20,
                                                }}
                                                transition={{
                                                    repeat: isPlaying ? Infinity : 0,
                                                    duration: 0.5,
                                                    delay: i * 0.02,
                                                }}
                                            />
                                        ))}
                                    </div>
                                    {!isPlaying && !isGenerating && !currentAudioUrl && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                            <p className="text-sm text-slate-400">Gere o áudio para visualizar</p>
                                        </div>
                                    )}
                                    {currentAudioUrl && !isPlaying && !isGenerating && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                            <p className="text-sm text-emerald-400">Áudio pronto! Clique play para ouvir</p>
                                        </div>
                                    )}
                                    {isGenerating && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                            <div className="text-center">
                                                <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mx-auto mb-2" />
                                                <p className="text-sm text-emerald-400">Gerando áudio com IA...</p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Player Controls */}
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                            <SkipBack className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            size="icon"
                                            className={cn(
                                                "h-12 w-12 rounded-full",
                                                isPlaying
                                                    ? "bg-emerald-600 hover:bg-emerald-500"
                                                    : "bg-slate-700 hover:bg-slate-600"
                                            )}
                                            onClick={() => {
                                                if (audioRef.current && currentAudioUrl) {
                                                    if (isPlaying) {
                                                        audioRef.current.pause();
                                                    } else {
                                                        audioRef.current.play();
                                                    }
                                                }
                                            }}
                                            disabled={!currentAudioUrl}
                                        >
                                            {isPlaying ? (
                                                <Pause className="w-5 h-5" />
                                            ) : (
                                                <Play className="w-5 h-5 ml-0.5" />
                                            )}
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                            <SkipForward className="w-4 h-4" />
                                        </Button>
                                    </div>

                                    <div className="flex-1 flex items-center gap-2">
                                        <span className="text-xs font-mono text-slate-500">0:00</span>
                                        <div className="flex-1 h-1 bg-slate-700 rounded-full">
                                            <div className="w-0 h-full bg-emerald-500 rounded-full" />
                                        </div>
                                        <span className="text-xs font-mono text-slate-500">0:{estimatedDuration.toString().padStart(2, '0')}</span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                            <Repeat className="w-4 h-4" />
                                        </Button>
                                        <Volume2 className="w-4 h-4 text-slate-400" />
                                        <div className="w-20">
                                            <Slider
                                                value={voiceVolume}
                                                onValueChange={setVoiceVolume}
                                                max={100}
                                                step={1}
                                                className="cursor-pointer"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <Separator className="bg-slate-800" />

                                {/* Action Buttons */}
                                <div className="flex gap-2">
                                    <Button
                                        className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500"
                                        onClick={handleGenerate}
                                        disabled={isGenerating || !scriptText.trim() || !selectedVoice}
                                    >
                                        {isGenerating ? (
                                            <>
                                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                                Gerando... {Math.round(generationProgress)}%
                                            </>
                                        ) : (
                                            <>
                                                <Wand2 className="w-4 h-4 mr-2" />
                                                Gerar Áudio
                                            </>
                                        )}
                                    </Button>
                                    <Button 
                                        variant="outline" 
                                        className="border-slate-700" 
                                        disabled={!currentAudioUrl}
                                        onClick={() => {
                                            if (currentAudioUrl) {
                                                const a = document.createElement('a');
                                                a.href = currentAudioUrl;
                                                a.download = `audio-${selectedVoice?.name || 'voice'}-${Date.now()}.mp3`;
                                                a.click();
                                                toast.success('Download iniciado!');
                                            }
                                        }}
                                    >
                                        <Download className="w-4 h-4 mr-2" />
                                        Download
                                    </Button>
                                    <Button variant="outline" className="border-slate-700" disabled={!currentAudioUrl}>
                                        <Share2 className="w-4 h-4" />
                                    </Button>
                                </div>

                                {/* Generation Progress */}
                                {isGenerating && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                    >
                                        <Progress value={generationProgress} className="h-2" />
                                        <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                                            <Info className="w-3 h-3" />
                                            Processando texto e sintetizando voz...
                                        </p>
                                    </motion.div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Panel - Voice Settings */}
                    <div className="col-span-3 space-y-4">
                        {/* Selected Voice Info */}
                        {selectedVoice && (
                            <Card className="bg-slate-900 border-slate-800">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-lg">Voz Selecionada</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        <div className={cn(
                                            "w-16 h-16 rounded-2xl flex items-center justify-center",
                                            selectedVoice.gender === 'female' ? "bg-pink-500/20" : "bg-blue-500/20"
                                        )}>
                                            <Mic className={cn(
                                                "w-6 h-6",
                                                selectedVoice.gender === 'female' ? "text-pink-400" : "text-blue-400"
                                            )} />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-bold text-lg flex items-center gap-2">
                                                {selectedVoice.name}
                                                {selectedVoice.premium && <Crown className="w-4 h-4 text-amber-400" />}
                                            </h3>
                                            <p className="text-sm text-slate-400">{selectedVoice.style}</p>
                                            <Badge variant="secondary" className="mt-1 text-xs">
                                                {selectedVoice.language}
                                            </Badge>
                                        </div>
                                    </div>

                                    <Button variant="outline" size="sm" className="w-full border-slate-700">
                                        <Play className="w-4 h-4 mr-2" />
                                        Ouvir Amostra
                                    </Button>
                                </CardContent>
                            </Card>
                        )}

                        {/* Voice Settings */}
                        <Card className="bg-slate-900 border-slate-800">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Settings className="w-4 h-4" />
                                    Configurações
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
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

                                <div>
                                    <div className="flex justify-between mb-2">
                                        <Label className="text-xs text-slate-400">Estabilidade</Label>
                                        <span className="text-xs text-slate-400">{voiceStability[0]}%</span>
                                    </div>
                                    <Slider
                                        value={voiceStability}
                                        onValueChange={setVoiceStability}
                                        min={0}
                                        max={100}
                                        step={5}
                                        className="cursor-pointer"
                                    />
                                </div>

                                <div>
                                    <div className="flex justify-between mb-2">
                                        <Label className="text-xs text-slate-400">Clareza</Label>
                                        <span className="text-xs text-slate-400">{voiceClarity[0]}%</span>
                                    </div>
                                    <Slider
                                        value={voiceClarity}
                                        onValueChange={setVoiceClarity}
                                        min={0}
                                        max={100}
                                        step={5}
                                        className="cursor-pointer"
                                    />
                                </div>

                                <Separator className="bg-slate-800" />

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-sm">Pausas automáticas</Label>
                                        <Switch checked={addPauses} onCheckedChange={setAddPauses} />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <Label className="text-sm">Melhorar áudio</Label>
                                        <Switch checked={enhanceAudio} onCheckedChange={setEnhanceAudio} />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Recent Generations */}
                        <Card className="bg-slate-900 border-slate-800">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <FileAudio className="w-4 h-4" />
                                    Áudios Recentes
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {[
                                    { name: 'Intro NR-35', voice: 'Clara', duration: '0:32', time: 'Há 5 min' },
                                    { name: 'Conceitos Básicos', voice: 'Pedro', duration: '1:15', time: 'Há 20 min' },
                                    { name: 'Equipamentos', voice: 'Clara', duration: '0:45', time: 'Há 1 hora' },
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center justify-between p-2 bg-slate-800 rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded bg-emerald-500/20 flex items-center justify-center">
                                                <FileAudio className="w-3 h-3 text-emerald-400" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-medium">{item.name}</p>
                                                <p className="text-[10px] text-slate-500">{item.voice} • {item.duration}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button variant="ghost" size="icon" className="h-6 w-6">
                                                <Play className="w-3 h-3" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-6 w-6">
                                                <Download className="w-3 h-3" />
                                            </Button>
                                        </div>
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
