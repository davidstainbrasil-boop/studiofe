/**
 * AI Services Module
 * Provides AI-powered features for video production
 * Uses OpenAI GPT-4 with graceful fallback when API key is not configured
 */

import { logger } from '@lib/logger';

export interface AIService {
  generateScript: (prompt: string) => Promise<string>;
  analyzeContent: (content: string) => Promise<ContentAnalysis>;
  suggestEdits: (videoData: unknown) => Promise<EditSuggestion[]>;
}

export interface ContentAnalysis {
  sentiment: 'positive' | 'neutral' | 'negative';
  topics: string[];
  keywords: string[];
  readabilityScore: number;
}

export interface EditSuggestion {
  type: 'cut' | 'transition' | 'effect' | 'text';
  startTime: number;
  endTime?: number;
  description: string;
  confidence: number;
}

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

async function callOpenAI(
  systemPrompt: string,
  userPrompt: string,
  options?: { jsonMode?: boolean; maxTokens?: number }
): Promise<string> {
  if (!OPENAI_API_KEY || OPENAI_API_KEY === 'not-configured') {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const body: Record<string, unknown> = {
    model: 'gpt-4-turbo-preview',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: options?.maxTokens ?? 2048,
    temperature: 0.7,
  };

  if (options?.jsonMode) {
    body.response_format = { type: 'json_object' };
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }));
    throw new Error(`OpenAI API error ${response.status}: ${err.error?.message || 'Unknown'}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? '';
}

export async function generateScript(prompt: string): Promise<string> {
  try {
    return await callOpenAI(
      'Você é um roteirista profissional de vídeos técnicos de segurança do trabalho (NRs). ' +
      'Gere roteiros claros, objetivos e profissionais em português brasileiro.',
      `Gere um roteiro de vídeo para o seguinte tema:\n\n${prompt}`,
      { maxTokens: 4096 }
    );
  } catch (error) {
    logger.warn('generateScript: OpenAI fallback', { error: (error as Error).message });
    // Fallback: structured template
    return [
      `# Roteiro: ${prompt}`,
      '',
      '## Introdução',
      `Bem-vindos ao treinamento sobre ${prompt}. Neste módulo abordaremos os conceitos fundamentais e práticas essenciais.`,
      '',
      '## Desenvolvimento',
      `O tema ${prompt} é essencial para a segurança no ambiente de trabalho. Vamos detalhar os principais pontos de atenção.`,
      '',
      '## Conclusão',
      'Lembre-se: a prevenção é sempre a melhor ferramenta. Aplique os conceitos aprendidos no seu dia a dia.',
    ].join('\n');
  }
}

export async function analyzeContent(content: string): Promise<ContentAnalysis> {
  try {
    const result = await callOpenAI(
      'Você é um analista de conteúdo especializado em vídeos técnicos. ' +
      'Analise o conteúdo fornecido e retorne um JSON com: sentiment (positive/neutral/negative), topics (array de tópicos), keywords (array de palavras-chave), readabilityScore (0-100).',
      `Analise este conteúdo:\n\n${content.substring(0, 3000)}`,
      { jsonMode: true, maxTokens: 1024 }
    );

    const parsed = JSON.parse(result);
    return {
      sentiment: parsed.sentiment || 'neutral',
      topics: Array.isArray(parsed.topics) ? parsed.topics : [],
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
      readabilityScore: typeof parsed.readabilityScore === 'number' ? parsed.readabilityScore : 75,
    };
  } catch (error) {
    logger.warn('analyzeContent: OpenAI fallback', { error: (error as Error).message });
    // Fallback: basic keyword extraction
    const words = content.toLowerCase().split(/\s+/);
    const wordFreq = new Map<string, number>();
    for (const w of words) {
      if (w.length > 4) wordFreq.set(w, (wordFreq.get(w) || 0) + 1);
    }
    const sorted = [...wordFreq.entries()].sort((a, b) => b[1] - a[1]);
    return {
      sentiment: 'neutral',
      topics: sorted.slice(0, 5).map(([w]) => w),
      keywords: sorted.slice(0, 10).map(([w]) => w),
      readabilityScore: 70,
    };
  }
}

export async function suggestEdits(videoData: unknown): Promise<EditSuggestion[]> {
  try {
    const dataStr = typeof videoData === 'string' ? videoData : JSON.stringify(videoData);
    const result = await callOpenAI(
      'Você é um editor de vídeo profissional. Analise os dados do vídeo e sugira edições. ' +
      'Retorne um JSON array com objetos: { type: "cut"|"transition"|"effect"|"text", startTime: number, endTime: number, description: string, confidence: number(0-1) }.',
      `Dados do vídeo para análise:\n\n${dataStr.substring(0, 3000)}`,
      { jsonMode: true, maxTokens: 2048 }
    );

    const parsed = JSON.parse(result);
    const suggestions = Array.isArray(parsed) ? parsed : (parsed.suggestions || []);
    return suggestions.map((s: Record<string, unknown>) => ({
      type: (s.type as string) || 'text',
      startTime: Number(s.startTime) || 0,
      endTime: s.endTime ? Number(s.endTime) : undefined,
      description: String(s.description || ''),
      confidence: Number(s.confidence) || 0.5,
    }));
  } catch (error) {
    logger.warn('suggestEdits: OpenAI fallback', { error: (error as Error).message });
    return [];
  }
}

export const aiService: AIService = {
  generateScript,
  analyzeContent,
  suggestEdits,
};

export default aiService;
