/**
 * AI-Powered Content Suggestions Engine
 * Rule-based content analysis and suggestions for video improvement
 */

import { logger } from '@lib/logger';
import type { SceneAnalysis } from './scene-detector.service';

export interface ContentSuggestion {
  id: string;
  type: 'content' | 'structure' | 'visual' | 'audio' | 'timing' | 'engagement';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  impact: { userExperience: number; technical: number; retention: number; conversion: number };
  suggestion: { action: string; details: Record<string, unknown>; automated: boolean; effort: 'low' | 'medium' | 'high' };
  confidence: number;
  reasoning: string[];
  evidence: string[];
}

export interface SuggestionContentAnalysis {
  summary: string;
  type: 'educational' | 'marketing' | 'entertainment' | 'corporate' | 'tutorial';
  audience: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  topics: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  complexity: 'simple' | 'moderate' | 'complex' | 'expert';
  duration: number;
  engagement_prediction: number;
  quality_score: number;
  visualComplexity?: 'low' | 'medium' | 'high';
}

export class AIContentSuggestions {
  private static instance: AIContentSuggestions;
  private suggestionHistory = new Map<string, ContentSuggestion[]>();

  private constructor() {}

  static getInstance(): AIContentSuggestions {
    if (!AIContentSuggestions.instance) {
      AIContentSuggestions.instance = new AIContentSuggestions();
    }
    return AIContentSuggestions.instance;
  }

  async generateSuggestions(
    sceneAnalysis: SceneAnalysis,
    _userInput?: string,
    _context?: Record<string, unknown>
  ): Promise<ContentSuggestion[]> {
    try {
      logger.info('Generating content suggestions', { service: 'AIContentSuggestions' });

      const contentAnalysis = this.analyzeContent(sceneAnalysis);

      const allSuggestions: ContentSuggestion[] = [
        ...this.generateContentSuggestions(contentAnalysis),
        ...this.generateVisualSuggestions(contentAnalysis),
        ...this.generateStructureSuggestions(contentAnalysis),
        ...this.generateEngagementSuggestions(contentAnalysis),
        ...this.generateTimingSuggestions(contentAnalysis),
        ...this.generateAccessibilitySuggestions()
      ];

      const filtered = allSuggestions
        .filter(s => s.confidence > 0.5)
        .sort((a, b) => {
          const score = (p: string) => p === 'critical' ? 4 : p === 'high' ? 3 : p === 'medium' ? 2 : 1;
          return score(b.priority) - score(a.priority);
        })
        .slice(0, 10);

      this.suggestionHistory.set(sceneAnalysis.id, filtered);
      logger.info('Content suggestions generated', { count: filtered.length, service: 'AIContentSuggestions' });
      return filtered;
    } catch (error) {
      logger.error('Content suggestions failed', error instanceof Error ? error : new Error(String(error)), { service: 'AIContentSuggestions' });
      return [];
    }
  }

  private analyzeContent(scene: SceneAnalysis): SuggestionContentAnalysis {
    const avgBrightness = scene.scenes.length > 0
      ? scene.scenes.reduce((s, sc) => s + sc.metadata.visualFeatures.brightness, 0) / scene.scenes.length
      : 0.5;
    const hasText = scene.scenes.some(s => s.metadata.contentAnalysis.hasText);
    const highMotion = scene.scenes.filter(s => s.metadata.motionAnalysis.motionLevel === 'high').length;

    let type: SuggestionContentAnalysis['type'] = 'tutorial';
    if (hasText && highMotion === 0) type = 'educational';
    else if (highMotion > scene.scenes.length / 2) type = 'entertainment';

    const complexity: SuggestionContentAnalysis['complexity'] =
      scene.scenes.length > 10 ? 'complex' : scene.scenes.length > 5 ? 'moderate' : 'simple';

    return {
      summary: `Video with ${scene.scenes.length} scenes, ${scene.duration}s duration`,
      type,
      audience: complexity === 'complex' ? 'advanced' : 'intermediate',
      topics: hasText ? ['text_content', 'presentation'] : ['visual_content'],
      sentiment: avgBrightness > 0.6 ? 'positive' : avgBrightness > 0.3 ? 'neutral' : 'negative',
      complexity,
      duration: scene.duration,
      engagement_prediction: Math.min(1, 0.3 + (scene.scenes.length * 0.05)),
      quality_score: scene.quality.overall === 'excellent' ? 0.9 : scene.quality.overall === 'good' ? 0.7 : 0.5
    };
  }

  private makeSuggestion(
    id: string,
    type: ContentSuggestion['type'],
    priority: ContentSuggestion['priority'],
    title: string,
    description: string,
    action: string,
    confidence: number,
    reasoning: string[]
  ): ContentSuggestion {
    return {
      id, type, priority, title, description,
      impact: { userExperience: 0.5, technical: 0.3, retention: 0.4, conversion: 0.2 },
      suggestion: { action, details: {}, automated: false, effort: 'medium' },
      confidence,
      reasoning,
      evidence: reasoning
    };
  }

  private generateContentSuggestions(analysis: SuggestionContentAnalysis): ContentSuggestion[] {
    const suggestions: ContentSuggestion[] = [];

    if (analysis.type === 'educational') {
      suggestions.push(this.makeSuggestion(
        'content_edu_1', 'content', 'high', 'Enhance Educational Content',
        'Add learning objectives and clear explanations',
        'Add clear learning objectives at the beginning',
        0.8, ['Content identified as educational']
      ));
    }

    if (analysis.complexity === 'simple' && analysis.topics.length < 3) {
      suggestions.push(this.makeSuggestion(
        'content_depth_1', 'content', 'medium', 'Add More Depth',
        'Content appears too simple for target audience',
        'Add detailed explanations and examples',
        0.7, ['Content analysis shows limited depth']
      ));
    }

    if (analysis.sentiment === 'negative') {
      suggestions.push(this.makeSuggestion(
        'content_sentiment_1', 'content', 'high', 'Improve Content Sentiment',
        'Content has negative sentiment detected',
        'Rephrase with positive language',
        0.9, ['Negative sentiment detected']
      ));
    }

    return suggestions;
  }

  private generateVisualSuggestions(analysis: SuggestionContentAnalysis): ContentSuggestion[] {
    const suggestions: ContentSuggestion[] = [];

    if (analysis.topics.includes('data') || analysis.topics.includes('financial')) {
      suggestions.push(this.makeSuggestion(
        'visual_color_1', 'visual', 'medium', 'Optimize for Data Visualization',
        'Colors need optimization for data presentation',
        'Use colorblind-safe palette',
        0.8, ['Data content detected']
      ));
    }

    suggestions.push(this.makeSuggestion(
      'visual_typography_1', 'visual', 'medium', 'Improve Typography',
      'Text readability could be improved',
      'Enhance text hierarchy and contrast',
      0.6, ['Text readability improvement recommended']
    ));

    return suggestions;
  }

  private generateStructureSuggestions(analysis: SuggestionContentAnalysis): ContentSuggestion[] {
    const suggestions: ContentSuggestion[] = [];

    if (analysis.duration > 300 && analysis.complexity !== 'simple') {
      suggestions.push(this.makeSuggestion(
        'structure_pacing_1', 'structure', 'high', 'Optimize Content Pacing',
        'Long content may lose viewer attention',
        'Add strategic pacing points',
        0.8, ['Long duration without proper pacing']
      ));
    }

    if (analysis.audience === 'advanced' && analysis.topics.length > 1) {
      suggestions.push(this.makeSuggestion(
        'structure_cta_1', 'structure', 'medium', 'Add Call to Action Elements',
        'Advanced audience needs clear action prompts',
        'Add interactive CTAs and clear next steps',
        0.8, ['Advanced audience needs action elements']
      ));
    }

    return suggestions;
  }

  private generateEngagementSuggestions(analysis: SuggestionContentAnalysis): ContentSuggestion[] {
    const suggestions: ContentSuggestion[] = [];

    if (analysis.engagement_prediction < 0.3) {
      suggestions.push(this.makeSuggestion(
        'engagement_interactive_1', 'engagement', 'high', 'Add Interactive Elements',
        'Low engagement prediction detected',
        'Add quizzes, polls, and interactive demonstrations',
        0.9, ['Low engagement score']
      ));
    }

    if (analysis.audience === 'intermediate' && analysis.duration > 60) {
      suggestions.push(this.makeSuggestion(
        'engagement_gamification_1', 'engagement', 'medium', 'Add Gamification',
        'Add gamification to improve engagement',
        'Add points, badges, and progress tracking',
        0.7, ['Intermediate audience benefits from gamification']
      ));
    }

    return suggestions;
  }

  private generateTimingSuggestions(analysis: SuggestionContentAnalysis): ContentSuggestion[] {
    const suggestions: ContentSuggestion[] = [];

    if (analysis.engagement_prediction < 0.4) {
      suggestions.push(this.makeSuggestion(
        'timing_attention_1', 'timing', 'medium', 'Improve Attention Retention',
        'Content may lose viewer attention',
        'Add highlight points and reduce cognitive load',
        0.8, ['Poor engagement prediction']
      ));
    }

    if (analysis.duration > 600) {
      suggestions.push(this.makeSuggestion(
        'timing_duration_1', 'timing', 'high', 'Optimize Session Duration',
        'Video is very long for typical sessions',
        'Break into shorter segments of 5 minutes',
        0.9, ['Excessive duration']
      ));
    }

    return suggestions;
  }

  private generateAccessibilitySuggestions(): ContentSuggestion[] {
    return [
      this.makeSuggestion(
        'a11y_color_1', 'content', 'high', 'Improve Color Accessibility',
        'Ensure WCAG 2.1 AA color contrast compliance',
        'Implement color contrast validation',
        0.8, ['Accessibility guidelines recommend contrast improvements']
      ),
      this.makeSuggestion(
        'a11y_text_1', 'content', 'medium', 'Improve Text Accessibility',
        'Use high contrast colors and larger fonts',
        'Apply 16px+ font sizes and sans-serif fonts',
        0.7, ['Text accessibility improvement needed']
      )
    ];
  }

  async getSuggestionHistory(limit = 50): Promise<ContentSuggestion[]> {
    return Array.from(this.suggestionHistory.values()).flat().slice(-limit);
  }

  async cleanup(): Promise<void> {
    this.suggestionHistory.clear();
    logger.info('AIContentSuggestions cleaned up', { service: 'AIContentSuggestions' });
  }
}

export const aiContentSuggestions = AIContentSuggestions.getInstance();
