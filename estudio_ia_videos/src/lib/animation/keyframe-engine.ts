import { getProject, types, ISheet, IProject } from '@theatre/core';
import studio from '@theatre/studio';

export class KeyframeEngine {
  private project: IProject;
  private sheet: ISheet;
  private objects: Map<string, any>;

  constructor(projectName: string) {
    // Only initialize studio in browser environment
    if (typeof window !== 'undefined') {
        this.project = getProject(projectName);
        this.sheet = this.project.sheet('Main');
        this.objects = new Map();

        // Initialize studio UI
        studio.initialize();
    } else {
        // Fallback for SSR
        this.project = {} as IProject;
        this.sheet = {} as ISheet;
        this.objects = new Map();
    }
  }

  registerElement(elementId: string, properties: Record<string, any>) {
    if (typeof window === 'undefined') return null;

    const config: Record<string, any> = {};

    // Convert properties to Theatre.js types
    for (const [key, value] of Object.entries(properties)) {
      if (typeof value === 'number') {
        config[key] = types.number(value, { range: [0, 1000] }); // Generic range
      } else if (key === 'position') {
        config[key] = types.compound({
          x: types.number(value.x || 0),
          y: types.number(value.y || 0)
        });
      } else if (key === 'scale') {
        config[key] = types.compound({
          x: types.number(value.x || 1),
          y: types.number(value.y || 1)
        });
      } else if (key === 'rotation') {
        config[key] = types.number(value || 0, { range: [0, 360] });
      } else if (key === 'opacity') {
        config[key] = types.number(value ?? 1, { range: [0, 1] });
      } else if (key === 'fill') {
          config[key] = types.rgba({ r: 255, g: 255, b: 255, a: 1 }); // placeholder
      }
    }

    const obj = this.sheet.object(elementId, config, { reconfigure: true });
    this.objects.set(elementId, obj);

    return obj;
  }

  animate(elementId: string, callback: (values: any) => void) {
    const obj = this.objects.get(elementId);
    if (!obj) return;

    return obj.onValuesChange(callback);
  }

  play() {
    this.sheet.sequence.play();
  }

  pause() {
    this.sheet.sequence.pause();
  }

  seek(time: number) {
    this.sheet.sequence.position = time;
  }
}
