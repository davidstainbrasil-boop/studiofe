/**
 * 📝 Subtitle Generator - Sistema de Legendas Automáticas
 * 
 * Gera legendas SRT/VTT automaticamente a partir do texto TTS
 * Suporta sincronização palavra por palavra e edição manual
 */

import { Logger } from '@lib/logger';

const logger = new Logger('subtitle-generator');

// =============================================================================
// Types
// =============================================================================

export type SubtitleFormat = 'srt' | 'vtt' | 'json';

export interface SubtitleCue {
  id: number;
  startTime: number; // in milliseconds
  endTime: number;   // in milliseconds
  text: string;
  speaker?: string;
  style?: SubtitleStyle;
}

export interface SubtitleStyle {
  color?: string;
  backgroundColor?: string;
  fontSize?: 'small' | 'medium' | 'large';
  position?: 'top' | 'middle' | 'bottom';
  align?: 'left' | 'center' | 'right';
  bold?: boolean;
  italic?: boolean;
}

export interface SubtitleOptions {
  /** Maximum characters per line (default: 42) */
  maxCharsPerLine?: number;
  /** Maximum lines per cue (default: 2) */
  maxLinesPerCue?: number;
  /** Minimum cue duration in ms (default: 1000) */
  minDuration?: number;
  /** Maximum cue duration in ms (default: 7000) */
  maxDuration?: number;
  /** Gap between cues in ms (default: 80) */
  gapBetweenCues?: number;
  /** Include speaker names (default: false) */
  includeSpeaker?: boolean;
  /** Default speaker name */
  defaultSpeaker?: string;
  /** Style settings */
  style?: SubtitleStyle;
  /** Words per minute for timing estimation (default: 150) */
  wordsPerMinute?: number;
}

export interface TextSegment {
  text: string;
  startTime?: number;
  endTime?: number;
  slideIndex?: number;
  slideTitle?: string;
}

export interface GeneratedSubtitles {
  format: SubtitleFormat;
  content: string;
  cues: SubtitleCue[];
  duration: number;
  wordCount: number;
  lineCount: number;
}

// =============================================================================
// Default Options
// =============================================================================

const DEFAULT_OPTIONS: Required<SubtitleOptions> = {
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
    fontSize: 'medium',
    position: 'bottom',
    align: 'center',
    bold: false,
    italic: false,
  },
  wordsPerMinute: 150,
};

// =============================================================================
// Subtitle Generator Class
// =============================================================================

export class SubtitleGenerator {
  private options: Required<SubtitleOptions>;

  constructor(options: SubtitleOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Generate subtitles from text segments
   */
  generate(segments: TextSegment[], format: SubtitleFormat = 'srt'): GeneratedSubtitles {
    logger.info('Gerando legendas', { 
      segmentCount: segments.length, 
      format,
      options: this.options,
    });

    // 1. Process all segments into cues
    const cues = this.processSegments(segments);

    // 2. Format output
    let content: string;
    switch (format) {
      case 'vtt':
        content = this.formatVTT(cues);
        break;
      case 'json':
        content = this.formatJSON(cues);
        break;
      case 'srt':
      default:
        content = this.formatSRT(cues);
        break;
    }

    // 3. Calculate stats
    const duration = cues.length > 0 ? cues[cues.length - 1].endTime : 0;
    const wordCount = cues.reduce((sum, cue) => sum + cue.text.split(/\s+/).length, 0);
    const lineCount = cues.length;

    logger.info('Legendas geradas com sucesso', { 
      cueCount: cues.length, 
      duration,
      wordCount,
    });

    return {
      format,
      content,
      cues,
      duration,
      wordCount,
      lineCount,
    };
  }

  /**
   * Generate subtitles from plain text with estimated timing
   */
  generateFromText(text: string, startTime: number = 0, format: SubtitleFormat = 'srt'): GeneratedSubtitles {
    const segments: TextSegment[] = [{
      text,
      startTime,
    }];
    return this.generate(segments, format);
  }

  /**
   * Generate subtitles from slide notes
   */
  generateFromSlideNotes(
    slides: Array<{ notes: string; title?: string; duration?: number }>,
    format: SubtitleFormat = 'srt'
  ): GeneratedSubtitles {
    let currentTime = 0;
    const segments: TextSegment[] = [];

    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];
      if (!slide.notes || slide.notes.trim() === '') continue;

      // Estimate duration based on word count if not provided
      const wordCount = slide.notes.split(/\s+/).length;
      const estimatedDuration = slide.duration || (wordCount / this.options.wordsPerMinute) * 60 * 1000;

      segments.push({
        text: slide.notes,
        startTime: currentTime,
        endTime: currentTime + estimatedDuration,
        slideIndex: i,
        slideTitle: slide.title,
      });

      currentTime += estimatedDuration;
    }

    return this.generate(segments, format);
  }

  /**
   * Process segments into subtitle cues
   */
  private processSegments(segments: TextSegment[]): SubtitleCue[] {
    const cues: SubtitleCue[] = [];
    let cueId = 1;

    for (const segment of segments) {
      // Split text into sentences
      const sentences = this.splitIntoSentences(segment.text);
      
      // Calculate timing for each sentence
      const segmentStart = segment.startTime || 0;
      const segmentEnd = segment.endTime;
      const totalWords = segment.text.split(/\s+/).length;
      const segmentDuration = segmentEnd 
        ? segmentEnd - segmentStart 
        : (totalWords / this.options.wordsPerMinute) * 60 * 1000;

      let currentTime = segmentStart;
      let wordsProcessed = 0;

      for (const sentence of sentences) {
        // Split sentence into chunks that fit subtitle constraints
        const chunks = this.splitIntoChunks(sentence);
        
        for (const chunk of chunks) {
          const chunkWords = chunk.split(/\s+/).length;
          const chunkDuration = (chunkWords / totalWords) * segmentDuration;
          
          // Apply min/max duration constraints
          const duration = Math.max(
            this.options.minDuration,
            Math.min(this.options.maxDuration, chunkDuration)
          );

          const cue: SubtitleCue = {
            id: cueId++,
            startTime: Math.round(currentTime),
            endTime: Math.round(currentTime + duration - this.options.gapBetweenCues),
            text: chunk,
          };

          // Add speaker if enabled
          if (this.options.includeSpeaker) {
            cue.speaker = this.options.defaultSpeaker;
          }

          // Add style if defined
          if (this.options.style) {
            cue.style = this.options.style;
          }

          cues.push(cue);
          currentTime += duration;
          wordsProcessed += chunkWords;
        }
      }
    }

    return cues;
  }

  /**
   * Split text into sentences
   */
  private splitIntoSentences(text: string): string[] {
    // Split by sentence-ending punctuation, keeping the punctuation
    const sentences = text.split(/(?<=[.!?])\s+/);
    return sentences.filter(s => s.trim().length > 0);
  }

  /**
   * Split text into chunks that fit subtitle constraints
   */
  private splitIntoChunks(text: string): string[] {
    const chunks: string[] = [];
    const maxChars = this.options.maxCharsPerLine * this.options.maxLinesPerCue;
    
    if (text.length <= maxChars) {
      // Text fits in one cue
      chunks.push(this.formatCueText(text));
      return chunks;
    }

    // Split by natural break points (clauses, commas, etc.)
    const segments = text.split(/(?<=[,;:])\s+|(?=\s+e\s+|\s+ou\s+|\s+mas\s+|\s+porém\s+|\s+que\s+)/i);
    
    let currentChunk = '';
    
    for (const segment of segments) {
      const testChunk = currentChunk ? `${currentChunk} ${segment}` : segment;
      
      if (testChunk.length <= maxChars) {
        currentChunk = testChunk;
      } else {
        // Save current chunk and start new one
        if (currentChunk) {
          chunks.push(this.formatCueText(currentChunk));
        }
        
        // If segment itself is too long, split by words
        if (segment.length > maxChars) {
          const words = segment.split(/\s+/);
          currentChunk = '';
          
          for (const word of words) {
            const testWithWord = currentChunk ? `${currentChunk} ${word}` : word;
            if (testWithWord.length <= maxChars) {
              currentChunk = testWithWord;
            } else {
              if (currentChunk) {
                chunks.push(this.formatCueText(currentChunk));
              }
              currentChunk = word;
            }
          }
        } else {
          currentChunk = segment;
        }
      }
    }
    
    // Don't forget the last chunk
    if (currentChunk) {
      chunks.push(this.formatCueText(currentChunk));
    }

    return chunks;
  }

  /**
   * Format cue text with line breaks
   */
  private formatCueText(text: string): string {
    text = text.trim();
    
    // If text fits in one line, return as is
    if (text.length <= this.options.maxCharsPerLine) {
      return text;
    }

    // Split into lines
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      
      if (testLine.length <= this.options.maxCharsPerLine) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          lines.push(currentLine);
        }
        currentLine = word;
        
        // Limit to maxLinesPerCue
        if (lines.length >= this.options.maxLinesPerCue - 1) {
          break;
        }
      }
    }

    if (currentLine && lines.length < this.options.maxLinesPerCue) {
      lines.push(currentLine);
    }

    return lines.join('\n');
  }

  /**
   * Format milliseconds as SRT timestamp (HH:MM:SS,mmm)
   */
  private formatSRTTime(ms: number): string {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = ms % 1000;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
  }

  /**
   * Format milliseconds as VTT timestamp (HH:MM:SS.mmm)
   */
  private formatVTTTime(ms: number): string {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = ms % 1000;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
  }

  /**
   * Format subtitles as SRT
   */
  private formatSRT(cues: SubtitleCue[]): string {
    const lines: string[] = [];

    for (const cue of cues) {
      lines.push(cue.id.toString());
      lines.push(`${this.formatSRTTime(cue.startTime)} --> ${this.formatSRTTime(cue.endTime)}`);
      
      if (cue.speaker) {
        lines.push(`[${cue.speaker}]`);
      }
      
      lines.push(cue.text);
      lines.push(''); // Empty line between cues
    }

    return lines.join('\n');
  }

  /**
   * Format subtitles as WebVTT
   */
  private formatVTT(cues: SubtitleCue[]): string {
    const lines: string[] = ['WEBVTT', '', ''];

    for (const cue of cues) {
      // VTT cue identifier (optional but useful for editing)
      lines.push(`cue-${cue.id}`);
      
      // Timestamp with optional positioning
      let timestamp = `${this.formatVTTTime(cue.startTime)} --> ${this.formatVTTTime(cue.endTime)}`;
      
      if (cue.style?.position) {
        const line = cue.style.position === 'top' ? '5%' : 
                     cue.style.position === 'middle' ? '50%' : '90%';
        timestamp += ` line:${line}`;
      }
      
      if (cue.style?.align) {
        timestamp += ` align:${cue.style.align}`;
      }
      
      lines.push(timestamp);
      
      // Text with optional speaker
      let text = cue.text;
      if (cue.speaker) {
        text = `<v ${cue.speaker}>${text}`;
      }
      
      // Apply styles if available
      if (cue.style?.bold) {
        text = `<b>${text}</b>`;
      }
      if (cue.style?.italic) {
        text = `<i>${text}</i>`;
      }
      
      lines.push(text);
      lines.push(''); // Empty line between cues
    }

    return lines.join('\n');
  }

  /**
   * Format subtitles as JSON
   */
  private formatJSON(cues: SubtitleCue[]): string {
    const output = {
      format: 'json' as const,
      version: '1.0',
      cues: cues.map(cue => ({
        id: cue.id,
        start: cue.startTime,
        end: cue.endTime,
        text: cue.text,
        ...(cue.speaker && { speaker: cue.speaker }),
        ...(cue.style && { style: cue.style }),
      })),
    };

    return JSON.stringify(output, null, 2);
  }

  /**
   * Parse SRT content back to cues
   */
  parseSRT(content: string): SubtitleCue[] {
    const cues: SubtitleCue[] = [];
    const blocks = content.trim().split(/\n\n+/);

    for (const block of blocks) {
      const lines = block.split('\n');
      if (lines.length < 3) continue;

      const id = parseInt(lines[0], 10);
      if (isNaN(id)) continue;

      const timeMatch = lines[1].match(/(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})/);
      if (!timeMatch) continue;

      const startTime = this.parseSRTTime(timeMatch[1]);
      const endTime = this.parseSRTTime(timeMatch[2]);
      
      // Check for speaker line
      let textStartIndex = 2;
      let speaker: string | undefined;
      if (lines[2].match(/^\[.+\]$/)) {
        speaker = lines[2].slice(1, -1);
        textStartIndex = 3;
      }

      const text = lines.slice(textStartIndex).join('\n');

      cues.push({
        id,
        startTime,
        endTime,
        text,
        speaker,
      });
    }

    return cues;
  }

  /**
   * Parse SRT timestamp to milliseconds
   */
  private parseSRTTime(time: string): number {
    const match = time.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})/);
    if (!match) return 0;

    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const seconds = parseInt(match[3], 10);
    const milliseconds = parseInt(match[4], 10);

    return (hours * 3600 + minutes * 60 + seconds) * 1000 + milliseconds;
  }

  /**
   * Parse VTT content back to cues
   */
  parseVTT(content: string): SubtitleCue[] {
    const cues: SubtitleCue[] = [];
    const lines = content.split('\n');
    
    // Skip WEBVTT header
    let i = 0;
    while (i < lines.length && !lines[i].includes('-->')) {
      i++;
    }

    let cueId = 1;
    while (i < lines.length) {
      const line = lines[i].trim();
      
      if (line === '') {
        i++;
        continue;
      }

      // Check if this is a cue identifier
      if (!line.includes('-->')) {
        i++;
        continue;
      }

      // Parse timestamp
      const timeMatch = line.match(/(\d{2}:\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3})/);
      if (!timeMatch) {
        i++;
        continue;
      }

      const startTime = this.parseVTTTime(timeMatch[1]);
      const endTime = this.parseVTTTime(timeMatch[2]);

      // Collect text lines until empty line
      i++;
      const textLines: string[] = [];
      while (i < lines.length && lines[i].trim() !== '') {
        textLines.push(lines[i].trim());
        i++;
      }

      // Parse speaker and clean up VTT tags
      let text = textLines.join('\n');
      let speaker: string | undefined;
      
      const speakerMatch = text.match(/<v\s+([^>]+)>/);
      if (speakerMatch) {
        speaker = speakerMatch[1];
        text = text.replace(/<v\s+[^>]+>/g, '');
      }
      
      // Remove VTT tags
      text = text.replace(/<\/?[bi]>/g, '');

      cues.push({
        id: cueId++,
        startTime,
        endTime,
        text,
        speaker,
      });
    }

    return cues;
  }

  /**
   * Parse VTT timestamp to milliseconds
   */
  private parseVTTTime(time: string): number {
    const match = time.match(/(\d{2}):(\d{2}):(\d{2})\.(\d{3})/);
    if (!match) return 0;

    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const seconds = parseInt(match[3], 10);
    const milliseconds = parseInt(match[4], 10);

    return (hours * 3600 + minutes * 60 + seconds) * 1000 + milliseconds;
  }

  /**
   * Merge adjacent cues if they're from the same speaker and close in time
   */
  mergeCues(cues: SubtitleCue[], maxGap: number = 500): SubtitleCue[] {
    if (cues.length < 2) return cues;

    const merged: SubtitleCue[] = [];
    let current = { ...cues[0] };

    for (let i = 1; i < cues.length; i++) {
      const next = cues[i];
      const gap = next.startTime - current.endTime;
      const combinedLength = current.text.length + next.text.length + 1;

      // Merge if same speaker, small gap, and combined text isn't too long
      if (
        gap <= maxGap &&
        current.speaker === next.speaker &&
        combinedLength <= this.options.maxCharsPerLine * this.options.maxLinesPerCue
      ) {
        current.endTime = next.endTime;
        current.text = `${current.text}\n${next.text}`;
      } else {
        merged.push(current);
        current = { ...next, id: merged.length + 1 };
      }
    }

    merged.push(current);

    // Renumber IDs
    return merged.map((cue, index) => ({ ...cue, id: index + 1 }));
  }

  /**
   * Shift all timestamps by an offset
   */
  shiftTime(cues: SubtitleCue[], offsetMs: number): SubtitleCue[] {
    return cues.map(cue => ({
      ...cue,
      startTime: Math.max(0, cue.startTime + offsetMs),
      endTime: Math.max(0, cue.endTime + offsetMs),
    }));
  }

  /**
   * Scale all timestamps by a factor (for speed changes)
   */
  scaleTime(cues: SubtitleCue[], factor: number): SubtitleCue[] {
    return cues.map(cue => ({
      ...cue,
      startTime: Math.round(cue.startTime * factor),
      endTime: Math.round(cue.endTime * factor),
    }));
  }

  /**
   * Convert between formats
   */
  convert(content: string, fromFormat: SubtitleFormat, toFormat: SubtitleFormat): string {
    let cues: SubtitleCue[];

    // Parse input
    switch (fromFormat) {
      case 'srt':
        cues = this.parseSRT(content);
        break;
      case 'vtt':
        cues = this.parseVTT(content);
        break;
      case 'json':
        const parsed = JSON.parse(content);
        cues = parsed.cues.map((c: {
          id: number;
          start: number;
          end: number;
          text: string;
          speaker?: string;
          style?: SubtitleStyle;
        }) => ({
          id: c.id,
          startTime: c.start,
          endTime: c.end,
          text: c.text,
          speaker: c.speaker,
          style: c.style,
        }));
        break;
      default:
        throw new Error(`Formato de entrada não suportado: ${fromFormat}`);
    }

    // Format output
    switch (toFormat) {
      case 'srt':
        return this.formatSRT(cues);
      case 'vtt':
        return this.formatVTT(cues);
      case 'json':
        return this.formatJSON(cues);
      default:
        throw new Error(`Formato de saída não suportado: ${toFormat}`);
    }
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create a subtitle generator with default options
 */
export function createSubtitleGenerator(options?: SubtitleOptions): SubtitleGenerator {
  return new SubtitleGenerator(options);
}

/**
 * Generate SRT subtitles from text
 */
export function generateSRT(text: string, options?: SubtitleOptions): string {
  const generator = new SubtitleGenerator(options);
  const result = generator.generateFromText(text, 0, 'srt');
  return result.content;
}

/**
 * Generate VTT subtitles from text
 */
export function generateVTT(text: string, options?: SubtitleOptions): string {
  const generator = new SubtitleGenerator(options);
  const result = generator.generateFromText(text, 0, 'vtt');
  return result.content;
}

/**
 * Convert SRT to VTT
 */
export function srtToVtt(srtContent: string): string {
  const generator = new SubtitleGenerator();
  return generator.convert(srtContent, 'srt', 'vtt');
}

/**
 * Convert VTT to SRT
 */
export function vttToSrt(vttContent: string): string {
  const generator = new SubtitleGenerator();
  return generator.convert(vttContent, 'vtt', 'srt');
}
