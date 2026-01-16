
import { TimelineProject } from '@lib/types/timeline-types';

export interface RemotionTimelineProps {
  tracks: Array<{
    id: string;
    name: string;
    type: string;
    elements: Array<{
      id: string;
      type: string;
      name?: string;
      startTime: number;
      duration: number;
      content: string | null;
      properties: Record<string, any>;
      style?: any;
      animation?: any;
    }>
  }>;
}

export const mapProjectToRemotionProps = (project: TimelineProject): RemotionTimelineProps => {
  if (!project.layers) return { tracks: [] };

  return {
    tracks: project.layers.map(layer => ({
      id: layer.id,
      name: layer.name,
      type: layer.type,
      elements: (layer.items || []).map(item => ({
        id: item.id,
        type: item.type,
        name: item.name,
        startTime: item.start,
        duration: item.duration,
        content: item.source,
        properties: item.properties || {},
        style: item.data?.style,
        animation: item.data?.animation
      }))
    }))
  };
};
