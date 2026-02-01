/**
 * Translation API - Tradução automática multi-idioma
 * 
 * Endpoints:
 * POST ?operation=translate     - Traduzir texto
 * POST ?operation=translateSlides - Traduzir slides de um projeto
 * POST ?operation=detect        - Detectar idioma do texto
 * GET  ?operation=languages     - Listar idiomas suportados
 * GET  ?operation=status&jobId=xxx - Status de tradução assíncrona
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// ============= TIPOS =============

type SupportedLanguage = 
  | 'pt-BR' | 'pt-PT' | 'en-US' | 'en-GB' | 'es-ES' | 'es-MX' 
  | 'fr-FR' | 'de-DE' | 'it-IT' | 'ja-JP' | 'ko-KR' | 'zh-CN' | 'zh-TW'
  | 'ru-RU' | 'ar-SA' | 'hi-IN' | 'nl-NL' | 'pl-PL' | 'tr-TR' | 'vi-VN';

interface LanguageInfo {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  ttsSupported: boolean;
  rtl: boolean;  // Right-to-left
}

interface TranslationSegment {
  original: string;
  translated: string;
  confidence: number;
}

interface TranslationResult {
  sourceLanguage: SupportedLanguage;
  targetLanguage: SupportedLanguage;
  segments: TranslationSegment[];
  totalCharacters: number;
  translationTime: number;  // ms
}

interface SlideTranslation {
  slideId: string;
  originalContent: string;
  translatedContent: string;
  notes?: {
    original?: string;
    translated?: string;
  };
}

interface TranslationJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  sourceLanguage: SupportedLanguage;
  targetLanguage: SupportedLanguage;
  progress: number;
  result?: TranslationResult | SlideTranslation[];
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

// ============= DADOS DE IDIOMAS =============

const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  { code: 'pt-BR', name: 'Portuguese (Brazil)', nativeName: 'Português (Brasil)', ttsSupported: true, rtl: false },
  { code: 'pt-PT', name: 'Portuguese (Portugal)', nativeName: 'Português (Portugal)', ttsSupported: true, rtl: false },
  { code: 'en-US', name: 'English (US)', nativeName: 'English (US)', ttsSupported: true, rtl: false },
  { code: 'en-GB', name: 'English (UK)', nativeName: 'English (UK)', ttsSupported: true, rtl: false },
  { code: 'es-ES', name: 'Spanish (Spain)', nativeName: 'Español (España)', ttsSupported: true, rtl: false },
  { code: 'es-MX', name: 'Spanish (Mexico)', nativeName: 'Español (México)', ttsSupported: true, rtl: false },
  { code: 'fr-FR', name: 'French', nativeName: 'Français', ttsSupported: true, rtl: false },
  { code: 'de-DE', name: 'German', nativeName: 'Deutsch', ttsSupported: true, rtl: false },
  { code: 'it-IT', name: 'Italian', nativeName: 'Italiano', ttsSupported: true, rtl: false },
  { code: 'ja-JP', name: 'Japanese', nativeName: '日本語', ttsSupported: true, rtl: false },
  { code: 'ko-KR', name: 'Korean', nativeName: '한국어', ttsSupported: true, rtl: false },
  { code: 'zh-CN', name: 'Chinese (Simplified)', nativeName: '简体中文', ttsSupported: true, rtl: false },
  { code: 'zh-TW', name: 'Chinese (Traditional)', nativeName: '繁體中文', ttsSupported: true, rtl: false },
  { code: 'ru-RU', name: 'Russian', nativeName: 'Русский', ttsSupported: true, rtl: false },
  { code: 'ar-SA', name: 'Arabic', nativeName: 'العربية', ttsSupported: true, rtl: true },
  { code: 'hi-IN', name: 'Hindi', nativeName: 'हिन्दी', ttsSupported: true, rtl: false },
  { code: 'nl-NL', name: 'Dutch', nativeName: 'Nederlands', ttsSupported: true, rtl: false },
  { code: 'pl-PL', name: 'Polish', nativeName: 'Polski', ttsSupported: true, rtl: false },
  { code: 'tr-TR', name: 'Turkish', nativeName: 'Türkçe', ttsSupported: true, rtl: false },
  { code: 'vi-VN', name: 'Vietnamese', nativeName: 'Tiếng Việt', ttsSupported: true, rtl: false },
];

// ============= SCHEMAS DE VALIDAÇÃO =============

const TranslateTextSchema = z.object({
  text: z.string().min(1).max(50000),
  sourceLanguage: z.string().optional(),  // Auto-detect se não fornecido
  targetLanguage: z.string(),
  preserveFormatting: z.boolean().default(true),
  glossary: z.record(z.string()).optional(),  // Termos técnicos customizados
});

const TranslateSlidesSchema = z.object({
  projectId: z.string(),
  slides: z.array(z.object({
    id: z.string(),
    content: z.string(),
    notes: z.string().optional(),
  })),
  sourceLanguage: z.string().optional(),
  targetLanguage: z.string(),
  includeNotes: z.boolean().default(true),
  glossary: z.record(z.string()).optional(),
});

const DetectLanguageSchema = z.object({
  text: z.string().min(10).max(5000),
});

// ============= STORAGE IN-MEMORY =============

const translationJobs = new Map<string, TranslationJob>();

// ============= HELPERS =============

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function isValidLanguage(code: string): code is SupportedLanguage {
  return SUPPORTED_LANGUAGES.some(l => l.code === code);
}

function getLanguageInfo(code: string): LanguageInfo | undefined {
  return SUPPORTED_LANGUAGES.find(l => l.code === code);
}

// Simulação de tradução (em produção, usar API como Google Translate, DeepL, etc.)
function mockTranslate(text: string, from: SupportedLanguage, to: SupportedLanguage): string {
  // Mapeamento simplificado para demonstração
  const translations: Record<string, Record<string, string>> = {
    'pt-BR': {
      'en-US': text.replace(/segurança/gi, 'safety')
        .replace(/trabalho/gi, 'work')
        .replace(/treinamento/gi, 'training')
        .replace(/equipamento/gi, 'equipment')
        .replace(/proteção/gi, 'protection')
        .replace(/risco/gi, 'risk')
        .replace(/perigo/gi, 'danger')
        .replace(/acidente/gi, 'accident'),
      'es-ES': text.replace(/segurança/gi, 'seguridad')
        .replace(/trabalho/gi, 'trabajo')
        .replace(/treinamento/gi, 'capacitación')
        .replace(/equipamento/gi, 'equipo')
        .replace(/proteção/gi, 'protección'),
    },
    'en-US': {
      'pt-BR': text.replace(/safety/gi, 'segurança')
        .replace(/work/gi, 'trabalho')
        .replace(/training/gi, 'treinamento')
        .replace(/equipment/gi, 'equipamento')
        .replace(/protection/gi, 'proteção')
        .replace(/risk/gi, 'risco')
        .replace(/danger/gi, 'perigo')
        .replace(/accident/gi, 'acidente'),
      'es-ES': text.replace(/safety/gi, 'seguridad')
        .replace(/work/gi, 'trabajo')
        .replace(/training/gi, 'capacitación'),
    },
  };

  // Tenta encontrar tradução
  const fromTranslations = translations[from];
  if (fromTranslations && fromTranslations[to]) {
    return fromTranslations[to];
  }

  // Fallback: adiciona prefixo indicando idioma de destino
  return `[${to}] ${text}`;
}

// Detecção de idioma simplificada
function detectLanguage(text: string): { language: SupportedLanguage; confidence: number } {
  const lowerText = text.toLowerCase();
  
  // Padrões característicos de cada idioma
  const patterns: Array<{ lang: SupportedLanguage; patterns: RegExp[]; weight: number }> = [
    { 
      lang: 'pt-BR', 
      patterns: [/ção\b/, /ões\b/, /ão\b/, /lh[ao]/, /nh[ao]/, /é\b/, /ê\b/],
      weight: 1 
    },
    { 
      lang: 'es-ES', 
      patterns: [/ción\b/, /ñ/, /¿/, /¡/, /\bel\b/, /\bla\b/, /\bque\b/],
      weight: 1 
    },
    { 
      lang: 'en-US', 
      patterns: [/\bthe\b/, /\band\b/, /\bis\b/, /\bare\b/, /ing\b/, /tion\b/],
      weight: 1 
    },
    { 
      lang: 'fr-FR', 
      patterns: [/\ble\b/, /\bla\b/, /\bles\b/, /\bdes\b/, /\bque\b/, /ç/, /œ/],
      weight: 1 
    },
    { 
      lang: 'de-DE', 
      patterns: [/\bder\b/, /\bdie\b/, /\bdas\b/, /\bund\b/, /ß/, /ü/, /ö/, /ä/],
      weight: 1 
    },
    { 
      lang: 'ja-JP', 
      patterns: [/[\u3040-\u309f]/, /[\u30a0-\u30ff]/, /[\u4e00-\u9faf]/],
      weight: 2 
    },
    { 
      lang: 'zh-CN', 
      patterns: [/[\u4e00-\u9fff]/],
      weight: 2 
    },
    { 
      lang: 'ko-KR', 
      patterns: [/[\uac00-\ud7af]/],
      weight: 2 
    },
    { 
      lang: 'ar-SA', 
      patterns: [/[\u0600-\u06ff]/],
      weight: 2 
    },
    { 
      lang: 'ru-RU', 
      patterns: [/[\u0400-\u04ff]/],
      weight: 2 
    },
  ];

  let bestMatch: { lang: SupportedLanguage; score: number } = { lang: 'en-US', score: 0 };

  for (const { lang, patterns: langPatterns, weight } of patterns) {
    let score = 0;
    for (const pattern of langPatterns) {
      const matches = lowerText.match(new RegExp(pattern, 'g'));
      if (matches) {
        score += matches.length * weight;
      }
    }
    
    if (score > bestMatch.score) {
      bestMatch = { lang, score };
    }
  }

  // Calcular confiança baseado no score
  const maxPossibleScore = text.length / 3;  // Estimativa grosseira
  const confidence = Math.min(0.95, bestMatch.score / maxPossibleScore + 0.5);

  return {
    language: bestMatch.lang,
    confidence: Math.round(confidence * 100) / 100,
  };
}

// Aplicar glossário de termos técnicos
function applyGlossary(text: string, glossary: Record<string, string>): string {
  let result = text;
  for (const [original, translated] of Object.entries(glossary)) {
    const regex = new RegExp(`\\b${original}\\b`, 'gi');
    result = result.replace(regex, translated);
  }
  return result;
}

// Tradução com segmentação
function translateWithSegments(
  text: string, 
  from: SupportedLanguage, 
  to: SupportedLanguage,
  glossary?: Record<string, string>
): TranslationSegment[] {
  // Dividir texto em sentenças
  const sentences = text.split(/(?<=[.!?])\s+/);
  
  return sentences.map(sentence => {
    let translated = mockTranslate(sentence, from, to);
    
    // Aplicar glossário se fornecido
    if (glossary) {
      translated = applyGlossary(translated, glossary);
    }
    
    return {
      original: sentence,
      translated,
      confidence: 0.85 + Math.random() * 0.10,  // Simulado: 85-95%
    };
  });
}

// ============= HANDLERS =============

async function handleTranslate(body: unknown): Promise<NextResponse> {
  const parsed = TranslateTextSchema.safeParse(body);
  
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dados inválidos', details: parsed.error.errors },
      { status: 400 }
    );
  }

  const { text, sourceLanguage, targetLanguage, preserveFormatting, glossary } = parsed.data;

  // Validar idioma de destino
  if (!isValidLanguage(targetLanguage)) {
    return NextResponse.json(
      { error: 'Idioma de destino não suportado', supported: SUPPORTED_LANGUAGES.map(l => l.code) },
      { status: 400 }
    );
  }

  // Detectar idioma se não fornecido
  let source: SupportedLanguage;
  let detectionConfidence = 1;
  
  if (sourceLanguage) {
    if (!isValidLanguage(sourceLanguage)) {
      return NextResponse.json(
        { error: 'Idioma de origem não suportado' },
        { status: 400 }
      );
    }
    source = sourceLanguage;
  } else {
    const detection = detectLanguage(text);
    source = detection.language;
    detectionConfidence = detection.confidence;
  }

  // Não traduzir se origem e destino forem iguais
  if (source === targetLanguage) {
    return NextResponse.json({
      success: true,
      result: {
        sourceLanguage: source,
        targetLanguage,
        segments: [{ original: text, translated: text, confidence: 1 }],
        totalCharacters: text.length,
        translationTime: 0,
        warning: 'Idioma de origem igual ao de destino',
      },
    });
  }

  const startTime = Date.now();
  
  // Traduzir
  const segments = translateWithSegments(text, source, targetLanguage, glossary);
  
  const translationTime = Date.now() - startTime;

  const result: TranslationResult = {
    sourceLanguage: source,
    targetLanguage,
    segments,
    totalCharacters: text.length,
    translationTime,
  };

  return NextResponse.json({
    success: true,
    result,
    metadata: {
      sourceDetected: !sourceLanguage,
      detectionConfidence,
      preservedFormatting: preserveFormatting,
      glossaryApplied: !!glossary,
    },
  });
}

async function handleTranslateSlides(body: unknown): Promise<NextResponse> {
  const parsed = TranslateSlidesSchema.safeParse(body);
  
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dados inválidos', details: parsed.error.errors },
      { status: 400 }
    );
  }

  const { projectId, slides, sourceLanguage, targetLanguage, includeNotes, glossary } = parsed.data;

  if (!isValidLanguage(targetLanguage)) {
    return NextResponse.json(
      { error: 'Idioma de destino não suportado' },
      { status: 400 }
    );
  }

  // Detectar idioma do primeiro slide se não fornecido
  let source: SupportedLanguage;
  if (sourceLanguage && isValidLanguage(sourceLanguage)) {
    source = sourceLanguage;
  } else {
    const sampleText = slides.slice(0, 3).map(s => s.content).join(' ');
    source = detectLanguage(sampleText).language;
  }

  // Criar job assíncrono para tradução de slides (pode demorar)
  const jobId = generateId('translation-job');
  
  const job: TranslationJob = {
    id: jobId,
    status: 'pending',
    sourceLanguage: source,
    targetLanguage,
    progress: 0,
    createdAt: new Date(),
  };

  translationJobs.set(jobId, job);

  // Simular processamento assíncrono
  setTimeout(() => {
    const currentJob = translationJobs.get(jobId);
    if (!currentJob) return;

    currentJob.status = 'processing';
    translationJobs.set(jobId, currentJob);

    // Traduzir slides
    const translatedSlides: SlideTranslation[] = slides.map((slide, index) => {
      // Atualizar progresso
      currentJob.progress = Math.round(((index + 1) / slides.length) * 100);
      translationJobs.set(jobId, currentJob);

      let translatedContent = mockTranslate(slide.content, source, targetLanguage);
      if (glossary) {
        translatedContent = applyGlossary(translatedContent, glossary);
      }

      const result: SlideTranslation = {
        slideId: slide.id,
        originalContent: slide.content,
        translatedContent,
      };

      if (includeNotes && slide.notes) {
        let translatedNotes = mockTranslate(slide.notes, source, targetLanguage);
        if (glossary) {
          translatedNotes = applyGlossary(translatedNotes, glossary);
        }
        result.notes = {
          original: slide.notes,
          translated: translatedNotes,
        };
      }

      return result;
    });

    currentJob.status = 'completed';
    currentJob.progress = 100;
    currentJob.result = translatedSlides;
    currentJob.completedAt = new Date();
    translationJobs.set(jobId, currentJob);
  }, 100);  // Simula processamento

  return NextResponse.json({
    success: true,
    jobId,
    status: 'pending',
    message: 'Tradução iniciada. Use GET ?operation=status&jobId=xxx para acompanhar.',
    projectId,
    slideCount: slides.length,
    sourceLanguage: source,
    targetLanguage,
  }, { status: 202 });
}

async function handleDetectLanguage(body: unknown): Promise<NextResponse> {
  const parsed = DetectLanguageSchema.safeParse(body);
  
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dados inválidos', details: parsed.error.errors },
      { status: 400 }
    );
  }

  const { text } = parsed.data;
  const detection = detectLanguage(text);
  const languageInfo = getLanguageInfo(detection.language);

  return NextResponse.json({
    success: true,
    detection: {
      language: detection.language,
      confidence: detection.confidence,
      languageName: languageInfo?.name,
      nativeName: languageInfo?.nativeName,
      ttsSupported: languageInfo?.ttsSupported ?? false,
      rtl: languageInfo?.rtl ?? false,
    },
    sampleText: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
  });
}

async function handleListLanguages(): Promise<NextResponse> {
  // Agrupar por região
  const grouped = {
    americas: SUPPORTED_LANGUAGES.filter(l => 
      ['pt-BR', 'en-US', 'es-MX'].includes(l.code)
    ),
    europe: SUPPORTED_LANGUAGES.filter(l => 
      ['pt-PT', 'en-GB', 'es-ES', 'fr-FR', 'de-DE', 'it-IT', 'nl-NL', 'pl-PL', 'ru-RU'].includes(l.code)
    ),
    asia: SUPPORTED_LANGUAGES.filter(l => 
      ['ja-JP', 'ko-KR', 'zh-CN', 'zh-TW', 'hi-IN', 'vi-VN', 'tr-TR'].includes(l.code)
    ),
    middleEast: SUPPORTED_LANGUAGES.filter(l => 
      ['ar-SA'].includes(l.code)
    ),
  };

  return NextResponse.json({
    success: true,
    languages: SUPPORTED_LANGUAGES,
    grouped,
    total: SUPPORTED_LANGUAGES.length,
    ttsSupported: SUPPORTED_LANGUAGES.filter(l => l.ttsSupported).length,
    rtlLanguages: SUPPORTED_LANGUAGES.filter(l => l.rtl).map(l => l.code),
  });
}

async function handleGetJobStatus(jobId: string): Promise<NextResponse> {
  const job = translationJobs.get(jobId);
  
  if (!job) {
    return NextResponse.json(
      { error: 'Job não encontrado' },
      { status: 404 }
    );
  }

  const response: Record<string, unknown> = {
    success: true,
    job: {
      id: job.id,
      status: job.status,
      sourceLanguage: job.sourceLanguage,
      targetLanguage: job.targetLanguage,
      progress: job.progress,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
    },
  };

  if (job.status === 'completed' && job.result) {
    response.result = job.result;
  }

  if (job.status === 'failed' && job.error) {
    response.error = job.error;
  }

  return NextResponse.json(response);
}

// ============= ROUTE HANDLERS =============

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const operation = searchParams.get('operation') || 'languages';

  try {
    switch (operation) {
      case 'languages':
        return handleListLanguages();

      case 'status': {
        const jobId = searchParams.get('jobId');
        if (!jobId) {
          return NextResponse.json({ error: 'jobId é obrigatório' }, { status: 400 });
        }
        return handleGetJobStatus(jobId);
      }

      default:
        return NextResponse.json(
          { error: 'Operação não reconhecida', validOperations: ['languages', 'status'] },
          { status: 400 }
        );
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro interno', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const operation = searchParams.get('operation') || 'translate';

  try {
    const body = await req.json();

    switch (operation) {
      case 'translate':
        return handleTranslate(body);

      case 'translateSlides':
        return handleTranslateSlides(body);

      case 'detect':
        return handleDetectLanguage(body);

      default:
        return NextResponse.json(
          { error: 'Operação não reconhecida', validOperations: ['translate', 'translateSlides', 'detect'] },
          { status: 400 }
        );
    }
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Erro interno', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
