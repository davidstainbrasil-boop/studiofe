/**
 * 📚 PPTX Parsers - Exportações Centralizadas
 * 
 * Este módulo exporta todos os parsers e tipos para facilitar importação
 */

// ===== PARSERS =====
export { PPTXTextParser, extractTextFromSlide } from './text-parser';
export { PPTXImageParser } from './image-parser';
export { PPTXLayoutParser, detectSlideLayout } from './layout-parser';
export { PPTXNotesParser, extractSpeakerNotes, extractAllSpeakerNotes } from './notes-parser';
export { SlideDurationCalculator, calculateSlideDuration, calculatePresentationDuration } from './duration-calculator';
export { PPTXAnimationParser, extractSlideAnimations, extractAllSlideAnimations } from './animation-parser';
export { PPTXAdvancedParser, parseCompletePPTX, parseCompleteSlide } from './advanced-parser';
export { PPTXThemeParser, extractPPTXTheme, themeToCSS } from './theme-parser';

// ===== TIPOS: TEXT PARSER =====
export type {
  SlideTextBoxSummary,
  SlideTextBoxPosition,
  SlideTextFormatting,
  SlideHyperlink,
  SlideTextExtractionResult,
} from './text-parser';

// ===== TIPOS: IMAGE PARSER =====
export type {
  ImageExtractionOptions,
  ExtractedImage,
  ImageExtractionResult,
} from './image-parser';

// ===== TIPOS: LAYOUT PARSER =====
export type {
  SlideLayoutInfo,
  SlideLayoutElement,
  SlideContentAnalysis,
  SlideLayoutDetectionResult,
} from './layout-parser';

// ===== TIPOS: NOTES PARSER =====
export type {
  SpeakerNotesResult,
} from './notes-parser';

// ===== TIPOS: DURATION CALCULATOR =====
export type {
  SlideDurationResult,
  DurationCalculationOptions,
} from './duration-calculator';

// ===== TIPOS: ANIMATION PARSER =====
export type {
  SlideTransition,
  AnimationEffect,
  SlideAnimationResult,
} from './animation-parser';

// ===== TIPOS: ADVANCED PARSER =====
export type {
  CompleteSlideData,
  CompletePPTXData,
  AdvancedParsingOptions,
} from './advanced-parser';

// ===== TIPOS: THEME PARSER =====
export type {
  ThemeColor,
  ThemeFont,
  ThemeFonts,
  ThemeBackground,
  PPTXTheme,
  ThemeExtractionResult,
} from './theme-parser';
