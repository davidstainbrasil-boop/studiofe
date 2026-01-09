'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Card, CardContent } from '@components/ui/card'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'
import { Textarea } from '@components/ui/textarea'
import { ScrollArea } from '@components/ui/scroll-area'
import { Play, Pause, SkipForward, SkipBack, ArrowLeft, ArrowRight, Edit2, Trash2, Plus } from 'lucide-react'
import { toast } from 'sonner'

interface Subtitle {
    id: number
    startTime: number
    endTime: number
    text: string
}

interface SubtitleEditorProps {
    videoFile: File | null
    subtitles: Subtitle[]
    onChange: (subtitles: Subtitle[]) => void
    onNext: () => void
    onBack: () => void
}

export default function SubtitleEditor({
    videoFile,
    subtitles,
    onChange,
    onNext,
    onBack
}: SubtitleEditorProps) {
    const [selectedIndex, setSelectedIndex] = useState(0)
    const [isPlaying, setIsPlaying] = useState(false)
    const [currentTime, setCurrentTime] = useState(0)
    const [videoUrl, setVideoUrl] = useState<string | null>(null)
    const videoRef = useRef<HTMLVideoElement>(null)

    useEffect(() => {
        if (videoFile) {
            const url = URL.createObjectURL(videoFile)
            setVideoUrl(url)
            return () => URL.revokeObjectURL(url)
        }
    }, [videoFile])

    useEffect(() => {
        if (videoRef.current) {
            const video = videoRef.current
            const handleTimeUpdate = () => {
                setCurrentTime(video.currentTime)

                // Auto-select subtitle based on current time
                const activeIndex = subtitles.findIndex(
                    sub => video.currentTime >= sub.startTime && video.currentTime <= sub.endTime
                )
                if (activeIndex !== -1) {
                    setSelectedIndex(activeIndex)
                }
            }

            video.addEventListener('timeupdate', handleTimeUpdate)
            return () => video.removeEventListener('timeupdate', handleTimeUpdate)
        }
    }, [subtitles])

    const formatTime = (seconds: number) => {
        const hrs = Math.floor(seconds / 3600)
        const mins = Math.floor((seconds % 3600) / 60)
        const secs = Math.floor(seconds % 60)
        const ms = Math.floor((seconds % 1) * 1000)

        if (hrs > 0) {
            return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`
        }
        return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`
    }

    const handlePlayPause = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause()
            } else {
                videoRef.current.play()
            }
            setIsPlaying(!isPlaying)
        }
    }

    const handleSeek = (time: number) => {
        if (videoRef.current) {
            videoRef.current.currentTime = time
        }
    }

    const updateSubtitle = (index: number, field: keyof Subtitle, value: any) => {
        const newSubtitles = [...subtitles]
        newSubtitles[index] = { ...newSubtitles[index], [field]: value }
        onChange(newSubtitles)
    }

    const deleteSubtitle = (index: number) => {
        const newSubtitles = subtitles.filter((_, i) => i !== index)
        onChange(newSubtitles)
        setSelectedIndex(Math.max(0, index - 1))
        toast.success('Legenda removida')
    }

    const addSubtitle = () => {
        const lastSub = subtitles[subtitles.length - 1]
        const newSub: Subtitle = {
            id: Date.now(),
            startTime: lastSub ? lastSub.endTime : 0,
            endTime: lastSub ? lastSub.endTime + 3 : 3,
            text: 'Nova legenda'
        }
        onChange([...subtitles, newSub])
        setSelectedIndex(subtitles.length)
        toast.success('Legenda adicionada')
    }

    const selectedSubtitle = subtitles[selectedIndex]

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Video Player */}
                <div className="space-y-4">
                    <Card>
                        <CardContent className="p-4">
                            {videoUrl ? (
                                <div className="space-y-4">
                                    <video
                                        ref={videoRef}
                                        src={videoUrl}
                                        className="w-full rounded-lg"
                                        onEnded={() => setIsPlaying(false)}
                                    />

                                    {/* Current subtitle overlay */}
                                    {subtitles[selectedIndex] && (
                                        <div className="bg-black/80 text-white text-center p-3 rounded-lg">
                                            <p className="text-lg">{subtitles[selectedIndex].text}</p>
                                        </div>
                                    )}

                                    {/* Player controls */}
                                    <div className="flex items-center justify-center gap-4">
                                        <Button
                                            onClick={() => handleSeek(Math.max(0, currentTime - 5))}
                                            variant="outline"
                                            size="sm"
                                        >
                                            <SkipBack className="w-4 h-4" />
                                        </Button>

                                        <Button
                                            onClick={handlePlayPause}
                                            className="w-12 h-12"
                                        >
                                            {isPlaying ? (
                                                <Pause className="w-5 h-5" />
                                            ) : (
                                                <Play className="w-5 h-5" />
                                            )}
                                        </Button>

                                        <Button
                                            onClick={() => handleSeek(currentTime + 5)}
                                            variant="outline"
                                            size="sm"
                                        >
                                            <SkipForward className="w-4 h-4" />
                                        </Button>
                                    </div>

                                    <div className="text-center text-sm text-gray-600">
                                        {formatTime(currentTime)}
                                    </div>
                                </div>
                            ) : (
                                <div className="h-64 flex items-center justify-center text-gray-500">
                                    Nenhum vídeo carregado
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Subtitle Editor */}
                <div className="space-y-4">
                    <Card>
                        <CardContent className="p-4 space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="font-semibold">Editar Legenda #{selectedIndex + 1}</h3>
                                <Button
                                    onClick={() => deleteSubtitle(selectedIndex)}
                                    variant="outline"
                                    size="sm"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>

                            {selectedSubtitle && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-sm font-medium mb-2 block">Início</label>
                                            <Input
                                                type="number"
                                                step="0.1"
                                                value={selectedSubtitle.startTime}
                                                onChange={(e) => updateSubtitle(selectedIndex, 'startTime', parseFloat(e.target.value))}
                                            />
                                            <p className="text-xs text-gray-500 mt-1">{formatTime(selectedSubtitle.startTime)}</p>
                                        </div>

                                        <div>
                                            <label className="text-sm font-medium mb-2 block">Fim</label>
                                            <Input
                                                type="number"
                                                step="0.1"
                                                value={selectedSubtitle.endTime}
                                                onChange={(e) => updateSubtitle(selectedIndex, 'endTime', parseFloat(e.target.value))}
                                            />
                                            <p className="text-xs text-gray-500 mt-1">{formatTime(selectedSubtitle.endTime)}</p>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-sm font-medium mb-2 block">Texto</label>
                                        <Textarea
                                            value={selectedSubtitle.text}
                                            onChange={(e) => updateSubtitle(selectedIndex, 'text', e.target.value)}
                                            rows={4}
                                            className="resize-none"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">
                                            {selectedSubtitle.text.length} caracteres
                                        </p>
                                    </div>

                                    <Button
                                        onClick={() => handleSeek(selectedSubtitle.startTime)}
                                        variant="outline"
                                        className="w-full"
                                    >
                                        <Play className="w-4 h-4 mr-2" />
                                        Preview neste ponto
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Button
                        onClick={addSubtitle}
                        variant="outline"
                        className="w-full"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar Legenda
                    </Button>
                </div>
            </div>

            {/* Subtitle List */}
            <Card>
                <CardContent className="p-4">
                    <h3 className="font-semibold mb-4">Todas as Legendas ({subtitles.length})</h3>
                    <ScrollArea className="h-64">
                        <div className="space-y-2">
                            {subtitles.map((sub, index) => (
                                <div
                                    key={sub.id}
                                    onClick={() => {
                                        setSelectedIndex(index)
                                        handleSeek(sub.startTime)
                                    }}
                                    className={`p-3 rounded-lg cursor-pointer transition-colors ${index === selectedIndex
                                            ? 'bg-blue-100 border-2 border-blue-500'
                                            : 'bg-gray-50 hover:bg-gray-100'
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-xs font-medium text-gray-500">
                                            #{index + 1}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                            {formatTime(sub.startTime)} → {formatTime(sub.endTime)}
                                        </span>
                                    </div>
                                    <p className="text-sm">{sub.text}</p>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex justify-between">
                <Button onClick={onBack} variant="outline">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Voltar
                </Button>
                <Button
                    onClick={onNext}
                    className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                >
                    Exportar
                    <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
            </div>
        </div>
    )
}
