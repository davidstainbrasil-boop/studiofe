'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card'
import { Button } from '@components/ui/button'
import { Badge } from '@components/ui/badge'
import { Input } from '@components/ui/input'
import { Label } from '@components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@components/ui/tabs'
import { Switch } from '@components/ui/switch'
import { Slider } from '@components/ui/slider'
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
    Pipette,
    Save,
    Loader2,
    RefreshCw
} from 'lucide-react'
import { toast } from 'sonner'
import { useBrandKit, type BrandColors } from '@/hooks/use-brand-kit'

// Local types for UI
interface UIBrandColor {
    id: string
    name: string
    key: keyof BrandColors
    hex: string
}

interface UIBrandFont {
    id: string
    name: string
    key: 'heading' | 'body'
    family: string
}

export default function BrandKitPage() {
    // Real API Hook
    const {
        brandKit,
        isLoading,
        isSaving,
        error,
        saveBrandKit,
        updateColors,
        updateFonts,
        updateLogo,
        updateWatermark,
        fetchBrandKit
    } = useBrandKit()
    
    const [copiedId, setCopiedId] = useState<string | null>(null)
    const [brandName, setBrandName] = useState(brandKit?.name || 'Minha Marca')
    
    // Update brand name when kit loads
    React.useEffect(() => {
        if (brandKit?.name) {
            setBrandName(brandKit.name)
        }
    }, [brandKit?.name])

    // Transform API colors to UI format
    const colors: UIBrandColor[] = brandKit ? [
        { id: '1', name: 'Primary', key: 'primary', hex: brandKit.colors.primary },
        { id: '2', name: 'Secondary', key: 'secondary', hex: brandKit.colors.secondary },
        { id: '3', name: 'Accent', key: 'accent', hex: brandKit.colors.accent },
        { id: '4', name: 'Background', key: 'background', hex: brandKit.colors.background },
        { id: '5', name: 'Text', key: 'text', hex: brandKit.colors.text }
    ] : []

    // Transform API fonts to UI format
    const fonts: UIBrandFont[] = brandKit ? [
        { id: '1', name: 'Título', key: 'heading', family: brandKit.fonts.heading },
        { id: '2', name: 'Corpo', key: 'body', family: brandKit.fonts.body }
    ] : []

    const copyColor = (hex: string, id: string) => {
        navigator.clipboard.writeText(hex)
        setCopiedId(id)
        setTimeout(() => setCopiedId(null), 2000)
        toast.success(`Cor ${hex} copiada!`)
    }

    const handleColorChange = (key: keyof BrandColors, hex: string) => {
        updateColors({ [key]: hex })
    }
    
    const handleFontChange = (key: 'heading' | 'body', family: string) => {
        updateFonts({ [key]: family })
    }
    
    const handleSave = async () => {
        if (!brandKit) return
        
        await saveBrandKit({
            name: brandName,
            logo: brandKit.logo || undefined,
            colors: brandKit.colors,
            fonts: brandKit.fonts,
            watermark: brandKit.watermark
        })
    }
    
    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
                    <p className="text-gray-600">Carregando Brand Kit...</p>
                </div>
            </div>
        )
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
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={fetchBrandKit} disabled={isLoading}>
                                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                                Recarregar
                            </Button>
                            <Button onClick={handleSave} disabled={isSaving}>
                                {isSaving ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Save className="w-4 h-4 mr-2" />
                                )}
                                Salvar
                            </Button>
                        </div>
                    </div>
                    
                    {/* Brand Name Input */}
                    <div className="mt-4">
                        <Label htmlFor="brandName">Nome da Marca</Label>
                        <Input 
                            id="brandName"
                            value={brandName}
                            onChange={(e) => setBrandName(e.target.value)}
                            className="max-w-md mt-1"
                            placeholder="Digite o nome da sua marca"
                        />
                    </div>
                </div>

                <Tabs defaultValue="colors" className="space-y-6">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="colors">
                            <Pipette className="w-4 h-4 mr-2" />
                            Cores
                        </TabsTrigger>
                        <TabsTrigger value="fonts">
                            <Type className="w-4 h-4 mr-2" />
                            Fontes
                        </TabsTrigger>
                        <TabsTrigger value="logo">
                            <Image className="w-4 h-4 mr-2" />
                            Logo
                        </TabsTrigger>
                        <TabsTrigger value="watermark">
                            <Image className="w-4 h-4 mr-2" />
                            Marca d'água
                        </TabsTrigger>
                    </TabsList>

                    {/* Colors Tab */}
                    <TabsContent value="colors">
                        <Card>
                            <CardHeader>
                                <CardTitle>Paleta de Cores</CardTitle>
                                <CardDescription>Defina as cores principais da sua marca (salvas na nuvem)</CardDescription>
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
                                                    <Label className="font-medium mb-1 block">{color.name}</Label>
                                                    <div className="flex items-center gap-2">
                                                        <Input
                                                            type="color"
                                                            value={color.hex}
                                                            onChange={(e) => handleColorChange(color.key, e.target.value)}
                                                            className="w-10 h-8 p-0 border-0"
                                                        />
                                                        <code className="text-sm text-gray-600">{color.hex}</code>
                                                    </div>
                                                </div>
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => copyColor(color.hex, color.id)}
                                                className="w-full"
                                            >
                                                {copiedId === color.id ? (
                                                    <Check className="w-4 h-4 mr-1" />
                                                ) : (
                                                    <Copy className="w-4 h-4 mr-1" />
                                                )}
                                                Copiar
                                            </Button>
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
                                <CardTitle>Tipografia</CardTitle>
                                <CardDescription>Configure as fontes da sua marca</CardDescription>
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
                                            </div>
                                            <div
                                                className="text-2xl mb-4"
                                                style={{ fontFamily: font.family }}
                                            >
                                                The quick brown fox jumps over the lazy dog
                                            </div>
                                            <div>
                                                <Label>Família da Fonte</Label>
                                                <select 
                                                    className="w-full mt-1 px-3 py-2 border rounded-md"
                                                    value={font.family}
                                                    onChange={(e) => handleFontChange(font.key, e.target.value)}
                                                >
                                                    <option value="Inter">Inter</option>
                                                    <option value="Roboto">Roboto</option>
                                                    <option value="Open Sans">Open Sans</option>
                                                    <option value="Montserrat">Montserrat</option>
                                                    <option value="Poppins">Poppins</option>
                                                    <option value="Lato">Lato</option>
                                                    <option value="Arial">Arial</option>
                                                </select>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Logo Tab */}
                    <TabsContent value="logo">
                        <Card>
                            <CardHeader>
                                <CardTitle>Logo</CardTitle>
                                <CardDescription>Faça upload do logo da sua marca</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Current Logo */}
                                    {brandKit?.logo ? (
                                        <Card className="overflow-hidden">
                                            <div className="h-40 bg-gray-100 flex items-center justify-center">
                                                <img 
                                                    src={brandKit.logo.url} 
                                                    alt="Logo"
                                                    className="max-h-full max-w-full object-contain"
                                                />
                                            </div>
                                            <CardContent className="p-4">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="font-medium">Logo Atual</span>
                                                    <Badge variant="outline">
                                                        {brandKit.logo.width}x{brandKit.logo.height}
                                                    </Badge>
                                                </div>
                                                <Button 
                                                    variant="outline" 
                                                    size="sm" 
                                                    className="w-full"
                                                    onClick={() => updateLogo(null)}
                                                >
                                                    <Trash2 className="w-4 h-4 mr-1" />
                                                    Remover
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    ) : null}

                                    {/* Upload placeholder */}
                                    <Card className="border-2 border-dashed border-gray-300 hover:border-purple-400 transition-colors cursor-pointer">
                                        <CardContent className="h-full flex flex-col items-center justify-center p-8 min-h-[200px]">
                                            <Upload className="w-12 h-12 text-gray-400 mb-4" />
                                            <p className="text-gray-500 text-center">
                                                Arraste ou clique para<br />fazer upload do logo
                                            </p>
                                            <p className="text-xs text-gray-400 mt-2">PNG, SVG ou JPG</p>
                                        </CardContent>
                                    </Card>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Watermark Tab */}
                    <TabsContent value="watermark">
                        <Card>
                            <CardHeader>
                                <CardTitle>Marca d'água</CardTitle>
                                <CardDescription>Configure a marca d'água para seus vídeos</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label>Ativar Marca d'água</Label>
                                        <p className="text-sm text-gray-500">Adiciona automaticamente aos vídeos exportados</p>
                                    </div>
                                    <Switch 
                                        checked={brandKit?.watermark.enabled || false}
                                        onCheckedChange={(checked) => updateWatermark({ enabled: checked })}
                                    />
                                </div>
                                
                                {brandKit?.watermark.enabled && (
                                    <>
                                        <div>
                                            <Label>Posição</Label>
                                            <select 
                                                className="w-full mt-1 px-3 py-2 border rounded-md"
                                                value={brandKit.watermark.position}
                                                onChange={(e) => updateWatermark({ 
                                                    position: e.target.value as 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' 
                                                })}
                                            >
                                                <option value="top-left">Superior Esquerdo</option>
                                                <option value="top-right">Superior Direito</option>
                                                <option value="bottom-left">Inferior Esquerdo</option>
                                                <option value="bottom-right">Inferior Direito</option>
                                            </select>
                                        </div>
                                        
                                        <div>
                                            <Label>Opacidade: {Math.round(brandKit.watermark.opacity * 100)}%</Label>
                                            <Slider 
                                                value={[brandKit.watermark.opacity * 100]}
                                                min={10}
                                                max={100}
                                                step={5}
                                                onValueChange={([v]) => updateWatermark({ opacity: v / 100 })}
                                                className="mt-2"
                                            />
                                        </div>
                                        
                                        <div>
                                            <Label>Tamanho: {brandKit.watermark.size}px</Label>
                                            <Slider 
                                                value={[brandKit.watermark.size]}
                                                min={32}
                                                max={200}
                                                step={8}
                                                onValueChange={([v]) => updateWatermark({ size: v })}
                                                className="mt-2"
                                            />
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
                
                {/* Error Display */}
                {error && (
                    <Card className="mt-6 bg-red-50 border-red-200">
                        <CardContent className="p-4 text-red-600">
                            {error}
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}
