
import React, { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@components/ui/tabs';
import { FileVideo, Image as ImageIcon, Music, Type, Upload, Trash2, User, Loader2, Cloud } from 'lucide-react';
import { ScrollArea } from '@components/ui/scroll-area';
import { Button } from '@components/ui/button';
import { DragData, TimelineElement } from '../../lib/types/timeline-types';
import { TemplateBrowser } from './TemplateBrowser';
import { AvatarConfiguratorModal } from './AvatarConfiguratorModal';
import { useTimelineStore } from '../../lib/stores/timeline-store';
import { useAvatarGeneration } from '../../hooks/use-avatar-generation';
import { toast } from 'sonner';
import { SubtitlesPanel } from './SubtitlesPanel';

interface RemoteAsset {
    id: string;
    type: 'image' | 'audio' | 'video';
    name: string;
    url: string;
    mimeType?: string;
    createdAt?: string;
}

const AVATARS_MOCK = [
    { id: 'avatar-1', name: 'Anna (Pro)', preview: '/avatars/anna.png', gender: 'female' },
    { id: 'avatar-2', name: 'Bob (Pro)', preview: '/avatars/bob.png', gender: 'male' },
    { id: 'avatar-3', name: 'Clara (AI)', preview: '/avatars/anna.png', gender: 'female' },
];

export function AssetBrowser() {
    const [assets, setAssets] = useState<RemoteAsset[]>([]);
    const [loading, setLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);

    // Store
    const addElement = useTimelineStore(state => state.addElement);
    const currentTime = useTimelineStore(state => state.currentTime);

    // Initial Load
    useEffect(() => {
        loadAssets();
    }, []);

    const loadAssets = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/assets/list');
            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    setAssets(data.data);
                }
            }
        } catch (error) {
            console.error('Failed to load assets', error);
            toast.error('Erro ao carregar assets');
        } finally {
            setLoading(false);
        }
    };

    // Upload Logic
    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        if (acceptedFiles.length === 0) return;

        setIsUploading(true);
        const uploadPromises = acceptedFiles.map(async (file) => {
            const formData = new FormData();
            formData.append('file', file);

            try {
                const res = await fetch('/api/assets/upload', {
                    method: 'POST',
                    body: formData,
                });

                if (!res.ok) throw new Error('Upload failed');

                const data = await res.json();
                return data.success ? data.asset : null;
            } catch (error) {
                console.error('Upload error for file', file.name, error);
                toast.error(`Erro ao enviar ${file.name}`);
                return null;
            }
        });

        const results = await Promise.all(uploadPromises);
        const newAssets = results.filter((a): a is RemoteAsset => a !== null);

        if (newAssets.length > 0) {
            setAssets(prev => [...newAssets, ...prev]);
            toast.success(`${newAssets.length} arquivos enviados!`);
        }

        setIsUploading(false);
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/*': [],
            'audio/*': [],
            'video/*': []
        },
        noClick: true // We use the button for click
    });


    // Avatar Generation Hook
    const { generateAvatar } = useAvatarGeneration((videoUrl) => {
        // Success Callback
        const newClip: TimelineElement = {
            id: crypto.randomUUID(),
            type: 'video',
            name: 'Avatar Clip (AI)',
            start: currentTime,
            duration: 10,
            layerId: crypto.randomUUID(),
            source: videoUrl,
            layer: 0,
            properties: {
                visible: true,
                locked: false
            },
            keyframes: [],
            data: {
                x: 0, y: 0, width: 1, height: 1,
                opacity: 1, rotation: 0, scale: 1,
                playbackRate: 1, volume: 1
            }
        };
        addElement(newClip);
        setAvatarModalOpen(false);
    });

    // Avatar Configurator
    const [avatarModalOpen, setAvatarModalOpen] = useState(false);
    const [selectedAvatar, setSelectedAvatar] = useState<{ id: string; name: string } | null>(null);

    const handleAvatarClick = (avatar: { id: string; name: string }) => {
        setSelectedAvatar(avatar);
        setAvatarModalOpen(true);
    };

    const handleGenerateAvatar = (config: any) => {
        if (!selectedAvatar) return;
        generateAvatar({
            avatarId: selectedAvatar.id,
            animation: 'talking',
            text: config.text || "Sem texto definido",
            voiceCloning: !!config.voiceId,
            voiceId: config.voiceId
        });
    };

    const handleDragStart = (e: React.DragEvent, asset: RemoteAsset) => {
        const dragData: DragData = {
            type: 'element',
            sourceId: asset.id,
            sourceType: 'asset',
            data: {
                type: asset.type === 'image' ? 'image' : asset.type === 'video' ? 'video' : 'audio',
                source: asset.url,
                name: asset.name
            }
        };
        e.dataTransfer.setData('application/json', JSON.stringify(dragData));
        e.dataTransfer.effectAllowed = 'copy';
    };

    const handleDelete = async (id: string) => {
        // TODO: Call API to delete? For now just remove from UI
        setAssets(prev => prev.filter(a => a.id !== id));
    };

    return (
        <div className="h-full flex flex-col bg-muted/10 border-r" {...getRootProps()}>
            {/* Dropzone Overlay */}
            {isDragActive && (
                <div className="absolute inset-0 z-50 bg-blue-500/20 border-2 border-blue-500 border-dashed flex items-center justify-center backdrop-blur-sm">
                    <div className="bg-background/90 p-4 rounded-lg shadow-lg flex flex-col items-center animate-in fade-in zoom-in duration-200">
                        <Cloud className="w-10 h-10 text-blue-500 mb-2" />
                        <p className="font-semibold text-blue-600">Solte os arquivos aqui</p>
                    </div>
                </div>
            )}

            <input {...getInputProps()} className="hidden" />

            <div className="px-4 py-3 border-b flex justify-between items-center bg-background/50 backdrop-blur-sm sticky top-0 z-10">
                <h2 className="font-semibold text-sm">Assets</h2>
                <label>
                    <input {...getInputProps()} className="hidden" />
                    {/* Can't nest input in label if dropzone already has input. Use a button trigger */}
                    <Button
                        size="sm"
                        variant="default"
                        className="h-7 text-xs gap-1"
                        disabled={isUploading}
                        onClick={(e) => {
                            // This is tricky with dropzone 'noClick'. We need to programmatically click the input? 
                            // Or just remove noClick and let layout handle it.
                            // Actually, let's just make the button trigger the file dialog directly if possible
                            const input = document.querySelector('input[type="file"]') as HTMLInputElement;
                            if (input) input.click();
                        }}
                    >
                        {isUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                        {isUploading ? 'Enviando...' : 'Upload'}
                    </Button>
                </label>
            </div>

            <Tabs defaultValue="media" className="flex-1 flex flex-col min-h-0">
                <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0 h-10 overflow-x-auto no-scrollbar shrink-0">
                    <TabsTrigger value="media" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary pb-2 text-xs">Mídia</TabsTrigger>
                    <TabsTrigger value="audio" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary pb-2 text-xs">Áudio</TabsTrigger>
                    <TabsTrigger value="avatars" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary pb-2 text-xs">Avatares</TabsTrigger>
                    <TabsTrigger value="subtitles" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary pb-2 text-xs">Legendas</TabsTrigger>
                    <TabsTrigger value="templates" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary pb-2 text-xs">Templates</TabsTrigger>
                </TabsList>

                <TabsContent value="media" className="flex-1 p-0 m-0 min-h-0 relative">
                    <ScrollArea className="h-full">
                        <div className="p-4 grid grid-cols-2 gap-2 pb-20">
                            {loading && <div className="col-span-2 text-center py-4"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></div>}

                            {!loading && assets.filter(a => a.type === 'image' || a.type === 'video').map((asset) => (
                                <div
                                    key={asset.id}
                                    className="group relative aspect-video bg-background rounded-md border flex items-center justify-center cursor-grab active:cursor-grabbing hover:border-primary transition-colors overflow-hidden shadow-sm"
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, asset)}
                                >
                                    {asset.type === 'video' ? (
                                        <video src={asset.url} className="w-full h-full object-cover pointer-events-none" />
                                    ) : (
                                        <img src={asset.url} alt={asset.name} className="w-full h-full object-cover pointer-events-none" />
                                    )}

                                    <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button variant="destructive" size="icon" className="h-6 w-6" onClick={() => handleDelete(asset.id)}>
                                            <Trash2 className="w-3 h-3" />
                                        </Button>
                                    </div>

                                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-2 pt-4">
                                        <p className="text-[10px] text-white truncate font-medium">{asset.name}</p>
                                    </div>

                                    {/* Type Badge */}
                                    <div className="absolute top-1 left-1 bg-black/50 rounded px-1 text-[8px] text-white uppercase backdrop-blur-sm">
                                        {asset.type}
                                    </div>
                                </div>
                            ))}

                            {!loading && assets.filter(a => a.type === 'image' || a.type === 'video').length === 0 && (
                                <div className="col-span-2 py-12 text-center text-xs text-muted-foreground border-2 border-dashed rounded-lg bg-muted/5">
                                    <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    <p>Arraste imagens ou vídeos aqui</p>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </TabsContent>

                <TabsContent value="audio" className="flex-1 p-0 m-0 min-h-0 relative">
                    <ScrollArea className="h-full">
                        <div className="p-4 space-y-2 pb-20">
                            {!loading && assets.filter(a => a.type === 'audio').map((asset) => (
                                <div
                                    key={asset.id}
                                    className="group flex items-center gap-3 p-2 rounded-lg border bg-card hover:border-primary cursor-grab active:cursor-grabbing shadow-sm transition-all"
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, asset)}
                                >
                                    <div className="h-10 w-10 bg-primary/10 rounded-md flex items-center justify-center shrink-0 text-primary">
                                        <Music className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium truncate">{asset.name}</div>
                                        <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                                            <span>MP3/WAV</span>
                                            <span>•</span>
                                            <span>{Math.round((asset.mimeType?.length || 0) / 1024)}KB</span>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 opacity-0 group-hover:opacity-100"
                                        onClick={() => handleDelete(asset.id)}
                                    >
                                        <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                                    </Button>
                                </div>
                            ))}
                            {!loading && assets.filter(a => a.type === 'audio').length === 0 && (
                                <div className="py-12 text-center text-xs text-muted-foreground border-2 border-dashed rounded-lg bg-muted/5">
                                    <Music className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    <p>Arraste arquivos de áudio aqui</p>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </TabsContent>

                <TabsContent value="avatars" className="flex-1 p-0 m-0">
                    <ScrollArea className="h-full p-4">
                        <div className="grid grid-cols-2 gap-2">
                            {AVATARS_MOCK.map((avatar) => (
                                <div
                                    key={avatar.id}
                                    className="group relative aspect-[3/4] rounded-lg overflow-hidden border bg-black cursor-pointer hover:ring-2 ring-primary transition-all"
                                    onClick={() => handleAvatarClick(avatar)}
                                >
                                    <img src={avatar.preview} alt={avatar.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                    <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/90 to-transparent">
                                        <p className="text-white text-xs font-medium">{avatar.name}</p>
                                        <p className="text-[10px] text-white/70 capitalize">{avatar.gender}</p>
                                    </div>
                                    <div className="absolute top-2 right-2 bg-purple-600 text-[9px] text-white px-1.5 py-0.5 rounded font-bold uppercase tracking-wider shadow-sm">
                                        AI
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </TabsContent>

                <TabsContent value="subtitles" className="flex-1 p-0 m-0">
                    <SubtitlesPanel />
                </TabsContent>

                <TabsContent value="templates" className="flex-1 p-0 m-0">
                    <TemplateBrowser />
                </TabsContent>
            </Tabs>

            <AvatarConfiguratorModal
                isOpen={avatarModalOpen}
                onOpenChange={setAvatarModalOpen}
                onGenerate={handleGenerateAvatar}
                selectedAvatar={selectedAvatar}
            />
        </div>
    );
}
