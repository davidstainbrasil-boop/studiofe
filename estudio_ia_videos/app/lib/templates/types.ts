
import { TimelineTrack } from '../timeline/types';

export interface VideoTemplate {
  id: string;
  name: string;
  category: string;
  thumbnail?: string;
  duration: number;
  tracks: TimelineTrack[];
  variables: TemplateVariable[];
}

export interface TemplateVariable {
  id: string;
  name: string;
  type: 'text' | 'image' | 'color' | 'video';
  defaultValue: any;
  description: string;
}
