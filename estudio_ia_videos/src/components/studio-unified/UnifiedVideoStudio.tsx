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

import { usePlayback } from '@hooks/use-playback';
import { useTimelineStore } from '@lib/stores/timeline-store';
import { logger } from '@lib/logger';

interface UnifiedVideoStudioProps {
    projectId: string;
    initialSnapshot?: any;
}

export function UnifiedVideoStudio({ projectId, initialSnapshot }: UnifiedVideoStudioProps) {
    // Initialize Playback Loop
    // Note: ensure usePlayback handles cleanup correctly if unmounted/remounted
    usePlayback();

    const hydrateFromSnapshot = useTimelineStore(state => state.hydrateFromSnapshot);
    const setProjectId = useTimelineStore(state => state.setProjectId);

    // Load project on mount/change
    useEffect(() => {
        if (initialSnapshot) {
            logger.info('Hydrating from initial snapshot prop', { projectId });
            hydrateFromSnapshot(initialSnapshot);
            setProjectId(projectId);
        } else {
            // Fallback or explicit load if no snapshot provided (though Router should handle this ideally)
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

                            {/* Lower Area: Timeline */}
                            <ResizablePanel defaultSize={35} minSize={20}>
                                <ProfessionalTimelineWrapper />
                            </ResizablePanel>

                        </ResizablePanelGroup>
                    </ResizablePanel>

                </ResizablePanelGroup>
            </div>
        </div>
    );
}
