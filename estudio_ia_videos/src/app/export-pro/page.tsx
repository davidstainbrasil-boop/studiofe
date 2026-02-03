'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@components/ui/button';
import { Badge } from '@components/ui/badge';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@components/ui/tabs';
import { ScrollArea } from '@components/ui/scroll-area';
import { Separator } from '@components/ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card';
import { Progress } from '@components/ui/progress';
import { Switch } from '@components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@components/ui/radio-group';
import {
    ChevronLeft,
    Download,
    Upload,
    Settings,
    Sparkles,
    Crown,
    Zap,
    Clock,
    Check,
    Play,
    Pause,
    FileVideo,
    FileAudio,
    FileCode,
    FileArchive,
    Monitor,
    Smartphone,
    Tablet,
    Globe,
    Share2,
    Link as LinkIcon,
    Copy,
    Mail,
    Facebook,
    Twitter,
    Linkedin,
    Youtube,
    Instagram,
    GraduationCap,
    Building2,
    Cloud,
    Server,
    Database,
    Shield,
    CheckCircle2,
    AlertCircle,
    Info,
    ExternalLink,
    RefreshCw,
    HardDrive,
    Film,
    Music,
    Image,
    Code,
    BookOpen,
    Loader2
} from 'lucide-react';
import { cn } from '@lib/utils';
import Link from 'next/link';
import { useExportPro, type SCORMVersion, type ExportFormat as ExportFormatType, type ExportResolution } from '@/hooks/use-export-pro';
import { toast } from 'sonner';
import { useSearchParams } from 'next/navigation';

// Types
interface ExportFormat {
    id: string;
    name: string;
    extension: string;
    description: string;
    icon: React.ElementType;
    premium?: boolean;
    sizes: string[];
}

interface LMSPlatform {
    id: string;
    name: string;
    logo: string;
    description: string;
    features: string[];
    status: 'connected' | 'available' | 'coming-soon';
}

// Data
const VIDEO_FORMATS: ExportFormat[] = [
    {
        id: 'mp4',
        name: 'MP4 (H.264)',
        extension: '.mp4',
        description: 'Universal, compatível com todos os players',
        icon: FileVideo,
        sizes: ['720p', '1080p', '4K'],
    },
    {
        id: 'webm',
        name: 'WebM (VP9)',
        extension: '.webm',
        description: 'Otimizado para web, menor tamanho',
        icon: Globe,
        sizes: ['720p', '1080p'],
    },
    {
        id: 'mov',
        name: 'MOV (ProRes)',
        extension: '.mov',
        description: 'Alta qualidade para edição profissional',
        icon: Film,
        premium: true,
        sizes: ['1080p', '4K'],
    },
    {
        id: 'gif',
        name: 'GIF Animado',
        extension: '.gif',
        description: 'Preview ou social media',
        icon: Image,
        sizes: ['480p', '720p'],
    },
];

const AUDIO_FORMATS: ExportFormat[] = [
    {
        id: 'mp3',
        name: 'MP3',
        extension: '.mp3',
        description: 'Áudio universal, alta compatibilidade',
        icon: Music,
        sizes: ['128kbps', '256kbps', '320kbps'],
    },
    {
        id: 'wav',
        name: 'WAV',
        extension: '.wav',
        description: 'Áudio sem compressão, máxima qualidade',
        icon: FileAudio,
        premium: true,
        sizes: ['16-bit', '24-bit'],
    },
];

const SCORM_VERSIONS = [
    { id: 'scorm12', name: 'SCORM 1.2', description: 'Máxima compatibilidade', popular: true },
    { id: 'scorm2004', name: 'SCORM 2004', description: 'Sequenciamento avançado', popular: false },
    { id: 'xapi', name: 'xAPI (Tin Can)', description: 'Rastreamento moderno', popular: false },
    { id: 'aicc', name: 'AICC', description: 'Sistemas legados', popular: false },
];

const LMS_PLATFORMS: LMSPlatform[] = [
    {
        id: 'moodle',
        name: 'Moodle',
        logo: '🎓',
        description: 'LMS open source mais popular do mundo',
        features: ['SCORM 1.2/2004', 'xAPI', 'Relatórios', 'Auto-matrícula'],
        status: 'connected',
    },
    {
        id: 'canvas',
        name: 'Canvas LMS',
        logo: '📚',
        description: 'Plataforma corporativa moderna',
        features: ['SCORM', 'LTI', 'Deep Linking', 'Grade Passback'],
        status: 'available',
    },
    {
        id: 'blackboard',
        name: 'Blackboard',
        logo: '🏫',
        description: 'Líder em educação superior',
        features: ['SCORM', 'LTI 1.3', 'Analytics', 'Content Marketplace'],
        status: 'available',
    },
    {
        id: 'cornerstone',
        name: 'Cornerstone',
        logo: '🏢',
        description: 'Treinamento corporativo enterprise',
        features: ['SCORM', 'xAPI', 'Skills Tracking', 'Compliance'],
        status: 'coming-soon',
    },
    {
        id: 'gupy',
        name: 'Gupy Educação',
        logo: '💜',
        description: 'Plataforma brasileira de RH',
        features: ['SCORM 1.2', 'Integração nativa', 'Certificados'],
        status: 'available',
    },
    {
        id: 'custom',
        name: 'LMS Customizado',
        logo: '⚙️',
        description: 'Integre com qualquer plataforma',
        features: ['SCORM', 'xAPI', 'API REST', 'Webhook'],
        status: 'available',
    },
];

const SOCIAL_PLATFORMS = [
    { id: 'youtube', name: 'YouTube', icon: Youtube, color: '#ff0000' },
    { id: 'linkedin', name: 'LinkedIn', icon: Linkedin, color: '#0077b5' },
    { id: 'instagram', name: 'Instagram', icon: Instagram, color: '#e1306c' },
    { id: 'facebook', name: 'Facebook', icon: Facebook, color: '#1877f2' },
    { id: 'twitter', name: 'X (Twitter)', icon: Twitter, color: '#000000' },
];

// Inner component that uses searchParams (requires Suspense)
function ExportProContent() {
    const searchParams = useSearchParams();
    const projectId = searchParams.get('projectId') || '';
    const videoUrl = searchParams.get('videoUrl') || '';
    
    // Real API hook
    const {
        isExporting,
        exportProgress,
        currentJob,
        exportHistory,
        error,
        exportVideo,
        exportSCORM,
        fetchExportHistory,
        downloadExport,
    } = useExportPro();
    
    // State
    const [activeTab, setActiveTab] = useState('video');
    const [selectedFormat, setSelectedFormat] = useState<ExportFormat | null>(VIDEO_FORMATS[0]);
    const [selectedResolution, setSelectedResolution] = useState('1080p');
    const [selectedScorm, setSelectedScorm] = useState<SCORMVersion>('scorm12');

    // SCORM settings
    const [scormTitle, setScormTitle] = useState('NR-35 Trabalho em Altura');
    const [scormVersion, setScormVersion] = useState('1.0.0');
    const [trackCompletion, setTrackCompletion] = useState(true);
    const [requireFullView, setRequireFullView] = useState(true);
    const [passScore, setPassScore] = useState(80);

    // Export settings
    const [includeSubtitles, setIncludeSubtitles] = useState(true);
    const [includeThumbnail, setIncludeThumbnail] = useState(true);
    const [watermark, setWatermark] = useState(false);
    
    // Fetch export history on mount if we have a projectId
    useEffect(() => {
        if (projectId) {
            fetchExportHistory(projectId);
        }
    }, [projectId, fetchExportHistory]);
    
    // Map SCORM selection to API version
    const getScormApiVersion = (selected: string): SCORMVersion => {
        const mapping: Record<string, SCORMVersion> = {
            'scorm12': 'scorm12',
            'scorm2004': 'scorm2004',
            'xapi': 'xapi',
            'aicc': 'aicc',
        };
        return mapping[selected] || 'scorm12';
    };
    
    // Handle Video Export (REAL API)
    const handleVideoExport = async () => {
        if (!projectId) {
            toast.error('ID do projeto não informado. Selecione um projeto primeiro.');
            return;
        }
        
        const format = (selectedFormat?.id || 'mp4') as ExportFormatType;
        const resolution = selectedResolution as ExportResolution;
        
        const result = await exportVideo({
            projectId,
            format,
            resolution,
            options: {
                includeSubtitles,
                includeThumbnail,
                watermark,
            },
        });
        
        if (result?.downloadUrl) {
            // Auto-download when complete
            const link = document.createElement('a');
            link.href = result.downloadUrl;
            link.download = `video-${projectId}.${format}`;
            link.click();
        }
    };
    
    // Handle SCORM Export (REAL API)
    const handleScormExport = async () => {
        if (!projectId) {
            toast.error('ID do projeto não informado. Selecione um projeto primeiro.');
            return;
        }
        
        if (!videoUrl) {
            toast.error('URL do vídeo não informada. Renderize o projeto primeiro.');
            return;
        }
        
        const result = await exportSCORM({
            projectId,
            videoUrl,
            title: scormTitle,
            version: getScormApiVersion(selectedScorm),
            settings: {
                trackCompletion,
                requireFullView,
                passScore,
                courseVersion: scormVersion,
            },
        });
        
        if (result?.downloadUrl) {
            toast.success('Pacote SCORM gerado! Baixe e importe no seu LMS.');
        }
    };
    
    // Handle export based on active tab
    const handleExport = async () => {
        if (activeTab === 'video' || activeTab === 'audio') {
            await handleVideoExport();
        } else if (activeTab === 'scorm') {
            await handleScormExport();
        } else if (activeTab === 'social') {
            toast.info('Publicação em redes sociais em desenvolvimento.');
        }
    };

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
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center">
                                <Download className="w-4 h-4" />
                            </div>
                            <div>
                                <h1 className="font-bold text-lg">Export Studio</h1>
                                <p className="text-xs text-slate-400">SCORM • LMS • Vídeo • Social</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="bg-blue-500/20 text-blue-400">
                            <Film className="w-3 h-3 mr-1" />
                            1:42 min
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
                    {/* Main Content */}
                    <div className="col-span-8 space-y-6">
                        <Tabs value={activeTab} onValueChange={setActiveTab}>
                            <TabsList className="bg-slate-900 border border-slate-800">
                                <TabsTrigger value="video" className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400">
                                    <FileVideo className="w-4 h-4 mr-2" />
                                    Vídeo
                                </TabsTrigger>
                                <TabsTrigger value="scorm" className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400">
                                    <GraduationCap className="w-4 h-4 mr-2" />
                                    SCORM/LMS
                                </TabsTrigger>
                                <TabsTrigger value="audio" className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400">
                                    <FileAudio className="w-4 h-4 mr-2" />
                                    Áudio
                                </TabsTrigger>
                                <TabsTrigger value="social" className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400">
                                    <Share2 className="w-4 h-4 mr-2" />
                                    Social
                                </TabsTrigger>
                            </TabsList>

                            {/* Video Export */}
                            <TabsContent value="video" className="mt-6">
                                <Card className="bg-slate-900 border-slate-800">
                                    <CardHeader>
                                        <CardTitle>Formato de Vídeo</CardTitle>
                                        <CardDescription>Escolha o formato e qualidade do seu vídeo</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div className="grid grid-cols-2 gap-4">
                                            {VIDEO_FORMATS.map(format => {
                                                const Icon = format.icon;
                                                return (
                                                    <motion.div
                                                        key={format.id}
                                                        whileHover={{ scale: 1.02 }}
                                                        className={cn(
                                                            "p-4 rounded-xl cursor-pointer transition-all border",
                                                            selectedFormat?.id === format.id
                                                                ? "bg-blue-500/20 border-blue-500"
                                                                : "bg-slate-800 border-slate-700 hover:border-slate-600"
                                                        )}
                                                        onClick={() => setSelectedFormat(format)}
                                                    >
                                                        <div className="flex items-start gap-3">
                                                            <div className={cn(
                                                                "w-10 h-10 rounded-lg flex items-center justify-center",
                                                                selectedFormat?.id === format.id ? "bg-blue-500/30" : "bg-slate-700"
                                                            )}>
                                                                <Icon className="w-5 h-5" />
                                                            </div>
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2">
                                                                    <h4 className="font-medium">{format.name}</h4>
                                                                    {format.premium && (
                                                                        <Badge className="bg-amber-500/20 text-amber-400 text-xs">
                                                                            <Crown className="w-3 h-3 mr-0.5" />
                                                                            PRO
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                                <p className="text-xs text-slate-500 mt-1">{format.description}</p>
                                                                <div className="flex gap-1 mt-2">
                                                                    {format.sizes.map(size => (
                                                                        <Badge key={size} variant="secondary" className="text-xs">
                                                                            {size}
                                                                        </Badge>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                            {selectedFormat?.id === format.id && (
                                                                <CheckCircle2 className="w-5 h-5 text-blue-400" />
                                                            )}
                                                        </div>
                                                    </motion.div>
                                                );
                                            })}
                                        </div>

                                        {selectedFormat && (
                                            <>
                                                <Separator className="bg-slate-800" />
                                                <div>
                                                    <Label className="text-sm mb-3 block">Resolução</Label>
                                                    <RadioGroup
                                                        value={selectedResolution}
                                                        onValueChange={setSelectedResolution}
                                                        className="flex gap-3"
                                                    >
                                                        {selectedFormat.sizes.map(size => (
                                                            <div key={size} className="flex items-center space-x-2">
                                                                <RadioGroupItem value={size} id={size} />
                                                                <Label htmlFor={size} className="cursor-pointer">{size}</Label>
                                                            </div>
                                                        ))}
                                                    </RadioGroup>
                                                </div>
                                            </>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* SCORM/LMS Export */}
                            <TabsContent value="scorm" className="mt-6 space-y-6">
                                {/* SCORM Version */}
                                <Card className="bg-slate-900 border-slate-800">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <BookOpen className="w-5 h-5 text-emerald-400" />
                                            Padrão de Empacotamento
                                        </CardTitle>
                                        <CardDescription>
                                            Escolha a versão compatível com seu LMS
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-2 gap-3">
                                            {SCORM_VERSIONS.map(version => (
                                                <motion.div
                                                    key={version.id}
                                                    whileHover={{ scale: 1.02 }}
                                                    className={cn(
                                                        "p-4 rounded-lg cursor-pointer transition-all border",
                                                        selectedScorm === version.id
                                                            ? "bg-emerald-500/20 border-emerald-500"
                                                            : "bg-slate-800 border-slate-700 hover:border-slate-600"
                                                    )}
                                                    onClick={() => setSelectedScorm(version.id as SCORMVersion)}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <h4 className="font-medium">{version.name}</h4>
                                                                {version.popular && (
                                                                    <Badge className="bg-emerald-500/20 text-emerald-400 text-xs">
                                                                        Recomendado
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <p className="text-xs text-slate-500 mt-1">{version.description}</p>
                                                        </div>
                                                        {selectedScorm === version.id && (
                                                            <Check className="w-5 h-5 text-emerald-400" />
                                                        )}
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* SCORM Settings */}
                                <Card className="bg-slate-900 border-slate-800">
                                    <CardHeader>
                                        <CardTitle>Configurações do Pacote</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <Label className="text-xs text-slate-400 mb-2 block">Título do Curso</Label>
                                                <Input
                                                    value={scormTitle}
                                                    onChange={(e) => setScormTitle(e.target.value)}
                                                    className="bg-slate-800 border-slate-700"
                                                />
                                            </div>
                                            <div>
                                                <Label className="text-xs text-slate-400 mb-2 block">Versão</Label>
                                                <Input
                                                    value={scormVersion}
                                                    onChange={(e) => setScormVersion(e.target.value)}
                                                    className="bg-slate-800 border-slate-700"
                                                />
                                            </div>
                                        </div>

                                        <Separator className="bg-slate-800" />

                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <Label className="text-sm">Rastrear Conclusão</Label>
                                                    <p className="text-xs text-slate-500">Registra quando o aluno completa</p>
                                                </div>
                                                <Switch checked={trackCompletion} onCheckedChange={setTrackCompletion} />
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <Label className="text-sm">Exigir Visualização Completa</Label>
                                                    <p className="text-xs text-slate-500">Aluno deve assistir 100%</p>
                                                </div>
                                                <Switch checked={requireFullView} onCheckedChange={setRequireFullView} />
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <Label className="text-sm">Nota de Aprovação</Label>
                                                    <p className="text-xs text-slate-500">Pontuação mínima para aprovação</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Input
                                                        type="number"
                                                        value={passScore}
                                                        onChange={(e) => setPassScore(Number(e.target.value))}
                                                        className="w-20 bg-slate-800 border-slate-700 text-center"
                                                    />
                                                    <span className="text-sm text-slate-400">%</span>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* LMS Platforms */}
                                <Card className="bg-slate-900 border-slate-800">
                                    <CardHeader>
                                        <CardTitle>Plataformas LMS Compatíveis</CardTitle>
                                        <CardDescription>
                                            Conecte-se diretamente ou faça upload do pacote SCORM
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-2 gap-3">
                                            {LMS_PLATFORMS.map(platform => (
                                                <div
                                                    key={platform.id}
                                                    className={cn(
                                                        "p-4 rounded-lg border transition-colors",
                                                        platform.status === 'connected'
                                                            ? "bg-emerald-500/10 border-emerald-500/50"
                                                            : platform.status === 'coming-soon'
                                                                ? "bg-slate-800/50 border-slate-700 opacity-60"
                                                                : "bg-slate-800 border-slate-700 hover:border-slate-600"
                                                    )}
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className="text-3xl">{platform.logo}</div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <h4 className="font-medium text-sm">{platform.name}</h4>
                                                                {platform.status === 'connected' && (
                                                                    <Badge className="bg-emerald-500/20 text-emerald-400 text-[10px]">
                                                                        Conectado
                                                                    </Badge>
                                                                )}
                                                                {platform.status === 'coming-soon' && (
                                                                    <Badge variant="secondary" className="text-[10px]">
                                                                        Em breve
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <p className="text-xs text-slate-500 mt-1">{platform.description}</p>
                                                            <div className="flex gap-1 mt-2 flex-wrap">
                                                                {platform.features.slice(0, 2).map(feature => (
                                                                    <Badge key={feature} variant="secondary" className="text-[10px]">
                                                                        {feature}
                                                                    </Badge>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {platform.status !== 'coming-soon' && (
                                                        <Button
                                                            variant={platform.status === 'connected' ? 'secondary' : 'outline'}
                                                            size="sm"
                                                            className="w-full mt-3"
                                                        >
                                                            {platform.status === 'connected' ? (
                                                                <>
                                                                    <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-400" />
                                                                    Configurado
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <ExternalLink className="w-3 h-3 mr-1" />
                                                                    Conectar
                                                                </>
                                                            )}
                                                        </Button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* Audio Export */}
                            <TabsContent value="audio" className="mt-6">
                                <Card className="bg-slate-900 border-slate-800">
                                    <CardHeader>
                                        <CardTitle>Exportar Áudio</CardTitle>
                                        <CardDescription>Extraia apenas a trilha de áudio do vídeo</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-2 gap-4">
                                            {AUDIO_FORMATS.map(format => {
                                                const Icon = format.icon;
                                                return (
                                                    <motion.div
                                                        key={format.id}
                                                        whileHover={{ scale: 1.02 }}
                                                        className="p-4 rounded-xl cursor-pointer transition-all border bg-slate-800 border-slate-700 hover:border-slate-600"
                                                    >
                                                        <div className="flex items-start gap-3">
                                                            <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center">
                                                                <Icon className="w-5 h-5" />
                                                            </div>
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2">
                                                                    <h4 className="font-medium">{format.name}</h4>
                                                                    {format.premium && (
                                                                        <Badge className="bg-amber-500/20 text-amber-400 text-xs">
                                                                            <Crown className="w-3 h-3 mr-0.5" />
                                                                            PRO
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                                <p className="text-xs text-slate-500 mt-1">{format.description}</p>
                                                                <div className="flex gap-1 mt-2">
                                                                    {format.sizes.map(size => (
                                                                        <Badge key={size} variant="secondary" className="text-xs">
                                                                            {size}
                                                                        </Badge>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                );
                                            })}
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* Social Export */}
                            <TabsContent value="social" className="mt-6 space-y-6">
                                <Card className="bg-slate-900 border-slate-800">
                                    <CardHeader>
                                        <CardTitle>Publicar nas Redes Sociais</CardTitle>
                                        <CardDescription>Otimizado automaticamente para cada plataforma</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-5 gap-3">
                                            {SOCIAL_PLATFORMS.map(platform => {
                                                const Icon = platform.icon;
                                                return (
                                                    <motion.div
                                                        key={platform.id}
                                                        whileHover={{ scale: 1.1 }}
                                                        whileTap={{ scale: 0.95 }}
                                                        className="p-4 rounded-xl cursor-pointer transition-all border bg-slate-800 border-slate-700 hover:border-slate-600 text-center"
                                                    >
                                                        <div
                                                            className="w-12 h-12 rounded-full mx-auto flex items-center justify-center"
                                                            style={{ backgroundColor: `${platform.color}20` }}
                                                        >
                                                            <Icon className="w-6 h-6" style={{ color: platform.color }} />
                                                        </div>
                                                        <p className="text-xs font-medium mt-2">{platform.name}</p>
                                                    </motion.div>
                                                );
                                            })}
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Share Link */}
                                <Card className="bg-slate-900 border-slate-800">
                                    <CardHeader>
                                        <CardTitle>Link de Compartilhamento</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="flex gap-2">
                                            <Input
                                                value="https://cursostecno.com.br/v/nr35-trabalho-altura"
                                                readOnly
                                                className="bg-slate-800 border-slate-700"
                                            />
                                            <Button variant="outline" className="border-slate-700 shrink-0">
                                                <Copy className="w-4 h-4 mr-2" />
                                                Copiar
                                            </Button>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Switch />
                                            <Label className="text-sm">Exigir senha para visualizar</Label>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>
                    </div>

                    {/* Right Sidebar - Preview & Actions */}
                    <div className="col-span-4 space-y-4">
                        {/* Project Info Banner */}
                        {!projectId && (
                            <Card className="bg-amber-500/10 border-amber-500/30">
                                <CardContent className="p-4">
                                    <div className="flex items-start gap-3">
                                        <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-medium text-amber-300">Projeto não selecionado</p>
                                            <p className="text-xs text-amber-400/80 mt-1">
                                                Acesse esta página através de um projeto para habilitar a exportação.
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                        
                        {/* Preview */}
                        <Card className="bg-slate-900 border-slate-800">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm">Preview</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="aspect-video bg-slate-800 rounded-lg flex items-center justify-center relative overflow-hidden">
                                    {videoUrl ? (
                                        <video 
                                            src={videoUrl} 
                                            className="w-full h-full object-contain"
                                            controls
                                        />
                                    ) : (
                                        <div className="text-center">
                                            <Film className="w-12 h-12 mx-auto text-slate-600 mb-2" />
                                            <p className="text-sm text-slate-500">{scormTitle || 'Nenhum vídeo selecionado'}</p>
                                            <Badge className="mt-2" variant="secondary">Aguardando</Badge>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                                    <div className="p-2 bg-slate-800 rounded-lg">
                                        <Monitor className="w-4 h-4 mx-auto mb-1 text-slate-400" />
                                        <p className="text-xs text-slate-500">Desktop</p>
                                    </div>
                                    <div className="p-2 bg-slate-800 rounded-lg">
                                        <Tablet className="w-4 h-4 mx-auto mb-1 text-slate-400" />
                                        <p className="text-xs text-slate-500">Tablet</p>
                                    </div>
                                    <div className="p-2 bg-slate-800 rounded-lg">
                                        <Smartphone className="w-4 h-4 mx-auto mb-1 text-slate-400" />
                                        <p className="text-xs text-slate-500">Mobile</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Export Options */}
                        <Card className="bg-slate-900 border-slate-800">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm">Opções de Exportação</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label className="text-sm">Incluir Legendas</Label>
                                    <Switch checked={includeSubtitles} onCheckedChange={setIncludeSubtitles} />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label className="text-sm">Gerar Thumbnail</Label>
                                    <Switch checked={includeThumbnail} onCheckedChange={setIncludeThumbnail} />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label className="text-sm">Marca d'água</Label>
                                    <Switch checked={watermark} onCheckedChange={setWatermark} />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Export Summary */}
                        <Card className="bg-slate-900 border-slate-800">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm">Resumo</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Formato</span>
                                    <span>{activeTab === 'scorm' ? `SCORM ${selectedScorm === 'scorm2004' ? '2004' : '1.2'}` : selectedFormat?.name || '-'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Resolução</span>
                                    <span>{selectedResolution}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Projeto</span>
                                    <span className="truncate max-w-[120px]">{projectId || 'Não selecionado'}</span>
                                </div>
                                {currentJob && (
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Status</span>
                                        <Badge variant={currentJob.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                                            {currentJob.status}
                                        </Badge>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                        
                        {/* Export History */}
                        {exportHistory.length > 0 && (
                            <Card className="bg-slate-900 border-slate-800">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm">Histórico de Exportações</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ScrollArea className="max-h-[150px]">
                                        <div className="space-y-2">
                                            {exportHistory.slice(0, 5).map((job) => (
                                                <div 
                                                    key={job.id} 
                                                    className="flex items-center justify-between p-2 bg-slate-800 rounded-lg"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        {job.type === 'scorm' ? (
                                                            <GraduationCap className="w-4 h-4 text-emerald-400" />
                                                        ) : (
                                                            <FileVideo className="w-4 h-4 text-blue-400" />
                                                        )}
                                                        <span className="text-xs text-slate-400">
                                                            {new Date(job.createdAt).toLocaleDateString('pt-BR')}
                                                        </span>
                                                    </div>
                                                    {job.status === 'completed' && job.downloadUrl && (
                                                        <Button 
                                                            size="sm" 
                                                            variant="ghost"
                                                            onClick={() => downloadExport(job.id)}
                                                        >
                                                            <Download className="w-3 h-3" />
                                                        </Button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                </CardContent>
                            </Card>
                        )}

                        {/* Export Button */}
                        <Button
                            className="w-full h-12 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-lg"
                            onClick={handleExport}
                            disabled={isExporting || !projectId}
                        >
                            {isExporting ? (
                                <>
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                    Exportando... {Math.round(exportProgress)}%
                                </>
                            ) : (
                                <>
                                    <Download className="w-5 h-5 mr-2" />
                                    {activeTab === 'scorm' ? 'Gerar Pacote SCORM' : 'Exportar Agora'}
                                </>
                            )}
                        </Button>

                        {/* Export Progress */}
                        {isExporting && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                <Progress value={exportProgress} className="h-2" />
                                <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                                    <Info className="w-3 h-3" />
                                    {activeTab === 'scorm' 
                                        ? 'Gerando pacote SCORM compatível com LMS...'
                                        : 'Renderizando vídeo em alta qualidade...'
                                    }
                                </p>
                            </motion.div>
                        )}
                        
                        {/* Error Display */}
                        {error && (
                            <Card className="bg-red-500/10 border-red-500/30">
                                <CardContent className="p-4">
                                    <div className="flex items-start gap-3">
                                        <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-medium text-red-300">Erro na exportação</p>
                                            <p className="text-xs text-red-400/80 mt-1">{error}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                        
                        {/* Success with Download */}
                        {currentJob?.status === 'completed' && currentJob.downloadUrl && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                            >
                                <Card className="bg-emerald-500/10 border-emerald-500/30">
                                    <CardContent className="p-4">
                                        <div className="flex items-start gap-3">
                                            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-emerald-300">Exportação concluída!</p>
                                                <p className="text-xs text-emerald-400/80 mt-1">
                                                    Seu {currentJob.type === 'scorm' ? 'pacote SCORM' : 'vídeo'} está pronto para download.
                                                </p>
                                                <Button
                                                    size="sm"
                                                    className="mt-3 bg-emerald-600 hover:bg-emerald-500"
                                                    onClick={() => downloadExport(currentJob.id)}
                                                >
                                                    <Download className="w-4 h-4 mr-2" />
                                                    Baixar Agora
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// Loading fallback for Suspense
function ExportProLoading() {
    return (
        <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                <p className="text-slate-400">Carregando exportação...</p>
            </div>
        </div>
    );
}

// Page wrapper with Suspense boundary (required for useSearchParams)
export default function ExportProPage() {
    return (
        <Suspense fallback={<ExportProLoading />}>
            <ExportProContent />
        </Suspense>
    );
}
