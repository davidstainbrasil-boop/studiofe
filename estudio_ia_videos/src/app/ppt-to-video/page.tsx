'use client';
import { logger } from '@/lib/logger';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Badge } from '@components/ui/badge';
import { Progress } from '@components/ui/progress';
import { Slider } from '@components/ui/slider';
import { Switch } from '@components/ui/switch';
import { Label } from '@components/ui/label';
import {
    Upload,
    FileText,
    Play,
    Pause,
    Check,
    ChevronRight,
    ChevronLeft,
    Sparkles,
    Mic,
    Music,
    Video,
    Download,
    Share2,
    Settings,
    Wand2,
    Volume2,
    Clock,
    Layers,
    Type,
    Palette,
    User,
    Zap,
    Globe,
    CheckCircle2,
    AlertCircle,
    Loader2,
    X,
    Eye,
    FileVideo,
    GraduationCap,
    Code
} from 'lucide-react';
import { cn } from '@lib/utils';
import { useDropzone } from 'react-dropzone';
import { usePPTToVideo, PPTSlide, PPTRenderParams } from '@/hooks/use-ppt-to-video';
import { toast } from 'sonner';

// Step definitions
const STEPS = [
    { id: 1, title: 'Upload', icon: Upload, description: 'Envie seu PPTX' },
    { id: 2, title: 'Customize', icon: Wand2, description: 'Configure estilo' },
    { id: 3, title: 'Preview', icon: Eye, description: 'Revise o vídeo' },
    { id: 4, title: 'Export', icon: Download, description: 'Baixe ou publique' },
];

// Voice type from API
interface VoiceOption {
    id: string;
    name: string;
    gender: 'M' | 'F';
    language: string;
    preview?: string;
    provider?: string;
    popular?: boolean;
}

// Avatar type from API
interface AvatarOption {
    id: string;
    name: string;
    style: string;
    gender: 'M' | 'F';
    thumbnail?: string;
    avatar_type?: string;
}

// Music options (static for now - can be API-driven later)
const MUSIC_TRACKS = [
    { id: 'corporate', name: 'Corporate Upbeat', duration: '2:30', mood: 'Energético' },
    { id: 'minimal', name: 'Minimal Tech', duration: '3:00', mood: 'Moderno' },
    { id: 'inspiring', name: 'Inspiring Piano', duration: '2:45', mood: 'Inspirador' },
    { id: 'none', name: 'Sem música', duration: '-', mood: '-' },
];

// Template styles
const TEMPLATES = [
    { id: 'corporate', name: 'Corporativo', colors: ['#1e40af', '#3b82f6', '#ffffff'] },
    { id: 'modern', name: 'Moderno', colors: ['#7c3aed', '#a855f7', '#ffffff'] },
    { id: 'minimal', name: 'Minimalista', colors: ['#18181b', '#71717a', '#ffffff'] },
    { id: 'vibrant', name: 'Vibrante', colors: ['#dc2626', '#f97316', '#ffffff'] },
    { id: 'nature', name: 'Natural', colors: ['#059669', '#10b981', '#ffffff'] },
    { id: 'custom', name: 'Personalizado', colors: ['#000000', '#666666', '#ffffff'] },
];

export default function PPTtoVideoWizard() {
    // Use the real hook for PPT processing
    const {
        isUploading,
        uploadProgress,
        parsedPPT,
        isRendering,
        renderProgress,
        renderJob,
        error: hookError,
        uploadPPT,
        updateSlide,
        removeSlide,
        startRender,
        reset,
    } = usePPTToVideo();

    const [currentStep, setCurrentStep] = useState(1);
    
    // Upload state
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    
    // API data state - REAL DATA from APIs
    const [voices, setVoices] = useState<VoiceOption[]>([]);
    const [avatars, setAvatars] = useState<AvatarOption[]>([]);
    const [loadingVoices, setLoadingVoices] = useState(false);
    const [loadingAvatars, setLoadingAvatars] = useState(false);
    
    // Customization state
    const [selectedVoice, setSelectedVoice] = useState('');
    const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
    const [selectedMusic, setSelectedMusic] = useState('corporate');
    const [selectedTemplate, setSelectedTemplate] = useState('corporate');
    const [voiceSpeed, setVoiceSpeed] = useState([1.0]);
    const [musicVolume, setMusicVolume] = useState([30]);
    const [autoSubtitles, setAutoSubtitles] = useState(true);
    const [hdQuality, setHdQuality] = useState(true);
    
    // Preview state
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [previewAudioUrl, setPreviewAudioUrl] = useState<string | null>(null);
    const [generatingPreview, setGeneratingPreview] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    
    // Export state
    const [exportFormat, setExportFormat] = useState('mp4');
    const [exportComplete, setExportComplete] = useState(false);

    // ============ REAL API CALLS ============

    // Fetch voices from real API on mount
    useEffect(() => {
        async function fetchVoices() {
            setLoadingVoices(true);
            try {
                const response = await fetch('/api/voice/generate');
                if (response.ok) {
                    const data = await response.json();
                    const rawVoices = Array.isArray(data?.data)
                        ? data.data
                        : [
                            ...(Array.isArray(data?.data?.elevenLabs) ? data.data.elevenLabs : []),
                            ...(Array.isArray(data?.data?.azure) ? data.data.azure : []),
                        ];

                    if (data.success && rawVoices.length > 0) {
                        const mappedVoices: VoiceOption[] = rawVoices.map((v: any) => ({
                            id: v.id || v.voiceId,
                            name: v.name || v.displayName,
                            gender: v.gender === 'Female' || v.gender === 'F' ? 'F' : 'M',
                            language: v.language || v.locale || 'pt-BR',
                            preview: v.language?.startsWith('pt-BR') ? '🇧🇷' : v.language?.startsWith('pt-PT') ? '🇵🇹' : '🌐',
                            provider: v.provider,
                            popular: v.popular || false,
                        }));
                        setVoices(mappedVoices);
                        // Auto-select first Brazilian voice
                        const brVoice = mappedVoices.find(v => v.language?.includes('pt-BR'));
                        if (brVoice) setSelectedVoice(brVoice.id);
                    } else {
                        setVoices([]);
                        setSelectedVoice('');
                        toast.error('Nenhuma voz disponível no provedor configurado.');
                    }
                } else {
                    setVoices([]);
                    setSelectedVoice('');
                    toast.error('Falha ao carregar vozes reais.');
                }
            } catch (err) {
                logger.warn('Failed to fetch voices:', err);
                setVoices([]);
                setSelectedVoice('');
                toast.error('Erro ao buscar vozes dos provedores.');
            } finally {
                setLoadingVoices(false);
            }
        }
        fetchVoices();
    }, []);

    // Fetch avatars from real API on mount
    useEffect(() => {
        async function fetchAvatars() {
            setLoadingAvatars(true);
            try {
                const response = await fetch('/api/avatars');
                if (response.ok) {
                    const data = await response.json();
                    const rawAvatars = Array.isArray(data?.data)
                        ? data.data
                        : Array.isArray(data?.avatars)
                            ? data.avatars
                            : [];

                    if (rawAvatars.length > 0) {
                        const mappedAvatars: AvatarOption[] = rawAvatars.map((a: any) => ({
                            id: a.id,
                            name: a.name,
                            style: a.style || 'Profissional',
                            gender: a.gender === 'female' || a.gender === 'F' ? 'F' : 'M',
                            thumbnail: a.thumbnail || a.thumbnail_url || a.ready_player_me_url,
                            avatar_type: a.avatar_type,
                        }));
                        setAvatars(mappedAvatars);
                    } else {
                        setAvatars([]);
                    }
                } else {
                    setAvatars([]);
                }
            } catch (err) {
                logger.warn('Failed to fetch avatars:', err);
                setAvatars([]);
            } finally {
                setLoadingAvatars(false);
            }
        }
        fetchAvatars();
    }, []);

    // REAL PPTX Upload via API
    const handleFileUpload = useCallback(async (file: File) => {
        setUploadedFile(file);
        const result = await uploadPPT(file);
        if (result) {
            toast.success(`${result.totalSlides} slides extraídos com sucesso!`);
        }
    }, [uploadPPT]);

    // Dropzone with real upload
    const onDrop = useCallback((acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (file) {
            handleFileUpload(file);
        }
    }, [handleFileUpload]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
            'application/vnd.ms-powerpoint': ['.ppt'],
        },
        maxFiles: 1,
    });

    // Generate voice preview (REAL TTS API call)
    const generateVoicePreview = useCallback(async (slideContent: string) => {
        if (!selectedVoice || !slideContent) return;
        
        setGeneratingPreview(true);
        try {
            const response = await fetch('/api/voice/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: slideContent.substring(0, 200), // Preview first 200 chars
                    voiceId: selectedVoice,
                    provider: 'AZURE', // or 'ELEVENLABS'
                }),
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.data?.audioBase64) {
                    const audioBlob = new Blob(
                        [Uint8Array.from(atob(data.data.audioBase64), c => c.charCodeAt(0))],
                        { type: data.data.contentType || 'audio/mpeg' }
                    );
                    const audioUrl = URL.createObjectURL(audioBlob);
                    setPreviewAudioUrl(audioUrl);
                    toast.success('Preview de áudio gerado!');
                }
            } else {
                toast.error('Erro ao gerar preview de voz');
            }
        } catch (err) {
            logger.error('Voice preview error:', err);
            toast.error('Erro ao gerar preview');
        } finally {
            setGeneratingPreview(false);
        }
    }, [selectedVoice]);

    // REAL Export/Render via API
    const handleExport = useCallback(async () => {
        if (!parsedPPT) {
            toast.error('Nenhuma apresentação carregada');
            return;
        }

        const renderParams: PPTRenderParams = {
            projectId: parsedPPT.projectId,
            slides: parsedPPT.slides,
            voiceId: selectedVoice,
            avatarId: selectedAvatar || undefined,
            config: {
                resolution: hdQuality ? '1080p' : '720p',
                quality: hdQuality ? 'high' : 'medium',
                transition: 'fade',
                transitionDuration: 0.5,
            },
        };

        const result = await startRender(renderParams);
        if (result?.status === 'completed') {
            setExportComplete(true);
        }
    }, [parsedPPT, selectedVoice, selectedAvatar, hdQuality, startRender]);

    // Computed values from real data
    const slides = parsedPPT?.slides || [];
    const totalDuration = slides.reduce((acc, slide) => acc + slide.duration, 0);

    const nextStep = () => {
        if (currentStep < 4) setCurrentStep(currentStep + 1);
    };

    const prevStep = () => {
        if (currentStep > 1) setCurrentStep(currentStep - 1);
    };

    const canProceed = () => {
        switch (currentStep) {
            case 1: return slides.length > 0 && !isUploading;
            case 2: return selectedVoice !== '';
            case 3: return true;
            case 4: return exportComplete || renderJob?.status === 'completed';
            default: return false;
        }
    };

    // Cleanup audio URL on unmount
    useEffect(() => {
        return () => {
            if (previewAudioUrl) {
                URL.revokeObjectURL(previewAudioUrl);
            }
        };
    }, [previewAudioUrl]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
            {/* Header */}
            <header className="border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
                                <Video className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h1 className="font-bold text-slate-900 dark:text-white">PPT para Vídeo</h1>
                                <p className="text-xs text-slate-500">Transforme apresentações em vídeos profissionais</p>
                            </div>
                        </div>
                        
                        {/* Steps indicator */}
                        <div className="hidden md:flex items-center gap-2">
                            {STEPS.map((step, index) => (
                                <React.Fragment key={step.id}>
                                    <button
                                        onClick={() => step.id <= currentStep && setCurrentStep(step.id)}
                                        className={cn(
                                            "flex items-center gap-2 px-3 py-2 rounded-lg transition-all",
                                            currentStep === step.id
                                                ? "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300"
                                                : currentStep > step.id
                                                ? "text-emerald-600 cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                                                : "text-slate-400 cursor-not-allowed"
                                        )}
                                        disabled={step.id > currentStep}
                                    >
                                        <div className={cn(
                                            "w-7 h-7 rounded-full flex items-center justify-center text-sm font-medium",
                                            currentStep === step.id
                                                ? "bg-violet-600 text-white"
                                                : currentStep > step.id
                                                ? "bg-emerald-500 text-white"
                                                : "bg-slate-200 dark:bg-slate-700 text-slate-500"
                                        )}>
                                            {currentStep > step.id ? <Check className="w-4 h-4" /> : step.id}
                                        </div>
                                        <span className="font-medium hidden lg:inline">{step.title}</span>
                                    </button>
                                    {index < STEPS.length - 1 && (
                                        <ChevronRight className="w-4 h-4 text-slate-300" />
                                    )}
                                </React.Fragment>
                            ))}
                        </div>

                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm">
                                <Settings className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 py-8">
                <AnimatePresence mode="wait">
                    {/* STEP 1: Upload */}
                    {currentStep === 1 && (
                        <motion.div
                            key="step1"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6"
                        >
                            <div className="text-center max-w-2xl mx-auto mb-8">
                                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-3">
                                    Envie sua apresentação
                                </h2>
                                <p className="text-slate-600 dark:text-slate-400">
                                    Faça upload do seu arquivo PPTX e nossa IA vai transformá-lo em um vídeo profissional em minutos
                                </p>
                            </div>

                            {!uploadedFile ? (
                                <div
                                    {...getRootProps()}
                                    className={cn(
                                        "border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all",
                                        isDragActive
                                            ? "border-violet-500 bg-violet-50 dark:bg-violet-900/20"
                                            : "border-slate-300 dark:border-slate-700 hover:border-violet-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                    )}
                                >
                                    <input {...getInputProps()} />
                                    <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-900/30 dark:to-indigo-900/30 flex items-center justify-center">
                                        <Upload className="w-10 h-10 text-violet-600 dark:text-violet-400" />
                                    </div>
                                    <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                                        {isDragActive ? 'Solte o arquivo aqui' : 'Arraste seu PPTX aqui'}
                                    </h3>
                                    <p className="text-slate-500 mb-4">ou clique para selecionar</p>
                                    <div className="flex items-center justify-center gap-4 text-sm text-slate-400">
                                        <span className="flex items-center gap-1">
                                            <FileText className="w-4 h-4" />
                                            .pptx, .ppt
                                        </span>
                                        <span>•</span>
                                        <span>Até 100MB</span>
                                        <span>•</span>
                                        <span>Até 100 slides</span>
                                    </div>
                                </div>
                            ) : (
                                <Card className="overflow-hidden">
                                    <CardContent className="p-6">
                                        {isUploading ? (
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-14 h-14 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                                                        <Loader2 className="w-7 h-7 text-violet-600 animate-spin" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <h3 className="font-semibold text-slate-900 dark:text-white">
                                                            Processando apresentação...
                                                        </h3>
                                                        <p className="text-sm text-slate-500">{uploadedFile.name}</p>
                                                    </div>
                                                </div>
                                                <Progress value={uploadProgress} className="h-2" />
                                                <p className="text-sm text-slate-500 text-center">
                                                    {uploadProgress < 30 && 'Enviando arquivo...'}
                                                    {uploadProgress >= 30 && uploadProgress < 60 && 'Extraindo slides com IA...'}
                                                    {uploadProgress >= 60 && uploadProgress < 90 && 'Analisando conteúdo...'}
                                                    {uploadProgress >= 90 && 'Finalizando...'}
                                                </p>
                                            </div>
                                        ) : hookError ? (
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-14 h-14 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                                        <AlertCircle className="w-7 h-7 text-red-600" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <h3 className="font-semibold text-red-900 dark:text-red-400">
                                                            Erro ao processar
                                                        </h3>
                                                        <p className="text-sm text-slate-500">{hookError}</p>
                                                    </div>
                                                </div>
                                                <Button
                                                    variant="outline"
                                                    onClick={() => {
                                                        reset();
                                                        setUploadedFile(null);
                                                    }}
                                                >
                                                    Tentar novamente
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="space-y-6">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-14 h-14 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                                                            <CheckCircle2 className="w-7 h-7 text-emerald-600" />
                                                        </div>
                                                        <div>
                                                            <h3 className="font-semibold text-slate-900 dark:text-white">
                                                                {parsedPPT?.title || uploadedFile.name}
                                                            </h3>
                                                            <p className="text-sm text-slate-500">
                                                                {slides.length} slides extraídos • Duração estimada: {Math.floor(totalDuration / 60)}:{String(totalDuration % 60).padStart(2, '0')}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                            reset();
                                                            setUploadedFile(null);
                                                        }}
                                                    >
                                                        <X className="w-4 h-4 mr-1" />
                                                        Remover
                                                    </Button>
                                                </div>

                                                {/* Real slides preview from API */}
                                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                                                    {slides.map((slide, index) => (
                                                        <div
                                                            key={slide.id}
                                                            className="aspect-video bg-slate-100 dark:bg-slate-800 rounded-lg relative overflow-hidden group cursor-pointer hover:ring-2 hover:ring-violet-500 transition-all"
                                                        >
                                                            {slide.imageUrl ? (
                                                                <img 
                                                                    src={slide.imageUrl} 
                                                                    alt={slide.title}
                                                                    className="absolute inset-0 w-full h-full object-cover"
                                                                />
                                                            ) : (
                                                                <div className="absolute inset-0 flex items-center justify-center p-2">
                                                                    <p className="text-[10px] text-center text-slate-600 dark:text-slate-400 line-clamp-3">
                                                                        {slide.title}
                                                                    </p>
                                                                </div>
                                                            )}
                                                            <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] px-2 py-1 flex justify-between">
                                                                <span>Slide {index + 1}</span>
                                                                <span>{slide.duration}s</span>
                                                            </div>
                                                            {/* Delete button on hover */}
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    removeSlide(slide.id);
                                                                }}
                                                                className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                            >
                                                                <X className="w-3 h-3 text-white" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            )}

                            {/* Features */}
                            <div className="grid md:grid-cols-3 gap-4 mt-8">
                                {[
                                    { icon: Sparkles, title: 'IA Inteligente', desc: 'Extração automática de texto e notas' },
                                    { icon: Clock, title: 'Ultra Rápido', desc: 'Processamento em segundos' },
                                    { icon: Layers, title: 'Preserva Layout', desc: 'Mantém design original dos slides' },
                                ].map((feature) => (
                                    <Card key={feature.title} className="bg-white/50 dark:bg-slate-800/50">
                                        <CardContent className="p-4 flex items-center gap-3">
                                            <feature.icon className="w-8 h-8 text-violet-600" />
                                            <div>
                                                <h4 className="font-medium text-slate-900 dark:text-white">{feature.title}</h4>
                                                <p className="text-sm text-slate-500">{feature.desc}</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 2: Customize */}
                    {currentStep === 2 && (
                        <motion.div
                            key="step2"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6"
                        >
                            <div className="text-center max-w-2xl mx-auto mb-8">
                                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-3">
                                    Personalize seu vídeo
                                </h2>
                                <p className="text-slate-600 dark:text-slate-400">
                                    Configure voz, avatar, música e estilo visual para criar o vídeo perfeito
                                </p>
                            </div>

                            <div className="grid lg:grid-cols-2 gap-6">
                                {/* Left Column - Settings */}
                                <div className="space-y-6">
                                    {/* Voice Selection - REAL API DATA */}
                                    <Card>
                                        <CardContent className="p-6">
                                            <div className="flex items-center gap-2 mb-4">
                                                <Mic className="w-5 h-5 text-violet-600" />
                                                <h3 className="font-semibold text-slate-900 dark:text-white">Voz da Narração</h3>
                                                {loadingVoices && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                {voices.map((voice) => (
                                                    <button
                                                        key={voice.id}
                                                        onClick={() => setSelectedVoice(voice.id)}
                                                        className={cn(
                                                            "p-3 rounded-xl border-2 transition-all text-left",
                                                            selectedVoice === voice.id
                                                                ? "border-violet-500 bg-violet-50 dark:bg-violet-900/20"
                                                                : "border-slate-200 dark:border-slate-700 hover:border-violet-300"
                                                        )}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-lg">{voice.preview}</span>
                                                            <div>
                                                                <p className="font-medium text-slate-900 dark:text-white">{voice.name}</p>
                                                                <p className="text-xs text-slate-500">
                                                                    {voice.gender === 'F' ? 'Feminina' : 'Masculina'}
                                                                    {voice.provider && ` • ${voice.provider}`}
                                                                </p>
                                                            </div>
                                                            {voice.popular && (
                                                                <Badge variant="secondary" className="ml-auto text-[10px]">Popular</Badge>
                                                            )}
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                            <div className="mt-4 space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <Label className="text-sm">Velocidade</Label>
                                                    <span className="text-sm text-slate-500">{voiceSpeed[0]}x</span>
                                                </div>
                                                <Slider
                                                    value={voiceSpeed}
                                                    onValueChange={setVoiceSpeed}
                                                    min={0.5}
                                                    max={2}
                                                    step={0.1}
                                                />
                                            </div>
                                            {/* Preview voice button */}
                                            {slides.length > 0 && (
                                                <Button 
                                                    variant="outline" 
                                                    size="sm" 
                                                    className="mt-4 w-full"
                                                    onClick={() => generateVoicePreview(slides[0]?.content || slides[0]?.title || 'Olá, este é um teste de voz.')}
                                                    disabled={generatingPreview || !selectedVoice}
                                                >
                                                    {generatingPreview ? (
                                                        <>
                                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                            Gerando preview...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Play className="w-4 h-4 mr-2" />
                                                            Ouvir preview da voz
                                                        </>
                                                    )}
                                                </Button>
                                            )}
                                            {previewAudioUrl && (
                                                <audio 
                                                    ref={audioRef}
                                                    src={previewAudioUrl} 
                                                    controls 
                                                    className="mt-2 w-full h-10"
                                                />
                                            )}
                                        </CardContent>
                                    </Card>

                                    {/* Avatar Selection - REAL API DATA */}
                                    <Card>
                                        <CardContent className="p-6">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-2">
                                                    <User className="w-5 h-5 text-violet-600" />
                                                    <h3 className="font-semibold text-slate-900 dark:text-white">Avatar Apresentador</h3>
                                                    {loadingAvatars && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
                                                </div>
                                                <Badge variant="outline" className="text-xs">Opcional</Badge>
                                            </div>
                                            <div className="grid grid-cols-4 gap-3">
                                                <button
                                                    onClick={() => setSelectedAvatar(null)}
                                                    className={cn(
                                                        "aspect-square rounded-xl border-2 transition-all flex items-center justify-center",
                                                        selectedAvatar === null
                                                            ? "border-violet-500 bg-violet-50 dark:bg-violet-900/20"
                                                            : "border-slate-200 dark:border-slate-700 hover:border-violet-300"
                                                    )}
                                                >
                                                    <X className="w-6 h-6 text-slate-400" />
                                                </button>
                                                {avatars.map((avatar) => (
                                                    <button
                                                        key={avatar.id}
                                                        onClick={() => setSelectedAvatar(avatar.id)}
                                                        className={cn(
                                                            "aspect-square rounded-xl border-2 transition-all overflow-hidden relative group",
                                                            selectedAvatar === avatar.id
                                                                ? "border-violet-500 ring-2 ring-violet-500/20"
                                                                : "border-slate-200 dark:border-slate-700 hover:border-violet-300"
                                                        )}
                                                    >
                                                        {avatar.thumbnail ? (
                                                            <img 
                                                                src={avatar.thumbnail} 
                                                                alt={avatar.name}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center">
                                                                <User className="w-8 h-8 text-slate-400" />
                                                            </div>
                                                        )}
                                                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[8px] px-1 py-0.5 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                            {avatar.name}
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Music Selection */}
                                    <Card>
                                        <CardContent className="p-6">
                                            <div className="flex items-center gap-2 mb-4">
                                                <Music className="w-5 h-5 text-violet-600" />
                                                <h3 className="font-semibold text-slate-900 dark:text-white">Música de Fundo</h3>
                                            </div>
                                            <div className="space-y-2">
                                                {MUSIC_TRACKS.map((track) => (
                                                    <button
                                                        key={track.id}
                                                        onClick={() => setSelectedMusic(track.id)}
                                                        className={cn(
                                                            "w-full p-3 rounded-lg border transition-all flex items-center justify-between",
                                                            selectedMusic === track.id
                                                                ? "border-violet-500 bg-violet-50 dark:bg-violet-900/20"
                                                                : "border-slate-200 dark:border-slate-700 hover:border-violet-300"
                                                        )}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                                                {track.id === 'none' ? <X className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                                            </div>
                                                            <div className="text-left">
                                                                <p className="font-medium text-slate-900 dark:text-white">{track.name}</p>
                                                                <p className="text-xs text-slate-500">{track.mood}</p>
                                                            </div>
                                                        </div>
                                                        <span className="text-sm text-slate-400">{track.duration}</span>
                                                    </button>
                                                ))}
                                            </div>
                                            {selectedMusic !== 'none' && (
                                                <div className="mt-4 space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <Label className="text-sm">Volume</Label>
                                                        <span className="text-sm text-slate-500">{musicVolume[0]}%</span>
                                                    </div>
                                                    <Slider
                                                        value={musicVolume}
                                                        onValueChange={setMusicVolume}
                                                        min={0}
                                                        max={100}
                                                        step={5}
                                                    />
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Right Column - Style & Options */}
                                <div className="space-y-6">
                                    {/* Template Selection */}
                                    <Card>
                                        <CardContent className="p-6">
                                            <div className="flex items-center gap-2 mb-4">
                                                <Palette className="w-5 h-5 text-violet-600" />
                                                <h3 className="font-semibold text-slate-900 dark:text-white">Estilo Visual</h3>
                                            </div>
                                            <div className="grid grid-cols-3 gap-3">
                                                {TEMPLATES.map((template) => (
                                                    <button
                                                        key={template.id}
                                                        onClick={() => setSelectedTemplate(template.id)}
                                                        className={cn(
                                                            "p-3 rounded-xl border-2 transition-all",
                                                            selectedTemplate === template.id
                                                                ? "border-violet-500 bg-violet-50 dark:bg-violet-900/20"
                                                                : "border-slate-200 dark:border-slate-700 hover:border-violet-300"
                                                        )}
                                                    >
                                                        <div className="flex gap-1 mb-2">
                                                            {template.colors.map((color, i) => (
                                                                <div
                                                                    key={i}
                                                                    className="w-4 h-4 rounded-full"
                                                                    style={{ backgroundColor: color }}
                                                                />
                                                            ))}
                                                        </div>
                                                        <p className="text-sm font-medium text-slate-900 dark:text-white">{template.name}</p>
                                                    </button>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Additional Options */}
                                    <Card>
                                        <CardContent className="p-6 space-y-4">
                                            <h3 className="font-semibold text-slate-900 dark:text-white">Opções Adicionais</h3>
                                            
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Type className="w-4 h-4 text-slate-500" />
                                                    <Label>Legendas automáticas</Label>
                                                </div>
                                                <Switch
                                                    checked={autoSubtitles}
                                                    onCheckedChange={setAutoSubtitles}
                                                />
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Zap className="w-4 h-4 text-slate-500" />
                                                    <Label>Qualidade HD (1080p)</Label>
                                                </div>
                                                <Switch
                                                    checked={hdQuality}
                                                    onCheckedChange={setHdQuality}
                                                />
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Preview Panel */}
                                    <Card className="overflow-hidden">
                                        <div className="aspect-video bg-slate-900 relative">
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <div className="text-center text-white/60">
                                                    <Video className="w-12 h-12 mx-auto mb-2" />
                                                    <p className="text-sm">Preview ao vivo</p>
                                                </div>
                                            </div>
                                            {selectedAvatar && (
                                                <div className="absolute bottom-4 right-4 w-24 h-24 rounded-full bg-slate-800 border-2 border-white/20 overflow-hidden">
                                                    {avatars.find(a => a.id === selectedAvatar)?.thumbnail ? (
                                                        <img 
                                                            src={avatars.find(a => a.id === selectedAvatar)?.thumbnail}
                                                            alt="Avatar"
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center">
                                                            <User className="w-10 h-10 text-slate-400" />
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <CardContent className="p-4 bg-slate-50 dark:bg-slate-800">
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-slate-600 dark:text-slate-400">
                                                    Voz: <strong>{voices.find(v => v.id === selectedVoice)?.name || 'Nenhuma'}</strong>
                                                </span>
                                                <span className="text-slate-600 dark:text-slate-400">
                                                    ~{Math.floor(totalDuration / 60)}:{String(totalDuration % 60).padStart(2, '0')}
                                                </span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 3: Preview */}
                    {currentStep === 3 && (
                        <motion.div
                            key="step3"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6"
                        >
                            <div className="text-center max-w-2xl mx-auto mb-8">
                                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-3">
                                    Revise seu vídeo
                                </h2>
                                <p className="text-slate-600 dark:text-slate-400">
                                    Assista ao preview e faça ajustes finais antes de exportar
                                </p>
                            </div>

                            <div className="grid lg:grid-cols-3 gap-6">
                                {/* Video Player */}
                                <div className="lg:col-span-2">
                                    <Card className="overflow-hidden">
                                        <div className="aspect-video bg-slate-900 relative">
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <Button
                                                    size="lg"
                                                    className="w-16 h-16 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur"
                                                    onClick={() => setIsPlaying(!isPlaying)}
                                                >
                                                    {isPlaying ? (
                                                        <Pause className="w-8 h-8 text-white" />
                                                    ) : (
                                                        <Play className="w-8 h-8 text-white ml-1" />
                                                    )}
                                                </Button>
                                            </div>
                                            {/* Progress bar */}
                                            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
                                                <Progress value={33} className="h-1 mb-2" />
                                                <div className="flex items-center justify-between text-white text-sm">
                                                    <span>0:33 / 1:40</span>
                                                    <div className="flex items-center gap-2">
                                                        <Button variant="ghost" size="sm" className="text-white">
                                                            <Volume2 className="w-4 h-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="sm" className="text-white">
                                                            HD
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                </div>

                                {/* Slides List */}
                                <div className="space-y-4">
                                    <h3 className="font-semibold text-slate-900 dark:text-white">Timeline de Slides</h3>
                                    <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                                        {slides.map((slide, index) => (
                                            <button
                                                key={slide.id}
                                                onClick={() => setCurrentSlide(index)}
                                                className={cn(
                                                    "w-full p-3 rounded-lg border transition-all text-left",
                                                    currentSlide === index
                                                        ? "border-violet-500 bg-violet-50 dark:bg-violet-900/20"
                                                        : "border-slate-200 dark:border-slate-700 hover:border-violet-300"
                                                )}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-16 h-10 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs text-slate-500">
                                                        {index + 1}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-medium text-slate-900 dark:text-white truncate">{slide.title}</p>
                                                        <p className="text-xs text-slate-500">{slide.duration}s</p>
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 4: Export */}
                    {currentStep === 4 && (
                        <motion.div
                            key="step4"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6"
                        >
                            <div className="text-center max-w-2xl mx-auto mb-8">
                                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-3">
                                    Exporte seu vídeo
                                </h2>
                                <p className="text-slate-600 dark:text-slate-400">
                                    Escolha o formato e qualidade para download ou publicação
                                </p>
                            </div>

                            <div className="max-w-3xl mx-auto">
                                {!exportComplete && renderJob?.status !== 'completed' ? (
                                    <Card>
                                        <CardContent className="p-8">
                                            {isRendering ? (
                                                <div className="text-center space-y-6">
                                                    <div className="w-20 h-20 mx-auto rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                                                        <Loader2 className="w-10 h-10 text-violet-600 animate-spin" />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                                                            Renderizando seu vídeo...
                                                        </h3>
                                                        <p className="text-slate-500">Isso pode levar alguns minutos dependendo da duração</p>
                                                    </div>
                                                    <Progress value={renderProgress} className="h-3" />
                                                    <div className="flex justify-between text-sm text-slate-500">
                                                        <span>{Math.round(renderProgress)}% concluído</span>
                                                        {renderJob?.estimatedTime && (
                                                            <span>~{Math.ceil(renderJob.estimatedTime / 60)} min restantes</span>
                                                        )}
                                                    </div>
                                                    {renderJob?.status && (
                                                        <p className="text-xs text-slate-400">
                                                            Status: {renderJob.status}
                                                        </p>
                                                    )}
                                                </div>
                                            ) : renderJob?.status === 'failed' ? (
                                                <div className="text-center space-y-6">
                                                    <div className="w-20 h-20 mx-auto rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                                        <AlertCircle className="w-10 h-10 text-red-600" />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-xl font-semibold text-red-900 dark:text-red-400 mb-2">
                                                            Erro na renderização
                                                        </h3>
                                                        <p className="text-slate-500">{renderJob.error || 'Ocorreu um erro ao gerar o vídeo'}</p>
                                                    </div>
                                                    <Button
                                                        onClick={handleExport}
                                                        className="bg-gradient-to-r from-violet-600 to-indigo-600"
                                                    >
                                                        <Zap className="w-5 h-5 mr-2" />
                                                        Tentar novamente
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="space-y-6">
                                                    <h3 className="font-semibold text-slate-900 dark:text-white">Formato de Exportação</h3>
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                        {[
                                                            { id: 'mp4', label: 'MP4', desc: 'Vídeo padrão', icon: FileVideo },
                                                            { id: 'webm', label: 'WebM', desc: 'Web otimizado', icon: Globe },
                                                            { id: 'scorm', label: 'SCORM', desc: 'Para LMS', icon: GraduationCap },
                                                            { id: 'embed', label: 'Embed', desc: 'Código HTML', icon: Code },
                                                        ].map((format) => (
                                                            <button
                                                                key={format.id}
                                                                onClick={() => setExportFormat(format.id)}
                                                                className={cn(
                                                                    "p-4 rounded-xl border-2 transition-all text-center",
                                                                    exportFormat === format.id
                                                                        ? "border-violet-500 bg-violet-50 dark:bg-violet-900/20"
                                                                        : "border-slate-200 dark:border-slate-700 hover:border-violet-300"
                                                                )}
                                                            >
                                                                <format.icon className="w-8 h-8 mx-auto mb-2 text-violet-600" />
                                                                <p className="font-medium text-slate-900 dark:text-white">{format.label}</p>
                                                                <p className="text-xs text-slate-500">{format.desc}</p>
                                                            </button>
                                                        ))}
                                                    </div>

                                                    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
                                                        <h4 className="font-medium text-slate-900 dark:text-white mb-3">Resumo</h4>
                                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                                            <div>
                                                                <p className="text-slate-500">Duração</p>
                                                                <p className="font-medium">{Math.floor(totalDuration / 60)}:{String(totalDuration % 60).padStart(2, '0')}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-slate-500">Qualidade</p>
                                                                <p className="font-medium">{hdQuality ? '1080p HD' : '720p'}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-slate-500">Slides</p>
                                                                <p className="font-medium">{slides.length} slides</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-slate-500">Voz</p>
                                                                <p className="font-medium">{voices.find(v => v.id === selectedVoice)?.name || 'Nenhuma'}</p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <Button
                                                        size="lg"
                                                        className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700"
                                                        onClick={handleExport}
                                                        disabled={!parsedPPT || slides.length === 0}
                                                    >
                                                        <Zap className="w-5 h-5 mr-2" />
                                                        Gerar Vídeo
                                                    </Button>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                ) : (
                                    <Card>
                                        <CardContent className="p-8 text-center">
                                            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                                                <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                                            </div>
                                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                                                Vídeo pronto!
                                            </h3>
                                            <p className="text-slate-500 mb-8">
                                                Seu vídeo foi renderizado com sucesso
                                            </p>
                                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                                {renderJob?.videoUrl ? (
                                                    <Button 
                                                        size="lg" 
                                                        className="bg-gradient-to-r from-violet-600 to-indigo-600"
                                                        onClick={() => window.open(renderJob.videoUrl, '_blank')}
                                                    >
                                                        <Download className="w-5 h-5 mr-2" />
                                                        Baixar Vídeo
                                                    </Button>
                                                ) : (
                                                    <Button size="lg" className="bg-gradient-to-r from-violet-600 to-indigo-600">
                                                        <Download className="w-5 h-5 mr-2" />
                                                        Baixar Vídeo
                                                    </Button>
                                                )}
                                                <Button size="lg" variant="outline">
                                                    <Share2 className="w-5 h-5 mr-2" />
                                                    Compartilhar
                                                </Button>
                                            </div>
                                            {renderJob?.videoUrl && (
                                                <div className="mt-6">
                                                    <video 
                                                        src={renderJob.videoUrl} 
                                                        controls 
                                                        className="w-full max-w-lg mx-auto rounded-lg shadow-lg"
                                                    />
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* Footer Navigation */}
            <footer className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-t py-4 px-6">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <Button
                        variant="outline"
                        onClick={prevStep}
                        disabled={currentStep === 1}
                    >
                        <ChevronLeft className="w-4 h-4 mr-2" />
                        Voltar
                    </Button>

                    <div className="flex items-center gap-2">
                        {STEPS.map((step) => (
                            <div
                                key={step.id}
                                className={cn(
                                    "w-2 h-2 rounded-full transition-all",
                                    currentStep === step.id
                                        ? "w-8 bg-violet-600"
                                        : currentStep > step.id
                                        ? "bg-emerald-500"
                                        : "bg-slate-300"
                                )}
                            />
                        ))}
                    </div>

                    {currentStep < 4 ? (
                        <Button
                            onClick={nextStep}
                            disabled={!canProceed()}
                            className="bg-gradient-to-r from-violet-600 to-indigo-600"
                        >
                            Próximo
                            <ChevronRight className="w-4 h-4 ml-2" />
                        </Button>
                    ) : (
                        <Button
                            disabled={!exportComplete}
                            className="bg-gradient-to-r from-emerald-600 to-teal-600"
                        >
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Finalizar
                        </Button>
                    )}
                </div>
            </footer>
        </div>
    );
}
