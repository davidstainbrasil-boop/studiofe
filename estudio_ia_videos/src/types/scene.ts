import type { CanvasScene } from '@components/studio-unified/InteractiveCanvas';

export interface Scene extends CanvasScene {
  duration: number;
  transition: 'fade';
}
