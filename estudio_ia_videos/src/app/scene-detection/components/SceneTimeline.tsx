'use client'

import React, { useRef, useEffect, useState } from 'react'
import { Card, CardContent } from '@components/ui/card'
import { Button } from '@components/ui/button'
import { ScrollArea } from '@components/ui/scroll-area'
import { Play, Clock } from 'lucide-react'

interface Scene {
    id: number
    startTime: number
    endTime: number
    thumbnail: string | null
    description: string
}

interface SceneTimelineProps {
    scenes: Scene[]
    videoFile: File | null
}

export default function SceneTimeline({ scenes, videoFile }: SceneTimelineProps) {
    const [videoUrl, setVideoUrl] = useState<string | null>(null)
    const [currentScene, setCurrentScene] = useState(0)
    const videoRef = useRef<HTMLVideoElement>(null)

    useEffect(() => {
        if (videoFile) {
            const url = URL.createObjectURL(videoFile)
            setVideoUrl(url)
            return () => URL.revokeObjectURL(url)
        }
    }, [videoFile])

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = Math.floor(seconds % 60)
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    const handleSceneClick = (scene: Scene, index: number) => {
        setCurrentScene(index)
        if (videoRef.current) {
            videoRef.current.currentTime = scene.startTime
        }
    }

    const getDuration = (scene: Scene) => {
        return (scene.endTime - scene.startTime).toFixed(1)
    }

    return (
        <div className="space-y-4">
            {/* Video Player */}
            {videoUrl && (
                <Card>
                    <CardContent className="p-4">
                        <video
                            ref={videoRef}
                            src={videoUrl}
                            controls
                            className="w-full rounded-lg"
                        />
                    </CardContent>
                </Card>
            )}

            {/* Scene List */}
            <ScrollArea className="h-96">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {scenes.map((scene, index) => (
                        <Card
                            key={scene.id}
                            className={`cursor-pointer transition-all hover:shadow-lg ${currentScene === index
                                    ? 'ring-2 ring-purple-500 bg-purple-50'
                                    : ''
                                }`}
                            onClick={() => handleSceneClick(scene, index)}
                        >
                            <CardContent className="p-4">
                                <div className="aspect-video bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg mb-3 flex items-center justify-center">
                                    <Play className="w-12 h-12 text-purple-600" />
                                </div>

                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-semibold">Cena #{index + 1}</span>
                                    <span className="text-xs text-gray-500">{getDuration(scene)}s</span>
                                </div>

                                <p className="text-sm text-gray-700 mb-2">{scene.description}</p>

                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <Clock className="w-3 h-3" />
                                    {formatTime(scene.startTime)} - {formatTime(scene.endTime)}
                                </div>

                                <Button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        handleSceneClick(scene, index)
                                    }}
                                    variant="outline"
                                    size="sm"
                                    className="w-full mt-3"
                                >
                                    <Play className="w-3 h-3 mr-1" />
                                    Reproduzir
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </ScrollArea>
        </div>
    )
}
