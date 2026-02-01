'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Code,
  Copy,
  Check,
  Monitor,
  Smartphone,
  Tablet,
  Settings,
  ExternalLink,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface EmbedGeneratorProps {
  videoId: string;
  videoUrl: string;
  title?: string;
  thumbnailUrl?: string;
  className?: string;
}

export function EmbedGenerator({
  videoId,
  videoUrl,
  title = 'Vídeo de Treinamento',
  thumbnailUrl,
  className,
}: EmbedGeneratorProps) {
  const [embedType, setEmbedType] = useState<'html' | 'iframe' | 'wordpress'>('iframe');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [copied, setCopied] = useState(false);
  
  // Embed options
  const [options, setOptions] = useState({
    responsive: true,
    autoplay: false,
    controls: true,
    loop: false,
    muted: false,
    width: 640,
    height: 360,
  });

  const baseUrl = typeof window !== 'undefined' 
    ? window.location.origin 
    : process.env.NEXT_PUBLIC_APP_URL || '';

  // Generate embed codes
  const generateHtmlEmbed = () => {
    const videoAttrs = [
      options.controls ? 'controls' : '',
      options.autoplay ? 'autoplay' : '',
      options.loop ? 'loop' : '',
      options.muted ? 'muted' : '',
      thumbnailUrl ? `poster="${thumbnailUrl}"` : '',
      'playsinline',
      `title="${title}"`,
    ].filter(Boolean).join(' ');

    const wrapperStyle = options.responsive
      ? 'position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%;'
      : `width: ${options.width}px; height: ${options.height}px;`;

    const videoStyle = options.responsive
      ? 'position: absolute; top: 0; left: 0; width: 100%; height: 100%;'
      : 'width: 100%; height: 100%;';

    return `<div class="estudio-ia-video" style="${wrapperStyle}">
  <video ${videoAttrs} style="${videoStyle}">
    <source src="${videoUrl}" type="video/mp4">
  </video>
</div>`;
  };

  const generateIframeEmbed = () => {
    const embedUrl = `${baseUrl}/embed/${videoId}${options.autoplay ? '?autoplay=1' : ''}`;

    if (options.responsive) {
      return `<div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden;">
  <iframe 
    src="${embedUrl}" 
    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;"
    allowfullscreen
    allow="autoplay; fullscreen"
  ></iframe>
</div>`;
    }

    return `<iframe 
  src="${embedUrl}" 
  width="${options.width}" 
  height="${options.height}" 
  frameborder="0" 
  allowfullscreen
></iframe>`;
  };

  const generateWordPressShortcode = () => {
    return `[estudio_ia_video id="${videoId}" autoplay="${options.autoplay}" controls="${options.controls}"]`;
  };

  const getEmbedCode = () => {
    switch (embedType) {
      case 'html':
        return generateHtmlEmbed();
      case 'iframe':
        return generateIframeEmbed();
      case 'wordpress':
        return generateWordPressShortcode();
      default:
        return '';
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(getEmbedCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Preview dimensions based on device
  const previewDimensions = {
    desktop: { width: '100%', maxWidth: '640px' },
    tablet: { width: '100%', maxWidth: '480px' },
    mobile: { width: '100%', maxWidth: '320px' },
  };

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Code className="w-5 h-5 text-violet-600" />
          Gerar Código de Embed
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Embed Type Selection */}
        <Tabs value={embedType} onValueChange={(v) => setEmbedType(v as any)}>
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="iframe">
              <Code className="w-4 h-4 mr-1" />
              iframe
            </TabsTrigger>
            <TabsTrigger value="html">
              <Code className="w-4 h-4 mr-1" />
              HTML
            </TabsTrigger>
            <TabsTrigger value="wordpress">
              <Code className="w-4 h-4 mr-1" />
              WordPress
            </TabsTrigger>
          </TabsList>

          <TabsContent value="iframe" className="mt-4">
            <p className="text-sm text-slate-600">
              Iframe é a opção mais segura e compatível com a maioria das plataformas.
            </p>
          </TabsContent>

          <TabsContent value="html" className="mt-4">
            <p className="text-sm text-slate-600">
              HTML direto para total controle sobre o player de vídeo.
            </p>
          </TabsContent>

          <TabsContent value="wordpress" className="mt-4">
            <p className="text-sm text-slate-600">
              Shortcode para uso com o plugin Estúdio IA para WordPress.
            </p>
          </TabsContent>
        </Tabs>

        {/* Options */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-4">
            <Label className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Opções
            </Label>

            <div className="flex items-center justify-between">
              <Label htmlFor="responsive" className="text-sm font-normal">
                Responsivo (ajusta ao container)
              </Label>
              <Switch
                id="responsive"
                checked={options.responsive}
                onCheckedChange={(checked) =>
                  setOptions({ ...options, responsive: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="autoplay" className="text-sm font-normal">
                Autoplay (pode ser bloqueado)
              </Label>
              <Switch
                id="autoplay"
                checked={options.autoplay}
                onCheckedChange={(checked) =>
                  setOptions({ ...options, autoplay: checked, muted: checked || options.muted })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="controls" className="text-sm font-normal">
                Mostrar controles
              </Label>
              <Switch
                id="controls"
                checked={options.controls}
                onCheckedChange={(checked) =>
                  setOptions({ ...options, controls: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="loop" className="text-sm font-normal">
                Loop (repetir)
              </Label>
              <Switch
                id="loop"
                checked={options.loop}
                onCheckedChange={(checked) =>
                  setOptions({ ...options, loop: checked })
                }
              />
            </div>
          </div>

          {!options.responsive && (
            <div className="space-y-4">
              <Label>Dimensões fixas</Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="width" className="text-xs">
                    Largura (px)
                  </Label>
                  <Input
                    id="width"
                    type="number"
                    value={options.width}
                    onChange={(e) =>
                      setOptions({ ...options, width: parseInt(e.target.value) || 640 })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="height" className="text-xs">
                    Altura (px)
                  </Label>
                  <Input
                    id="height"
                    type="number"
                    value={options.height}
                    onChange={(e) =>
                      setOptions({ ...options, height: parseInt(e.target.value) || 360 })
                    }
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Preview */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Preview</Label>
            <div className="flex gap-1">
              <Button
                variant={previewDevice === 'desktop' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPreviewDevice('desktop')}
              >
                <Monitor className="w-4 h-4" />
              </Button>
              <Button
                variant={previewDevice === 'tablet' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPreviewDevice('tablet')}
              >
                <Tablet className="w-4 h-4" />
              </Button>
              <Button
                variant={previewDevice === 'mobile' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPreviewDevice('mobile')}
              >
                <Smartphone className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="bg-slate-100 rounded-lg p-4 flex justify-center">
            <div
              style={previewDimensions[previewDevice]}
              className="transition-all duration-300"
            >
              <div className="relative bg-slate-900 rounded-lg overflow-hidden aspect-video">
                <video
                  src={videoUrl}
                  poster={thumbnailUrl}
                  controls={options.controls}
                  loop={options.loop}
                  muted={options.muted || options.autoplay}
                  autoPlay={options.autoplay}
                  playsInline
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Code Output */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Código para copiar</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className={cn(copied && 'bg-green-50 text-green-600 border-green-200')}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-1" />
                  Copiado!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-1" />
                  Copiar
                </>
              )}
            </Button>
          </div>

          <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-sm overflow-x-auto">
            <code>{getEmbedCode()}</code>
          </pre>
        </div>

        {/* Additional Actions */}
        <div className="flex gap-2 pt-2 border-t">
          <Button variant="outline" size="sm" asChild>
            <a href={videoUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-1" />
              Abrir vídeo
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={videoUrl} download>
              <Download className="w-4 h-4 mr-1" />
              Baixar MP4
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
