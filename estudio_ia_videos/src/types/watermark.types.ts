
import { z } from 'zod';

// Enum para posições da marca d'água
export const WatermarkPositionEnum = z.enum([
  'top-left', 'top-center', 'top-right',
  'center-left', 'center', 'center-right',
  'bottom-left', 'bottom-center', 'bottom-right'
]);

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
