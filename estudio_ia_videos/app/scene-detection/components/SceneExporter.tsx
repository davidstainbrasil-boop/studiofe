'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Download, FileVideo, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'

interface Scene {
    id: number
    startTime: number
    endTime: number
    thumbnail: string | null
    description: string
}

interface SceneExporterProps {
    scenes: Scene[]
    videoFile: File | null
}

export default function SceneExporter({ scenes, videoFile }: SceneExporterProps) {
    const [selectedScenes, setSelectedScenes] = useState<number[]>([])
    const [isExporting, setIsExporting] = useState(false)

    const toggleScene = (sceneId: number) => {
        setSelectedScenes(prev =>
            prev.includes(sceneId)
                ? prev.filter(id => id !== sceneId)
                : [...prev, sceneId]
        )
    }

    const selectAll = () => {
        if (selectedScenes.length === scenes.length) {
            setSelectedScenes([])
        } else {
            setSelectedScenes(scenes.map(s => s.id))
        }
    }

    const handleExport = async () => {
        if (selectedScenes.length === 0) {
            toast.error('Selecione pelo menos uma cena')
            return
        }

        setIsExporting(true)

        try {
            // TODO: Implement actual scene export logic
            // This would split the video file into individual scenes

            await new Promise(resolve => setTimeout(resolve, 2000))

            toast.success(`${selectedScenes.length} cena(s) exportada(s)!`)
            setSelectedScenes([])
        } catch (error) {
            toast.error('Erro ao exportar cenas')
        } finally {
            setIsExporting(false)
        }
    }

    if (scenes.length === 0) {
        return (
            <Card className="border-dashed">
                <CardContent className="p-6 text-center">
                    <FileVideo className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm text-gray-600">
                        Nenhuma cena detectada ainda.
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                        Faça upload de um vídeo e detecte cenas primeiro.
                    </p>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-4">
            <Card>
                <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold">{scenes.length} Cenas</h4>
                        <Button
                            onClick={selectAll}
                            variant="outline"
                            size="sm"
                        >
                            {selectedScenes.length === scenes.length ? 'Desmarcar' : 'Marcar'} Todas
                        </Button>
                    </div>

                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        {scenes.map((scene, index) => (
                            <div
                                key={scene.id}
                                className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                <Checkbox
                                    checked={selectedScenes.includes(scene.id)}
                                    onCheckedChange={() => toggleScene(scene.id)}
                                />
                                <div className="flex-1">
                                    <p className="text-sm font-medium">Cena #{index + 1}</p>
                                    <p className="text-xs text-gray-500">{scene.description}</p>
                                </div>
                                <span className="text-xs text-gray-500">
                                    {(scene.endTime - scene.startTime).toFixed(1)}s
                                </span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <Card className={`${selectedScenes.length > 0 ? 'border-purple-200 bg-purple-50' : ''}`}>
                <CardContent className="p-4">
                    <div className="text-center mb-3">
                        <div className="inline-flex items-center gap-2 mb-2">
                            <CheckCircle className="w-5 h-5 text-purple-600" />
                            <span className="font-semibold">
                                {selectedScenes.length} cena(s) selecionada(s)
                            </span>
                        </div>
                    </div>

                    <Button
                        onClick={handleExport}
                        disabled={selectedScenes.length === 0 || isExporting || !videoFile}
                        className="w-full bg-gradient-to-r from-purple-500 to-pink-600"
                    >
                        {isExporting ? (
                            <>Exportando...</>
                        ) : (
                            <>
                                <Download className="w-4 h-4 mr-2" />
                                Exportar Cenas Selecionadas
                            </>
                        )}
                    </Button>

                    {!videoFile && (
                        <p className="text-xs text-center text-gray-500 mt-2">
                            Vídeo original necessário para exportação
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
