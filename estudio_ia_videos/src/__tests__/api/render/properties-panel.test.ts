/**
 * Tests for PropertiesPanel component
 * Tests: element selection, property editing, empty state
 */

import { useEditorStore } from '@/app/editor/pro/stores/useEditorStore';
import type { CanvasElement } from '@/app/editor/pro/stores/useEditorStore';

describe('PropertiesPanel Store Integration', () => {
  beforeEach(() => {
    // Reset store state
    useEditorStore.setState({
      elements: [],
      selectedId: null,
      tracks: [
        { id: 'track-1', name: 'Video 1', type: 'video' },
        { id: 'track-2', name: 'Audio 1', type: 'audio' },
      ],
      currentTime: 0,
      duration: 30000,
      isPlaying: false,
      zoom: 100,
      subtitles: [],
      activeVideoElements: new Map(),
    });
  });

  it('should return null when no element is selected', () => {
    const state = useEditorStore.getState();
    expect(state.selectedId).toBeNull();
    const selected = state.elements.find(el => el.id === state.selectedId);
    expect(selected).toBeUndefined();
  });

  it('should select an element', () => {
    const store = useEditorStore.getState();
    
    // Add element
    store.addElement({
      id: 'test-shape-1',
      type: 'shape',
      x: 100,
      y: 200,
      width: 150,
      height: 100,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      fill: '#ff0000',
      zIndex: 0,
    });

    // Select it
    store.selectElement('test-shape-1');
    
    const state = useEditorStore.getState();
    expect(state.selectedId).toBe('test-shape-1');
    
    const selected = state.elements.find(el => el.id === 'test-shape-1');
    expect(selected).toBeDefined();
    expect(selected?.x).toBe(100);
    expect(selected?.y).toBe(200);
  });

  it('should update element properties', () => {
    const store = useEditorStore.getState();
    
    // Add and select element
    store.addElement({
      id: 'test-text-1',
      type: 'text',
      x: 50,
      y: 50,
      width: 200,
      height: 40,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      text: 'Hello',
      fill: '#000000',
      zIndex: 0,
    });

    // Update properties
    store.updateElement('test-text-1', {
      x: 300,
      y: 150,
      rotation: 45,
      text: 'Updated Text',
      fill: '#ff6600',
    });

    const state = useEditorStore.getState();
    const element = state.elements.find(el => el.id === 'test-text-1');
    
    expect(element?.x).toBe(300);
    expect(element?.y).toBe(150);
    expect(element?.rotation).toBe(45);
    expect(element?.text).toBe('Updated Text');
    expect(element?.fill).toBe('#ff6600');
  });

  it('should clear selection when element is removed', () => {
    const store = useEditorStore.getState();
    
    store.addElement({
      id: 'to-remove',
      type: 'shape',
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      zIndex: 0,
    });

    store.selectElement('to-remove');
    expect(useEditorStore.getState().selectedId).toBe('to-remove');

    store.removeElement('to-remove');
    
    const state = useEditorStore.getState();
    expect(state.selectedId).toBeNull();
    expect(state.elements.length).toBe(0);
  });

  it('should manage subtitle CRUD operations', () => {
    const store = useEditorStore.getState();

    // Add subtitle
    store.addSubtitle({
      id: 'sub-1',
      text: 'Test subtitle',
      startTime: 1000,
      endTime: 3000,
      style: { fontSize: 24, fontFamily: 'Arial', fill: 'white', align: 'center' },
    });

    let state = useEditorStore.getState();
    expect(state.subtitles).toHaveLength(1);
    expect(state.subtitles[0].text).toBe('Test subtitle');

    // Update subtitle
    store.updateSubtitle('sub-1', { text: 'Updated subtitle' });
    state = useEditorStore.getState();
    expect(state.subtitles[0].text).toBe('Updated subtitle');

    // Delete subtitle
    store.deleteSubtitle('sub-1');
    state = useEditorStore.getState();
    expect(state.subtitles).toHaveLength(0);
  });

  it('should add elements with timeline defaults', () => {
    const store = useEditorStore.getState();
    store.setCurrentTime(5000);

    store.addElement({
      id: 'timed-element',
      type: 'image',
      x: 0,
      y: 0,
      width: 640,
      height: 480,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      src: 'https://example.com/image.png',
      zIndex: 0,
    });

    const state = useEditorStore.getState();
    const element = state.elements.find(el => el.id === 'timed-element');
    
    expect(element?.startTime).toBe(5000);
    expect(element?.duration).toBe(5000); // default 5s
    expect(element?.trackId).toBe('track-1');
  });
});
