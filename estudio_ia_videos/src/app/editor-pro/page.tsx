'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@components/ui/button';
import { Badge } from '@components/ui/badge';
import { Slider } from '@components/ui/slider';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@components/ui/tabs';
import { ScrollArea } from '@components/ui/scroll-area';
import { Separator } from '@components/ui/separator';
import {
    Play,
    Pause,
    SkipBack,
    SkipForward,
    Volume2,
    VolumeX,
    Plus,
    Trash2,
    Copy,
    Scissors,
    Undo2,
    Redo2,
    Save,
    Download,
    Upload,
    Image,
    Type,
    Music,
    Video,
    Mic,
    Settings,
    Layers,
    Lock,
    Unlock,
    Eye,
    EyeOff,
    ZoomIn,
    ZoomOut,
    MoreVertical,
    Sparkles,
    Clapperboard,
    User,
    MessageSquare,
    Wand2,
    Square,
    Circle,
    Triangle,
    Layers2,
    SlidersHorizontal,
    Film,
    ChevronLeft,
    Home,
    Clock,
    Palette
} from 'lucide-react';
import { cn } from '@lib/utils';
import Link from 'next/link';

// Types
interface Track {
    id: string;
    name: string;
    type: 'video' | 'audio' | 'text' | 'image' | 'avatar';
    locked: boolean;
    visible: boolean;
    clips: Clip[];
}

interface Clip {
    id: string;
    trackId: string;
    name: string;
    startTime: number;
    duration: number;
    color: string;
    thumbnail?: string;
    content?: string;
}

interface TimelineState {
    currentTime: number;
    duration: number;
    zoom: number;
    playing: boolean;
}

// Mock data
const INITIAL_TRACKS: Track[] = [
    {
        id: 'video-1',
        name: 'Vídeo Principal',
        type: 'video',
        locked: false,
        visible: true,
        clips: [
            { id: 'clip-1', trackId: 'video-1', name: 'Slide 1 - Intro', startTime: 0, duration: 15, color: '#8b5cf6' },
            { id: 'clip-2', trackId: 'video-1', name: 'Slide 2 - Objetivos', startTime: 15, duration: 12, color: '#8b5cf6' },
            { id: 'clip-3', trackId: 'video-1', name: 'Slide 3 - Conceitos', startTime: 27, duration: 20, color: '#8b5cf6' },
            { id: 'clip-4', trackId: 'video-1', name: 'Slide 4 - NR', startTime: 47, duration: 25, color: '#8b5cf6' },
            { id: 'clip-5', trackId: 'video-1', name: 'Slide 5 - EPIs', startTime: 72, duration: 18, color: '#8b5cf6' },
            { id: 'clip-6', trackId: 'video-1', name: 'Slide 6 - Conclusão', startTime: 90, duration: 10, color: '#8b5cf6' },
        ],
    },
    {
        id: 'avatar-1',
        name: 'Avatar Apresentador',
        type: 'avatar',
        locked: false,
        visible: true,
        clips: [
            { id: 'avatar-clip-1', trackId: 'avatar-1', name: 'Avatar Julia', startTime: 0, duration: 100, color: '#ec4899' },
        ],
    },
    {
        id: 'audio-1',
        name: 'Narração',
        type: 'audio',
        locked: false,
        visible: true,
        clips: [
            { id: 'audio-clip-1', trackId: 'audio-1', name: 'Narração Clara', startTime: 0, duration: 100, color: '#10b981' },
        ],
    },
    {
        id: 'music-1',
        name: 'Música de Fundo',
        type: 'audio',
        locked: false,
        visible: true,
        clips: [
            { id: 'music-clip-1', trackId: 'music-1', name: 'Corporate Upbeat', startTime: 0, duration: 100, color: '#f59e0b' },
        ],
    },
    {
        id: 'text-1',
        name: 'Legendas',
        type: 'text',
        locked: false,
        visible: true,
        clips: [],
    },
];

// Asset library items
const ASSETS = {
    transitions: [
        { id: 'fade', name: 'Fade', icon: '◐' },
        { id: 'slide', name: 'Slide', icon: '→' },
        { id: 'zoom', name: 'Zoom', icon: '⊕' },
        { id: 'wipe', name: 'Wipe', icon: '▤' },
        { id: 'dissolve', name: 'Dissolve', icon: '◑' },
    ],
    effects: [
        { id: 'blur', name: 'Blur', icon: '◎' },
        { id: 'brightness', name: 'Brilho', icon: '☀' },
        { id: 'contrast', name: 'Contraste', icon: '◐' },
        { id: 'saturation', name: 'Saturação', icon: '🎨' },
        { id: 'vignette', name: 'Vinheta', icon: '⬭' },
    ],
};

const AVATARS = [
    { id: 'julia', name: 'Julia', style: 'Profissional', thumbnail: '👩‍💼' },
    { id: 'carlos', name: 'Carlos', style: 'Corporativo', thumbnail: '👨‍💼' },
    { id: 'ana', name: 'Ana', style: 'Casual', thumbnail: '👩' },
    { id: 'pedro', name: 'Pedro', style: 'Técnico', thumbnail: '👷' },
];

const VOICES = [
    { id: 'clara', name: 'Clara', language: 'PT-BR', style: 'Natural' },
    { id: 'pedro', name: 'Pedro', language: 'PT-BR', style: 'Dinâmico' },
    { id: 'ana', name: 'Ana', language: 'PT-BR', style: 'Suave' },
    { id: 'lucas', name: 'Lucas', language: 'PT-BR', style: 'Formal' },
];

export default function VideoEditorPro() {
    // State
    const [tracks, setTracks] = useState<Track[]>(INITIAL_TRACKS);
    const [selectedClip, setSelectedClip] = useState<Clip | null>(null);
    const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
    const [timeline, setTimeline] = useState<TimelineState>({
        currentTime: 0,
        duration: 100,
        zoom: 1,
        playing: false,
    });
    const [sidebarTab, setSidebarTab] = useState('assets');
    const [volume, setVolume] = useState([80]);
    const [isMuted, setIsMuted] = useState(false);
    const [showAIPanel, setShowAIPanel] = useState(false);

    // Refs
    const timelineRef = useRef<HTMLDivElement>(null);
    const playheadRef = useRef<HTMLDivElement>(null);

    // Playback control
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (timeline.playing) {
            interval = setInterval(() => {
                setTimeline(prev => ({
                    ...prev,
                    currentTime: prev.currentTime >= prev.duration ? 0 : prev.currentTime + 0.1,
                }));
            }, 100);
        }
        return () => clearInterval(interval);
    }, [timeline.playing, timeline.duration]);

    const togglePlay = () => {
        setTimeline(prev => ({ ...prev, playing: !prev.playing }));
    };

    const seekTo = (time: number) => {
        setTimeline(prev => ({ ...prev, currentTime: Math.max(0, Math.min(time, prev.duration)) }));
    };

    const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!timelineRef.current) return;
        const rect = timelineRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = x / rect.width;
        seekTo(percentage * timeline.duration);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const frames = Math.floor((seconds % 1) * 30);
        return `${mins}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
    };

    const zoomIn = () => setTimeline(prev => ({ ...prev, zoom: Math.min(prev.zoom * 1.5, 4) }));
    const zoomOut = () => setTimeline(prev => ({ ...prev, zoom: Math.max(prev.zoom / 1.5, 0.5) }));

    const toggleTrackLock = (trackId: string) => {
        setTracks(prev => prev.map(t => t.id === trackId ? { ...t, locked: !t.locked } : t));
    };

    const toggleTrackVisibility = (trackId: string) => {
        setTracks(prev => prev.map(t => t.id === trackId ? { ...t, visible: !t.visible } : t));
    };

    const deleteClip = (clipId: string) => {
        setTracks(prev => prev.map(track => ({
            ...track,
            clips: track.clips.filter(c => c.id !== clipId),
        })));
        if (selectedClip?.id === clipId) setSelectedClip(null);
    };

    const duplicateClip = (clip: Clip) => {
        const newClip = {
            ...clip,
            id: `${clip.id}-copy-${Date.now()}`,
            name: `${clip.name} (cópia)`,
            startTime: clip.startTime + clip.duration,
        };
        setTracks(prev => prev.map(track =>
            track.id === clip.trackId
                ? { ...track, clips: [...track.clips, newClip] }
                : track
        ));
    };

    const addTrack = (type: Track['type']) => {
        const newTrack: Track = {
            id: `${type}-${Date.now()}`,
            name: type === 'video' ? 'Nova Faixa de Vídeo' :
                type === 'audio' ? 'Nova Faixa de Áudio' :
                    type === 'text' ? 'Nova Faixa de Texto' :
                        type === 'avatar' ? 'Novo Avatar' : 'Nova Faixa',
            type,
            locked: false,
            visible: true,
            clips: [],
        };
        setTracks(prev => [...prev, newTrack]);
    };

    return (
        <div className="h-screen flex flex-col bg-slate-950 text-white overflow-hidden">
            {/* Top Bar */}
            <header className="h-14 bg-slate-900 border-b border-slate-800 flex items-center px-4 gap-4">
                <Link href="/projects" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                    <span className="text-sm">Projetos</span>
                </Link>
                <Separator orientation="vertical" className="h-6 bg-slate-700" />
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
                        <Video className="w-4 h-4" />
                    </div>
                    <span className="font-bold">NR-35 Trabalho em Altura</span>
                    <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-400 text-xs">
                        Salvo automaticamente
                    </Badge>
                </div>
                <Separator orientation="vertical" className="h-6 bg-slate-700" />
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white">
                        <Undo2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white">
                        <Redo2 className="w-4 h-4" />
                    </Button>
                </div>
                <Separator orientation="vertical" className="h-6 bg-slate-700" />
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white">
                        <Scissors className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white">
                        <Copy className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white">
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>
                <div className="flex-1" />

                {/* AI Assistant Button */}
                <Button
                    variant={showAIPanel ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setShowAIPanel(!showAIPanel)}
                    className={cn(showAIPanel && "bg-violet-600/20 text-violet-400")}
                >
                    <Wand2 className="w-4 h-4 mr-2" />
                    Assistente IA
                </Button>

                <Button variant="outline" size="sm" className="border-slate-700 text-slate-300">
                    <Save className="w-4 h-4 mr-2" />
                    Salvar
                </Button>
                <Button size="sm" className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500">
                    <Download className="w-4 h-4 mr-2" />
                    Exportar
                </Button>
            </header>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Sidebar - Assets */}
                <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
                    <Tabs value={sidebarTab} onValueChange={setSidebarTab} className="flex-1 flex flex-col">
                        <TabsList className="grid grid-cols-5 mx-2 mt-2 bg-slate-800/50">
                            <TabsTrigger value="assets" className="text-xs data-[state=active]:bg-violet-600">
                                <Image className="w-4 h-4" />
                            </TabsTrigger>
                            <TabsTrigger value="text" className="text-xs data-[state=active]:bg-violet-600">
                                <Type className="w-4 h-4" />
                            </TabsTrigger>
                            <TabsTrigger value="audio" className="text-xs data-[state=active]:bg-violet-600">
                                <Music className="w-4 h-4" />
                            </TabsTrigger>
                            <TabsTrigger value="avatars" className="text-xs data-[state=active]:bg-violet-600">
                                <User className="w-4 h-4" />
                            </TabsTrigger>
                            <TabsTrigger value="effects" className="text-xs data-[state=active]:bg-violet-600">
                                <Sparkles className="w-4 h-4" />
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="assets" className="flex-1 m-0 p-3">
                            <ScrollArea className="h-full">
                                <div className="space-y-4">
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <h4 className="text-xs font-medium text-slate-400">Slides do Projeto</h4>
                                            <Badge variant="secondary" className="text-xs">6</Badge>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            {[1, 2, 3, 4, 5, 6].map(i => (
                                                <motion.div
                                                    key={i}
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                    className="aspect-video bg-slate-800 rounded-lg cursor-pointer hover:ring-2 hover:ring-violet-500 transition-all flex items-center justify-center relative overflow-hidden group"
                                                >
                                                    <div className="absolute inset-0 bg-gradient-to-br from-violet-600/20 to-indigo-600/20" />
                                                    <span className="text-xs text-slate-400 z-10">Slide {i}</span>
                                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                        <Plus className="w-5 h-5 text-white" />
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </div>
                                    <Separator className="bg-slate-800" />
                                    <div>
                                        <h4 className="text-xs font-medium text-slate-400 mb-2">Stock Library</h4>
                                        <Button variant="outline" size="sm" className="w-full border-slate-700 text-slate-300 hover:bg-slate-800">
                                            <Upload className="w-4 h-4 mr-2" />
                                            Importar Mídia
                                        </Button>
                                    </div>
                                </div>
                            </ScrollArea>
                        </TabsContent>

                        <TabsContent value="text" className="flex-1 m-0 p-3">
                            <ScrollArea className="h-full">
                                <div className="space-y-3">
                                    <h4 className="text-xs font-medium text-slate-400">Estilos de Texto</h4>
                                    {[
                                        { name: 'Título Principal', size: 'text-xl font-bold' },
                                        { name: 'Subtítulo', size: 'text-lg font-semibold' },
                                        { name: 'Corpo', size: 'text-base' },
                                        { name: 'Legenda', size: 'text-sm text-slate-400' },
                                        { name: 'Call-to-Action', size: 'text-base font-bold text-violet-400' },
                                    ].map(style => (
                                        <motion.div
                                            key={style.name}
                                            whileHover={{ scale: 1.02 }}
                                            className="p-3 bg-slate-800 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors"
                                        >
                                            <span className={style.size}>{style.name}</span>
                                        </motion.div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </TabsContent>

                        <TabsContent value="audio" className="flex-1 m-0 p-3">
                            <ScrollArea className="h-full">
                                <div className="space-y-4">
                                    <div>
                                        <h4 className="text-xs font-medium text-slate-400 mb-2">Vozes IA</h4>
                                        {VOICES.map(voice => (
                                            <motion.div
                                                key={voice.id}
                                                whileHover={{ scale: 1.02 }}
                                                className="p-3 bg-slate-800 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors flex items-center gap-3 mb-2"
                                            >
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                                                    <Mic className="w-4 h-4" />
                                                </div>
                                                <div className="flex-1">
                                                    <span className="text-sm font-medium">{voice.name}</span>
                                                    <p className="text-xs text-slate-400">{voice.style}</p>
                                                </div>
                                                <Play className="w-4 h-4 text-slate-400" />
                                            </motion.div>
                                        ))}
                                    </div>
                                    <Separator className="bg-slate-800" />
                                    <div>
                                        <h4 className="text-xs font-medium text-slate-400 mb-2">Trilhas Sonoras</h4>
                                        {['Corporate Upbeat', 'Minimal Tech', 'Inspiring Ambient', 'Focus Mode'].map(music => (
                                            <motion.div
                                                key={music}
                                                whileHover={{ scale: 1.02 }}
                                                className="p-3 bg-slate-800 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors flex items-center gap-3 mb-2"
                                            >
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                                                    <Music className="w-4 h-4" />
                                                </div>
                                                <span className="text-sm flex-1">{music}</span>
                                                <Play className="w-4 h-4 text-slate-400" />
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            </ScrollArea>
                        </TabsContent>

                        <TabsContent value="avatars" className="flex-1 m-0 p-3">
                            <ScrollArea className="h-full">
                                <div className="space-y-4">
                                    <h4 className="text-xs font-medium text-slate-400">Avatares IA</h4>
                                    <div className="grid grid-cols-2 gap-2">
                                        {AVATARS.map(avatar => (
                                            <motion.div
                                                key={avatar.id}
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                className="aspect-square bg-slate-800 rounded-xl cursor-pointer hover:ring-2 hover:ring-pink-500 transition-all flex flex-col items-center justify-center gap-2 p-3"
                                            >
                                                <div className="text-4xl">{avatar.thumbnail}</div>
                                                <span className="text-xs font-medium">{avatar.name}</span>
                                                <span className="text-[10px] text-slate-500">{avatar.style}</span>
                                            </motion.div>
                                        ))}
                                    </div>
                                    <Button variant="outline" size="sm" className="w-full border-slate-700 text-slate-300 hover:bg-slate-800">
                                        <Plus className="w-4 h-4 mr-2" />
                                        Criar Avatar Custom
                                    </Button>
                                </div>
                            </ScrollArea>
                        </TabsContent>

                        <TabsContent value="effects" className="flex-1 m-0 p-3">
                            <ScrollArea className="h-full">
                                <div className="space-y-4">
                                    <div>
                                        <h4 className="text-xs font-medium text-slate-400 mb-2">Transições</h4>
                                        <div className="grid grid-cols-3 gap-2">
                                            {ASSETS.transitions.map(t => (
                                                <motion.div
                                                    key={t.id}
                                                    whileHover={{ scale: 1.1 }}
                                                    className="aspect-square bg-slate-800 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors flex flex-col items-center justify-center gap-1"
                                                >
                                                    <span className="text-xl">{t.icon}</span>
                                                    <span className="text-[10px] text-slate-400">{t.name}</span>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </div>
                                    <Separator className="bg-slate-800" />
                                    <div>
                                        <h4 className="text-xs font-medium text-slate-400 mb-2">Filtros</h4>
                                        <div className="grid grid-cols-3 gap-2">
                                            {ASSETS.effects.map(e => (
                                                <motion.div
                                                    key={e.id}
                                                    whileHover={{ scale: 1.1 }}
                                                    className="aspect-square bg-slate-800 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors flex flex-col items-center justify-center gap-1"
                                                >
                                                    <span className="text-xl">{e.icon}</span>
                                                    <span className="text-[10px] text-slate-400">{e.name}</span>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </div>
                                    <Separator className="bg-slate-800" />
                                    <div>
                                        <h4 className="text-xs font-medium text-slate-400 mb-2">Shapes</h4>
                                        <div className="grid grid-cols-3 gap-2">
                                            {[
                                                { Icon: Square, name: 'Retângulo' },
                                                { Icon: Circle, name: 'Círculo' },
                                                { Icon: Triangle, name: 'Triângulo' },
                                            ].map(({ Icon, name }) => (
                                                <motion.div
                                                    key={name}
                                                    whileHover={{ scale: 1.1 }}
                                                    className="aspect-square bg-slate-800 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors flex flex-col items-center justify-center gap-1"
                                                >
                                                    <Icon className="w-5 h-5" />
                                                    <span className="text-[10px] text-slate-400">{name}</span>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </ScrollArea>
                        </TabsContent>
                    </Tabs>
                </aside>

                {/* Main Editor Area */}
                <div className="flex-1 flex flex-col">
                    {/* Preview Area */}
                    <div className="flex-1 bg-slate-950 p-4 flex items-center justify-center relative">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="relative w-full max-w-4xl aspect-video bg-slate-900 rounded-lg overflow-hidden shadow-2xl border border-slate-800"
                        >
                            {/* Video Preview */}
                            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
                                <div className="text-center">
                                    <div className="relative">
                                        <Clapperboard className="w-20 h-20 mx-auto text-slate-600 mb-4" />
                                        <motion.div
                                            animate={{ scale: [1, 1.2, 1] }}
                                            transition={{ repeat: Infinity, duration: 2 }}
                                            className="absolute -top-2 -right-2 w-6 h-6 bg-violet-600 rounded-full flex items-center justify-center"
                                        >
                                            <Sparkles className="w-3 h-3" />
                                        </motion.div>
                                    </div>
                                    <p className="text-slate-400 text-lg font-medium">NR-35 Trabalho em Altura</p>
                                    <p className="text-slate-500 text-sm">Treinamento de Segurança</p>
                                </div>
                            </div>

                            {/* Avatar overlay (if enabled) */}
                            {tracks.find(t => t.type === 'avatar' && t.visible) && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="absolute bottom-4 right-4 w-36 h-36 rounded-2xl overflow-hidden border-2 border-white/20 shadow-xl"
                                >
                                    <div className="w-full h-full bg-gradient-to-br from-pink-500/30 to-purple-500/30 flex items-center justify-center">
                                        <div className="text-5xl">👩‍💼</div>
                                    </div>
                                </motion.div>
                            )}

                            {/* Time indicator */}
                            <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-sm px-3 py-1.5 rounded-lg text-sm font-mono flex items-center gap-2">
                                <Clock className="w-3 h-3 text-violet-400" />
                                {formatTime(timeline.currentTime)}
                            </div>

                            {/* Resolution indicator */}
                            <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-sm px-3 py-1.5 rounded-lg text-xs font-medium">
                                1080p HD
                            </div>
                        </motion.div>

                        {/* AI Panel Overlay */}
                        <AnimatePresence>
                            {showAIPanel && (
                                <motion.div
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className="absolute top-4 right-4 w-80 bg-slate-900/95 backdrop-blur-lg rounded-xl border border-slate-700 shadow-2xl overflow-hidden"
                                >
                                    <div className="p-4 border-b border-slate-700 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center">
                                                <Wand2 className="w-4 h-4" />
                                            </div>
                                            <span className="font-medium">Assistente IA</span>
                                        </div>
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowAIPanel(false)}>
                                            <Plus className="w-4 h-4 rotate-45" />
                                        </Button>
                                    </div>
                                    <div className="p-4 space-y-3">
                                        <p className="text-sm text-slate-400">O que você gostaria de fazer?</p>
                                        {[
                                            { icon: Mic, label: 'Gerar narração automática', desc: 'IA cria o script' },
                                            { icon: MessageSquare, label: 'Adicionar legendas', desc: 'Auto-transcrição' },
                                            { icon: Film, label: 'Sugerir transições', desc: 'Match visual' },
                                            { icon: Clock, label: 'Ajustar timings', desc: 'Sync perfeito' },
                                        ].map(({ icon: Icon, label, desc }) => (
                                            <motion.button
                                                key={label}
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                                className="w-full p-3 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors text-left flex items-center gap-3"
                                            >
                                                <div className="w-8 h-8 rounded-lg bg-violet-600/20 flex items-center justify-center">
                                                    <Icon className="w-4 h-4 text-violet-400" />
                                                </div>
                                                <div>
                                                    <span className="text-sm font-medium block">{label}</span>
                                                    <span className="text-xs text-slate-500">{desc}</span>
                                                </div>
                                            </motion.button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Timeline Area */}
                    <div className="h-72 bg-slate-900 border-t border-slate-800 flex flex-col">
                        {/* Timeline Controls */}
                        <div className="h-12 px-4 flex items-center justify-between border-b border-slate-800">
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => seekTo(0)}>
                                    <SkipBack className="w-4 h-4" />
                                </Button>
                                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className={cn(
                                            "h-10 w-10 rounded-full",
                                            timeline.playing && "bg-violet-600 hover:bg-violet-700"
                                        )}
                                        onClick={togglePlay}
                                    >
                                        {timeline.playing ? (
                                            <Pause className="w-5 h-5" />
                                        ) : (
                                            <Play className="w-5 h-5 ml-0.5" />
                                        )}
                                    </Button>
                                </motion.div>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => seekTo(timeline.duration)}>
                                    <SkipForward className="w-4 h-4" />
                                </Button>
                                <Separator orientation="vertical" className="h-6 bg-slate-700 mx-2" />
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => setIsMuted(!isMuted)}
                                >
                                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                                </Button>
                                <div className="w-24">
                                    <Slider
                                        value={isMuted ? [0] : volume}
                                        onValueChange={setVolume}
                                        max={100}
                                        step={1}
                                        className="cursor-pointer"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center gap-4 text-sm font-mono bg-slate-800/50 px-4 py-1.5 rounded-lg">
                                <span className="text-violet-400">{formatTime(timeline.currentTime)}</span>
                                <span className="text-slate-600">/</span>
                                <span className="text-slate-400">{formatTime(timeline.duration)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="sm" onClick={() => addTrack('video')}>
                                    <Plus className="w-4 h-4 mr-1" />
                                    Track
                                </Button>
                                <Separator orientation="vertical" className="h-6 bg-slate-700" />
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={zoomOut}>
                                    <ZoomOut className="w-4 h-4" />
                                </Button>
                                <span className="text-xs text-slate-400 w-12 text-center">
                                    {Math.round(timeline.zoom * 100)}%
                                </span>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={zoomIn}>
                                    <ZoomIn className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Timeline Tracks */}
                        <div className="flex-1 flex overflow-hidden">
                            {/* Track Headers */}
                            <div className="w-48 bg-slate-900 border-r border-slate-800 flex flex-col">
                                {tracks.map(track => (
                                    <motion.div
                                        key={track.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className={cn(
                                            "h-12 px-2 flex items-center gap-2 border-b border-slate-800 hover:bg-slate-800/50 cursor-pointer transition-colors",
                                            selectedTrack?.id === track.id && "bg-slate-800"
                                        )}
                                        onClick={() => setSelectedTrack(track)}
                                    >
                                        <div className={cn(
                                            "w-1 h-6 rounded-full",
                                            track.type === 'video' && "bg-violet-500",
                                            track.type === 'audio' && "bg-emerald-500",
                                            track.type === 'avatar' && "bg-pink-500",
                                            track.type === 'text' && "bg-amber-500",
                                            track.type === 'image' && "bg-blue-500"
                                        )} />
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6"
                                            onClick={(e) => { e.stopPropagation(); toggleTrackVisibility(track.id); }}
                                        >
                                            {track.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3 text-slate-600" />}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6"
                                            onClick={(e) => { e.stopPropagation(); toggleTrackLock(track.id); }}
                                        >
                                            {track.locked ? <Lock className="w-3 h-3 text-amber-400" /> : <Unlock className="w-3 h-3" />}
                                        </Button>
                                        <div className="flex-1 truncate">
                                            <span className="text-xs font-medium">{track.name}</span>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>

                            {/* Timeline Content */}
                            <div className="flex-1 overflow-x-auto" ref={timelineRef} onClick={handleTimelineClick}>
                                <div
                                    className="relative h-full"
                                    style={{ width: `${timeline.duration * 10 * timeline.zoom}px`, minWidth: '100%' }}
                                >
                                    {/* Time ruler */}
                                    <div className="h-6 border-b border-slate-800 relative bg-slate-800/30">
                                        {Array.from({ length: Math.ceil(timeline.duration / 5) + 1 }).map((_, i) => (
                                            <div
                                                key={i}
                                                className="absolute top-0 h-full flex flex-col justify-end"
                                                style={{ left: `${i * 5 * 10 * timeline.zoom}px` }}
                                            >
                                                <span className="text-[10px] text-slate-500 mb-1 font-mono">{i * 5}s</span>
                                                <div className="w-px h-2 bg-slate-600" />
                                            </div>
                                        ))}
                                    </div>

                                    {/* Tracks */}
                                    {tracks.map(track => (
                                        <div
                                            key={track.id}
                                            className="h-12 border-b border-slate-800 relative"
                                        >
                                            {track.clips.map(clip => (
                                                <motion.div
                                                    key={clip.id}
                                                    whileHover={{ y: -1 }}
                                                    className={cn(
                                                        "absolute top-1 bottom-1 rounded-lg cursor-pointer transition-all hover:brightness-110 overflow-hidden",
                                                        selectedClip?.id === clip.id && "ring-2 ring-white shadow-lg"
                                                    )}
                                                    style={{
                                                        left: `${clip.startTime * 10 * timeline.zoom}px`,
                                                        width: `${clip.duration * 10 * timeline.zoom}px`,
                                                        backgroundColor: clip.color,
                                                    }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedClip(clip);
                                                    }}
                                                >
                                                    {/* Clip gradient overlay */}
                                                    <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
                                                    <div className="px-2 py-1 truncate relative">
                                                        <span className="text-[10px] text-white font-medium drop-shadow">
                                                            {clip.name}
                                                        </span>
                                                    </div>
                                                    {/* Resize handles */}
                                                    <div className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-white/30" />
                                                    <div className="absolute right-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-white/30" />
                                                </motion.div>
                                            ))}
                                        </div>
                                    ))}

                                    {/* Playhead */}
                                    <motion.div
                                        ref={playheadRef}
                                        className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 pointer-events-none"
                                        style={{ left: `${timeline.currentTime * 10 * timeline.zoom}px` }}
                                        animate={{ left: `${timeline.currentTime * 10 * timeline.zoom}px` }}
                                    >
                                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-red-500 rounded-full shadow-lg" />
                                        <div className="absolute top-0 left-1/2 -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-red-500" />
                                    </motion.div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Sidebar - Properties */}
                <aside className="w-72 bg-slate-900 border-l border-slate-800 flex flex-col">
                    <div className="p-4 border-b border-slate-800">
                        <h3 className="font-medium">Propriedades</h3>
                    </div>
                    <ScrollArea className="flex-1 p-4">
                        {selectedClip ? (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-4"
                            >
                                <div className="flex items-center gap-2 p-3 bg-slate-800/50 rounded-lg">
                                    <div
                                        className="w-4 h-4 rounded"
                                        style={{ backgroundColor: selectedClip.color }}
                                    />
                                    <span className="text-sm font-medium flex-1 truncate">{selectedClip.name}</span>
                                </div>

                                <div>
                                    <Label className="text-xs text-slate-400">Nome do Clip</Label>
                                    <Input
                                        value={selectedClip.name}
                                        className="mt-1 bg-slate-800 border-slate-700 focus:border-violet-500"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <Label className="text-xs text-slate-400">Início</Label>
                                        <Input
                                            value={`${selectedClip.startTime}s`}
                                            className="mt-1 bg-slate-800 border-slate-700"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs text-slate-400">Duração</Label>
                                        <Input
                                            value={`${selectedClip.duration}s`}
                                            className="mt-1 bg-slate-800 border-slate-700"
                                        />
                                    </div>
                                </div>

                                <Separator className="bg-slate-700" />

                                <div>
                                    <Label className="text-xs text-slate-400 mb-2 block">Cor do Clip</Label>
                                    <div className="flex gap-2">
                                        {['#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#3b82f6', '#ef4444'].map(color => (
                                            <motion.button
                                                key={color}
                                                whileHover={{ scale: 1.2 }}
                                                whileTap={{ scale: 0.9 }}
                                                className={cn(
                                                    "w-8 h-8 rounded-lg transition-all",
                                                    selectedClip.color === color && "ring-2 ring-white"
                                                )}
                                                style={{ backgroundColor: color }}
                                            />
                                        ))}
                                    </div>
                                </div>

                                <Separator className="bg-slate-700" />

                                <div className="grid grid-cols-2 gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="border-slate-700 hover:bg-slate-800"
                                        onClick={() => duplicateClip(selectedClip)}
                                    >
                                        <Copy className="w-3 h-3 mr-1" />
                                        Duplicar
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => deleteClip(selectedClip.id)}
                                    >
                                        <Trash2 className="w-3 h-3 mr-1" />
                                        Excluir
                                    </Button>
                                </div>
                            </motion.div>
                        ) : (
                            <div className="text-center text-slate-500 py-12">
                                <Layers className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                <p className="text-sm font-medium">Nenhum clip selecionado</p>
                                <p className="text-xs text-slate-600 mt-1">Clique em um clip na timeline</p>
                            </div>
                        )}
                    </ScrollArea>

                    {/* Quick Stats */}
                    <div className="p-4 border-t border-slate-800 bg-slate-800/30">
                        <h4 className="text-xs font-medium text-slate-400 mb-3">Resumo do Projeto</h4>
                        <div className="space-y-2 text-xs">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Duração total</span>
                                <span className="font-mono">{formatTime(timeline.duration)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Tracks</span>
                                <span>{tracks.length}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Clips</span>
                                <span>{tracks.reduce((acc, t) => acc + t.clips.length, 0)}</span>
                            </div>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
}
