'use client'

import React, { useState, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Upload, FileVideo, X, Play } from 'lucide-react'
import { toast } from 'sonner'

interface SubtitleUploaderProps {
    onVideoUpload: (file: File) => void
}

export default function SubtitleUploader({ onVideoUpload }: SubtitleUploaderProps) {
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [isDragging, setIsDragging] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileSelect = (file: File) => {
        // Validate file type
        if (!file.type.startsWith('video/')) {
            toast.error('Por favor, selecione um arquivo de vídeo válido')
            return
        }

        // Validate file size (max 500MB)
        const maxSize = 500 * 1024 * 1024
        if (file.size > maxSize) {
            toast.error('O arquivo é muito grande. Máximo: 500MB')
            return
        }

        setSelectedFile(file)
        const url = URL.createObjectURL(file)
        setPreviewUrl(url)
        toast.success('Vídeo carregado com sucesso!')
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)

        const files = Array.from(e.dataTransfer.files)
        if (files.length > 0) {
            handleFileSelect(files[0])
        }
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(true)
    }

    const handleDragLeave = () => {
        setIsDragging(false)
    }

    const handleRemove = () => {
        setSelectedFile(null)
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl)
            setPreviewUrl(null)
        }
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    const handleContinue = () => {
        if (selectedFile) {
            onVideoUpload(selectedFile)
        }
    }

    return (
        <div className="space-y-6">
            {!selectedFile ? (
                <div
                    className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${isDragging
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                >
                    <div className="flex flex-col items-center gap-4">
                        <div className="p-4 bg-blue-100 rounded-full">
                            <Upload className="w-12 h-12 text-blue-600" />
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold mb-2">
                                Arraste e solte seu vídeo aqui
                            </h3>
                            <p className="text-gray-600 mb-4">
                                ou clique para selecionar um arquivo
                            </p>
                            <Button
                                onClick={() => fileInputRef.current?.click()}
                                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                            >
                                <FileVideo className="w-4 h-4 mr-2" />
                                Selecionar Vídeo
                            </Button>
                        </div>

                        <p className="text-sm text-gray-500">
                            Formatos suportados: MP4, AVI, MOV, WebM • Máximo: 500MB
                        </p>
                    </div>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="video/*"
                        onChange={(e) => {
                            const files = e.target.files
                            if (files && files.length > 0) {
                                handleFileSelect(files[0])
                            }
                        }}
                        className="hidden"
                    />
                </div>
            ) : (
                <div className="space-y-4">
                    <Card className="border-green-200 bg-green-50">
                        <CardContent className="p-6">
                            <div className="flex items-start gap-4">
                                {previewUrl && (
                                    <video
                                        src={previewUrl}
                                        className="w-32 h-20 rounded-lg object-cover"
                                        controls={false}
                                    />
                                )}

                                <div className="flex-1">
                                    <h4 className="font-semibold mb-1">{selectedFile.name}</h4>
                                    <p className="text-sm text-gray-600 mb-2">
                                        Tamanho: {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                                    </p>
                                    <div className="flex gap-2">
                                        <Button
                                            onClick={handleContinue}
                                            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                                        >
                                            Continuar
                                        </Button>
                                        <Button
                                            onClick={handleRemove}
                                            variant="outline"
                                        >
                                            <X className="w-4 h-4 mr-2" />
                                            Remover
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {previewUrl && (
                        <Card>
                            <CardContent className="p-4">
                                <h4 className="font-semibold mb-3">Preview do Vídeo</h4>
                                <video
                                    src={previewUrl}
                                    controls
                                    className="w-full rounded-lg"
                                />
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}
        </div>
    )
}
