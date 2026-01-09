/**
 * 🎨 PPTX Theme Parser
 * 
 * Parser para extrair informações de tema de arquivos PPTX:
 * - Cores do tema (accent1-6, dk1, dk2, lt1, lt2)
 * - Fontes (heading, body)
 * - Background styles
 */

import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';
import { logger } from '@lib/logger';

// ===== TIPOS =====

export interface ThemeColor {
  name: string;
  value: string;
  rgb?: string;
}

export interface ThemeFont {
  typeface: string;
  panose?: string;
  pitchFamily?: number;
  charset?: number;
}

export interface ThemeFonts {
  majorFont: ThemeFont;  // Heading font
  minorFont: ThemeFont;  // Body font
}

export interface ThemeBackground {
  type: 'solid' | 'gradient' | 'image' | 'pattern';
  color?: string;
  gradientStops?: Array<{ position: number; color: string }>;
}

export interface PPTXTheme {
  name: string;
  colors: ThemeColor[];
  fonts: ThemeFonts;
  background?: ThemeBackground;
  colorScheme: {
    dark1: string;
    light1: string;
    dark2: string;
    light2: string;
    accent1: string;
    accent2: string;
    accent3: string;
    accent4: string;
    accent5: string;
    accent6: string;
    hyperlink: string;
    followedHyperlink: string;
  };
}

export interface ThemeExtractionResult {
  success: boolean;
  theme?: PPTXTheme;
  error?: string;
}

// ===== PARSER =====

export class PPTXThemeParser {
  private xmlParser: XMLParser;
  private static readonly COMPONENT = 'PPTXThemeParser';

  constructor() {
    this.xmlParser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      parseAttributeValue: true,
    });
  }

  /**
   * Extrai tema de um buffer de arquivo PPTX
   */
  async extractTheme(pptxBuffer: Buffer | ArrayBuffer): Promise<ThemeExtractionResult> {
    try {
      const zip = await JSZip.loadAsync(pptxBuffer);
      
      // Procurar arquivo de tema (geralmente theme1.xml)
      const themeFile = zip.file(/ppt\/theme\/theme\d+\.xml/)[0];
      
      if (!themeFile) {
        return {
          success: false,
          error: 'Arquivo de tema não encontrado no PPTX'
        };
      }

      const themeXml = await themeFile.async('string');
      const themeData = this.xmlParser.parse(themeXml);
      
      const theme = this.parseThemeXml(themeData);
      
      logger.info('Theme extracted successfully', {
        component: PPTXThemeParser.COMPONENT,
        themeName: theme.name,
        colorCount: theme.colors.length
      });

      return {
        success: true,
        theme
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Failed to extract theme', error instanceof Error ? error : new Error(errorMessage), {
        component: PPTXThemeParser.COMPONENT
      });
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Parse do XML do tema
   */
  private parseThemeXml(themeData: Record<string, unknown>): PPTXTheme {
    const root = themeData['a:theme'] as Record<string, unknown> || themeData;
    const themeElements = root['a:themeElements'] as Record<string, unknown> || {};
    
    // Nome do tema
    const name = (root['@_name'] as string) || 'Default Theme';
    
    // Cores
    const colorScheme = this.parseColorScheme(themeElements['a:clrScheme'] as Record<string, unknown>);
    const colors = this.extractAllColors(colorScheme);
    
    // Fontes
    const fonts = this.parseFonts(themeElements['a:fontScheme'] as Record<string, unknown>);
    
    // Background (se disponível)
    const background = this.parseBackground(themeElements['a:fmtScheme'] as Record<string, unknown>);

    return {
      name,
      colors,
      fonts,
      background,
      colorScheme
    };
  }

  /**
   * Parse do esquema de cores
   */
  private parseColorScheme(clrScheme: Record<string, unknown> | undefined): PPTXTheme['colorScheme'] {
    const defaultScheme = {
      dark1: '#000000',
      light1: '#FFFFFF',
      dark2: '#1F497D',
      light2: '#EEECE1',
      accent1: '#4F81BD',
      accent2: '#C0504D',
      accent3: '#9BBB59',
      accent4: '#8064A2',
      accent5: '#4BACC6',
      accent6: '#F79646',
      hyperlink: '#0000FF',
      followedHyperlink: '#800080'
    };

    if (!clrScheme) return defaultScheme;

    const extractColor = (colorNode: unknown): string => {
      if (!colorNode || typeof colorNode !== 'object') return '#000000';
      const node = colorNode as Record<string, unknown>;
      
      // srgbClr - cor RGB direta
      if (node['a:srgbClr']) {
        const srgb = node['a:srgbClr'] as Record<string, unknown>;
        return `#${srgb['@_val'] || '000000'}`;
      }
      
      // sysClr - cor do sistema
      if (node['a:sysClr']) {
        const sys = node['a:sysClr'] as Record<string, unknown>;
        return `#${sys['@_lastClr'] || sys['@_val'] || '000000'}`;
      }
      
      return '#000000';
    };

    return {
      dark1: extractColor(clrScheme['a:dk1']),
      light1: extractColor(clrScheme['a:lt1']),
      dark2: extractColor(clrScheme['a:dk2']),
      light2: extractColor(clrScheme['a:lt2']),
      accent1: extractColor(clrScheme['a:accent1']),
      accent2: extractColor(clrScheme['a:accent2']),
      accent3: extractColor(clrScheme['a:accent3']),
      accent4: extractColor(clrScheme['a:accent4']),
      accent5: extractColor(clrScheme['a:accent5']),
      accent6: extractColor(clrScheme['a:accent6']),
      hyperlink: extractColor(clrScheme['a:hlink']),
      followedHyperlink: extractColor(clrScheme['a:folHlink'])
    };
  }

  /**
   * Extrai todas as cores como array
   */
  private extractAllColors(colorScheme: PPTXTheme['colorScheme']): ThemeColor[] {
    return [
      { name: 'dark1', value: colorScheme.dark1, rgb: this.hexToRgb(colorScheme.dark1) },
      { name: 'light1', value: colorScheme.light1, rgb: this.hexToRgb(colorScheme.light1) },
      { name: 'dark2', value: colorScheme.dark2, rgb: this.hexToRgb(colorScheme.dark2) },
      { name: 'light2', value: colorScheme.light2, rgb: this.hexToRgb(colorScheme.light2) },
      { name: 'accent1', value: colorScheme.accent1, rgb: this.hexToRgb(colorScheme.accent1) },
      { name: 'accent2', value: colorScheme.accent2, rgb: this.hexToRgb(colorScheme.accent2) },
      { name: 'accent3', value: colorScheme.accent3, rgb: this.hexToRgb(colorScheme.accent3) },
      { name: 'accent4', value: colorScheme.accent4, rgb: this.hexToRgb(colorScheme.accent4) },
      { name: 'accent5', value: colorScheme.accent5, rgb: this.hexToRgb(colorScheme.accent5) },
      { name: 'accent6', value: colorScheme.accent6, rgb: this.hexToRgb(colorScheme.accent6) },
      { name: 'hyperlink', value: colorScheme.hyperlink, rgb: this.hexToRgb(colorScheme.hyperlink) },
      { name: 'followedHyperlink', value: colorScheme.followedHyperlink, rgb: this.hexToRgb(colorScheme.followedHyperlink) }
    ];
  }

  /**
   * Parse das fontes do tema
   */
  private parseFonts(fontScheme: Record<string, unknown> | undefined): ThemeFonts {
    const defaultFonts: ThemeFonts = {
      majorFont: { typeface: 'Calibri Light' },
      minorFont: { typeface: 'Calibri' }
    };

    if (!fontScheme) return defaultFonts;

    const extractFont = (fontNode: unknown): ThemeFont => {
      if (!fontNode || typeof fontNode !== 'object') return { typeface: 'Calibri' };
      const node = fontNode as Record<string, unknown>;
      
      // Procurar fonte latina (principal)
      const latin = node['a:latin'] as Record<string, unknown>;
      if (latin) {
        return {
          typeface: (latin['@_typeface'] as string) || 'Calibri',
          panose: latin['@_panose'] as string,
          pitchFamily: latin['@_pitchFamily'] as number,
          charset: latin['@_charset'] as number
        };
      }
      
      return { typeface: 'Calibri' };
    };

    return {
      majorFont: extractFont(fontScheme['a:majorFont']),
      minorFont: extractFont(fontScheme['a:minorFont'])
    };
  }

  /**
   * Parse do background/formato do tema
   */
  private parseBackground(fmtScheme: Record<string, unknown> | undefined): ThemeBackground | undefined {
    if (!fmtScheme) return undefined;

    const bgFillStyleLst = fmtScheme['a:bgFillStyleLst'] as Record<string, unknown>;
    if (!bgFillStyleLst) return undefined;

    // Procurar primeiro fill style
    const solidFill = bgFillStyleLst['a:solidFill'] as Record<string, unknown>;
    if (solidFill) {
      const schemeClr = solidFill['a:schemeClr'] as Record<string, unknown>;
      if (schemeClr) {
        return {
          type: 'solid',
          color: schemeClr['@_val'] as string
        };
      }
    }

    const gradFill = bgFillStyleLst['a:gradFill'] as Record<string, unknown>;
    if (gradFill) {
      return {
        type: 'gradient',
        gradientStops: this.parseGradientStops(gradFill)
      };
    }

    return { type: 'solid', color: 'lt1' };
  }

  /**
   * Parse de stops de gradiente
   */
  private parseGradientStops(gradFill: Record<string, unknown>): Array<{ position: number; color: string }> {
    const gsLst = gradFill['a:gsLst'] as Record<string, unknown>;
    if (!gsLst) return [];

    const stops: Array<{ position: number; color: string }> = [];
    const gs = gsLst['a:gs'];
    
    const gsArray = Array.isArray(gs) ? gs : [gs];
    for (const stop of gsArray) {
      if (stop && typeof stop === 'object') {
        const stopData = stop as Record<string, unknown>;
        const position = (stopData['@_pos'] as number) / 100000; // Convert from Office units
        const schemeClr = stopData['a:schemeClr'] as Record<string, unknown>;
        const color = schemeClr ? (schemeClr['@_val'] as string) : 'lt1';
        stops.push({ position, color });
      }
    }

    return stops;
  }

  /**
   * Converte hex para RGB string
   */
  private hexToRgb(hex: string): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return '0,0,0';
    return `${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)}`;
  }

  /**
   * Aplica tema a CSS variables
   */
  generateCSSVariables(theme: PPTXTheme): Record<string, string> {
    const vars: Record<string, string> = {};
    
    // Cores
    for (const color of theme.colors) {
      vars[`--theme-${color.name}`] = color.value;
      if (color.rgb) {
        vars[`--theme-${color.name}-rgb`] = color.rgb;
      }
    }
    
    // Fontes
    vars['--theme-font-heading'] = theme.fonts.majorFont.typeface;
    vars['--theme-font-body'] = theme.fonts.minorFont.typeface;
    
    return vars;
  }
}

// ===== FUNÇÕES HELPER =====

/**
 * Extrai tema de um buffer PPTX
 */
export async function extractPPTXTheme(pptxBuffer: Buffer | ArrayBuffer): Promise<ThemeExtractionResult> {
  const parser = new PPTXThemeParser();
  return parser.extractTheme(pptxBuffer);
}

/**
 * Gera CSS variables a partir de um tema
 */
export function themeToCSS(theme: PPTXTheme): string {
  const parser = new PPTXThemeParser();
  const vars = parser.generateCSSVariables(theme);
  
  return Object.entries(vars)
    .map(([key, value]) => `${key}: ${value};`)
    .join('\n');
}
