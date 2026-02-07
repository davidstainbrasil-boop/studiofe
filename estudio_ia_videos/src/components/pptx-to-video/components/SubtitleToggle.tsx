/**
 * SubtitleToggle - Toggle de legendas com preview de estilo
 */
'use client';

import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Subtitles, Check, Eye } from 'lucide-react';

interface SubtitleToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  style: 'default' | 'netflix' | 'minimal' | 'bold';
  onStyleChange: (style: 'default' | 'netflix' | 'minimal' | 'bold') => void;
}

const SUBTITLE_STYLES = [
  {
    id: 'default' as const,
    name: 'Padrão',
    description: 'Branco com borda preta',
    previewBg: 'bg-transparent',
    previewText: 'text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]',
    previewBorder: 'border-none',
  },
  {
    id: 'netflix' as const,
    name: 'Netflix',
    description: 'Fundo semi-transparente',
    previewBg: 'bg-black/75',
    previewText: 'text-white',
    previewBorder: 'border-none',
  },
  {
    id: 'minimal' as const,
    name: 'Minimal',
    description: 'Sem borda, apenas texto',
    previewBg: 'bg-transparent',
    previewText: 'text-white/90',
    previewBorder: 'border-none',
  },
  {
    id: 'bold' as const,
    name: 'Bold',
    description: 'Fonte maior para apresentações',
    previewBg: 'bg-black/60',
    previewText: 'text-white font-bold text-lg',
    previewBorder: 'border-2 border-white/20',
  },
];

export function SubtitleToggle({
  enabled,
  onToggle,
  style,
  onStyleChange,
}: SubtitleToggleProps) {
  return (
    <div className="space-y-6">
      {/* Main Toggle */}
      <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center">
            <Subtitles className="w-5 h-5 text-cyan-600" />
          </div>
          <div>
            <Label htmlFor="subtitles-toggle" className="text-base font-medium cursor-pointer">
              Legendas Automáticas
            </Label>
            <p className="text-sm text-muted-foreground">
              Gerar legendas sincronizadas com a narração
            </p>
          </div>
        </div>
        <Switch
          id="subtitles-toggle"
          checked={enabled}
          onCheckedChange={onToggle}
        />
      </div>

      {/* Style Selection - only visible when enabled */}
      {enabled && (
        <div className="space-y-4">
          <div className="text-sm font-medium">Estilo das Legendas</div>

          <RadioGroup
            value={style}
            onValueChange={(v) => onStyleChange(v as typeof style)}
            className="grid grid-cols-2 gap-4"
          >
            {SUBTITLE_STYLES.map((subtitleStyle) => (
              <div key={subtitleStyle.id}>
                <RadioGroupItem
                  value={subtitleStyle.id}
                  id={`style-${subtitleStyle.id}`}
                  className="peer sr-only"
                />
                <Label
                  htmlFor={`style-${subtitleStyle.id}`}
                  className={cn(
                    'flex flex-col cursor-pointer rounded-lg border-2 overflow-hidden transition-all',
                    'hover:border-muted-foreground/50',
                    'peer-data-[state=checked]:border-blue-500 peer-data-[state=checked]:ring-2 peer-data-[state=checked]:ring-blue-500/20'
                  )}
                >
                  {/* Preview Area */}
                  <div className="aspect-video bg-gradient-to-br from-gray-700 to-gray-900 relative flex items-end justify-center p-3">
                    {/* Simulated video frame */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-30">
                      <Eye className="w-8 h-8 text-white" />
                    </div>

                    {/* Subtitle Preview */}
                    <div
                      className={cn(
                        'px-3 py-1.5 rounded text-center text-sm',
                        subtitleStyle.previewBg,
                        subtitleStyle.previewText,
                        subtitleStyle.previewBorder
                      )}
                    >
                      Esta é uma legenda de exemplo
                    </div>

                    {/* Selected Indicator */}
                    {style === subtitleStyle.id && (
                      <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-3 bg-card">
                    <div className="font-medium text-sm">{subtitleStyle.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {subtitleStyle.description}
                    </div>
                  </div>
                </Label>
              </div>
            ))}
          </RadioGroup>

          {/* Additional Info */}
          <div className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Subtitles className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-foreground mb-1">Legendas Burn-in</p>
                <p>
                  As legendas serão embutidas diretamente no vídeo para máxima
                  compatibilidade. Também disponibilizamos o arquivo SRT separado
                  para plataformas que suportam legendas externas.
                </p>
              </div>
            </div>
          </div>

          {/* Features List */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              { label: 'Sincronização automática', description: 'Com a narração' },
              { label: 'Múltiplos formatos', description: 'SRT, VTT, ASS' },
              { label: 'Estilo personalizado', description: 'Cores e fontes' },
              { label: 'Edição posterior', description: 'Arquivo editável' },
            ].map((feature) => (
              <div
                key={feature.label}
                className="flex items-center gap-2 p-2 rounded-lg bg-green-50 dark:bg-green-950/20"
              >
                <Check className="w-4 h-4 text-green-600 shrink-0" />
                <div>
                  <div className="font-medium text-green-700 dark:text-green-400">
                    {feature.label}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {feature.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Disabled State Info */}
      {!enabled && (
        <div className="text-sm text-muted-foreground text-center py-4">
          Ative as legendas para configurar o estilo
        </div>
      )}
    </div>
  );
}
