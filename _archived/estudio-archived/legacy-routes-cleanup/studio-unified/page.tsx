
'use client';

import React, { useEffect } from 'react';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@components/ui/resizable';

import { UnifiedTopBar } from '@components/studio-unified/UnifiedTopBar';
import { AssetBrowser } from '@components/studio-unified/AssetBrowser';
import { StudioPreview } from '@components/studio-unified/StudioPreview';
import { PropertyInspector } from '@components/studio-unified/PropertyInspector';
import { ProfessionalTimelineWrapper } from '@components/studio-unified/ProfessionalTimelineWrapper';
import { AudioPlaybackManager } from '@components/studio-unified/AudioPlaybackManager';
// ... imports
import { usePlayback } from '@hooks/use-playback';
import { useTimelineStore } from '@lib/stores/timeline-store';
import { logger } from '@lib/logger';

export default function UnifiedStudioPage() {
  // Initialize Playback Loop
  usePlayback();

  const hydrateFromSnapshot = useTimelineStore(state => state.hydrateFromSnapshot);
  const setProjectId = useTimelineStore(state => state.setProjectId);

  // Load project from URL on mount
  useEffect(() => {
    const loadProject = async () => {
      const params = new URLSearchParams(window.location.search);
      const projectId = params.get('projectId');

      if (!projectId) {
        logger.info('No projectId in URL, starting new project');
        return;
      }

      try {
        logger.info('Loading project from URL', { projectId });

        const response = await fetch(`/api/studio/load/${projectId}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Falha ao carregar projeto');
        }

        const result = await response.json();

        // Hydrate store with snapshot
        hydrateFromSnapshot(result.snapshot);
        setProjectId(result.projectId);

        logger.info('Project loaded successfully', { projectId: result.projectId });

      } catch (error) {
        logger.error('Failed to load project', error as Error);
        // Continue with empty project
      }
    };

    loadProject();
  }, []);

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      <AudioPlaybackManager />
      {/* 1. Top Bar (Fixed Height) */}
      <UnifiedTopBar />

      {/* 2. Main Workspace (Resizable) */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal">

          {/* Left Panel: Assets */}
          <ResizablePanel defaultSize={20} minSize={15} maxSize={30} className="bg-background">
            <AssetBrowser />
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Center + Right Group */}
          <ResizablePanel defaultSize={80}>
            <ResizablePanelGroup direction="vertical">

              {/* Upper Area: Preview + Inspector */}
              <ResizablePanel defaultSize={65} minSize={30}>
                <ResizablePanelGroup direction="horizontal">

                  {/* Center: Canvas/Preview */}
                  <ResizablePanel defaultSize={75} minSize={50} className="bg-muted/30">
                    <StudioPreview />
                  </ResizablePanel>

                  <ResizableHandle withHandle />

                  {/* Right: Inspector */}
                  <ResizablePanel defaultSize={25} minSize={20} maxSize={35} className="bg-background">
                    <PropertyInspector />
                  </ResizablePanel>

                </ResizablePanelGroup>
              </ResizablePanel>

              <ResizableHandle withHandle />

              {/* Bottom Area: Timeline */}
              <ResizablePanel defaultSize={35} minSize={15} className="bg-background">
                <ProfessionalTimelineWrapper />
              </ResizablePanel>

            </ResizablePanelGroup>
          </ResizablePanel>

        </ResizablePanelGroup>
      </div>
    </div>
  );
}