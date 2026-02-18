/**
 * Subtitle Service
 * Sistema de legendas automáticas para vídeos
 * 
 * Features:
 * - Transcrição automática do TTS
 * - Sincronização palavra por palavra
 * - Export em formato SRT/VTT
 * - Edição manual de legendas
 * - Burn-in de legendas no vídeo
 * 
 * @module lib/subtitles/subtitle-service
 */

// ============================================================================
// TYPES
// ============================================================================

export interface SubtitleCue {
  id: string;
  startTime: number; // em segundos
  endTime: number;
  text: string;
  slideId?: string;
  words?: SubtitleWord[];
  style?: SubtitleStyle;
}

export interface SubtitleWord {
  text: string;
  startTime: number;
  endTime: number;
  confidence?: number;
}

export interface SubtitleStyle {
  fontSize?: 'small' | 'medium' | 'large';
  fontFamily?: string;
  color?: string;
  backgroundColor?: string;
  position?: 'bottom' | 'top';
  alignment?: 'left' | 'center' | 'right';
}

export interface SubtitleTrack {
  id: string;
  language: string;
  languageCode: string;
  cues: SubtitleCue[];
  isDefault?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TranscriptionRequest {
  audioUrl?: string;
  audioBuffer?: ArrayBuffer;
  text: string; // texto original para sincronização
  voiceId: string;
  speed: number;
}

export interface TranscriptionResult {
  words: SubtitleWord[];
  duration: number;
  confidence: number;
}

export type SubtitleFormat = 'srt' | 'vtt' | 'json' | 'ass';

export interface BurnInConfig {
  style: SubtitleStyle;
  fontPath?: string;
  outline?: number;
  shadow?: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_STYLE: SubtitleStyle = {
  fontSize: 'medium',
  fontFamily: 'Arial',
  color: '#FFFFFF',
  backgroundColor: 'rgba(0, 0, 0, 0.75)',
  position: 'bottom',
  alignment: 'center',
};

const FONT_SIZES = {
  small: 20,
  medium: 28,
  large: 36,
};

const MAX_CHARS_PER_LINE = 42;
const MAX_LINES = 2;
const MIN_CUE_DURATION = 1.5; // segundos
const MAX_CUE_DURATION = 7; // segundos

// ============================================================================
// LOGGER
// ============================================================================

const logger = {
  info: (msg: string, meta?: Record<string, unknown>) =>
    console.log(`[SUBTITLE] ${msg}`, meta || ''),
  error: (msg: string, meta?: Record<string, unknown>) =>
    console.error(`[SUBTITLE ERROR] ${msg}`, meta || ''),
  warn: (msg: string, meta?: Record<string, unknown>) =>
    console.warn(`[SUBTITLE WARN] ${msg}`, meta || ''),
};

// ============================================================================
// SUBTITLE SERVICE
// ============================================================================

export class SubtitleService {
  private tracks: Map<string, SubtitleTrack> = new Map();

  // ==========================================================================
  // TRANSCRIPTION
  // ==========================================================================

  /**
   * Gera legendas a partir de texto e áudio TTS
   */
  async generateFromTTS(
    text: string,
    voiceId: string,
    speed: number = 1.0,
    slideId?: string
  ): Promise<SubtitleCue[]> {
    // Divide o texto em sentenças
    const sentences = this.splitIntoSentences(text);
    const cues: SubtitleCue[] = [];

    // Estima timing baseado em caracteres e velocidade
    const charsPerSecond = 15 * speed; // ~15 chars/s para TTS normal
    let currentTime = 0;

    for (const sentence of sentences) {
      const duration = Math.max(
        MIN_CUE_DURATION,
        Math.min(MAX_CUE_DURATION, sentence.length / charsPerSecond)
      );

      // Divide sentenças longas em múltiplas linhas
      const lines = this.wrapText(sentence);
      const lineText = lines.join('\n');

      cues.push({
        id: `cue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        startTime: currentTime,
        endTime: currentTime + duration,
        text: lineText,
        slideId,
      });

      currentTime += duration + 0.1; // pequena pausa entre legendas
    }

    logger.info('Legendas geradas do TTS', {
      cueCount: cues.length,
      totalDuration: currentTime,
    });

    return cues;
  }

  /**
   * Sincroniza legendas com áudio usando word-level timing
   */
  async syncWithAudio(
    cues: SubtitleCue[],
    audioTimings: SubtitleWord[]
  ): Promise<SubtitleCue[]> {
    if (!audioTimings.length) return cues;

    const syncedCues: SubtitleCue[] = [];
    let wordIndex = 0;

    for (const cue of cues) {
      const words = cue.text.split(/\s+/);
      const cueWords: SubtitleWord[] = [];
      let startTime = -1;
      let endTime = 0;

      for (const word of words) {
        if (wordIndex < audioTimings.length) {
          const timing = audioTimings[wordIndex];
          if (startTime === -1) startTime = timing.startTime;
          endTime = timing.endTime;
          cueWords.push(timing);
          wordIndex++;
        }
      }

      if (startTime !== -1) {
        syncedCues.push({
          ...cue,
          startTime,
          endTime,
          words: cueWords,
        });
      }
    }

    logger.info('Legendas sincronizadas com áudio', { cueCount: syncedCues.length });
    return syncedCues;
  }

  // ==========================================================================
  // TEXT PROCESSING
  // ==========================================================================

  private splitIntoSentences(text: string): string[] {
    // Divide por pontuação, mas mantém frases de tamanho razoável
    const raw = text
      .replace(/([.!?])\s+/g, '$1|||')
      .split('|||')
      .filter(s => s.trim());

    const sentences: string[] = [];

    for (const sentence of raw) {
      if (sentence.length <= MAX_CHARS_PER_LINE * MAX_LINES) {
        sentences.push(sentence.trim());
      } else {
        // Divide sentenças muito longas por vírgulas ou palavras
        const parts = this.splitLongSentence(sentence);
        sentences.push(...parts);
      }
    }

    return sentences;
  }

  private splitLongSentence(sentence: string): string[] {
    const maxLength = MAX_CHARS_PER_LINE * MAX_LINES;
    const parts: string[] = [];
    
    // Tenta dividir por vírgulas primeiro
    const byComma = sentence.split(/,\s*/);
    let current = '';

    for (const part of byComma) {
      if ((current + part).length <= maxLength) {
        current += (current ? ', ' : '') + part;
      } else {
        if (current) parts.push(current);
        current = part;
      }
    }

    if (current) parts.push(current);

    // Se ainda muito longo, divide por palavras
    return parts.flatMap(p => 
      p.length > maxLength ? this.splitByWords(p, maxLength) : [p]
    );
  }

  private splitByWords(text: string, maxLength: number): string[] {
    const words = text.split(/\s+/);
    const parts: string[] = [];
    let current = '';

    for (const word of words) {
      if ((current + ' ' + word).length <= maxLength) {
        current += (current ? ' ' : '') + word;
      } else {
        if (current) parts.push(current);
        current = word;
      }
    }

    if (current) parts.push(current);
    return parts;
  }

  private wrapText(text: string): string[] {
    if (text.length <= MAX_CHARS_PER_LINE) {
      return [text];
    }

    const words = text.split(/\s+/);
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if ((currentLine + ' ' + word).length <= MAX_CHARS_PER_LINE) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
        if (lines.length >= MAX_LINES - 1) break;
      }
    }

    if (currentLine && lines.length < MAX_LINES) {
      lines.push(currentLine);
    }

    return lines;
  }

  // ==========================================================================
  // TRACK MANAGEMENT
  // ==========================================================================

  /**
   * Cria uma nova track de legendas
   */
  createTrack(language: string, languageCode: string): SubtitleTrack {
    const track: SubtitleTrack = {
      id: `track-${Date.now()}`,
      language,
      languageCode,
      cues: [],
      isDefault: this.tracks.size === 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.tracks.set(track.id, track);
    logger.info('Track criada', { trackId: track.id, language });

    return track;
  }

  /**
   * Adiciona cue a uma track
   */
  addCue(trackId: string, cue: SubtitleCue): void {
    const track = this.tracks.get(trackId);
    if (!track) {
      throw new Error(`Track não encontrada: ${trackId}`);
    }

    track.cues.push(cue);
    track.cues.sort((a, b) => a.startTime - b.startTime);
    track.updatedAt = new Date();
  }

  /**
   * Atualiza um cue existente
   */
  updateCue(trackId: string, cueId: string, updates: Partial<SubtitleCue>): void {
    const track = this.tracks.get(trackId);
    if (!track) {
      throw new Error(`Track não encontrada: ${trackId}`);
    }

    const cueIndex = track.cues.findIndex(c => c.id === cueId);
    if (cueIndex === -1) {
      throw new Error(`Cue não encontrado: ${cueId}`);
    }

    track.cues[cueIndex] = { ...track.cues[cueIndex], ...updates };
    track.cues.sort((a, b) => a.startTime - b.startTime);
    track.updatedAt = new Date();
  }

  /**
   * Remove um cue
   */
  removeCue(trackId: string, cueId: string): void {
    const track = this.tracks.get(trackId);
    if (!track) return;

    track.cues = track.cues.filter(c => c.id !== cueId);
    track.updatedAt = new Date();
  }

  /**
   * Retorna track por ID
   */
  getTrack(trackId: string): SubtitleTrack | undefined {
    return this.tracks.get(trackId);
  }

  /**
   * Lista todas as tracks
   */
  listTracks(): SubtitleTrack[] {
    return Array.from(this.tracks.values());
  }

  // ==========================================================================
  // EXPORT FORMATS
  // ==========================================================================

  /**
   * Exporta legendas para formato especificado
   */
  export(trackId: string, format: SubtitleFormat): string {
    const track = this.tracks.get(trackId);
    if (!track) {
      throw new Error(`Track não encontrada: ${trackId}`);
    }

    switch (format) {
      case 'srt':
        return this.exportSRT(track);
      case 'vtt':
        return this.exportVTT(track);
      case 'json':
        return this.exportJSON(track);
      case 'ass':
        return this.exportASS(track);
      default:
        throw new Error(`Formato não suportado: ${format}`);
    }
  }

  /**
   * Exporta para SRT (SubRip)
   */
  private exportSRT(track: SubtitleTrack): string {
    return track.cues.map((cue, index) => {
      const start = this.formatTimeSRT(cue.startTime);
      const end = this.formatTimeSRT(cue.endTime);
      return `${index + 1}\n${start} --> ${end}\n${cue.text}\n`;
    }).join('\n');
  }

  /**
   * Exporta para WebVTT
   */
  private exportVTT(track: SubtitleTrack): string {
    const header = 'WEBVTT\n\n';
    const cues = track.cues.map((cue, index) => {
      const start = this.formatTimeVTT(cue.startTime);
      const end = this.formatTimeVTT(cue.endTime);
      return `${index + 1}\n${start} --> ${end}\n${cue.text}\n`;
    }).join('\n');

    return header + cues;
  }

  /**
   * Exporta para JSON
   */
  private exportJSON(track: SubtitleTrack): string {
    return JSON.stringify({
      language: track.language,
      languageCode: track.languageCode,
      cues: track.cues.map(cue => ({
        startTime: cue.startTime,
        endTime: cue.endTime,
        text: cue.text,
        words: cue.words,
      })),
    }, null, 2);
  }

  /**
   * Exporta para ASS (Advanced SubStation Alpha)
   */
  private exportASS(track: SubtitleTrack): string {
    const header = `[Script Info]
Title: Generated Subtitles
ScriptType: v4.00+
Collisions: Normal
PlayDepth: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,28,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,0,0,0,0,100,100,0,0,1,2,1,2,10,10,20,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

    const events = track.cues.map(cue => {
      const start = this.formatTimeASS(cue.startTime);
      const end = this.formatTimeASS(cue.endTime);
      const text = cue.text.replace(/\n/g, '\\N');
      return `Dialogue: 0,${start},${end},Default,,0,0,0,,${text}`;
    }).join('\n');

    return header + events;
  }

  // ==========================================================================
  // TIME FORMATTING
  // ==========================================================================

  private formatTimeSRT(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${this.pad(hours, 2)}:${this.pad(mins, 2)}:${this.pad(secs, 2)},${this.pad(ms, 3)}`;
  }

  private formatTimeVTT(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${this.pad(hours, 2)}:${this.pad(mins, 2)}:${this.pad(secs, 2)}.${this.pad(ms, 3)}`;
  }

  private formatTimeASS(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}:${this.pad(mins, 2)}:${secs.toFixed(2).padStart(5, '0')}`;
  }

  private pad(num: number, size: number): string {
    return num.toString().padStart(size, '0');
  }

  // ==========================================================================
  // IMPORT
  // ==========================================================================

  /**
   * Importa legendas de arquivo SRT
   */
  importSRT(content: string): SubtitleCue[] {
    const cues: SubtitleCue[] = [];
    const blocks = content.trim().split(/\n\n+/);

    for (const block of blocks) {
      const lines = block.split('\n');
      if (lines.length < 3) continue;

      const timeLine = lines[1];
      const timeMatch = timeLine.match(
        /(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/
      );

      if (!timeMatch) continue;

      const startTime = this.parseTime(timeMatch.slice(1, 5));
      const endTime = this.parseTime(timeMatch.slice(5, 9));
      const text = lines.slice(2).join('\n');

      cues.push({
        id: `cue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        startTime,
        endTime,
        text,
      });
    }

    logger.info('SRT importado', { cueCount: cues.length });
    return cues;
  }

  /**
   * Importa legendas de arquivo VTT
   */
  importVTT(content: string): SubtitleCue[] {
    // Remove header WEBVTT
    const cleaned = content.replace(/^WEBVTT.*\n+/, '');
    return this.importSRT(cleaned);
  }

  private parseTime(parts: string[]): number {
    const [h, m, s, ms] = parts.map(Number);
    return h * 3600 + m * 60 + s + ms / 1000;
  }

  // ==========================================================================
  // BURN-IN GENERATION (FFmpeg command)
  // ==========================================================================

  /**
   * Gera comando FFmpeg para burn-in de legendas
   */
  generateBurnInCommand(
    inputVideo: string,
    outputVideo: string,
    subtitleFile: string,
    config: BurnInConfig = { style: DEFAULT_STYLE }
  ): string {
    const style = { ...DEFAULT_STYLE, ...config.style };
    const fontSize = FONT_SIZES[style.fontSize || 'medium'];

    // Converte cor hex para formato FFmpeg (BGR)
    const primaryColor = this.hexToBGR(style.color || '#FFFFFF');
    const outlineColor = '000000';
    const shadowColor = '000000';

    const fontStyle = [
      `FontName=${style.fontFamily || 'Arial'}`,
      `FontSize=${fontSize}`,
      `PrimaryColour=&H${primaryColor}`,
      `OutlineColour=&H${outlineColor}`,
      `BackColour=&H80${shadowColor}`,
      `Outline=${config.outline || 2}`,
      `Shadow=${config.shadow || 1}`,
      style.alignment === 'left' ? 'Alignment=1' : 
        style.alignment === 'right' ? 'Alignment=3' : 'Alignment=2',
      style.position === 'top' ? 'MarginV=20' : 'MarginV=40',
    ].join(',');

    return `ffmpeg -i "${inputVideo}" -vf "subtitles='${subtitleFile}':force_style='${fontStyle}'" -c:a copy "${outputVideo}"`;
  }

  private hexToBGR(hex: string): string {
    const clean = hex.replace('#', '');
    const r = clean.substring(0, 2);
    const g = clean.substring(2, 4);
    const b = clean.substring(4, 6);
    return `${b}${g}${r}`;
  }

  // ==========================================================================
  // UTILITIES
  // ==========================================================================

  /**
   * Valida e corrige sobreposições de tempo
   */
  fixOverlaps(cues: SubtitleCue[]): SubtitleCue[] {
    const sorted = [...cues].sort((a, b) => a.startTime - b.startTime);
    
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i].endTime > sorted[i + 1].startTime) {
        // Ajusta endTime para não sobrepor o próximo cue
        sorted[i].endTime = sorted[i + 1].startTime - 0.05;
      }
    }

    return sorted;
  }

  /**
   * Shift todas as legendas por um offset
   */
  shiftTiming(cues: SubtitleCue[], offsetSeconds: number): SubtitleCue[] {
    return cues.map(cue => ({
      ...cue,
      startTime: Math.max(0, cue.startTime + offsetSeconds),
      endTime: Math.max(0.1, cue.endTime + offsetSeconds),
    }));
  }

  /**
   * Escala timing por um fator
   */
  scaleTiming(cues: SubtitleCue[], factor: number): SubtitleCue[] {
    return cues.map(cue => ({
      ...cue,
      startTime: cue.startTime * factor,
      endTime: cue.endTime * factor,
    }));
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

let subtitleServiceInstance: SubtitleService | null = null;

export function getSubtitleService(): SubtitleService {
  if (!subtitleServiceInstance) {
    subtitleServiceInstance = new SubtitleService();
  }
  return subtitleServiceInstance;
}

export default SubtitleService;
