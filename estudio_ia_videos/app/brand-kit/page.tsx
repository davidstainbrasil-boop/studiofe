'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    Palette,
    Upload,
    Plus,
    Trash2,
    Download,
    Copy,
    Check,
    Image,
    Type,
    Pipette
} from 'lucide-react'
import { toast } from 'sonner'

interface BrandColor {
    id: string
    name: string
    hex: string
}

interface BrandFont {
    id: string
    name: string
    family: string
    weight: string
}

interface BrandLogo {
    id: string
    name: string
    variant: 'primary' | 'secondary' | 'icon'
    url: string
}

export default function BrandKitPage() {
    const [colors, setColors] = useState<BrandColor[]>([
        { id: '1', name: 'Primary', hex: '#6366F1' },
        { id: '2', name: 'Secondary', hex: '#EC4899' },
        { id: '3', name: 'Accent', hex: '#10B981' },
        { id: '4', name: 'Dark', hex: '#1F2937' },
        { id: '5', name: 'Light', hex: '#F9FAFB' }
    ])

    const [fonts, setFonts] = useState<BrandFont[]>([
        { id: '1', name: 'Heading', family: 'Inter', weight: '700' },
        { id: '2', name: 'Body', family: 'Inter', weight: '400' },
        { id: '3', name: 'Caption', family: 'Inter', weight: '500' }
    ])

    const [logos, setLogos] = useState<BrandLogo[]>([
        { id: '1', name: 'Logo Principal', variant: 'primary', url: '🎬' },
        { id: '2', name: 'Logo Secundária', variant: 'secondary', url: '📹' },
        { id: '3', name: 'Ícone', variant: 'icon', url: '▶️' }
    ])

    const [copiedId, setCopiedId] = useState<string | null>(null)

    const copyColor = (hex: string, id: string) => {
        navigator.clipboard.writeText(hex)
        setCopiedId(id)
        setTimeout(() => setCopiedId(null), 2000)
        toast.success(`Cor ${hex} copiada!`)
    }

    const addColor = () => {
        const newColor: BrandColor = {
            id: Date.now().toString(),
            name: 'Nova Cor',
            hex: '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')
        }
        setColors(prev => [...prev, newColor])
        toast.success('Cor adicionada!')
    }

    const updateColor = (id: string, updates: Partial<BrandColor>) => {
        setColors(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c))
    }

    const deleteColor = (id: string) => {
        setColors(prev => prev.filter(c => c.id !== id))
        toast.success('Cor removida!')
    }

    const addFont = () => {
        const newFont: BrandFont = {
            id: Date.now().toString(),
            name: 'Nova Fonte',
            family: 'Inter',
            weight: '400'
        }
        setFonts(prev => [...prev, newFont])
        toast.success('Fonte adicionada!')
    }

    const deleteFont = (id: string) => {
        setFonts(prev => prev.filter(f => f.id !== id))
        toast.success('Fonte removida!')
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 p-6">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-gradient-to-r from-pink-500 to-purple-600 rounded-xl">
                                <Palette className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                                    Brand Kit
                                </h1>
                                <p className="text-gray-600">Gerencie a identidade visual da sua marca</p>
                            </div>
                        </div>
                        <Button variant="outline">
                            <Download className="w-4 h-4 mr-2" />
                            Exportar Kit
                        </Button>
                    </div>
                </div>

                <Tabs defaultValue="colors" className="space-y-6">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="colors">
                            <Pipette className="w-4 h-4 mr-2" />
                            Cores
                        </TabsTrigger>
                        <TabsTrigger value="fonts">
                            <Type className="w-4 h-4 mr-2" />
                            Fontes
                        </TabsTrigger>
                        <TabsTrigger value="logos">
                            <Image className="w-4 h-4 mr-2" />
                            Logos
                        </TabsTrigger>
                    </TabsList>

                    {/* Colors Tab */}
                    <TabsContent value="colors">
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle>Paleta de Cores</CardTitle>
                                        <CardDescription>Defina as cores da sua marca</CardDescription>
                                    </div>
                                    <Button onClick={addColor}>
                                        <Plus className="w-4 h-4 mr-2" />
                                        Adicionar Cor
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {colors.map(color => (
                                        <div
                                            key={color.id}
                                            className="p-4 border rounded-lg hover:shadow-md transition-shadow"
                                        >
                                            <div className="flex items-center gap-4 mb-3">
                                                <div
                                                    className="w-16 h-16 rounded-lg shadow-inner cursor-pointer"
                                                    style={{ backgroundColor: color.hex }}
                                                    onClick={() => copyColor(color.hex, color.id)}
                                                />
                                                <div className="flex-1">
                                                    <Input
                                                        value={color.name}
                                                        onChange={(e) => updateColor(color.id, { name: e.target.value })}
                                                        className="font-medium mb-1"
                                                    />
                                                    <div className="flex items-center gap-2">
                                                        <Input
                                                            type="color"
                                                            value={color.hex}
                                                            onChange={(e) => updateColor(color.id, { hex: e.target.value })}
                                                            className="w-10 h-8 p-0 border-0"
                                                        />
                                                        <code className="text-sm text-gray-600">{color.hex}</code>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex justify-between">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => copyColor(color.hex, color.id)}
                                                >
                                                    {copiedId === color.id ? (
                                                        <Check className="w-4 h-4 mr-1" />
                                                    ) : (
                                                        <Copy className="w-4 h-4 mr-1" />
                                                    )}
                                                    Copiar
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="text-red-600 hover:bg-red-50"
                                                    onClick={() => deleteColor(color.id)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Fonts Tab */}
                    <TabsContent value="fonts">
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle>Tipografia</CardTitle>
                                        <CardDescription>Configure as fontes da sua marca</CardDescription>
                                    </div>
                                    <Button onClick={addFont}>
                                        <Plus className="w-4 h-4 mr-2" />
                                        Adicionar Fonte
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {fonts.map(font => (
                                        <div
                                            key={font.id}
                                            className="p-4 border rounded-lg"
                                        >
                                            <div className="flex items-center justify-between mb-4">
                                                <Badge>{font.name}</Badge>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="text-red-600 hover:bg-red-50"
                                                    onClick={() => deleteFont(font.id)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                            <div
                                                className="text-2xl mb-4"
                                                style={{ fontFamily: font.family, fontWeight: font.weight }}
                                            >
                                                The quick brown fox jumps over the lazy dog
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <Label>Família</Label>
                                                    <select className="w-full mt-1 px-3 py-2 border rounded-md">
                                                        <option>Inter</option>
                                                        <option>Roboto</option>
                                                        <option>Open Sans</option>
                                                        <option>Montserrat</option>
                                                        <option>Poppins</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <Label>Peso</Label>
                                                    <select className="w-full mt-1 px-3 py-2 border rounded-md">
                                                        <option value="300">Light (300)</option>
                                                        <option value="400">Regular (400)</option>
                                                        <option value="500">Medium (500)</option>
                                                        <option value="600">SemiBold (600)</option>
                                                        <option value="700">Bold (700)</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Logos Tab */}
                    <TabsContent value="logos">
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle>Logos</CardTitle>
                                        <CardDescription>Gerencie as variações do seu logo</CardDescription>
                                    </div>
                                    <Button>
                                        <Upload className="w-4 h-4 mr-2" />
                                        Upload Logo
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {logos.map(logo => (
                                        <Card key={logo.id} className="overflow-hidden">
                                            <div className="h-40 bg-gray-100 flex items-center justify-center">
                                                <span className="text-6xl">{logo.url}</span>
                                            </div>
                                            <CardContent className="p-4">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="font-medium">{logo.name}</span>
                                                    <Badge variant="outline">{logo.variant}</Badge>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button variant="outline" size="sm" className="flex-1">
                                                        <Download className="w-4 h-4 mr-1" />
                                                        PNG
                                                    </Button>
                                                    <Button variant="outline" size="sm" className="flex-1">
                                                        <Download className="w-4 h-4 mr-1" />
                                                        SVG
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}

                                    {/* Upload placeholder */}
                                    <Card className="border-2 border-dashed border-gray-300 hover:border-purple-400 transition-colors cursor-pointer">
                                        <CardContent className="h-full flex flex-col items-center justify-center p-8">
                                            <Upload className="w-12 h-12 text-gray-400 mb-4" />
                                            <p className="text-gray-500 text-center">
                                                Arraste ou clique para<br />fazer upload
                                            </p>
                                        </CardContent>
                                    </Card>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}
