
import 'openai/shims/node';
import { OpenAI } from 'openai';
import { logger } from '../logger';

export interface AIContentGenerationOptions {
  nrType: string;
  audience: string;
  type: string;
  includeQuiz?: boolean;
  duration?: number;
  includeImages?: boolean;
}

export interface GeneratedContentResult {
  title: string;
  content: string;
  slides?: string[];
  questions?: {
    question: string;
    options: string[];
    correct: number;
    explanation: string;
  }[];
  metadata: {
    wordCount: number;
    estimatedDuration: number;
    complexity: string;
    nrCompliance: string[];
    generatedAt: string;
    aiModel: string;
    complianceScore: number;
  };
  suggestions: {
    images?: string[];
    improvements: string[];
  };
}

export interface MetricWithTrend {
  current: number;
  predicted: number;
  confidence: number;
  trend: 'up' | 'down' | 'stable';
}

export interface ScoreCategory {
  score: number;
  maxScore: number;
  category: string;
}

export interface ProjectAnalysisResult {
  projectId: string;
  analysisType: string;
  completedAt: string;
  confidence: number;
  overallScore: number;
  engagementMetrics: {
    retentionRate: MetricWithTrend;
    engagementScore: MetricWithTrend;
    completionRate: MetricWithTrend;
    learningRetention: MetricWithTrend;
  };
  performanceScores: {
    contentQuality: ScoreCategory;
    visualExperience: ScoreCategory;
    audioNarration: ScoreCategory;
    pedagogicalStructure: ScoreCategory;
    complianceNR12: ScoreCategory;
  };
  predictions: {
    successRate: number;
    estimatedViews: number;
    timelinePerformance: { period: string; views: number; growth: string }[];
    riskAnalysis: {
      lowEngagement: number;
      nonCompletion: number;
      complianceIssues: number;
    };
  };
  insights: string[];
  aiRecommendations: {
    id: string;
    priority: 'high' | 'medium' | 'low';
    title: string;
    impact: number;
    confidence: number;
    description: string;
  }[];
}

export class AIContentService {
  private static instance: AIContentService;
  private openai: OpenAI;
  private model = 'gpt-4-turbo-preview'; // Or gpt-4o

  private constructor() {
    if (!process.env.OPENAI_API_KEY) {
      logger.warn('OPENAI_API_KEY not found in environment variables');
    }
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || 'dummy_key', // Allow instantiation but calls will fail if key is missing
    });
  }

  static getInstance(): AIContentService {
    if (!this.instance) {
      this.instance = new AIContentService();
    }
    return this.instance;
  }

  async generateContent(prompt: string, options: AIContentGenerationOptions): Promise<GeneratedContentResult> {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is required for real content generation');
    }

    logger.info('Generating AI content', { prompt, options });

    const systemPrompt = `
      You are an expert Technical Content Creator for Industrial Safety Training (NRs - Normas Regulamentadoras).
      Generate a JSON response strictly following the requested schema.
      The content must be in Portuguese (Brazil).
      
      Context:
      - NR Type: ${options.nrType}
      - Audience: ${options.audience}
      - Format: ${options.type}
      - Duration: ${options.duration || 10} minutes
      
      Your task is to generate high-quality, technically accurate training content.
    `;

    const userPrompt = `
      Generate content for: "${prompt}"
      
      Return a JSON object with this structure:
      {
        "title": "Title",
        "content": "Markdown content...",
        "slides": ["Slide 1 Title - Description", "Slide 2..."],
        "questions": [
          { "question": "...", "options": ["A", "B", "C", "D"], "correct": index_0_based, "explanation": "..." }
        ],
        "metadata": {
          "complexity": "Básico" | "Intermediário" | "Avançado",
          "complianceScore": number (0-100)
        },
        "suggestions": {
          "images": ["image description 1", ...],
          "improvements": ["tip 1", ...]
        }
      }
      
      Requirements:
      - Content must be compliant with ${options.nrType}.
      - Include ${options.includeQuiz ? 'at least 5 quiz questions' : 'no questions'}.
      - Include ${options.includeImages ? 'image descriptions' : 'no image descriptions'}.
      - ${options.type === 'presentation' ? 'Focus on slide structure' : 'Focus on detailed script'}.
    `;

    try {
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      });

      const result = JSON.parse(completion.choices[0].message.content || '{}');
      
      // Post-processing to ensure defaults
      return {
        title: result.title || `Treinamento ${options.nrType}`,
        content: result.content || '',
        slides: result.slides || [],
        questions: result.questions || [],
        metadata: {
          wordCount: (result.content || '').split(' ').length,
          estimatedDuration: options.duration || 10,
          complexity: result.metadata?.complexity || 'Intermediário',
          nrCompliance: [options.nrType.toUpperCase(), 'NR-01'],
          generatedAt: new Date().toISOString(),
          aiModel: this.model,
          complianceScore: result.metadata?.complianceScore || 95
        },
        suggestions: {
          images: result.suggestions?.images || [],
          improvements: result.suggestions?.improvements || []
        }
      };

    } catch (error) {
      logger.error('Failed to generate AI content', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  async analyzeProject(projectId: string, projectContext: any): Promise<ProjectAnalysisResult> {
    if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY is required for real analysis');
    }

    logger.info('Analyzing project', { projectId });

    const systemPrompt = `
      You are an expert Educational Data Analyst and Industrial Safety Specialist.
      Analyze the provided training project context and predict its effectiveness.
      Return a JSON response matching the complex schema required.
      Language: Portuguese (Brazil).
    `;

    const userPrompt = `
      Project Context: ${JSON.stringify(projectContext)}
      
      Analyze:
      1. Engagement Potential
      2. NR Compliance
      3. Pedagogical Structure
      
      Return a JSON object with:
      - engagementMetrics (retention, engagement, completion, learningRetention) - all with current/predicted values
      - performanceScores (contentQuality, visualExperience, audioNarration, pedagogicalStructure, complianceNR12)
      - predictions (successRate, estimatedViews, timelinePerformance, riskAnalysis)
      - insights (list of strings)
      - aiRecommendations (list of objects with id, priority, title, impact, confidence, description)
      - overallScore
      - confidence
    `;

    try {
        const completion = await this.openai.chat.completions.create({
            model: this.model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.4, // Lower temperature for analysis
        });

        const result = JSON.parse(completion.choices[0].message.content || '{}');

        return {
            projectId,
            analysisType: 'full',
            completedAt: new Date().toISOString(),
            confidence: result.confidence || 85,
            overallScore: result.overallScore || 80,
            engagementMetrics: result.engagementMetrics || {
                retentionRate: { current: 0, predicted: 0, confidence: 0, trend: 'stable' },
                engagementScore: { current: 0, predicted: 0, confidence: 0, trend: 'stable' },
                completionRate: { current: 0, predicted: 0, confidence: 0, trend: 'stable' },
                learningRetention: { current: 0, predicted: 0, confidence: 0, trend: 'stable' }
            },
            performanceScores: result.performanceScores || {
                 contentQuality: { score: 0, maxScore: 10, category: 'Qualidade' },
                 visualExperience: { score: 0, maxScore: 10, category: 'Visual' },
                 audioNarration: { score: 0, maxScore: 10, category: 'Áudio' },
                 pedagogicalStructure: { score: 0, maxScore: 10, category: 'Pedagogia' },
                 complianceNR12: { score: 0, maxScore: 10, category: 'Compliance' }
            },
            predictions: result.predictions || {
                successRate: 0,
                estimatedViews: 0,
                timelinePerformance: [],
                riskAnalysis: { lowEngagement: 0, nonCompletion: 0, complianceIssues: 0 }
            },
            insights: result.insights || [],
            aiRecommendations: result.aiRecommendations || []
        };

    } catch (error) {
        logger.error('Failed to analyze project', error instanceof Error ? error : new Error(String(error)));
        throw error;
    }
  }

  async analyzeSpecificContent(type: string, data: any): Promise<any> {
    if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY is required for real analysis');
    }

    logger.info('Analyzing specific content', { type });

    const systemPrompt = `
      You are an expert Content Auditor for Industrial Training.
      Analyze the provided content (${type}) and suggest improvements.
      Focus on NR Compliance, Layout, and Engagement.
      Return a JSON with:
      - analyses: list of objects { id, title, type, priority, confidence, description, suggestion, impact, implementation }
      - metrics: { readability, engagement, visualHarmony, nrCompliance, contentQuality, performance }
    `;

    const userPrompt = `
      Content Data: ${JSON.stringify(data)}
      
      Provide actionable insights.
    `;

    try {
        const completion = await this.openai.chat.completions.create({
            model: this.model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.5,
        });

        const result = JSON.parse(completion.choices[0].message.content || '{}');
        
        return {
            analysis: result.analyses || [],
            metrics: result.metrics || {
                readability: 0,
                engagement: 0,
                visualHarmony: 0,
                nrCompliance: 0,
                contentQuality: 0,
                performance: 0
            },
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        logger.error('Failed to analyze specific content', error instanceof Error ? error : new Error(String(error)));
        throw error;
    }
  }
}
