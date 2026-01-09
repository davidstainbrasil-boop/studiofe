import { OpenAI } from 'openai';

export interface ScriptGenerationParams {
  nr: string;
  topics: string[];
  duration: number;
  audience: string;
  company_context?: string;
}

export interface ScriptScene {
  id: string;
  title: string;
  content: string;
  duration: number;
  avatar_instructions: string;
  visual_cues: string[];
  safety_highlights: string[];
}

export interface GeneratedScript {
  title: string;
  scenes: ScriptScene[];
  total_duration: number;
  compliance_notes: string[];
  engagement_tips: string[];
}

export class AIScriptGeneratorService {
  private static openai: OpenAI | null = null;

  private static getClient(): OpenAI | null {
    if (process.env.OPENAI_API_KEY && !this.openai) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
    return this.openai;
  }

  static async generate(params: ScriptGenerationParams): Promise<GeneratedScript> {
    const client = this.getClient();

    if (client) {
      try {
        console.log('[AIScriptGenerator] Using OpenAI API');
        return await this.generateWithOpenAI(client, params);
      } catch (error) {
        console.error('[AIScriptGenerator] OpenAI Error, falling back to mock:', error);
        return this.generateMock(params);
      }
    } else {
      console.log('[AIScriptGenerator] No API Key found, using Mock Generator');
      return this.generateMock(params);
    }
  }

  private static async generateWithOpenAI(client: OpenAI, params: ScriptGenerationParams): Promise<GeneratedScript> {
    const systemPrompt = `
      Você é um especialista em Segurança do Trabalho (SST) e Roteirista de Vídeos Profissionais.
      Sua tarefa é criar um roteiro técnico para um vídeo de treinamento sobre NRs (Normas Regulamentadoras).
      
      Estruture a resposta estritamente em JSON com o seguinte formato:
      {
        "title": "Título do Vídeo",
        "total_duration": number (minutos),
        "scenes": [
          {
            "id": "scene-1",
            "title": "Título da Cena",
            "duration": number (minutos),
            "content": "Texto falado pelo avatar...",
            "avatar_instructions": "Como o avatar deve se comportar",
            "visual_cues": ["lista", "de", "elementos", "visuais"],
            "safety_highlights": ["pontos", "chave", "de", "segurança"]
          }
        ],
        "compliance_notes": ["nota 1", "nota 2"],
        "engagement_tips": ["dica 1", "dica 2"]
      }

      O público alvo é: ${params.audience}.
      O contexto da empresa é: ${params.company_context || 'Indústria Geral'}.
    `;

    const userPrompt = `
      Gere um roteiro para a norma ${params.nr}.
      Duração estimada: ${params.duration} minutos.
      Tópicos obrigatórios:
      ${params.topics.map(t => `- ${t}`).join('\n')}
    `;

    const response = await client.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error('Empty response from OpenAI');

    return JSON.parse(content) as GeneratedScript;
  }

  private static generateMock(params: ScriptGenerationParams): GeneratedScript {
    // Determine tone based on audience
    const isOperational = params.audience.toLowerCase().includes('operador');
    const tone = isOperational ? 'direto e prático' : 'técnico e gerencial';

    const scenes: ScriptScene[] = params.topics.map((topic, index) => ({
      id: `scene-${index + 1}`,
      title: `Módulo ${index + 1}: ${topic}`,
      duration: Math.ceil(params.duration / params.topics.length),
      content: `[Tom ${tone}] Nesta etapa vamos abordar ${topic}. É fundamental entender que... (Conteúdo simulado detalhado sobre ${topic} para ${params.nr}). Lembre-se: a prevenção é a melhor ferramenta.`,
      avatar_instructions: index === 0 ? 'Apresentação formal, gestos de boas vindas' : 'Postura séria, enfatizando pontos críticos com as mãos',
      visual_cues: ['Slide com Tópicos', `Ícone de ${topic}`, 'Vídeo de fundo: Ambiente Industrial'],
      safety_highlights: [`Risco crítico associado a ${topic}`, 'Procedimento de emergência padrão']
    }));

    // Add Intro and Outro if duration allows
    if (scenes.length > 0) {
      scenes.unshift({
        id: 'scene-intro',
        title: 'Introdução e Objetivos',
        duration: 2,
        content: `Olá equipe. Bem-vindos ao treinamento oficial sobre ${params.nr}. Hoje focaremos na segurança em ${params.company_context || 'nossa operação'}.`,
        avatar_instructions: 'Sorriso profissional, contato visual direto',
        visual_cues: ['Logo da Empresa', 'Título do Treinamento'],
        safety_highlights: ['Compromisso com a Vida', 'Meta Zero Acidentes']
      });
    }

    return {
      title: `Treinamento Oficial: ${params.nr}`,
      total_duration: params.duration,
      scenes: scenes,
      compliance_notes: [
        `Conteúdo alinhado com a revisão 2024 da ${params.nr}`,
        'Necessário validação do SESMT local'
      ],
      engagement_tips: [
        'Realizar quiz prático após cada módulo',
        'Discutir "quase acidentes" relacionados aos temas'
      ]
    };
  }
}
