/**
 * Studio Pro - Integrated Professional Video Editor
 *
 * Combines all Studio Pro features into a unified interface:
 * - Multi-scene timeline with PPTX import
 * - Avatar library with 3D preview
 * - Conversation builder
 * - Canvas preview
 * - Properties panel
 */

'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useStudioStore } from '@/lib/stores/studio-store';
import { Timeline } from './Timeline';
import { AvatarLibrary } from './AvatarLibrary';
import { ConversationBuilder } from './ConversationBuilder';
import { Avatar3DPreview } from './Avatar3DPreview';
import { KeyboardShortcutsDialog } from './KeyboardShortcutsDialog';
import { VideoRenderDialog } from './VideoRenderDialog';
import { importPPTX } from '@/lib/pptx/pptx-to-scenes';
import type { VideoProject, Track, TimelineElement } from '@/types/video-project';
import {
  Play,
  Pause,
  Square,
  Upload,
  Save,
  Download,
  Undo,
  Redo,
  Settings,
  FileVideo,
  Users,
  Type,
  Image as ImageIcon,
  Presentation,
  Layers,
  SlidersHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface StudioProProps {
  className?: string;
  onSave?: (project: VideoProject) => void;
  onExport?: (project: VideoProject) => void;
}

export function StudioPro({ className, onSave, onExport }: StudioProProps) {
  // Store state
  const {
    videoProject,
    setVideoProject,
    currentSceneId,
    setCurrentSceneId,
    timelineState,
    setTimelineState,
    avatars,
    selectedAvatarId,
    selectAvatar,
    conversations,
    addConversation,
    leftPanelTab,
    setLeftPanelTab,
    rightPanelTab,
    setRightPanelTab,
    showConversationBuilder,
    setShowConversationBuilder,
    play,
    pause,
    stop,
    seek,
    addAvatarToTimeline,
    updateTrack,
    updateTimelineElement,
    deleteTimelineElement,
    getCurrentScene,
    getSelectedAvatar,
  } = useStudioStore();

  // Local UI state
  const [canvasZoom, setCanvasZoom] = useState(100);
  const [showRenderDialog, setShowRenderDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Current scene
  const currentScene = getCurrentScene();
  const selectedAvatar = getSelectedAvatar();

  // PPTX Import Handler
  const handlePPTXImport = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      try {
        const result = await importPPTX(file);
        setVideoProject(result.project);

        // Show notification (you can add toast here)
        if (result.warnings.length > 0) {
          console.warn('Import warnings:', result.warnings);
        }
        // Success: imported slides
        void result.slidesProcessed;
      } catch (error) {
        console.error('Failed to import PPTX:', error);
      }

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [setVideoProject],
  );

  // Playback handlers
  const handlePlayPause = useCallback(() => {
    if (timelineState.isPlaying) {
      pause();
    } else {
      play();
    }
  }, [timelineState.isPlaying, play, pause]);

  const handleStop = useCallback(() => {
    stop();
  }, [stop]);

  // Scene handlers
  const handleSceneChange = useCallback(
    (sceneId: string | null) => {
      setCurrentSceneId(sceneId);
    },
    [setCurrentSceneId],
  );

  // Track handlers
  const handleTrackUpdate = useCallback(
    (track: Track) => {
      if (!currentSceneId) return;
      updateTrack(currentSceneId, track);
    },
    [currentSceneId, updateTrack],
  );

  // Element handlers
  const handleElementSelect = useCallback(
    (elementIds: string[]) => {
      setTimelineState({ selectedElements: elementIds });
    },
    [setTimelineState],
  );

  const handleElementUpdate = useCallback(
    (elementId: string, updates: Partial<TimelineElement>) => {
      updateTimelineElement(elementId, updates);
    },
    [updateTimelineElement],
  );

  const handleElementDelete = useCallback(
    (elementId: string) => {
      deleteTimelineElement(elementId);
    },
    [deleteTimelineElement],
  );

  // Avatar handlers
  const handleAvatarSelect = useCallback(
    (avatarId: string) => {
      selectAvatar(avatarId);
      addAvatarToTimeline(avatarId);
    },
    [selectAvatar, addAvatarToTimeline],
  );

  // Save/Export handlers
  const handleSave = useCallback(() => {
    if (videoProject && onSave) {
      onSave(videoProject);
    }
  }, [videoProject, onSave]);

  const handleExport = useCallback(() => {
    // Open render dialog instead of direct export
    setShowRenderDialog(true);

    // Also call onExport callback if provided
    if (videoProject && onExport) {
      onExport(videoProject);
    }
  }, [videoProject, onExport]);

  // Trigger PPTX file input
  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input/textarea
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true'
      ) {
        return;
      }

      // Space - Play/Pause
      if (event.code === 'Space') {
        event.preventDefault();
        handlePlayPause();
        return;
      }

      // Escape - Stop
      if (event.code === 'Escape') {
        event.preventDefault();
        handleStop();
        return;
      }

      // Arrow Left - Seek backward 1s
      if (event.code === 'ArrowLeft') {
        event.preventDefault();
        const newTime = Math.max(0, timelineState.currentTime - 1);
        seek(newTime);
        return;
      }

      // Arrow Right - Seek forward 1s
      if (event.code === 'ArrowRight') {
        event.preventDefault();
        const currentScene = getCurrentScene();
        const maxTime = currentScene?.duration || 0;
        const newTime = Math.min(maxTime, timelineState.currentTime + 1);
        seek(newTime);
        return;
      }

      // Ctrl/Cmd + S - Save
      if ((event.ctrlKey || event.metaKey) && event.code === 'KeyS') {
        event.preventDefault();
        handleSave();
        return;
      }

      // Ctrl/Cmd + E - Export
      if ((event.ctrlKey || event.metaKey) && event.code === 'KeyE') {
        event.preventDefault();
        handleExport();
        return;
      }

      // Ctrl/Cmd + I - Import PPTX
      if ((event.ctrlKey || event.metaKey) && event.code === 'KeyI') {
        event.preventDefault();
        handleImportClick();
        return;
      }

      // Delete/Backspace - Delete selected elements
      if (event.code === 'Delete' || event.code === 'Backspace') {
        event.preventDefault();
        timelineState.selectedElements.forEach((elementId) => {
          handleElementDelete(elementId);
        });
        return;
      }

      // 1-4 - Switch left panel tabs
      if (event.code === 'Digit1') {
        event.preventDefault();
        setLeftPanelTab('avatars');
        return;
      }
      if (event.code === 'Digit2') {
        event.preventDefault();
        setLeftPanelTab('text');
        return;
      }
      if (event.code === 'Digit3') {
        event.preventDefault();
        setLeftPanelTab('assets');
        return;
      }
      if (event.code === 'Digit4') {
        event.preventDefault();
        setLeftPanelTab('pptx');
        return;
      }

      // C - Toggle conversation builder
      if (event.code === 'KeyC') {
        event.preventDefault();
        setShowConversationBuilder(!showConversationBuilder);
        return;
      }

      // L - Switch to layers panel
      if (event.code === 'KeyL') {
        event.preventDefault();
        setRightPanelTab('layers');
        setShowConversationBuilder(false);
        return;
      }

      // P - Switch to properties panel
      if (event.code === 'KeyP') {
        event.preventDefault();
        setRightPanelTab('properties');
        setShowConversationBuilder(false);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    timelineState.currentTime,
    timelineState.selectedElements,
    timelineState.isPlaying,
    showConversationBuilder,
    handlePlayPause,
    handleStop,
    handleSave,
    handleExport,
    handleImportClick,
    handleElementDelete,
    seek,
    setLeftPanelTab,
    setRightPanelTab,
    setShowConversationBuilder,
    getCurrentScene,
  ]);

  return (
    <div className={cn('studio-pro flex flex-col h-screen bg-background', className)}>
      {/* Top Toolbar */}
      <div className="toolbar flex items-center gap-2 px-4 py-2 border-b bg-muted/30">
        {/* Project Actions */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={handleImportClick} title="Import PPTX">
            <Upload className="h-4 w-4 mr-2" />
            Import PPTX
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pptx"
            onChange={handlePPTXImport}
            className="hidden"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSave}
            disabled={!videoProject}
            title="Save Project"
          >
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExport}
            disabled={!videoProject}
            title="Export Video"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Playback Controls */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePlayPause}
            disabled={!videoProject}
            title={timelineState.isPlaying ? 'Pause' : 'Play'}
          >
            {timelineState.isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleStop}
            disabled={!videoProject}
            title="Stop"
          >
            <Square className="h-4 w-4" />
          </Button>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Edit Actions */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" disabled title="Undo">
            <Undo className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" disabled title="Redo">
            <Redo className="h-4 w-4" />
          </Button>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Conversation Builder Toggle */}
        <Button
          variant={showConversationBuilder ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setShowConversationBuilder(!showConversationBuilder)}
          title="Toggle Conversation Builder"
        >
          <Users className="h-4 w-4 mr-2" />
          Conversations
        </Button>

        <div className="flex-1" />

        {/* Project Info */}
        {videoProject && (
          <div className="text-sm text-muted-foreground">
            {videoProject.name} • {videoProject.scenes.length} scene(s)
          </div>
        )}

        <Separator orientation="vertical" className="h-6" />

        {/* Keyboard Shortcuts */}
        <KeyboardShortcutsDialog />

        {/* Settings */}
        <Button variant="ghost" size="sm" title="Settings">
          <Settings className="h-4 w-4" />
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Assets */}
        <div className="left-panel w-80 border-r flex flex-col bg-muted/20">
          <Tabs
            value={leftPanelTab}
            onValueChange={(value) => setLeftPanelTab(value as typeof leftPanelTab)}
            className="flex-1 flex flex-col"
          >
            <TabsList className="w-full grid grid-cols-4 rounded-none border-b">
              <TabsTrigger value="avatars" className="gap-1">
                <Users className="h-4 w-4" />
                Avatars
              </TabsTrigger>
              <TabsTrigger value="text" className="gap-1">
                <Type className="h-4 w-4" />
                Text
              </TabsTrigger>
              <TabsTrigger value="assets" className="gap-1">
                <ImageIcon className="h-4 w-4" />
                Media
              </TabsTrigger>
              <TabsTrigger value="pptx" className="gap-1">
                <Presentation className="h-4 w-4" />
                PPTX
              </TabsTrigger>
            </TabsList>

            <TabsContent value="avatars" className="flex-1 mt-0">
              <ScrollArea className="h-full">
                <AvatarLibrary
                  avatars={avatars}
                  selectedAvatarId={selectedAvatarId}
                  onAvatarSelect={handleAvatarSelect}
                  className="p-4"
                />
              </ScrollArea>
            </TabsContent>

            <TabsContent value="text" className="flex-1 mt-0 p-4">
              <div className="text-sm text-muted-foreground">Text tools coming soon...</div>
            </TabsContent>

            <TabsContent value="assets" className="flex-1 mt-0 p-4">
              <div className="text-sm text-muted-foreground">Media library coming soon...</div>
            </TabsContent>

            <TabsContent value="pptx" className="flex-1 mt-0 p-4">
              <div className="space-y-4">
                <Button variant="outline" className="w-full" onClick={handleImportClick}>
                  <Upload className="h-4 w-4 mr-2" />
                  Import PPTX File
                </Button>
                <div className="text-sm text-muted-foreground">
                  Import PowerPoint presentations. Each slide will become a scene in your timeline.
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Center - Canvas & Timeline */}
        <div className="center-content flex-1 flex flex-col">
          {/* Canvas Preview */}
          <div className="canvas-preview flex-1 bg-black/5 flex items-center justify-center p-4 relative">
            {selectedAvatar ? (
              <div className="w-full h-full max-w-4xl">
                <Avatar3DPreview
                  avatar={selectedAvatar}
                  autoRotate={!timelineState.isPlaying}
                  showControls={true}
                />
              </div>
            ) : (
              <div className="text-center text-muted-foreground">
                <FileVideo className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <p className="text-lg font-medium">No preview available</p>
                <p className="text-sm">Select an avatar or import a PPTX to get started</p>
              </div>
            )}

            {/* Zoom Controls */}
            <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-background/80 backdrop-blur-sm rounded-lg px-3 py-2 border">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCanvasZoom(Math.max(25, canvasZoom - 25))}
              >
                -
              </Button>
              <span className="text-sm font-medium min-w-[4rem] text-center">{canvasZoom}%</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCanvasZoom(Math.min(200, canvasZoom + 25))}
              >
                +
              </Button>
            </div>
          </div>

          {/* Timeline */}
          <div className="timeline-container h-80 border-t">
            <Timeline
              scenes={videoProject?.scenes || []}
              currentScene={currentScene}
              timelineState={timelineState}
              onTimeUpdate={seek}
              onSceneChange={handleSceneChange}
              onTrackUpdate={handleTrackUpdate}
              onElementSelect={handleElementSelect}
              onElementUpdate={handleElementUpdate}
              onPlayPause={handlePlayPause}
              onStop={handleStop}
            />
          </div>
        </div>

        {/* Right Panel - Properties / Conversation Builder */}
        <div className="right-panel w-96 border-l flex flex-col bg-muted/20">
          {showConversationBuilder ? (
            <div className="flex-1 flex flex-col">
              <div className="px-4 py-3 border-b">
                <h3 className="font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Conversation Builder
                </h3>
              </div>
              <ScrollArea className="flex-1">
                <ConversationBuilder
                  availableAvatars={avatars}
                  existingConversations={conversations}
                  onSave={(conversation) => {
                    addConversation(conversation);
                    setShowConversationBuilder(false);
                  }}
                  className="p-4"
                />
              </ScrollArea>
            </div>
          ) : (
            <Tabs
              value={rightPanelTab}
              onValueChange={(value) => setRightPanelTab(value as typeof rightPanelTab)}
              className="flex-1 flex flex-col"
            >
              <TabsList className="w-full grid grid-cols-2 rounded-none border-b">
                <TabsTrigger value="layers" className="gap-2">
                  <Layers className="h-4 w-4" />
                  Layers
                </TabsTrigger>
                <TabsTrigger value="properties" className="gap-2">
                  <SlidersHorizontal className="h-4 w-4" />
                  Properties
                </TabsTrigger>
              </TabsList>

              <TabsContent value="layers" className="flex-1 mt-0 p-4">
                <div className="space-y-2">
                  <div className="text-sm font-medium">Scene Layers</div>
                  {currentScene?.tracks.map((track) => (
                    <div key={track.id} className="p-2 rounded border bg-background text-sm">
                      <div className="font-medium">{track.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {track.elements.length} element(s)
                      </div>
                    </div>
                  ))}
                  {!currentScene && (
                    <div className="text-sm text-muted-foreground">No scene selected</div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="properties" className="flex-1 mt-0 p-4">
                <div className="text-sm text-muted-foreground">
                  Select an element to edit properties
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>

      {/* Video Render Dialog */}
      <VideoRenderDialog
        open={showRenderDialog}
        onOpenChange={setShowRenderDialog}
        project={videoProject}
      />
    </div>
  );
}
