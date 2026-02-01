'use client';

/**
 * Professional Studio - Página Principal
 * Editor profissional e intuitivo com Timeline multicamada
 * Integra todos os componentes: Avatar Library, Properties Panel, Asset Library, etc.
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Button } from '@components/ui/button';
import { Separator } from '@components/ui/separator';
import { Label } from '@components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@components/ui/tabs';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@components/ui/resizable';
import {
  Play,
  Pause,
  Square,
  Save,
  Download,
  Settings,
  Layers,
  User,
  Image,
  Music,
  Type,
  Sparkles,
  Eye,
  Maximize,
  ChevronLeft,
  ChevronRight,
  Folder,
  Clock,
  Zap,
  Undo2,
  Redo2,
  Upload,
} from 'lucide-react';
import { cn } from '@lib/utils';
import { toast } from 'sonner';

// Components
import { ScenesTimeline } from '@components/studio-unified/ScenesTimeline';
import { AvatarLibraryPanel } from '@components/studio-unified/AvatarLibraryPanel';
import { PropertiesPanel, ElementProperties } from '@components/studio-unified/PropertiesPanel';
import {
  InteractiveCanvas,
  CanvasElement,
  CanvasScene,
} from '@components/studio-unified/InteractiveCanvas';
import { ShortcutsHelpPanel } from '@components/studio-unified/ShortcutsHelpPanel';
import { LayersPanel } from '@components/studio-unified/LayersPanel';
import { AlignmentToolbar } from '@components/studio-unified/AlignmentToolbar';
import { useKeyboardShortcuts, COMMON_SHORTCUTS } from '@hooks/useKeyboardShortcuts';
import { useHistory } from '@hooks/useHistory';
import type { Scene } from '@/types/scene';
import type { Scene as VideoProjectScene, CanvasElement as VideoProjectCanvasElement } from '@/types/video-project';
import { importPPTX } from '@lib/pptx/pptx-to-scenes';

// ============================================================================
// TYPES
// ============================================================================

export type StudioTab = 'avatars' | 'media' | 'text' | 'music' | 'effects';

export interface ProjectSettings {
  resolution: { width: number; height: number };
  fps: number;
}

export interface Project {
  id: string;
  name: string;
  duration: number;
  scenes: Scene[];
  settings: ProjectSettings;
}

const createScene = (index: number): Scene => {
  const id = `scene-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    name: `Scene ${index}`,
    elements: [],
    backgroundColor: '#1a1a1a',
    width: 1920,
    height: 1080,
    duration: 5,
    transition: 'fade',
  };
};

const formatDuration = (seconds: number) => {
  const totalSeconds = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const mapImportedElement = (element: VideoProjectCanvasElement, index: number): CanvasElement => ({
  id: element.id,
  type: element.type,
  name: element.text ? element.text.slice(0, 32) : `${element.type} ${index + 1}`,
  x: element.x,
  y: element.y,
  width: element.width,
  height: element.height,
  rotation: element.rotation,
  scaleX: element.scaleX,
  scaleY: element.scaleY,
  opacity: 1,
  src: element.src,
  text: element.text,
  fill: element.fill,
  locked: false,
  visible: true,
  draggable: true,
  zIndex: element.zIndex,
});

const mapImportedScene = (scene: VideoProjectScene, index: number): Scene => ({
  id: scene.id,
  name: scene.name || `Scene ${index + 1}`,
  elements: scene.elements.map(mapImportedElement),
  backgroundColor: scene.backgroundColor || '#1a1a1a',
  width: 1920,
  height: 1080,
  duration: scene.duration || 5,
  transition: 'fade',
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function StudioProPage() {
  // State
  const [isPlaying, setIsPlaying] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [currentTime, setCurrentTime] = useState(0);
  const [selectedElement, setSelectedElement] = useState<ElementProperties | null>(null);
  const [activeTab, setActiveTab] = useState<StudioTab>('avatars');
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [rightPanelTab, setRightPanelTab] = useState<'properties' | 'layers'>('layers');
  const [projectName, setProjectName] = useState('Untitled Project');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initialScene = useMemo(() => createScene(1), []);
  const emptyScene = useMemo<CanvasScene>(
    () => ({
      id: 'empty',
      name: 'Empty',
      elements: [],
      backgroundColor: '#1a1a1a',
      width: 1920,
      height: 1080,
    }),
    [],
  );
  const [scenes, setScenes] = useState<Scene[]>([initialScene]);
  const [activeSceneId, setActiveSceneId] = useState<string | null>(initialScene.id);
  const totalDuration = useMemo(
    () => scenes.reduce((sum, scene) => sum + scene.duration, 0),
    [scenes],
  );

  // Canvas State with History
  const {
    state: canvasScene,
    setState: setCanvasSceneInternal,
    undo,
    redo,
    canUndo,
    canRedo,
    clear,
  } = useHistory<CanvasScene>({
    initialState: initialScene,
    maxHistorySize: 50,
  });
  const [selectedCanvasElementIds, setSelectedCanvasElementIds] = useState<string[]>([]);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [clipboard, setClipboard] = useState<CanvasElement[]>([]); // Clipboard for copy/paste
  const [elementGroups, setElementGroups] = useState<Map<string, string[]>>(new Map()); // groupId -> elementIds[]
  const setCanvasScene = useCallback(
    (nextState: CanvasScene | ((prev: CanvasScene) => CanvasScene)) => {
      setCanvasSceneInternal((prev) => {
        const next = typeof nextState === 'function' ? nextState(prev) : nextState;
        if (activeSceneId) {
          setScenes((prevScenes) =>
            prevScenes.map((scene) => (scene.id === activeSceneId ? { ...scene, ...next } : scene)),
          );
        }
        return next;
      });
    },
    [activeSceneId, setCanvasSceneInternal],
  );

  const handleAddScene = useCallback(() => {
    setScenes((prev) => {
      const newScene = createScene(prev.length + 1);
      setActiveSceneId(newScene.id);
      setCanvasSceneInternal(newScene);
      clear();
      setSelectedCanvasElementIds([]);
      setSelectedElement(null);
      toast.success('Scene added');
      return [...prev, newScene];
    });
  }, [clear, setCanvasSceneInternal]);

  const handleRemoveScene = useCallback(
    (sceneId: string) => {
      setScenes((prev) => {
        const remaining = prev.filter((scene) => scene.id !== sceneId);
        if (remaining.length === 0) {
          setActiveSceneId(null);
          setCanvasSceneInternal(emptyScene);
          clear();
          setSelectedCanvasElementIds([]);
          setSelectedElement(null);
          return remaining;
        }
        if (sceneId === activeSceneId) {
          setActiveSceneId(remaining[0].id);
        }
        return remaining;
      });
    },
    [activeSceneId, clear, emptyScene, setCanvasSceneInternal],
  );

  const handleSceneDurationChange = useCallback((sceneId: string, duration: number) => {
    setScenes((prev) =>
      prev.map((scene) => (scene.id === sceneId ? { ...scene, duration } : scene)),
    );
  }, []);

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handlePPTXImport = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      try {
        const result = await importPPTX(file);
        const importedScenes = result.project.scenes.map(mapImportedScene);
        if (importedScenes.length === 0) {
          toast.error('No slides found in PPTX');
          return;
        }

        setProjectName(result.project.name || file.name.replace(/\.pptx?$/i, ''));
        setScenes(importedScenes);
        setActiveSceneId(importedScenes[0].id);
        setCanvasSceneInternal(importedScenes[0]);
        clear();
        setSelectedCanvasElementIds([]);
        setSelectedElement(null);
        toast.success('PPTX imported');
      } catch (error) {
        toast.error('Failed to import PPTX');
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    },
    [clear, setCanvasSceneInternal],
  );

  useEffect(() => {
    if (scenes.length === 0) {
      setActiveSceneId(null);
      setCanvasSceneInternal(emptyScene);
      clear();
      setSelectedCanvasElementIds([]);
      setSelectedElement(null);
      return;
    }

    const activeScene = scenes.find((scene) => scene.id === activeSceneId);
    if (!activeScene) {
      setActiveSceneId(scenes[0].id);
      return;
    }

    if (canvasScene.id !== activeScene.id) {
      setCanvasSceneInternal(activeScene);
      clear();
      setSelectedCanvasElementIds([]);
      setSelectedElement(null);
    }
  }, [scenes, activeSceneId, canvasScene.id, clear, emptyScene, setCanvasSceneInternal]);

  // Handlers
  const handlePlay = useCallback(() => {
    setIsPlaying(!isPlaying);
    toast.success(isPlaying ? 'Paused' : 'Playing');
  }, [isPlaying]);

  const handleSave = useCallback(async () => {
    toast.promise(new Promise((resolve) => setTimeout(resolve, 1000)), {
      loading: 'Saving project...',
      success: 'Project saved successfully',
      error: 'Failed to save project',
    });
  }, []);

  const handleExport = useCallback(async () => {
    toast.promise(new Promise((resolve) => setTimeout(resolve, 2000)), {
      loading: 'Exporting video...',
      success: 'Video exported successfully',
      error: 'Failed to export video',
    });
  }, []);

  const handleSelectAvatar = useCallback((avatar: { name: string; thumbnailUrl: string }) => {
    // Add avatar to canvas
    const newElement: CanvasElement = {
      id: `avatar-${Date.now()}`,
      type: 'avatar',
      name: avatar.name,
      x: 960 - 200, // Center horizontally (1920/2 - width/2)
      y: 540 - 300, // Center vertically (1080/2 - height/2)
      width: 400,
      height: 600,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      src: avatar.thumbnailUrl,
      locked: false,
      visible: true,
      draggable: true,
      zIndex: 20,
    };

    setCanvasScene((prev) => ({
      ...prev,
      elements: [...prev.elements, newElement],
    }));

    toast.success(`Avatar "${avatar.name}" added to scene`);
  }, []);

  // Conversion: CanvasElement → ElementProperties
  const canvasElementToProperties = useCallback((element: CanvasElement): ElementProperties => {
    return {
      id: element.id,
      name: element.name,
      type: element.type,
      locked: element.locked ?? false,
      visible: element.visible ?? true,
      transform: {
        x: element.x,
        y: element.y,
        scale: element.scaleX ?? 1,
        rotation: element.rotation ?? 0,
        opacity: element.opacity ?? 1,
        width: element.width,
        height: element.height,
      },
      textStyle: element.text
        ? {
            fontSize: 24,
            fontFamily: 'Inter',
            fontWeight: 400,
            color: '#ffffff',
            textAlign: 'left',
            textDecoration: [],
            lineHeight: 1.2,
            letterSpacing: 0,
          }
        : undefined,
      animations: [],
      effects: [],
    };
  }, []);

  // Conversion: ElementProperties → CanvasElement updates
  const propertiesToCanvasElement = useCallback(
    (properties: ElementProperties): Partial<CanvasElement> => {
      return {
        name: properties.name,
        locked: properties.locked,
        visible: properties.visible,
        x: properties.transform.x,
        y: properties.transform.y,
        scaleX: properties.transform.scale,
        scaleY: properties.transform.scale,
        rotation: properties.transform.rotation,
        opacity: properties.transform.opacity,
        width: properties.transform.width,
        height: properties.transform.height,
        // Note: text content is stored in CanvasElement.text, not in TextStyle
      };
    },
    [],
  );

  const handleUpdateElement = useCallback(
    (updates: Partial<ElementProperties>) => {
      if (!selectedElement) return;

      // Update Properties Panel state
      const updatedProperties = { ...selectedElement, ...updates };
      setSelectedElement(updatedProperties);

      // Sync to Canvas Element
      const canvasUpdates = propertiesToCanvasElement(updatedProperties);
      handleUpdateCanvasElement(selectedElement.id, canvasUpdates);
    },
    [selectedElement, propertiesToCanvasElement],
  );

  // Canvas Handlers
  const handleSelectCanvasElement = useCallback(
    (id: string | null, multiSelect: boolean = false) => {
      if (id === null) {
        setSelectedCanvasElementIds([]);
        setSelectedElement(null);
        return;
      }

      if (multiSelect) {
        // Multi-select with Shift: toggle element
        setSelectedCanvasElementIds(
          (prev) =>
            prev.includes(id)
              ? prev.filter((eid) => eid !== id) // Deselect if already selected
              : [...prev, id], // Add to selection
        );
        // For multi-select, Properties Panel shows first selected element
        const firstId = id;
        const element = canvasScene.elements.find((el) => el.id === firstId);
        if (element) {
          setSelectedElement(canvasElementToProperties(element));
          setRightPanelTab('properties');
        }
      } else {
        // Single select: replace selection
        setSelectedCanvasElementIds([id]);
        const element = canvasScene.elements.find((el) => el.id === id);
        if (element) {
          setSelectedElement(canvasElementToProperties(element));
          setRightPanelTab('properties');
        }
      }
    },
    [canvasScene.elements, canvasElementToProperties],
  );

  const handleUpdateCanvasElement = useCallback(
    (id: string, updates: Partial<CanvasElement>) => {
      setCanvasScene((prev) => ({
        ...prev,
        elements: prev.elements.map((el) => (el.id === id ? { ...el, ...updates } : el)),
      }));

      // Sync to Properties Panel if this element is selected
      if (selectedElement?.id === id) {
        const element = canvasScene.elements.find((el) => el.id === id);
        if (element) {
          const updatedElement = { ...element, ...updates };
          setSelectedElement(canvasElementToProperties(updatedElement));
        }
      }
    },
    [selectedElement, canvasScene.elements, canvasElementToProperties],
  );

  const handleDeleteCanvasElement = useCallback((id: string) => {
    setCanvasScene((prev) => ({
      ...prev,
      elements: prev.elements.filter((el) => el.id !== id),
    }));
    setSelectedCanvasElementIds((prev) => prev.filter((eid) => eid !== id));
  }, []);

  const handleDuplicateCanvasElement = useCallback(
    (id: string) => {
      const element = canvasScene.elements.find((el) => el.id === id);
      if (!element) return;

      // Check if element is locked
      if (element.locked) {
        toast.error('Cannot duplicate locked element');
        return;
      }

      const newElement: CanvasElement = {
        ...element,
        id: `element-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        x: element.x + 20,
        y: element.y + 20,
        name: `${element.name} (Copy)`,
      };

      setCanvasScene((prev) => ({
        ...prev,
        elements: [...prev.elements, newElement],
      }));
      toast.success('Element duplicated');
    },
    [canvasScene.elements],
  );

  const handleReorderElements = useCallback((reorderedElements: CanvasElement[]) => {
    setCanvasScene((prev) => ({
      ...prev,
      elements: reorderedElements,
    }));
  }, []);

  const handleDeleteSelectedElements = useCallback(() => {
    if (selectedCanvasElementIds.length === 0) return;

    // Filter out locked elements
    const unlockedIds = selectedCanvasElementIds.filter((id) => {
      const element = canvasScene.elements.find((el) => el.id === id);
      return element && !element.locked;
    });

    if (unlockedIds.length === 0) {
      toast.error('Cannot delete locked elements');
      return;
    }

    const lockedCount = selectedCanvasElementIds.length - unlockedIds.length;

    setCanvasScene((prev) => ({
      ...prev,
      elements: prev.elements.filter((el) => !unlockedIds.includes(el.id)),
    }));
    setSelectedCanvasElementIds([]);

    if (lockedCount > 0) {
      toast.warning(
        `Deleted ${unlockedIds.length} element(s), ${lockedCount} locked element(s) skipped`,
      );
    } else {
      toast.success(`Deleted ${unlockedIds.length} element(s)`);
    }
  }, [selectedCanvasElementIds, canvasScene.elements]);

  const handleSelectAllElements = useCallback(() => {
    const allIds = canvasScene.elements.map((el) => el.id);
    setSelectedCanvasElementIds(allIds);
    toast.success(`Selected ${allIds.length} element(s)`);
  }, [canvasScene.elements]);

  const handleDeselectAll = useCallback(() => {
    setSelectedCanvasElementIds([]);
    toast.success('Deselected all');
  }, []);

  const handleAddCanvasElement = useCallback(
    (element: Omit<CanvasElement, 'id'>) => {
      const newElement: CanvasElement = {
        ...element,
        id: `element-${Date.now()}`,
      };

      setCanvasScene((prev) => ({
        ...prev,
        elements: [...prev.elements, newElement],
      }));

      // Auto-select the new element
      setSelectedCanvasElementIds([newElement.id]);

      // Convert to properties and open Properties Panel
      const properties = canvasElementToProperties(newElement);
      setSelectedElement(properties);
      setRightPanelTab('properties');
    },
    [canvasElementToProperties],
  );

  // Text creation handler
  const handleAddText = useCallback(
    (template: { text: string; fontSize: number; fill: string; fontWeight?: number }) => {
      handleAddCanvasElement({
        type: 'text',
        name: 'Text',
        text: template.text,
        fill: template.fill,
        x: canvasScene.width / 2 - 150,
        y: canvasScene.height / 2 - 30,
        width: 300,
        height: 60,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        opacity: 1,
        locked: false,
        visible: true,
        draggable: true,
        zIndex: canvasScene.elements.length,
      });
      toast.success('Text added to canvas');
    },
    [handleAddCanvasElement, canvasScene.width, canvasScene.height, canvasScene.elements.length],
  );

  // Double-click text element handler
  const handleDoubleClickTextElement = useCallback(
    (id: string, element: CanvasElement) => {
      if (element.type === 'text') {
        // Select the element and open Properties Panel to edit
        setSelectedCanvasElementIds([id]);
        const properties = canvasElementToProperties(element);
        setSelectedElement(properties);
        setRightPanelTab('properties');
        toast.info('Edit text in Properties Panel →');
      }
    },
    [canvasElementToProperties],
  );

  const handleMoveSelectedElements = useCallback(
    (dx: number, dy: number) => {
      if (selectedCanvasElementIds.length === 0) return;

      // Filter out locked elements
      const unlockedIds = selectedCanvasElementIds.filter((id) => {
        const element = canvasScene.elements.find((el) => el.id === id);
        return element && !element.locked;
      });

      if (unlockedIds.length === 0) {
        return; // Silently ignore if all selected elements are locked
      }

      setCanvasScene((prev) => ({
        ...prev,
        elements: prev.elements.map((el) =>
          unlockedIds.includes(el.id) ? { ...el, x: el.x + dx, y: el.y + dy } : el,
        ),
      }));
    },
    [selectedCanvasElementIds, canvasScene.elements],
  );

  // Layer Management
  const handleBringToFront = useCallback(() => {
    if (selectedCanvasElementIds.length === 0) return;

    setCanvasScene((prev) => {
      const maxZIndex = Math.max(...prev.elements.map((el) => el.zIndex), 0);
      return {
        ...prev,
        elements: prev.elements.map((el) =>
          selectedCanvasElementIds.includes(el.id) ? { ...el, zIndex: maxZIndex + 1 } : el,
        ),
      };
    });
    toast.success('Brought to front');
  }, [selectedCanvasElementIds]);

  const handleSendToBack = useCallback(() => {
    if (selectedCanvasElementIds.length === 0) return;

    setCanvasScene((prev) => {
      const minZIndex = Math.min(...prev.elements.map((el) => el.zIndex), 0);
      return {
        ...prev,
        elements: prev.elements.map((el) =>
          selectedCanvasElementIds.includes(el.id) ? { ...el, zIndex: minZIndex - 1 } : el,
        ),
      };
    });
    toast.success('Sent to back');
  }, [selectedCanvasElementIds]);

  const handleBringForward = useCallback(() => {
    if (selectedCanvasElementIds.length === 0) return;

    setCanvasScene((prev) => ({
      ...prev,
      elements: prev.elements.map((el) =>
        selectedCanvasElementIds.includes(el.id) ? { ...el, zIndex: el.zIndex + 1 } : el,
      ),
    }));
    toast.success('Brought forward');
  }, [selectedCanvasElementIds]);

  const handleSendBackward = useCallback(() => {
    if (selectedCanvasElementIds.length === 0) return;

    setCanvasScene((prev) => ({
      ...prev,
      elements: prev.elements.map((el) =>
        selectedCanvasElementIds.includes(el.id) ? { ...el, zIndex: el.zIndex - 1 } : el,
      ),
    }));
    toast.success('Sent backward');
  }, [selectedCanvasElementIds]);

  // Single element layer management (for LayersPanel)
  const handleBringForwardSingle = useCallback((id: string) => {
    setCanvasScene((prev) => ({
      ...prev,
      elements: prev.elements.map((el) => (el.id === id ? { ...el, zIndex: el.zIndex + 1 } : el)),
    }));
  }, []);

  const handleSendBackwardSingle = useCallback((id: string) => {
    setCanvasScene((prev) => ({
      ...prev,
      elements: prev.elements.map((el) => (el.id === id ? { ...el, zIndex: el.zIndex - 1 } : el)),
    }));
  }, []);

  // Copy/Paste Handlers
  const handleCopy = useCallback(() => {
    if (selectedCanvasElementIds.length === 0) {
      toast.error('No elements selected to copy');
      return;
    }

    const elementsToCopy = canvasScene.elements.filter((el) =>
      selectedCanvasElementIds.includes(el.id),
    );
    setClipboard(elementsToCopy);
    toast.success(`Copied ${elementsToCopy.length} element(s)`);
  }, [selectedCanvasElementIds, canvasScene.elements]);

  const handlePaste = useCallback(() => {
    if (clipboard.length === 0) {
      toast.error('Clipboard is empty');
      return;
    }

    const pastedElements: CanvasElement[] = clipboard.map((el) => ({
      ...el,
      id: `element-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      x: el.x + 20, // Offset by 20px
      y: el.y + 20,
      name: `${el.name} (Copy)`,
    }));

    setCanvasScene((prev) => ({
      ...prev,
      elements: [...prev.elements, ...pastedElements],
    }));

    // Select the pasted elements
    setSelectedCanvasElementIds(pastedElements.map((el) => el.id));
    toast.success(`Pasted ${pastedElements.length} element(s)`);
  }, [clipboard]);

  const handleCut = useCallback(() => {
    if (selectedCanvasElementIds.length === 0) {
      toast.error('No elements selected to cut');
      return;
    }

    const elementsToCut = canvasScene.elements.filter((el) =>
      selectedCanvasElementIds.includes(el.id),
    );
    setClipboard(elementsToCut);

    // Delete the selected elements
    setCanvasScene((prev) => ({
      ...prev,
      elements: prev.elements.filter((el) => !selectedCanvasElementIds.includes(el.id)),
    }));
    setSelectedCanvasElementIds([]);
    toast.success(`Cut ${elementsToCut.length} element(s)`);
  }, [selectedCanvasElementIds, canvasScene.elements]);

  // Grouping Handlers
  const handleGroupElements = useCallback(() => {
    if (selectedCanvasElementIds.length < 2) {
      toast.error('Select at least 2 elements to group');
      return;
    }

    const groupId = `group-${Date.now()}`;
    setElementGroups((prev) => {
      const newGroups = new Map(prev);
      newGroups.set(groupId, [...selectedCanvasElementIds]);
      return newGroups;
    });
    toast.success(`Grouped ${selectedCanvasElementIds.length} elements`);
  }, [selectedCanvasElementIds]);

  const handleUngroupElements = useCallback(() => {
    if (selectedCanvasElementIds.length === 0) {
      toast.error('No elements selected to ungroup');
      return;
    }

    // Find groups that contain any of the selected elements
    const groupsToRemove: string[] = [];
    elementGroups.forEach((elementIds, groupId) => {
      if (elementIds.some((id) => selectedCanvasElementIds.includes(id))) {
        groupsToRemove.push(groupId);
      }
    });

    if (groupsToRemove.length === 0) {
      toast.error('Selected elements are not grouped');
      return;
    }

    setElementGroups((prev) => {
      const newGroups = new Map(prev);
      groupsToRemove.forEach((groupId) => newGroups.delete(groupId));
      return newGroups;
    });
    toast.success(`Ungrouped ${groupsToRemove.length} group(s)`);
  }, [selectedCanvasElementIds, elementGroups]);

  // Alignment Handlers
  const handleAlignLeft = useCallback(() => {
    if (selectedCanvasElementIds.length < 2) {
      toast.error('Select at least 2 elements to align');
      return;
    }

    // Filter out locked elements
    const unlockedElements = canvasScene.elements.filter(
      (el) => selectedCanvasElementIds.includes(el.id) && !el.locked,
    );

    if (unlockedElements.length === 0) {
      toast.error('Cannot align locked elements');
      return;
    }

    const lockedCount = selectedCanvasElementIds.length - unlockedElements.length;
    const unlockedIds = unlockedElements.map((el) => el.id);
    const minX = Math.min(...unlockedElements.map((el) => el.x));

    setCanvasScene((prev) => ({
      ...prev,
      elements: prev.elements.map((el) => (unlockedIds.includes(el.id) ? { ...el, x: minX } : el)),
    }));

    if (lockedCount > 0) {
      toast.warning(
        `Aligned ${unlockedElements.length} element(s), ${lockedCount} locked element(s) skipped`,
      );
    } else {
      toast.success('Aligned left');
    }
  }, [selectedCanvasElementIds, canvasScene.elements]);

  const handleAlignCenter = useCallback(() => {
    if (selectedCanvasElementIds.length < 2) {
      toast.error('Select at least 2 elements to align');
      return;
    }

    const unlockedElements = canvasScene.elements.filter(
      (el) => selectedCanvasElementIds.includes(el.id) && !el.locked,
    );

    if (unlockedElements.length === 0) {
      toast.error('Cannot align locked elements');
      return;
    }

    const lockedCount = selectedCanvasElementIds.length - unlockedElements.length;
    const unlockedIds = unlockedElements.map((el) => el.id);
    const minX = Math.min(...unlockedElements.map((el) => el.x));
    const maxX = Math.max(...unlockedElements.map((el) => el.x + el.width));
    const centerX = (minX + maxX) / 2;

    setCanvasScene((prev) => ({
      ...prev,
      elements: prev.elements.map((el) =>
        unlockedIds.includes(el.id) ? { ...el, x: centerX - el.width / 2 } : el,
      ),
    }));

    if (lockedCount > 0) {
      toast.warning(
        `Aligned ${unlockedElements.length} element(s), ${lockedCount} locked element(s) skipped`,
      );
    } else {
      toast.success('Aligned center');
    }
  }, [selectedCanvasElementIds, canvasScene.elements]);

  const handleAlignRight = useCallback(() => {
    if (selectedCanvasElementIds.length < 2) {
      toast.error('Select at least 2 elements to align');
      return;
    }

    const unlockedElements = canvasScene.elements.filter(
      (el) => selectedCanvasElementIds.includes(el.id) && !el.locked,
    );

    if (unlockedElements.length === 0) {
      toast.error('Cannot align locked elements');
      return;
    }

    const lockedCount = selectedCanvasElementIds.length - unlockedElements.length;
    const unlockedIds = unlockedElements.map((el) => el.id);
    const maxX = Math.max(...unlockedElements.map((el) => el.x + el.width));

    setCanvasScene((prev) => ({
      ...prev,
      elements: prev.elements.map((el) =>
        unlockedIds.includes(el.id) ? { ...el, x: maxX - el.width } : el,
      ),
    }));

    if (lockedCount > 0) {
      toast.warning(
        `Aligned ${unlockedElements.length} element(s), ${lockedCount} locked element(s) skipped`,
      );
    } else {
      toast.success('Aligned right');
    }
  }, [selectedCanvasElementIds, canvasScene.elements]);

  const handleAlignTop = useCallback(() => {
    if (selectedCanvasElementIds.length < 2) {
      toast.error('Select at least 2 elements to align');
      return;
    }

    const unlockedElements = canvasScene.elements.filter(
      (el) => selectedCanvasElementIds.includes(el.id) && !el.locked,
    );

    if (unlockedElements.length === 0) {
      toast.error('Cannot align locked elements');
      return;
    }

    const lockedCount = selectedCanvasElementIds.length - unlockedElements.length;
    const unlockedIds = unlockedElements.map((el) => el.id);
    const minY = Math.min(...unlockedElements.map((el) => el.y));

    setCanvasScene((prev) => ({
      ...prev,
      elements: prev.elements.map((el) => (unlockedIds.includes(el.id) ? { ...el, y: minY } : el)),
    }));

    if (lockedCount > 0) {
      toast.warning(
        `Aligned ${unlockedElements.length} element(s), ${lockedCount} locked element(s) skipped`,
      );
    } else {
      toast.success('Aligned top');
    }
  }, [selectedCanvasElementIds, canvasScene.elements]);

  const handleAlignMiddle = useCallback(() => {
    if (selectedCanvasElementIds.length < 2) {
      toast.error('Select at least 2 elements to align');
      return;
    }

    const unlockedElements = canvasScene.elements.filter(
      (el) => selectedCanvasElementIds.includes(el.id) && !el.locked,
    );

    if (unlockedElements.length === 0) {
      toast.error('Cannot align locked elements');
      return;
    }

    const lockedCount = selectedCanvasElementIds.length - unlockedElements.length;
    const unlockedIds = unlockedElements.map((el) => el.id);
    const minY = Math.min(...unlockedElements.map((el) => el.y));
    const maxY = Math.max(...unlockedElements.map((el) => el.y + el.height));
    const centerY = (minY + maxY) / 2;

    setCanvasScene((prev) => ({
      ...prev,
      elements: prev.elements.map((el) =>
        unlockedIds.includes(el.id) ? { ...el, y: centerY - el.height / 2 } : el,
      ),
    }));

    if (lockedCount > 0) {
      toast.warning(
        `Aligned ${unlockedElements.length} element(s), ${lockedCount} locked element(s) skipped`,
      );
    } else {
      toast.success('Aligned middle');
    }
  }, [selectedCanvasElementIds, canvasScene.elements]);

  const handleAlignBottom = useCallback(() => {
    if (selectedCanvasElementIds.length < 2) {
      toast.error('Select at least 2 elements to align');
      return;
    }

    const unlockedElements = canvasScene.elements.filter(
      (el) => selectedCanvasElementIds.includes(el.id) && !el.locked,
    );

    if (unlockedElements.length === 0) {
      toast.error('Cannot align locked elements');
      return;
    }

    const lockedCount = selectedCanvasElementIds.length - unlockedElements.length;
    const unlockedIds = unlockedElements.map((el) => el.id);
    const maxY = Math.max(...unlockedElements.map((el) => el.y + el.height));

    setCanvasScene((prev) => ({
      ...prev,
      elements: prev.elements.map((el) =>
        unlockedIds.includes(el.id) ? { ...el, y: maxY - el.height } : el,
      ),
    }));

    if (lockedCount > 0) {
      toast.warning(
        `Aligned ${unlockedElements.length} element(s), ${lockedCount} locked element(s) skipped`,
      );
    } else {
      toast.success('Aligned bottom');
    }
  }, [selectedCanvasElementIds, canvasScene.elements]);

  // Distribution Handlers
  const handleDistributeHorizontally = useCallback(() => {
    if (selectedCanvasElementIds.length < 3) {
      toast.error('Select at least 3 elements to distribute');
      return;
    }

    const unlockedElements = canvasScene.elements
      .filter((el) => selectedCanvasElementIds.includes(el.id) && !el.locked)
      .sort((a, b) => a.x - b.x);

    if (unlockedElements.length === 0) {
      toast.error('Cannot distribute locked elements');
      return;
    }

    const lockedCount = selectedCanvasElementIds.length - unlockedElements.length;
    const minX = unlockedElements[0].x;
    const maxX = unlockedElements[unlockedElements.length - 1].x;
    const totalWidth = unlockedElements.reduce((sum, el) => sum + el.width, 0);
    const availableSpace =
      maxX - minX - totalWidth + unlockedElements[unlockedElements.length - 1].width;
    const spacing = availableSpace / (unlockedElements.length - 1);

    let currentX = minX;
    const updates = new Map<string, number>();

    unlockedElements.forEach((el, index) => {
      if (index > 0) {
        currentX += spacing;
      }
      updates.set(el.id, currentX);
      currentX += el.width;
    });

    setCanvasScene((prev) => ({
      ...prev,
      elements: prev.elements.map((el) => {
        const newX = updates.get(el.id);
        return newX !== undefined ? { ...el, x: newX } : el;
      }),
    }));

    if (lockedCount > 0) {
      toast.warning(
        `Distributed ${unlockedElements.length} element(s), ${lockedCount} locked element(s) skipped`,
      );
    } else {
      toast.success('Distributed horizontally');
    }
  }, [selectedCanvasElementIds, canvasScene.elements]);

  const handleDistributeVertically = useCallback(() => {
    if (selectedCanvasElementIds.length < 3) {
      toast.error('Select at least 3 elements to distribute');
      return;
    }

    const unlockedElements = canvasScene.elements
      .filter((el) => selectedCanvasElementIds.includes(el.id) && !el.locked)
      .sort((a, b) => a.y - b.y);

    if (unlockedElements.length === 0) {
      toast.error('Cannot distribute locked elements');
      return;
    }

    const lockedCount = selectedCanvasElementIds.length - unlockedElements.length;
    const minY = unlockedElements[0].y;
    const maxY = unlockedElements[unlockedElements.length - 1].y;
    const totalHeight = unlockedElements.reduce((sum, el) => sum + el.height, 0);
    const availableSpace =
      maxY - minY - totalHeight + unlockedElements[unlockedElements.length - 1].height;
    const spacing = availableSpace / (unlockedElements.length - 1);

    let currentY = minY;
    const updates = new Map<string, number>();

    unlockedElements.forEach((el, index) => {
      if (index > 0) {
        currentY += spacing;
      }
      updates.set(el.id, currentY);
      currentY += el.height;
    });

    setCanvasScene((prev) => ({
      ...prev,
      elements: prev.elements.map((el) => {
        const newY = updates.get(el.id);
        return newY !== undefined ? { ...el, y: newY } : el;
      }),
    }));

    if (lockedCount > 0) {
      toast.warning(
        `Distributed ${unlockedElements.length} element(s), ${lockedCount} locked element(s) skipped`,
      );
    } else {
      toast.success('Distributed vertically');
    }
  }, [selectedCanvasElementIds, canvasScene.elements]);

  // Keyboard Shortcuts
  useKeyboardShortcuts({
    shortcuts: [
      {
        ...COMMON_SHORTCUTS.PLAY_PAUSE,
        callback: handlePlay,
      },
      {
        ...COMMON_SHORTCUTS.SAVE,
        callback: handleSave,
      },
      {
        ...COMMON_SHORTCUTS.EXPORT,
        callback: handleExport,
      },
      {
        ...COMMON_SHORTCUTS.UNDO,
        callback: () => {
          if (canUndo) {
            undo();
            toast.success('Undo');
          }
        },
      },
      {
        ...COMMON_SHORTCUTS.REDO_Y,
        callback: () => {
          if (canRedo) {
            redo();
            toast.success('Redo');
          }
        },
      },
      {
        ...COMMON_SHORTCUTS.REDO_Z,
        callback: () => {
          if (canRedo) {
            redo();
            toast.success('Redo');
          }
        },
      },
      {
        ...COMMON_SHORTCUTS.DELETE,
        callback: handleDeleteSelectedElements,
      },
      {
        ...COMMON_SHORTCUTS.BACKSPACE,
        callback: handleDeleteSelectedElements,
      },
      {
        ...COMMON_SHORTCUTS.DUPLICATE,
        callback: () => {
          if (selectedCanvasElementIds.length > 0) {
            const selectedElements = canvasScene.elements.filter((e) =>
              selectedCanvasElementIds.includes(e.id),
            );
            selectedElements.forEach((element) => {
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const { id, ...rest } = element;
              handleAddCanvasElement({
                ...rest,
                x: rest.x + 20,
                y: rest.y + 20,
                name: `${rest.name} (copy)`,
              });
            });
            toast.success(`Duplicated ${selectedElements.length} element(s)`);
          }
        },
      },
      {
        ...COMMON_SHORTCUTS.DESELECT,
        callback: handleDeselectAll,
      },
      {
        ...COMMON_SHORTCUTS.SELECT_ALL,
        callback: handleSelectAllElements,
      },
      // Copy/Paste/Cut
      {
        ...COMMON_SHORTCUTS.COPY,
        callback: handleCopy,
      },
      {
        ...COMMON_SHORTCUTS.PASTE,
        callback: handlePaste,
      },
      {
        ...COMMON_SHORTCUTS.CUT,
        callback: handleCut,
      },
      // Layer Management
      {
        ...COMMON_SHORTCUTS.BRING_TO_FRONT,
        callback: handleBringToFront,
      },
      {
        ...COMMON_SHORTCUTS.SEND_TO_BACK,
        callback: handleSendToBack,
      },
      {
        ...COMMON_SHORTCUTS.BRING_FORWARD,
        callback: handleBringForward,
      },
      {
        ...COMMON_SHORTCUTS.SEND_BACKWARD,
        callback: handleSendBackward,
      },
      // Grouping
      {
        ...COMMON_SHORTCUTS.GROUP,
        callback: handleGroupElements,
      },
      {
        ...COMMON_SHORTCUTS.UNGROUP,
        callback: handleUngroupElements,
      },
      {
        ...COMMON_SHORTCUTS.HELP,
        callback: () => setShowShortcuts(true),
      },
      {
        ...COMMON_SHORTCUTS.SHORTCUTS,
        callback: () => setShowShortcuts(true),
      },
      // Arrow keys for movement (works with multi-select)
      {
        key: 'ArrowUp',
        callback: () => handleMoveSelectedElements(0, -1),
        description: 'Move selected up 1px',
      },
      {
        key: 'ArrowDown',
        callback: () => handleMoveSelectedElements(0, 1),
        description: 'Move selected down 1px',
      },
      {
        key: 'ArrowLeft',
        callback: () => handleMoveSelectedElements(-1, 0),
        description: 'Move selected left 1px',
      },
      {
        key: 'ArrowRight',
        callback: () => handleMoveSelectedElements(1, 0),
        description: 'Move selected right 1px',
      },
      // Shift + Arrow for fast movement (works with multi-select)
      {
        key: 'ArrowUp',
        shift: true,
        callback: () => handleMoveSelectedElements(0, -10),
        description: 'Move selected up 10px',
      },
      {
        key: 'ArrowDown',
        shift: true,
        callback: () => handleMoveSelectedElements(0, 10),
        description: 'Move selected down 10px',
      },
      {
        key: 'ArrowLeft',
        shift: true,
        callback: () => handleMoveSelectedElements(-10, 0),
        description: 'Move selected left 10px',
      },
      {
        key: 'ArrowRight',
        shift: true,
        callback: () => handleMoveSelectedElements(10, 0),
        description: 'Move selected right 10px',
      },
    ],
  });

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top Bar */}
      <div className="h-14 border-b flex items-center justify-between px-4 bg-background">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            <h1 className="text-lg font-bold">Studio Pro</h1>
          </div>
          <Separator orientation="vertical" className="h-6" />
          <div className="flex items-center gap-2">
            <Folder className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {projectName}
              <span className="text-xs text-muted-foreground ml-2">
                {formatDuration(totalDuration)}
              </span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".ppt,.pptx"
            onChange={handlePPTXImport}
            className="hidden"
          />
          <Button variant="ghost" size="sm">
            <Clock className="h-4 w-4 mr-2" />
            History
          </Button>
          <Button variant="ghost" size="sm" onClick={handleImportClick}>
            <Upload className="h-4 w-4 mr-2" />
            Import PPTX
          </Button>
          <Button variant="ghost" size="sm" onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
          <Button variant="default" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <Button variant="ghost" size="icon">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Left Panel - Asset Library */}
        <ResizablePanel
          defaultSize={20}
          minSize={15}
          maxSize={30}
          collapsible
          collapsedSize={0}
          onResize={(size) => setLeftPanelCollapsed(size.asPercentage === 0)}
        >
          <div className="h-full flex flex-col bg-muted/30">
            {/* Panel Header */}
            <div className="h-12 border-b flex items-center justify-between px-4 bg-background">
              <h2 className="text-sm font-semibold">Assets</h2>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setLeftPanelCollapsed(true)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>

            {/* Tabs */}
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as StudioTab)}
              className="flex-1 flex flex-col"
            >
              <TabsList className="grid grid-cols-5 m-2">
                <TabsTrigger value="avatars" className="text-xs">
                  <User className="h-3 w-3" />
                </TabsTrigger>
                <TabsTrigger value="media" className="text-xs">
                  <Image className="h-3 w-3" />
                </TabsTrigger>
                <TabsTrigger value="text" className="text-xs">
                  <Type className="h-3 w-3" />
                </TabsTrigger>
                <TabsTrigger value="music" className="text-xs">
                  <Music className="h-3 w-3" />
                </TabsTrigger>
                <TabsTrigger value="effects" className="text-xs">
                  <Zap className="h-3 w-3" />
                </TabsTrigger>
              </TabsList>

              <TabsContent value="avatars" className="flex-1 m-0">
                <AvatarLibraryPanel onSelectAvatar={handleSelectAvatar} className="h-full" />
              </TabsContent>

              <TabsContent value="media" className="flex-1 m-0">
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <Image className="h-12 w-12 mx-auto mb-4" />
                    <p className="text-sm">Media Library</p>
                    <p className="text-xs">Coming soon</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="text" className="flex-1 m-0 overflow-y-auto">
                <div className="p-4 space-y-4">
                  {/* Add Text Button */}
                  <Button
                    onClick={() =>
                      handleAddText({
                        text: 'Click to edit',
                        fontSize: 32,
                        fill: '#ffffff',
                        fontWeight: 600,
                      })
                    }
                    className="w-full"
                    variant="default"
                  >
                    <Type className="h-4 w-4 mr-2" />
                    Add Text
                  </Button>

                  {/* Text Templates */}
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Quick Templates</Label>
                    <div className="grid gap-2">
                      {/* Heading Template */}
                      <Button
                        variant="outline"
                        className="h-auto py-3 px-3 justify-start"
                        onClick={() =>
                          handleAddText({
                            text: 'Your Heading Here',
                            fontSize: 48,
                            fill: '#ffffff',
                            fontWeight: 700,
                          })
                        }
                      >
                        <div className="text-left">
                          <div className="text-sm font-bold">Heading</div>
                          <div className="text-xs text-muted-foreground">Large, bold title</div>
                        </div>
                      </Button>

                      {/* Subtitle Template */}
                      <Button
                        variant="outline"
                        className="h-auto py-3 px-3 justify-start"
                        onClick={() =>
                          handleAddText({
                            text: 'Your subtitle text',
                            fontSize: 28,
                            fill: '#cccccc',
                            fontWeight: 500,
                          })
                        }
                      >
                        <div className="text-left">
                          <div className="text-sm font-medium">Subtitle</div>
                          <div className="text-xs text-muted-foreground">Medium secondary text</div>
                        </div>
                      </Button>

                      {/* Body Text Template */}
                      <Button
                        variant="outline"
                        className="h-auto py-3 px-3 justify-start"
                        onClick={() =>
                          handleAddText({
                            text: 'Your body text here',
                            fontSize: 20,
                            fill: '#e0e0e0',
                            fontWeight: 400,
                          })
                        }
                      >
                        <div className="text-left">
                          <div className="text-sm font-normal">Body Text</div>
                          <div className="text-xs text-muted-foreground">
                            Regular paragraph text
                          </div>
                        </div>
                      </Button>

                      {/* Call to Action Template */}
                      <Button
                        variant="outline"
                        className="h-auto py-3 px-3 justify-start"
                        onClick={() =>
                          handleAddText({
                            text: 'CALL TO ACTION',
                            fontSize: 36,
                            fill: '#fbbf24',
                            fontWeight: 800,
                          })
                        }
                      >
                        <div className="text-left">
                          <div className="text-sm font-bold text-yellow-400">Call to Action</div>
                          <div className="text-xs text-muted-foreground">
                            Attention-grabbing text
                          </div>
                        </div>
                      </Button>

                      {/* Caption Template */}
                      <Button
                        variant="outline"
                        className="h-auto py-3 px-3 justify-start"
                        onClick={() =>
                          handleAddText({
                            text: 'Caption or description',
                            fontSize: 16,
                            fill: '#999999',
                            fontWeight: 300,
                          })
                        }
                      >
                        <div className="text-left">
                          <div className="text-sm font-light">Caption</div>
                          <div className="text-xs text-muted-foreground">
                            Small descriptive text
                          </div>
                        </div>
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="music" className="flex-1 m-0">
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <Music className="h-12 w-12 mx-auto mb-4" />
                    <p className="text-sm">Music Library</p>
                    <p className="text-xs">Coming soon</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="effects" className="flex-1 m-0">
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <Zap className="h-12 w-12 mx-auto mb-4" />
                    <p className="text-sm">Effects & Transitions</p>
                    <p className="text-xs">Coming soon</p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </ResizablePanel>

        {leftPanelCollapsed && (
          <div className="w-12 border-r flex flex-col items-center py-2 gap-2 bg-background">
            <Button variant="ghost" size="icon" onClick={() => setLeftPanelCollapsed(false)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        <ResizableHandle />

        {/* Center Panel - Canvas & Timeline */}
        <ResizablePanel defaultSize={60} minSize={40}>
          <ResizablePanelGroup direction="vertical">
            {/* Canvas */}
            <ResizablePanel defaultSize={60} minSize={30}>
              <div className="h-full flex flex-col bg-muted/50">
                {/* Canvas Toolbar */}
                <div className="h-12 border-b flex items-center justify-between px-4 bg-background">
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={handlePlay}>
                      {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Square className="h-4 w-4" />
                    </Button>
                    <Separator orientation="vertical" className="h-6" />
                    <span className="text-xs font-mono tabular-nums">
                      {Math.floor(currentTime / 60)}:
                      {(currentTime % 60).toString().padStart(2, '0')}
                    </span>
                    <Separator orientation="vertical" className="h-6" />
                    {/* Undo/Redo Buttons */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        undo();
                        toast.success('Undo');
                      }}
                      disabled={!canUndo}
                      title="Undo (Ctrl+Z)"
                    >
                      <Undo2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        redo();
                        toast.success('Redo');
                      }}
                      disabled={!canRedo}
                      title="Redo (Ctrl+Y)"
                    >
                      <Redo2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Alignment Toolbar */}
                    {selectedCanvasElementIds.length > 0 && (
                      <>
                        <AlignmentToolbar
                          selectedCount={selectedCanvasElementIds.length}
                          onAlignLeft={handleAlignLeft}
                          onAlignCenter={handleAlignCenter}
                          onAlignRight={handleAlignRight}
                          onAlignTop={handleAlignTop}
                          onAlignMiddle={handleAlignMiddle}
                          onAlignBottom={handleAlignBottom}
                          onDistributeHorizontally={handleDistributeHorizontally}
                          onDistributeVertically={handleDistributeVertically}
                          onGroup={handleGroupElements}
                          onUngroup={handleUngroupElements}
                        />
                        <Separator orientation="vertical" className="h-6" />
                      </>
                    )}
                    <Button variant="ghost" size="icon">
                      <Maximize className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Interactive Canvas */}
                <InteractiveCanvas
                  scene={activeSceneId ? canvasScene : emptyScene}
                  selectedElementIds={selectedCanvasElementIds}
                  onSelectElement={handleSelectCanvasElement}
                  onUpdateElement={handleUpdateCanvasElement}
                  onDeleteElement={handleDeleteCanvasElement}
                  onAddElement={handleAddCanvasElement}
                  onDoubleClickElement={handleDoubleClickTextElement}
                  className="flex-1"
                />
              </div>
            </ResizablePanel>

            <ResizableHandle />

            {/* Timeline */}
            <ResizablePanel defaultSize={40} minSize={20}>
              <div className="h-full bg-background">
                <ScenesTimeline
                  scenes={scenes}
                  activeSceneId={activeSceneId}
                  onSelectScene={setActiveSceneId}
                  onAddScene={handleAddScene}
                  onRemoveScene={handleRemoveScene}
                  onDurationChange={handleSceneDurationChange}
                />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>

        <ResizableHandle />

        {/* Right Panel - Properties */}
        <ResizablePanel
          defaultSize={20}
          minSize={15}
          maxSize={30}
          collapsible
          collapsedSize={0}
          onResize={(size) => setRightPanelCollapsed(size.asPercentage === 0)}
        >
          <div className="h-full flex flex-col bg-muted/30">
            {/* Panel Header */}
            <div className="h-12 border-b flex items-center justify-between px-4 bg-background">
              <Tabs
                value={rightPanelTab}
                onValueChange={(v) => setRightPanelTab(v as 'properties' | 'layers')}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2 h-9">
                  <TabsTrigger value="layers" className="text-xs">
                    <Layers className="w-3 h-3 mr-1" />
                    Layers
                  </TabsTrigger>
                  <TabsTrigger value="properties" className="text-xs">
                    <Settings className="w-3 h-3 mr-1" />
                    Properties
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 ml-2"
                onClick={() => setRightPanelCollapsed(true)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Panel Content */}
            <div className="flex-1 overflow-hidden">
              {rightPanelTab === 'layers' ? (
                <LayersPanel
                  elements={canvasScene.elements}
                  selectedElementIds={selectedCanvasElementIds}
                  onSelectElement={handleSelectCanvasElement}
                  onUpdateElement={handleUpdateCanvasElement}
                  onDeleteElement={handleDeleteCanvasElement}
                  onDuplicateElement={handleDuplicateCanvasElement}
                  onReorderElements={handleReorderElements}
                  onBringForward={handleBringForwardSingle}
                  onSendBackward={handleSendBackwardSingle}
                />
              ) : (
                <PropertiesPanel
                  element={selectedElement}
                  onUpdate={handleUpdateElement}
                  className="h-full"
                />
              )}
            </div>
          </div>
        </ResizablePanel>

        {rightPanelCollapsed && (
          <div className="w-12 border-l flex flex-col items-center py-2 gap-2 bg-background">
            <Button variant="ghost" size="icon" onClick={() => setRightPanelCollapsed(false)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        )}
      </ResizablePanelGroup>

      {/* Status Bar */}
      <div className="h-8 border-t flex items-center justify-between px-4 text-xs text-muted-foreground bg-background">
        <div className="flex items-center gap-4">
          <span>Ready</span>
          <Separator orientation="vertical" className="h-4" />
          <span>1920x1080 @ 30fps</span>
          {selectedCanvasElementIds.length > 0 && (
            <>
              <Separator orientation="vertical" className="h-4" />
              <span>
                {selectedCanvasElementIds.length === 1
                  ? canvasScene.elements.find((e) => e.id === selectedCanvasElementIds[0])?.name +
                    ' selected'
                  : `${selectedCanvasElementIds.length} elements selected`}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-4">
          {/* Undo/Redo Status */}
          <span className={cn(!canUndo && 'opacity-50')}>Undo: {canUndo ? 'Ctrl+Z' : 'N/A'}</span>
          <Separator orientation="vertical" className="h-4" />
          <span className={cn(!canRedo && 'opacity-50')}>Redo: {canRedo ? 'Ctrl+Y' : 'N/A'}</span>
          <Separator orientation="vertical" className="h-4" />
          <span>100% zoom</span>
          <Separator orientation="vertical" className="h-4" />
          <button
            onClick={() => setShowShortcuts(true)}
            className="hover:text-foreground transition-colors cursor-pointer"
          >
            Press Ctrl+/ for shortcuts
          </button>
        </div>
      </div>

      {/* Shortcuts Help Panel */}
      <ShortcutsHelpPanel isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
    </div>
  );
}
