'use client'

import React, { useState } from 'react'
import { Card, CardContent } from '@components/ui/card'
import { Button } from '@components/ui/button'
import { Badge } from '@components/ui/badge'
import { Download, FileText, ArrowLeft, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'

interface Subtitle {
    id: number
    startTime: number
    endTime: number
    text: string
}

interface SubtitleExporterProps {
    subtitles: Subtitle[]
    videoFile: File | null
    onBack: () => void
}

export default function SubtitleExporter({
    subtitles,
    videoFile,
    onBack
}: SubtitleExporterProps) {
    const [selectedFormats, setSelectedFormats] = useState<string[]>(['srt'])

    const formats = [
        {
            value: 'srt',
            label: 'SRT (SubRip)',
            description: 'Formato universal, compatível com a maioria dos players',
            icon: FileText
        },
        {
            value: 'vtt',
            label: 'VTT (WebVTT)',
            description: 'Ideal para web players e HTML5',
            icon: FileText
        },
        {
            value: 'ass',
            label: 'ASS (Advanced SubStation)',
            description: 'Suporta estilos avançados e formatação',
            icon: FileText
        },
        {
            value: 'txt',
            label: 'TXT (Texto Simples)',
            description: 'Apenas texto, sem timestamps',
            icon: FileText
        }
    ]

    const toggleFormat = (format: string) => {
        setSelectedFormats(prev =>
            prev.includes(format)
                ? prev.filter(f => f !== format)
                : [...prev, format]
        )
    }

    const formatTime = (seconds: number, format: string) => {
        const hrs = Math.floor(seconds / 3600)
        const mins = Math.floor((seconds % 3600) / 60)
        const secs = Math.floor(seconds % 60)
        const ms = Math.floor((seconds % 1) * 1000)

        if (format === 'srt' || format === 'ass') {
            return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`
        } else if (format === 'vtt') {
            return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`
        }
        return ''
    }

    const generateSRT = () => {
        return subtitles.map((sub, index) => {
            return `${index + 1}\n${formatTime(sub.startTime, 'srt')} --> ${formatTime(sub.endTime, 'srt')}\n${sub.text}\n`
        }).join('\n')
    }

    const generateVTT = () => {
        const content = subtitles.map((sub, index) => {
            return `${index + 1}\n${formatTime(sub.startTime, 'vtt')} --> ${formatTime(sub.endTime, 'vtt')}\n${sub.text}\n`
        }).join('\n')
        return `WEBVTT\n\n${content}`
    }

    const generateASS = () => {
        const header = `[Script Info]
Title: Auto-generated subtitles
ScriptType: v4.00+

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,20,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,2,0,2,10,10,10,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n`

        const events = subtitles.map(sub => {
            return `Dialogue: 0,${formatTime(sub.startTime, 'ass')},${formatTime(sub.endTime, 'ass')},Default,,0,0,0,,${sub.text}`
        }).join('\n')

        return header + events
    }

    const generateTXT = () => {
        return subtitles.map(sub => sub.text).join('\n\n')
    }

    const downloadFile = (content: string, filename: string) => {
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = filename
        link.click()
        URL.revokeObjectURL(url)
    }

    const handleExport = (format: string) => {
        let content = ''
        let filename = `subtitles_${Date.now()}`

        switch (format) {
            case 'srt':
                content = generateSRT()
                filename += '.srt'
                break
            case 'vtt':
                content = generateVTT()
                filename += '.vtt'
                break
            case 'ass':
                content = generateASS()
                filename += '.ass'
                break
            case 'txt':
                content = generateTXT()
                filename += '.txt'
                break
            default:
                return
        }

        downloadFile(content, filename)
        toast.success(`Legendas exportadas em formato ${format.toUpperCase()}`)
    }

    const handleExportAll = () => {
        selectedFormats.forEach(format => {
            handleExport(format)
        })
        toast.success(`${selectedFormats.length} arquivo(s) exportado(s)`)
    }

    return (
        <div className="space-y-6">
            {/* Summary */}
            <Card className="border-green-200 bg-green-50">
                <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-green-500 rounded-full">
                            <CheckCircle className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-green-900 mb-2">
                                Legendas Prontas para Exportação
                            </h3>
                            <p className="text-green-800 mb-4">
                                {subtitles.length} segmentos de legenda prontos para exportar
                            </p>
                            <div className="flex gap-2">
                                <Badge variant="secondary">{subtitles.length} legendas</Badge>
                                <Badge variant="secondary">
                                    {Math.ceil(subtitles[subtitles.length - 1]?.endTime || 0)}s de vídeo
                                </Badge>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Format Selection */}
            <div>
                <h3 className="font-semibold mb-4">Selecione os Formatos de Exportação</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {formats.map((format) => {
                        const Icon = format.icon
                        const isSelected = selectedFormats.includes(format.value)

                        return (
                            <Card
                                key={format.value}
                                className={`cursor-pointer transition-all ${isSelected
                                        ? 'ring-2 ring-blue-500 bg-blue-50'
                                        : 'hover:shadow-md'
                                    }`}
                                onClick={() => toggleFormat(format.value)}
                            >
                                <CardContent className="p-4">
                                    <div className="flex items-start gap-3">
                                        <div className={`p-2 rounded-lg ${isSelected ? 'bg-blue-500 text-white' : 'bg-gray-100'
                                            }`}>
                                            <Icon className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between mb-1">
                                                <h4 className="font-semibold">{format.label}</h4>
                                                {isSelected && (
                                                    <CheckCircle className="w-5 h-5 text-blue-500" />
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-600">{format.description}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            </div>

            {/* Individual Export Buttons */}
            <div>
                <h3 className="font-semibold mb-4">Exportar Individualmente</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {formats.map((format) => (
                        <Button
                            key={format.value}
                            onClick={() => handleExport(format.value)}
                            variant="outline"
                            className="w-full"
                        >
                            <Download className="w-4 h-4 mr-2" />
                            {format.value.toUpperCase()}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between">
                <Button onClick={onBack} variant="outline">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Voltar
                </Button>

                <Button
                    onClick={handleExportAll}
                    disabled={selectedFormats.length === 0}
                    className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                >
                    <Download className="w-4 h-4 mr-2" />
                    Exportar Selecionados ({selectedFormats.length})
                </Button>
            </div>
        </div>
    )
}
