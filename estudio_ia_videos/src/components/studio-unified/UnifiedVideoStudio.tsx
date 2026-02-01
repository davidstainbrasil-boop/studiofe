import React, { useEffect } from 'react';
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from '@components/ui/resizable';

import { UnifiedTopBar } from '@components/studio-unified/UnifiedTopBar';
import { UnifiedAssetBrowser } from '@components/studio-unified/UnifiedAssetBrowser';
import { StudioPreview } from '@components/studio-unified/StudioPreview';
import { UnifiedInspector } from '@components/studio-unified/inspector/UnifiedInspector';
import { ProfessionalTimelineWrapper } from '@components/studio-unified/ProfessionalTimelineWrapper';
import { AudioPlaybackManager } from '@components/studio-unified/AudioPlaybackManager';

import { usePlayback } from '@hooks/use-playback';
import { useTimelineStore } from '@lib/stores/timeline-store';
import { logger } from '@lib/logger';

interface UnifiedVideoStudioProps {
    projectId: string;
    initialSnapshot?: any;
}

import { CollaborationProvider } from '@components/collaboration/CollaborationProvider';
import { CollaboratorCursors } from '@components/collaboration/CollaboratorCursors';


export function UnifiedVideoStudio({ projectId, initialSnapshot }: UnifiedVideoStudioProps) {
    // Initialize Playback Loop
    usePlayback();

    const hydrateFromSnapshot = useTimelineStore(state => state.hydrateFromSnapshot);
    const setProjectId = useTimelineStore(state => state.setProjectId);

    // Get current user for socket connection
    // We need userId and name. Using mock for now if auth hook not found, but trying to find real one.
    // Ideally passed from page.tsx or context. 
    // Using a simple random ID if not available for dev, but standardizing on what we have.
    const userId = 'user-' + Math.floor(Math.random() * 10000);
    const userName = 'Collaborator ' + Math.floor(Math.random() * 100);

    // Load project on mount/change
    useEffect(() => {
        if (initialSnapshot) {
            logger.info('Hydrating from initial snapshot prop', { projectId });
            hydrateFromSnapshot(initialSnapshot);
            setProjectId(projectId);
        } else {
            const loadProject = async () => {
                try {
                    logger.info('Loading project from API (Component Mount)', { projectId });
                    const response = await fetch(`/api/studio/load/${projectId}`);
                    if (!response.ok) throw new Error('Failed to load project');

                    const result = await response.json();
                    hydrateFromSnapshot(result.snapshot);
                    setProjectId(projectId);
                } catch (error) {
                    logger.error('Failed to load project in UnifiedVideoStudio', error as Error);
                }
            };
            loadProject();
        }
    }, [projectId, initialSnapshot, hydrateFromSnapshot, setProjectId]);

    return (
        <CollaborationProvider projectId={projectId} userId={userId} userName={userName}>
            <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden relative">
                <AudioPlaybackManager />
                {/* 1. Top Bar (Fixed Height) */}
                <UnifiedTopBar />

                {/* 2. Main Workspace (Resizable) */}
                <div className="flex-1 overflow-hidden">
                    <ResizablePanelGroup direction="horizontal">

                        {/* Left Panel: Assets */}
                        <ResizablePanel defaultSize={20} minSize={15} maxSize={30} className="bg-background">
                            <UnifiedAssetBrowser />
                        </ResizablePanel>

                        <ResizableHandle withHandle />

                        {/* Center + Right Group */}
                        <ResizablePanel defaultSize={80}>
                            <ResizablePanelGroup direction="vertical">

                                {/* Upper Area: Preview + Inspector */}
                                <ResizablePanel defaultSize={65} minSize={30}>
                                    <ResizablePanelGroup direction="horizontal">

                                        {/* Center: Canvas/Preview */}
                                        <ResizablePanel defaultSize={75} minSize={50} className="bg-muted/30 relative">
                                            <StudioPreview />
                                            {/* Cursor Overlay on top of preview/canvas */}
                                            <CollaboratorCursors />
                                        </ResizablePanel>

                                        <ResizableHandle withHandle />

                                        {/* Right: Inspector */}
                                        <ResizablePanel defaultSize={25} minSize={20} maxSize={35} className="bg-background">
                                            <UnifiedInspector />
                                        </ResizablePanel>

                                    </ResizablePanelGroup>
                                </ResizablePanel>

                                <ResizableHandle withHandle />

                                {/* Lower Area: Timeline */}
                                <ResizablePanel defaultSize={35} minSize={20}>
                                    <ProfessionalTimelineWrapper />
                                </ResizablePanel>

                            </ResizablePanelGroup>
                        </ResizablePanel>

                    </ResizablePanelGroup>
                </div>
            </div>
        </CollaborationProvider>
    );
}
