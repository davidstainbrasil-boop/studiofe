'use client';

/**
 * Brand Kit Component
 * 
 * Allows users to define and manage brand identity:
 * - Logo upload
 * - Brand colors
 * - Fonts
 * - Watermark settings
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Palette,
  Type,
  Image,
  Upload,
  X,
  Plus,
  Check,
  Eye,
  EyeOff,
  Trash2,
  Settings2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Types
export interface BrandKit {
  id: string;
  name: string;
  logo?: {
    url: string;
    width: number;
    height: number;
  };
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
  watermark: {
    enabled: boolean;
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    opacity: number;
    size: number;
  };
}

interface BrandKitEditorProps {
  brandKit: BrandKit;
  onChange: (brandKit: BrandKit) => void;
  onSave?: () => Promise<void>;
  className?: string;
}

// Available fonts
const AVAILABLE_FONTS = [
  { value: 'Inter', label: 'Inter' },
  { value: 'Roboto', label: 'Roboto' },
  { value: 'Open Sans', label: 'Open Sans' },
  { value: 'Montserrat', label: 'Montserrat' },
  { value: 'Poppins', label: 'Poppins' },
  { value: 'Lato', label: 'Lato' },
  { value: 'Nunito', label: 'Nunito' },
  { value: 'Source Sans Pro', label: 'Source Sans Pro' },
];

export function BrandKitEditor({
  brandKit,
  onChange,
  onSave,
  className,
}: BrandKitEditorProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  const updateBrandKit = useCallback((updates: Partial<BrandKit>) => {
    onChange({ ...brandKit, ...updates });
  }, [brandKit, onChange]);

  const updateColors = useCallback((colorKey: keyof BrandKit['colors'], value: string) => {
    onChange({
      ...brandKit,
      colors: { ...brandKit.colors, [colorKey]: value },
    });
  }, [brandKit, onChange]);

  const updateFonts = useCallback((fontKey: keyof BrandKit['fonts'], value: string) => {
    onChange({
      ...brandKit,
      fonts: { ...brandKit.fonts, [fontKey]: value },
    });
  }, [brandKit, onChange]);

  const updateWatermark = useCallback((updates: Partial<BrandKit['watermark']>) => {
    onChange({
      ...brandKit,
      watermark: { ...brandKit.watermark, ...updates },
    });
  }, [brandKit, onChange]);

  const handleLogoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, envie uma imagem');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 5MB');
      return;
    }

    // Create preview URL
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      updateBrandKit({
        logo: {
          url,
          width: img.width,
          height: img.height,
        },
      });
    };
    img.src = url;
  }, [updateBrandKit]);

  const handleSave = async () => {
    if (!onSave) return;
    
    try {
      setIsSaving(true);
      await onSave();
      toast.success('Brand Kit salvo com sucesso!');
    } catch (error) {
      toast.error('Erro ao salvar Brand Kit');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Palette className="w-5 h-5 text-violet-600" />
            Brand Kit
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Configure a identidade visual dos seus vídeos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPreviewMode(!previewMode)}
          >
            {previewMode ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
            {previewMode ? 'Editar' : 'Preview'}
          </Button>
          {onSave && (
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Salvando...' : 'Salvar'}
            </Button>
          )}
        </div>
      </div>

      {previewMode ? (
        <BrandKitPreview brandKit={brandKit} />
      ) : (
        <Tabs defaultValue="logo" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="logo">
              <Image className="w-4 h-4 mr-2" />
              Logo
            </TabsTrigger>
            <TabsTrigger value="colors">
              <Palette className="w-4 h-4 mr-2" />
              Cores
            </TabsTrigger>
            <TabsTrigger value="fonts">
              <Type className="w-4 h-4 mr-2" />
              Fontes
            </TabsTrigger>
            <TabsTrigger value="watermark">
              <Settings2 className="w-4 h-4 mr-2" />
              Marca d&apos;água
            </TabsTrigger>
          </TabsList>

          {/* Logo Tab */}
          <TabsContent value="logo" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Logo da Empresa</CardTitle>
                <CardDescription>
                  Faça upload do logo para usar nos vídeos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {brandKit.logo ? (
                  <div className="relative inline-block">
                    <img
                      src={brandKit.logo.url}
                      alt="Logo"
                      className="max-w-[200px] max-h-[100px] object-contain border rounded-lg"
                    />
                    <button
                      onClick={() => updateBrandKit({ logo: undefined })}
                      className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                    <Upload className="w-8 h-8 text-slate-400 mb-2" />
                    <span className="text-sm text-slate-500">Clique para enviar</span>
                    <span className="text-xs text-slate-400 mt-1">PNG, JPG, SVG até 5MB</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoUpload}
                    />
                  </label>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Colors Tab */}
          <TabsContent value="colors" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Paleta de Cores</CardTitle>
                <CardDescription>
                  Defina as cores da sua marca
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                {(Object.keys(brandKit.colors) as Array<keyof BrandKit['colors']>).map((colorKey) => (
                  <div key={colorKey} className="flex items-center gap-4">
                    <Label className="w-32 capitalize">
                      {colorKey === 'primary' ? 'Primária' :
                       colorKey === 'secondary' ? 'Secundária' :
                       colorKey === 'accent' ? 'Destaque' :
                       colorKey === 'background' ? 'Fundo' : 'Texto'}
                    </Label>
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="color"
                        value={brandKit.colors[colorKey]}
                        onChange={(e) => updateColors(colorKey, e.target.value)}
                        className="w-10 h-10 rounded cursor-pointer border-0"
                      />
                      <Input
                        value={brandKit.colors[colorKey]}
                        onChange={(e) => updateColors(colorKey, e.target.value)}
                        className="font-mono w-28"
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Fonts Tab */}
          <TabsContent value="fonts" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Tipografia</CardTitle>
                <CardDescription>
                  Escolha as fontes para títulos e corpo de texto
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Fonte de Títulos</Label>
                  <Select
                    value={brandKit.fonts.heading}
                    onValueChange={(v) => updateFonts('heading', v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AVAILABLE_FONTS.map((font) => (
                        <SelectItem key={font.value} value={font.value}>
                          <span style={{ fontFamily: font.value }}>{font.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p
                    className="text-2xl font-bold mt-2"
                    style={{ fontFamily: brandKit.fonts.heading }}
                  >
                    Exemplo de Título
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Fonte de Corpo</Label>
                  <Select
                    value={brandKit.fonts.body}
                    onValueChange={(v) => updateFonts('body', v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AVAILABLE_FONTS.map((font) => (
                        <SelectItem key={font.value} value={font.value}>
                          <span style={{ fontFamily: font.value }}>{font.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p
                    className="text-base mt-2"
                    style={{ fontFamily: brandKit.fonts.body }}
                  >
                    Este é um exemplo de texto para o corpo do conteúdo.
                    A fonte escolhida será usada em descrições e narrações.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Watermark Tab */}
          <TabsContent value="watermark" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Marca d&apos;água</CardTitle>
                <CardDescription>
                  Configure como o logo aparece nos vídeos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Ativar marca d&apos;água</Label>
                    <p className="text-sm text-slate-500">
                      Exibir logo em todos os vídeos
                    </p>
                  </div>
                  <Switch
                    checked={brandKit.watermark.enabled}
                    onCheckedChange={(checked) => updateWatermark({ enabled: checked })}
                  />
                </div>

                {brandKit.watermark.enabled && (
                  <>
                    <div className="space-y-2">
                      <Label>Posição</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { value: 'top-left', label: '↖ Superior Esquerdo' },
                          { value: 'top-right', label: '↗ Superior Direito' },
                          { value: 'bottom-left', label: '↙ Inferior Esquerdo' },
                          { value: 'bottom-right', label: '↘ Inferior Direito' },
                        ].map((pos) => (
                          <button
                            key={pos.value}
                            onClick={() => updateWatermark({ position: pos.value as BrandKit['watermark']['position'] })}
                            className={cn(
                              'p-3 rounded-lg border-2 text-sm transition-all',
                              brandKit.watermark.position === pos.value
                                ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/30'
                                : 'border-slate-200 hover:border-violet-300'
                            )}
                          >
                            {pos.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Opacidade: {Math.round(brandKit.watermark.opacity * 100)}%</Label>
                      <Slider
                        value={[brandKit.watermark.opacity]}
                        min={0.1}
                        max={1}
                        step={0.1}
                        onValueChange={([v]) => updateWatermark({ opacity: v })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Tamanho: {brandKit.watermark.size}px</Label>
                      <Slider
                        value={[brandKit.watermark.size]}
                        min={32}
                        max={200}
                        step={8}
                        onValueChange={([v]) => updateWatermark({ size: v })}
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

// Brand Kit Preview Component
function BrandKitPreview({ brandKit }: { brandKit: BrandKit }) {
  return (
    <div
      className="relative aspect-video rounded-lg overflow-hidden"
      style={{ backgroundColor: brandKit.colors.background }}
    >
      {/* Sample Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
        <h1
          className="text-3xl font-bold mb-4"
          style={{
            fontFamily: brandKit.fonts.heading,
            color: brandKit.colors.primary,
          }}
        >
          Título do Vídeo
        </h1>
        <p
          className="text-center max-w-md"
          style={{
            fontFamily: brandKit.fonts.body,
            color: brandKit.colors.text,
          }}
        >
          Este é um exemplo de como seu vídeo ficará com as configurações
          de marca atuais.
        </p>
        <div className="flex gap-3 mt-6">
          <span
            className="px-4 py-2 rounded-full text-white text-sm"
            style={{ backgroundColor: brandKit.colors.primary }}
          >
            Botão Primário
          </span>
          <span
            className="px-4 py-2 rounded-full text-white text-sm"
            style={{ backgroundColor: brandKit.colors.secondary }}
          >
            Botão Secundário
          </span>
          <span
            className="px-4 py-2 rounded-full text-white text-sm"
            style={{ backgroundColor: brandKit.colors.accent }}
          >
            Destaque
          </span>
        </div>
      </div>

      {/* Watermark */}
      {brandKit.watermark.enabled && brandKit.logo && (
        <div
          className={cn(
            'absolute p-4',
            brandKit.watermark.position === 'top-left' && 'top-0 left-0',
            brandKit.watermark.position === 'top-right' && 'top-0 right-0',
            brandKit.watermark.position === 'bottom-left' && 'bottom-0 left-0',
            brandKit.watermark.position === 'bottom-right' && 'bottom-0 right-0'
          )}
        >
          <img
            src={brandKit.logo.url}
            alt="Watermark"
            style={{
              opacity: brandKit.watermark.opacity,
              width: brandKit.watermark.size,
              height: 'auto',
            }}
          />
        </div>
      )}
    </div>
  );
}

export default BrandKitEditor;
