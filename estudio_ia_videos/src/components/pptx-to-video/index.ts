/**
 * PPTX to Video Components
 *
 * Exports all components for the 3-step PPTX to Video wizard
 */

// Main Wizard
export { PPTXToVideoWizard } from './PPTXToVideoWizard';

// Steps
export { Step1Upload } from './steps/Step1Upload';
export { Step2Customize } from './steps/Step2Customize';
export { Step3Generate } from './steps/Step3Generate';

// Components
export { AvatarPicker } from './components/AvatarPicker';
export { VoicePicker } from './components/VoicePicker';
export { MusicPicker } from './components/MusicPicker';
export { SubtitleToggle } from './components/SubtitleToggle';

// Hooks
export { usePPTXToVideo } from './hooks/usePPTXToVideo';
export type {
  ExtractedSlide,
  SelectedAvatar,
  SelectedVoice,
  VideoSettings,
  GenerationProgress,
  GenerationResult,
  WizardStep,
  PPTXToVideoState,
  UsePPTXToVideoReturn,
} from './hooks/usePPTXToVideo';
