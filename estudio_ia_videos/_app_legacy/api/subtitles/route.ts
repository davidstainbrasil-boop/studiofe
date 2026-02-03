/**
 * 📝 Subtitles API - Geração e conversão de legendas
 * 
 * Endpoints:
 * - POST /api/subtitles?operation=generate - Gera legendas a partir de texto ou slides
 * - POST /api/subtitles?operation=convert - Converte entre formatos (SRT, VTT, JSON)
 * - POST /api/subtitles?operation=sync - Sincroniza legendas com timing
 * - GET /api/subtitles - Documentação da API
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// =============================================================================
// Types
// =============================================================================

type SubtitleFormat = 'srt' | 'vtt' | 'json';

interface SubtitleCue {
  id: number;
  startTime: number;
  endTime: number;
  text: string;
  speaker?: string;
}

interface SubtitleStyle {
  color?: string;
  backgroundColor?: string;
  fontSize?: 'small' | 'medium' | 'large';
  position?: 'top' | 'middle' | 'bottom';
  align?: 'left' | 'center' | 'right';
}

interface SubtitleOptions {
  maxCharsPerLine?: number;
  maxLinesPerCue?: number;
  minDuration?: number;
  maxDuration?: number;
  gapBetweenCues?: number;
  includeSpeaker?: boolean;
  defaultSpeaker?: string;
  style?: SubtitleStyle;
  wordsPerMinute?: number;
}

interface TextSegment {
  text: string;
  startTime?: number;
  endTime?: number;
  slideIndex?: number;
  slideTitle?: string;
}

// =============================================================================
// Default Options
// =============================================================================

const DEFAULT_OPTIONS = {
  maxCharsPerLine: 42,
  maxLinesPerCue: 2,
  minDuration: 1000,
  maxDuration: 7000,
  gapBetweenCues: 80,
  includeSpeaker: false,
  defaultSpeaker: 'Narrador',
  style: {
    color: '#FFFFFF',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    fontSize: 'medium' as const,
    position: 'bottom' as const,
    align: 'center' as const,
  },
  wordsPerMinute: 150,
};

// =============================================================================
// Subtitle Generator
// =============================================================================

class SubtitleGenerator {
  private options: Required<SubtitleOptions>;

  constructor(options?: SubtitleOptions) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  generateFromText(text: string, startTime: number = 0): SubtitleCue[] {
    const words = text.split(/\s+/).filter(Boolean);
    if (words.length === 0) return [];

    const msPerWord = 60000 / this.options.wordsPerMinute;
    const cues: SubtitleCue[] = [];
    let currentTime = startTime;
    let cueId = 1;

    let currentWords: string[] = [];
    let currentLineLength = 0;
    let lineCount = 0;

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const wordWithSpace = currentLineLength === 0 ? word : ` ${word}`;

      if (currentLineLength + wordWithSpace.length > this.options.maxCharsPerLine) {
        lineCount++;
        if (lineCount >= this.options.maxLinesPerCue || currentWords.length > 0) {
          if (currentWords.length > 0) {
            const duration = Math.min(
              Math.max(currentWords.length * msPerWord, this.options.minDuration),
              this.options.maxDuration
            );
            cues.push({
              id: cueId++,
              startTime: currentTime,
              endTime: currentTime + duration,
              text: currentWords.join(' '),
            });
            currentTime += duration + this.options.gapBetweenCues;
          }
          currentWords = [word];
          currentLineLength = word.length;
          lineCount = 0;
        } else {
          currentWords.push('\n' + word);
          currentLineLength = word.length;
        }
      } else {
        currentWords.push(word);
        currentLineLength += wordWithSpace.length;
      }
    }

    if (currentWords.length > 0) {
      const duration = Math.min(
        Math.max(currentWords.length * msPerWord, this.options.minDuration),
        this.options.maxDuration
      );
      cues.push({
        id: cueId++,
        startTime: currentTime,
        endTime: currentTime + duration,
        text: currentWords.join(' ').replace(/\n /g, '\n'),
      });
    }

    return cues;
  }

  generateFromSegments(segments: TextSegment[]): SubtitleCue[] {
    const cues: SubtitleCue[] = [];
    let cueId = 1;

    for (const segment of segments) {
      if (!segment.text.trim()) continue;

      const segmentCues = this.generateFromText(
        segment.text,
        segment.startTime || 0
      );

      for (const cue of segmentCues) {
        cues.push({ ...cue, id: cueId++ });
      }
    }

    return cues;
  }

  generateFromSlideNotes(slides: Array<{ notes: string; title?: string; duration?: number }>): SubtitleCue[] {
    let currentTime = 0;
    const segments: TextSegment[] = [];

    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];
      if (!slide.notes.trim()) continue;

      segments.push({
        text: slide.notes,
        startTime: currentTime,
        slideIndex: i,
        slideTitle: slide.title,
      });

      const wordCount = slide.notes.split(/\s+/).length;
      const estimatedDuration = slide.duration || (wordCount / this.options.wordsPerMinute) * 60000;
      currentTime += estimatedDuration + 1000;
    }

    return this.generateFromSegments(segments);
  }

  formatSRT(cues: SubtitleCue[]): string {
    return cues.map((cue: SubtitleCue) => {
      const start = this.formatSRTTime(cue.startTime);
      const end = this.formatSRTTime(cue.endTime);
      return `${cue.id}\n${start} --> ${end}\n${cue.text}\n`;
    }).join('\n');
  }

  formatVTT(cues: SubtitleCue[]): string {
    const header = 'WEBVTT\n\n';
    const body = cues.map((cue: SubtitleCue) => {
      const start = this.formatVTTTime(cue.startTime);
      const end = this.formatVTTTime(cue.endTime);
      return `${cue.id}\n${start} --> ${end}\n${cue.text}\n`;
    }).join('\n');
    return header + body;
  }

  formatJSON(cues: SubtitleCue[]): string {
    return JSON.stringify({
      format: 'subtitle-json',
      version: '1.0',
      cues,
      metadata: {
        totalCues: cues.length,
        duration: cues.length > 0 ? cues[cues.length - 1].endTime : 0,
        generatedAt: new Date().toISOString(),
      },
    }, null, 2);
  }

  private formatSRTTime(ms: number): string {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = ms % 1000;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')},${String(milliseconds).padStart(3, '0')}`;
  }

  private formatVTTTime(ms: number): string {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = ms % 1000;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
  }

  parseSRT(content: string): SubtitleCue[] {
    const cues: SubtitleCue[] = [];
    const blocks = content.trim().split(/\n\n+/);

    for (const block of blocks) {
      const lines = block.split('\n');
      if (lines.length < 3) continue;

      const id = parseInt(lines[0], 10);
      const timeLine = lines[1];
      const text = lines.slice(2).join('\n');

      const timeMatch = timeLine.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}),(\d{3})/);
      if (!timeMatch) continue;

      const startTime = this.parseTime(timeMatch[1], timeMatch[2], timeMatch[3], timeMatch[4]);
      const endTime = this.parseTime(timeMatch[5], timeMatch[6], timeMatch[7], timeMatch[8]);

      cues.push({ id, startTime, endTime, text });
    }

    return cues;
  }

  parseVTT(content: string): SubtitleCue[] {
    const cues: SubtitleCue[] = [];
    const lines = content.split('\n');
    
    let i = 0;
    while (i < lines.length && !lines[i].includes('-->')) i++;

    let cueId = 1;
    while (i < lines.length) {
      const timeLine = lines[i];
      const timeMatch = timeLine.match(/(\d{2}):(\d{2}):(\d{2})\.(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})\.(\d{3})/);
      
      if (timeMatch) {
        const startTime = this.parseTime(timeMatch[1], timeMatch[2], timeMatch[3], timeMatch[4]);
        const endTime = this.parseTime(timeMatch[5], timeMatch[6], timeMatch[7], timeMatch[8]);
        
        i++;
        const textLines: string[] = [];
        while (i < lines.length && lines[i].trim() !== '' && !lines[i].includes('-->')) {
          textLines.push(lines[i]);
          i++;
        }
        
        cues.push({
          id: cueId++,
          startTime,
          endTime,
          text: textLines.join('\n'),
        });
      } else {
        i++;
      }
    }

    return cues;
  }

  private parseTime(h: string, m: string, s: string, ms: string): number {
    return parseInt(h) * 3600000 + parseInt(m) * 60000 + parseInt(s) * 1000 + parseInt(ms);
  }

  convert(content: string, from: SubtitleFormat, to: SubtitleFormat): string {
    let cues: SubtitleCue[];
    
    if (from === 'srt') {
      cues = this.parseSRT(content);
    } else if (from === 'vtt') {
      cues = this.parseVTT(content);
    } else {
      const parsed = JSON.parse(content);
      cues = parsed.cues || parsed;
    }

    if (to === 'srt') return this.formatSRT(cues);
    if (to === 'vtt') return this.formatVTT(cues);
    return this.formatJSON(cues);
  }

  shiftTime(cues: SubtitleCue[], offsetMs: number): SubtitleCue[] {
    return cues.map((cue: SubtitleCue) => ({
      ...cue,
      startTime: Math.max(0, cue.startTime + offsetMs),
      endTime: Math.max(0, cue.endTime + offsetMs),
    }));
  }

  scaleTime(cues: SubtitleCue[], factor: number): SubtitleCue[] {
    return cues.map((cue: SubtitleCue) => ({
      ...cue,
      startTime: Math.round(cue.startTime * factor),
      endTime: Math.round(cue.endTime * factor),
    }));
  }
}

// =============================================================================
// Schemas
// =============================================================================

const subtitleOptionsSchema = z.object({
  maxCharsPerLine: z.number().min(20).max(80).optional(),
  maxLinesPerCue: z.number().min(1).max(4).optional(),
  minDuration: z.number().min(500).max(3000).optional(),
  maxDuration: z.number().min(3000).max(15000).optional(),
  gapBetweenCues: z.number().min(0).max(500).optional(),
  wordsPerMinute: z.number().min(80).max(250).optional(),
});

const generateFromTextSchema = z.object({
  mode: z.literal('text'),
  text: z.string().min(1).max(50000),
  startTime: z.number().min(0).optional(),
  format: z.enum(['srt', 'vtt', 'json']).default('srt'),
  options: subtitleOptionsSchema.optional(),
});

const generateFromSlidesSchema = z.object({
  mode: z.literal('slides'),
  slides: z.array(z.object({
    notes: z.string(),
    title: z.string().optional(),
    duration: z.number().positive().optional(),
  })).min(1).max(500),
  format: z.enum(['srt', 'vtt', 'json']).default('srt'),
  options: subtitleOptionsSchema.optional(),
});

const generateSchema = z.discriminatedUnion('mode', [
  generateFromTextSchema,
  generateFromSlidesSchema,
]);

const convertSchema = z.object({
  content: z.string().min(1).max(500000),
  fromFormat: z.enum(['srt', 'vtt', 'json']),
  toFormat: z.enum(['srt', 'vtt', 'json']),
});

const syncSchema = z.object({
  cues: z.array(z.object({
    id: z.number(),
    startTime: z.number().min(0),
    endTime: z.number().min(0),
    text: z.string(),
  })).min(1),
  operation: z.enum(['shift', 'scale']),
  value: z.number(),
  outputFormat: z.enum(['srt', 'vtt', 'json']).default('srt'),
});

// =============================================================================
// GET Handler - Documentation
// =============================================================================

export async function GET() {
  return NextResponse.json({
    name: 'Subtitles API',
    version: '1.0.0',
    description: 'Geração e conversão de legendas automáticas',
    endpoints: {
      'POST ?operation=generate': {
        description: 'Gera legendas a partir de texto ou slides',
        modes: ['text', 'slides'],
        formats: ['srt', 'vtt', 'json'],
      },
      'POST ?operation=convert': {
        description: 'Converte legendas entre formatos',
        fromFormats: ['srt', 'vtt', 'json'],
        toFormats: ['srt', 'vtt', 'json'],
      },
      'POST ?operation=sync': {
        description: 'Ajusta timing das legendas',
        operations: ['shift', 'scale'],
      },
    },
    defaultOptions: {
      maxCharsPerLine: 42,
      maxLinesPerCue: 2,
      wordsPerMinute: 150,
      minDuration: '1000ms',
      maxDuration: '7000ms',
    },
  });
}

// =============================================================================
// POST Handler
// =============================================================================

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const operation = searchParams.get('operation');

  try {
    const body = await request.json();

    // === Operation: Generate ===
    if (operation === 'generate') {
      const parsed = generateSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Dados inválidos', details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const data = parsed.data;
      const generator = new SubtitleGenerator(data.options);
      let cues: SubtitleCue[];

      if (data.mode === 'text') {
        cues = generator.generateFromText(data.text, data.startTime || 0);
      } else {
        cues = generator.generateFromSlideNotes(data.slides);
      }

      let content: string;
      if (data.format === 'srt') {
        content = generator.formatSRT(cues);
      } else if (data.format === 'vtt') {
        content = generator.formatVTT(cues);
      } else {
        content = generator.formatJSON(cues);
      }

      const totalWords = cues.reduce((sum: number, cue: SubtitleCue) => 
        sum + cue.text.split(/\s+/).length, 0
      );

      return NextResponse.json({
        success: true,
        format: data.format,
        content,
        metadata: {
          cueCount: cues.length,
          totalDuration: cues.length > 0 ? cues[cues.length - 1].endTime : 0,
          wordCount: totalWords,
          generatedAt: new Date().toISOString(),
        },
      });
    }

    // === Operation: Convert ===
    if (operation === 'convert') {
      const parsed = convertSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Dados inválidos', details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const { content, fromFormat, toFormat } = parsed.data;
      const generator = new SubtitleGenerator();

      const converted = generator.convert(content, fromFormat, toFormat);

      return NextResponse.json({
        success: true,
        fromFormat,
        toFormat,
        content: converted,
        convertedAt: new Date().toISOString(),
      });
    }

    // === Operation: Sync ===
    if (operation === 'sync') {
      const parsed = syncSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Dados inválidos', details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const { cues, operation: syncOp, value, outputFormat } = parsed.data;
      const generator = new SubtitleGenerator();

      let adjustedCues: SubtitleCue[];
      if (syncOp === 'shift') {
        adjustedCues = generator.shiftTime(cues, value);
      } else {
        adjustedCues = generator.scaleTime(cues, value);
      }

      let content: string;
      if (outputFormat === 'srt') {
        content = generator.formatSRT(adjustedCues);
      } else if (outputFormat === 'vtt') {
        content = generator.formatVTT(adjustedCues);
      } else {
        content = generator.formatJSON(adjustedCues);
      }

      return NextResponse.json({
        success: true,
        operation: syncOp,
        value,
        format: outputFormat,
        content,
        cueCount: adjustedCues.length,
      });
    }

    return NextResponse.json(
      { error: 'Operação não especificada. Use ?operation=generate|convert|sync' },
      { status: 400 }
    );

  } catch (error) {
    console.error('[subtitles-api] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno no servidor' },
      { status: 500 }
    );
  }
}
