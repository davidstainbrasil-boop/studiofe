import 'openai/shims/node';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import { logger } from '@lib/logger';
import OpenAI, { toFile } from 'openai';
import { getOptionalEnv } from '@lib/env';

const execAsync = promisify(exec);

export interface TranscriptionWord {
  word: string;
  startTime: number;
  endTime: number;
  confidence: number;
}

export interface TranscriptionSegment {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
  words: TranscriptionWord[];
  confidence: number;
  speaker?: string;
}

export interface TranscriptionResult {
  segments: TranscriptionSegment[];
  language: string;
  duration: number;
  confidence: number;
  wordCount: number;
}

export interface KaraokeStyle {
  activeColor: string;
  inactiveColor: string;
  fontSize: number;
  fontFamily: string;
  animationSpeed: number;
  backgroundColor?: string;
  textShadow?: string;
}

interface WhisperWord {
  word: string;
  start: number;
  end: number;
  confidence: number;
}

interface WhisperSegment {
  id: number;
  start: number;
  end: number;
  text: string;
  words: WhisperWord[];
  confidence?: number;
  speaker?: string;
}

interface WhisperOutput {
  segments: WhisperSegment[];
  language: string;
  duration?: number;
  confidence?: number;
}

type TranslationProvider = 'deepl' | 'google';

interface TranslationConfig {
  provider: TranslationProvider;
  apiKey: string;
  apiUrl?: string;
}

export class TranscriptionService {
  private static instance: TranscriptionService;
  private tempDir: string;

  private constructor() {
    this.tempDir = path.join(process.cwd(), 'temp', 'transcription');
    this.ensureTempDir();
  }

  static getInstance(): TranscriptionService {
    if (!TranscriptionService.instance) {
      TranscriptionService.instance = new TranscriptionService();
    }
    return TranscriptionService.instance;
  }

  private async ensureTempDir(): Promise<void> {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      logger.error(
        'Error creating temp directory:',
        error instanceof Error ? error : new Error(String(error)),
        { component: 'TranscriptionService' },
      );
    }
  }

  async transcribeAudio(
    audioPath: string,
    options: {
      language?: string;
      enableKaraoke?: boolean;
      enableSpeakerDiarization?: boolean;
      maxSpeakers?: number;
    } = {},
  ): Promise<TranscriptionResult> {
    const {
      language = 'pt-BR',
      enableKaraoke = true,
      enableSpeakerDiarization = false,
      maxSpeakers = 2,
    } = options;

    try {
      // Extract audio if video file
      const audioFile = await this.extractAudioIfNeeded(audioPath);

      // Convert to WAV for better accuracy
      const wavFile = await this.convertToWav(audioFile);

      // Try OpenAI First
      try {
        const transcription = await this.transcribeWithOpenAI(
          wavFile,
          language,
          enableKaraoke,
          enableSpeakerDiarization,
          maxSpeakers,
        );

        await this.cleanupTempFiles([audioFile, wavFile]);
        return transcription;
      } catch (openaiError) {
        logger.warn('OpenAI Transcription failed, falling back to local Whisper', {
          error: openaiError,
        });
        // Fallback to local
        const transcription = await this.transcribeWithWhisper(
          wavFile,
          language,
          enableKaraoke,
          enableSpeakerDiarization,
          maxSpeakers,
        );
        await this.cleanupTempFiles([audioFile, wavFile]);
        return transcription;
      }
    } catch (error) {
      logger.error(
        'Transcription error:',
        error instanceof Error ? error : new Error(String(error)),
        { component: 'TranscriptionService' },
      );
      throw new Error(`Failed to transcribe audio: ${(error as Error).message}`);
    }
  }

  private async transcribeWithOpenAI(
    audioPath: string,
    language: string,
    enableKaraoke: boolean,
    _enableSpeakerDiarization: boolean,
    _maxSpeakers: number,
  ): Promise<TranscriptionResult> {
    const apiKey = getOptionalEnv('OPENAI_API_KEY');
    if (!apiKey) throw new Error('OpenAI API Key not found');

    const openai = new OpenAI({ apiKey });

    const fileStream = await fs.readFile(audioPath);
    // OpenAI expects a File object or ReadStream. configuring for node:
    const file = await toFile(fileStream, 'audio.wav');

    type OpenAITranscriptionResponse = {
      segments?: Array<{ id: string | number; start: number; end: number; text: string }>;
      words?: Array<{ word: string; start: number; end: number }>;
      duration: number;
    };

    const response = (await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      language: language.split('-')[0], // OpenAI uses ISO-639-1 (e.g. 'pt')
      response_format: 'verbose_json',
      timestamp_granularities: enableKaraoke ? ['word', 'segment'] : ['segment'],
    })) as unknown as OpenAITranscriptionResponse;

    // Process OpenAI Response
    const segments: TranscriptionSegment[] = (response.segments || []).map((segment) => ({
      id: segment.id.toString(),
      startTime: segment.start,
      endTime: segment.end,
      text: segment.text.trim(),
      confidence: 0.95, // OpenAI doesn't always return confidence per segment in simple mode
      words: (response.words || [])
        .filter((word) => word.start >= segment.start && word.end <= segment.end)
        .map((word) => ({
          word: word.word,
          startTime: word.start,
          endTime: word.end,
          confidence: 0.95,
        })),
    }));

    return {
      segments,
      language,
      duration: response.duration,
      confidence: 0.95,
      wordCount: segments.reduce((acc, s) => acc + s.words.length, 0),
    };
  }

  private async extractAudioIfNeeded(filePath: string): Promise<string> {
    const ext = path.extname(filePath).toLowerCase();

    if (['.mp4', '.avi', '.mov', '.mkv', '.webm'].includes(ext)) {
      const outputPath = path.join(this.tempDir, `${Date.now()}_audio.wav`);

      const command = `ffmpeg -i "${filePath}" -vn -acodec pcm_s16le -ar 16000 -ac 1 "${outputPath}" -y`;
      await execAsync(command);

      return outputPath;
    }

    return filePath;
  }

  private async convertToWav(audioPath: string): Promise<string> {
    const outputPath = path.join(this.tempDir, `${Date.now()}_16k.wav`);

    const command = `ffmpeg -i "${audioPath}" -ar 16000 -ac 1 -c:a pcm_s16le "${outputPath}" -y`;
    await execAsync(command);

    return outputPath;
  }

  private async transcribeWithWhisper(
    audioPath: string,
    language: string,
    enableKaraoke: boolean,
    enableSpeakerDiarization: boolean,
    maxSpeakers: number,
  ): Promise<TranscriptionResult> {
    let command = `whisper "${audioPath}" --language ${language} --output_format json --output_dir "${this.tempDir}"`;

    if (enableKaraoke) {
      command += ' --word_timestamps True';
    }

    if (enableSpeakerDiarization) {
      command += ` --diarization True --max_speakers ${maxSpeakers}`;
    }

    command += ` --model medium --task transcribe`;

    try {
      await execAsync(command);

      // Read the generated JSON file
      const jsonFile = audioPath.replace(/\.[^/.]+$/, '') + '.json';
      const transcriptionData = JSON.parse(await fs.readFile(jsonFile, 'utf-8')) as WhisperOutput;

      return this.processWhisperOutput(transcriptionData);
    } catch (error) {
      if (process.env.NODE_ENV !== 'development') {
        throw error instanceof Error ? error : new Error(String(error));
      }
      // Fallback to local Whisper if not installed (dev only)
      return this.transcribeWithLocalWhisper(audioPath, language, enableKaraoke);
    }
  }

  private async transcribeWithLocalWhisper(
    audioPath: string,
    language: string,
    enableKaraoke: boolean,
  ): Promise<TranscriptionResult> {
    if (process.env.NODE_ENV !== 'development') {
      throw new Error('Transcrição local não configurada em produção');
    }
    // This is a fallback implementation using a local Whisper model
    // In production, you would use a proper Whisper implementation

    const duration = await this.getAudioDuration(audioPath);

    // Mock transcription for demonstration
    // In real implementation, integrate with actual Whisper model
    const mockSegments: TranscriptionSegment[] = [
      {
        id: '1',
        startTime: 0,
        endTime: 5,
        text: 'Bem-vindo ao nosso vídeo técnico',
        words: enableKaraoke
          ? [
              { word: 'Bem-vindo', startTime: 0, endTime: 1, confidence: 0.95 },
              { word: 'ao', startTime: 1, endTime: 1.5, confidence: 0.92 },
              { word: 'nosso', startTime: 1.5, endTime: 2, confidence: 0.94 },
              { word: 'vídeo', startTime: 2, endTime: 3, confidence: 0.96 },
              { word: 'técnico', startTime: 3, endTime: 5, confidence: 0.93 },
            ]
          : [],
        confidence: 0.94,
      },
      {
        id: '2',
        startTime: 5,
        endTime: 10,
        text: 'Vamos aprender sobre desenvolvimento web',
        words: enableKaraoke
          ? [
              { word: 'Vamos', startTime: 5, endTime: 6, confidence: 0.91 },
              { word: 'aprender', startTime: 6, endTime: 7, confidence: 0.93 },
              { word: 'sobre', startTime: 7, endTime: 7.5, confidence: 0.89 },
              { word: 'desenvolvimento', startTime: 7.5, endTime: 9, confidence: 0.95 },
              { word: 'web', startTime: 9, endTime: 10, confidence: 0.97 },
            ]
          : [],
        confidence: 0.92,
      },
    ];

    return {
      segments: mockSegments,
      language,
      duration,
      confidence: 0.93,
      wordCount: mockSegments.reduce((count, segment) => count + segment.words.length, 0),
    };
  }

  private async getAudioDuration(audioPath: string): Promise<number> {
    try {
      const command = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`;
      const { stdout } = await execAsync(command);
      return parseFloat(stdout.trim());
    } catch (error) {
      logger.error(
        'Error getting audio duration:',
        error instanceof Error ? error : new Error(String(error)),
        { component: 'TranscriptionService' },
      );
      return 0;
    }
  }

  private processWhisperOutput(data: WhisperOutput): TranscriptionResult {
    const segments: TranscriptionSegment[] =
      data.segments?.map((segment: WhisperSegment, index: number) => ({
        id: segment.id?.toString() || (index + 1).toString(),
        startTime: segment.start,
        endTime: segment.end,
        text: segment.text?.trim() || '',
        words:
          segment.words?.map((word: WhisperWord) => ({
            word: word.word?.trim() || '',
            startTime: word.start,
            endTime: word.end,
            confidence: word.confidence || 0.9,
          })) || [],
        confidence: segment.confidence || 0.9,
        speaker: segment.speaker,
      })) || [];

    return {
      segments,
      language: data.language || 'pt-BR',
      duration: data.duration || 0,
      confidence:
        data.confidence ||
        (segments.length > 0
          ? segments.reduce((acc, seg) => acc + seg.confidence, 0) / segments.length
          : 0),
      wordCount: segments.reduce((count, segment) => count + segment.words.length, 0),
    };
  }

  generateKaraokeSubtitles(
    transcription: TranscriptionResult,
    style: KaraokeStyle = {
      activeColor: '#00ff00',
      inactiveColor: '#ffffff',
      fontSize: 24,
      fontFamily: 'Arial',
      animationSpeed: 300,
    },
  ): string {
    const assHeader = this.generateASSHeader(style);
    const assEvents = this.generateASSEvents(transcription.segments, style);

    return assHeader + assEvents;
  }

  private generateASSHeader(style: KaraokeStyle): string {
    return `[Script Info]
Title: Karaoke Subtitles
ScriptType: v4.00+
Collisions: Normal
PlayDepth: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${style.fontFamily},${style.fontSize},&H00${style.inactiveColor.replace('#', '')},&H00${style.activeColor.replace('#', '')},&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,2,0,2,10,10,10,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;
  }

  private generateASSEvents(segments: TranscriptionSegment[], style: KaraokeStyle): string {
    return segments
      .map((segment) => {
        const startTime = this.formatASSTime(segment.startTime);
        const endTime = this.formatASSTime(segment.endTime);

        if (segment.words.length > 0) {
          // Karaoke style with word-by-word highlighting
          const karaokeText = segment.words
            .map((word) => {
              const duration = ((word.endTime - word.startTime) * 100) / style.animationSpeed;
              return `{\\k${Math.round(duration)}}${word.word}`;
            })
            .join(' ');

          return `Dialogue: 0,${startTime},${endTime},Default,,0,0,0,,${karaokeText}`;
        } else {
          // Regular subtitle without karaoke effect
          return `Dialogue: 0,${startTime},${endTime},Default,,0,0,0,,${segment.text}`;
        }
      })
      .join('\n');
  }

  private formatASSTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const centisecs = Math.floor((seconds % 1) * 100);

    return `${hours.toString().padStart(1, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${centisecs.toString().padStart(2, '0')}`;
  }

  generateSRT(transcription: TranscriptionResult): string {
    return transcription.segments
      .map((segment, index) => {
        const startTime = this.formatSRTTime(segment.startTime);
        const endTime = this.formatSRTTime(segment.endTime);

        return `${index + 1}\n${startTime} --> ${endTime}\n${segment.text}\n\n`;
      })
      .join('');
  }

  generateVTT(transcription: TranscriptionResult): string {
    const header = 'WEBVTT\n\n';
    const body = transcription.segments
      .map((segment, index) => {
        const startTime = this.formatVTTTime(segment.startTime);
        const endTime = this.formatVTTTime(segment.endTime);

        return `${index + 1}\n${startTime} --> ${endTime}\n${segment.text}\n\n`;
      })
      .join('');
    return header + body;
  }

  private formatSRTTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const millisecs = Math.floor((seconds % 1) * 1000);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${millisecs.toString().padStart(3, '0')}`;
  }

  private formatVTTTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const millisecs = Math.floor((seconds % 1) * 1000);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${millisecs.toString().padStart(3, '0')}`;
  }

  async translateTranscription(
    transcription: TranscriptionResult,
    targetLanguage: string,
    options: {
      preserveTiming?: boolean;
      enableKaraoke?: boolean;
    } = {},
  ): Promise<TranscriptionResult> {
    const { enableKaraoke = true } = options;

    try {
      const translatedTexts = await this.translateTexts(
        transcription.segments.map((segment) => segment.text),
        targetLanguage,
        transcription.language,
      );

      const translatedSegments: TranscriptionSegment[] = await Promise.all(
        transcription.segments.map(async (segment, index) => {
          const translatedText = translatedTexts[index] || segment.text;

          let translatedWords: TranscriptionWord[] = [];
          if (enableKaraoke && segment.words.length > 0) {
            const translatedWordArray = translatedText.split(' ');
            translatedWords = segment.words.map((word, index) => ({
              word: translatedWordArray[index] || word.word,
              startTime: word.startTime,
              endTime: word.endTime,
              confidence: word.confidence * 0.9, // Slightly lower confidence for translation
            }));
          }

          return {
            ...segment,
            text: translatedText,
            words: translatedWords,
          };
        }),
      );

      return {
        ...transcription,
        segments: translatedSegments,
        language: targetLanguage,
      };
    } catch (error) {
      logger.error('Translation error', error instanceof Error ? error : new Error(String(error)), {
        component: 'TranscriptionService',
      });
      throw new Error(`Failed to translate transcription: ${(error as Error).message}`);
    }
  }

  private async translateText(text: string, targetLanguage: string): Promise<string> {
    const results = await this.translateTexts([text], targetLanguage);
    return results[0] || text;
  }

  private resolveTranslationConfig(): TranslationConfig {
    const provider = (process.env.TRANSLATION_PROVIDER || '').toLowerCase() as TranslationProvider;
    const deeplKey = process.env.DEEPL_API_KEY;
    const googleKey = process.env.GOOGLE_TRANSLATE_API_KEY;

    if (provider === 'deepl') {
      if (!deeplKey) {
        throw new Error('DEEPL_API_KEY não configurada para tradução');
      }
      return { provider: 'deepl', apiKey: deeplKey, apiUrl: process.env.DEEPL_API_URL };
    }

    if (provider === 'google') {
      if (!googleKey) {
        throw new Error('GOOGLE_TRANSLATE_API_KEY não configurada para tradução');
      }
      return { provider: 'google', apiKey: googleKey };
    }

    if (deeplKey) {
      return { provider: 'deepl', apiKey: deeplKey, apiUrl: process.env.DEEPL_API_URL };
    }

    if (googleKey) {
      return { provider: 'google', apiKey: googleKey };
    }

    throw new Error(
      'Nenhum provider de tradução configurado (DEEPL_API_KEY/GOOGLE_TRANSLATE_API_KEY)',
    );
  }

  private normalizeDeeplLang(language: string): string {
    const normalized = language.replace('_', '-').toUpperCase();
    if (normalized.startsWith('PT')) return normalized === 'PT' ? 'PT-BR' : normalized;
    if (normalized.startsWith('EN') && !normalized.includes('-')) return 'EN-US';
    return normalized;
  }

  private normalizeGoogleLang(language: string): string {
    return language.split('-')[0].toLowerCase();
  }

  private async translateTexts(
    texts: string[],
    targetLanguage: string,
    sourceLanguage?: string,
  ): Promise<string[]> {
    if (!texts.length) return [];
    const config = this.resolveTranslationConfig();

    if (config.provider === 'deepl') {
      const url = config.apiUrl || 'https://api-free.deepl.com/v2/translate';
      const params = new URLSearchParams();
      params.append('auth_key', config.apiKey);
      texts.forEach((text) => params.append('text', text));
      params.append('target_lang', this.normalizeDeeplLang(targetLanguage));
      if (sourceLanguage) {
        params.append('source_lang', this.normalizeDeeplLang(sourceLanguage));
      }

      const response = await fetch(url, { method: 'POST', body: params });
      if (!response.ok) {
        throw new Error(`DeepL erro ${response.status}: ${await response.text()}`);
      }
      const data = (await response.json()) as { translations?: Array<{ text: string }> };
      if (!data.translations || data.translations.length !== texts.length) {
        throw new Error('Resposta inválida do DeepL');
      }
      return data.translations.map((t) => t.text);
    }

    const googleUrl = `https://translation.googleapis.com/language/translate/v2?key=${config.apiKey}`;
    const googleBody = {
      q: texts,
      target: this.normalizeGoogleLang(targetLanguage),
      ...(sourceLanguage ? { source: this.normalizeGoogleLang(sourceLanguage) } : {}),
    };

    const googleResponse = await fetch(googleUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(googleBody),
    });

    if (!googleResponse.ok) {
      throw new Error(
        `Google Translate erro ${googleResponse.status}: ${await googleResponse.text()}`,
      );
    }

    const googleJson = (await googleResponse.json()) as {
      data?: { translations?: Array<{ translatedText: string }> };
    };
    const translations = googleJson.data?.translations;
    if (!translations || translations.length !== texts.length) {
      throw new Error('Resposta inválida do Google Translate');
    }
    return translations.map((t) => t.translatedText);
  }

  private async cleanupTempFiles(files: string[]): Promise<void> {
    await Promise.all(
      files.map((file) =>
        fs
          .unlink(file)
          .catch((error) =>
            logger.error(
              `Error deleting temp file ${file}`,
              error instanceof Error ? error : new Error(String(error)),
              { component: 'TranscriptionService' },
            ),
          ),
      ),
    );
  }
}
