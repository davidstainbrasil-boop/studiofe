
import { z } from 'zod';

// Enum para posições da marca d'água
export const WatermarkPositionEnum = z.enum([
  'top-left', 'top-center', 'top-right',
  'center-left', 'center', 'center-right',
  'bottom-left', 'bottom-center', 'bottom-right'
]);

// Alias for compatibility
export type WatermarkPosition = z.infer<typeof WatermarkPositionEnum>;

// Runtime array of positions for iteration
export const WatermarkPositionValues: WatermarkPosition[] = [
  'top-left', 'top-center', 'top-right',
  'center-left', 'center', 'center-right',
  'bottom-left', 'bottom-center', 'bottom-right'
];

// Watermark types
export type WatermarkType = 'image' | 'text' | 'logo';

// Runtime array of watermark types
export const WatermarkTypeValues: WatermarkType[] = ['image', 'text', 'logo'];

// Animation types
export type WatermarkAnimation = 'none' | 'fade-in' | 'slide-in' | 'pulse';

// Runtime array of animation types
export const WatermarkAnimationValues: WatermarkAnimation[] = ['none', 'fade-in', 'slide-in', 'pulse'];

// Text style configuration
export interface TextWatermarkStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  color: string;
  textShadow?: string;
}

// Padding configuration
export interface WatermarkPadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

// Image watermark config
export interface ImageWatermarkConfig {
  id?: string;
  name?: string;
  description?: string;
  type: 'image';
  url: string;
  position: WatermarkPosition;
  scale: number;
  opacity: number;
  margin: number;
  animation?: WatermarkAnimation;
}

// Text watermark config
export interface TextWatermarkConfig {
  id?: string;
  name?: string;
  description?: string;
  type: 'text';
  text: string;
  position: WatermarkPosition;
  style: TextWatermarkStyle;
  opacity: number;
  margin: number;
  animation?: WatermarkAnimation;
}

// Combined watermark config
export type WatermarkConfig = ImageWatermarkConfig | TextWatermarkConfig;

// Default text style
export const DEFAULT_TEXT_STYLE: TextWatermarkStyle = {
  fontFamily: 'Inter, sans-serif',
  fontSize: 24,
  fontWeight: '600',
  color: '#ffffff',
  textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
};

// Default padding
export const DEFAULT_PADDING: WatermarkPadding = {
  top: 20,
  right: 20,
  bottom: 20,
  left: 20
};

// Default watermark presets
export const DEFAULT_WATERMARK_PRESETS: WatermarkConfig[] = [
  {
    id: 'preset-copyright',
    name: 'Copyright Padrão',
    description: 'Marca de copyright no canto inferior direito',
    type: 'text',
    text: '© TécnicoCursos',
    position: 'bottom-right',
    style: DEFAULT_TEXT_STYLE,
    opacity: 0.8,
    margin: 20
  },
  {
    id: 'preset-confidential',
    name: 'Material Confidencial',
    description: 'Marca d\'água centralizada semi-transparente',
    type: 'text',
    text: 'Material Confidencial',
    position: 'center',
    style: { ...DEFAULT_TEXT_STYLE, fontSize: 48, color: 'rgba(255,255,255,0.3)' },
    opacity: 0.5,
    margin: 0
  }
];

// Esquema para as configurações da marca d'água
export const WatermarkSettingsSchema = z.object({
  imageUrl: z.string().url({ message: "A URL da imagem da marca d'água deve ser válida." }),
  position: WatermarkPositionEnum.default('bottom-right'),
  scale: z.number().min(0.1).max(1.0).default(0.2),
  opacity: z.number().min(0.1).max(1.0).default(0.8),
  margin: z.number().min(0).default(10),
});

// Tipo inferido do esquema Zod
export type WatermarkSettings = z.infer<typeof WatermarkSettingsSchema>;
