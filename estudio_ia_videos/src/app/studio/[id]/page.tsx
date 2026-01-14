'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { logger } from '@lib/logger';

// Dynamic Imports for Engines (Code Splitting)
const UnifiedVideoStudio = dynamic(
    () => import('@components/studio-unified/UnifiedVideoStudio').then(mod => mod.UnifiedVideoStudio),
    { ssr: false, loading: () => <LoadingScreen message="Loading Video Engine..." /> }
);

// TODO: Ensure these paths are correct. Using placeholders based on file lists.
const ProfessionalPPTXStudio = dynamic(
    () => import('@components/pptx/professional-pptx-studio').then(mod => mod.ProfessionalPPTXStudio),
    { ssr: false, loading: () => <LoadingScreen message="Loading PPTX Engine..." /> }
);

const RealisticAvatarSystem = dynamic(
    () => import('@components/avatars/realistic/RealisticAvatarSystem'),
    { ssr: false, loading: () => <LoadingScreen message="Loading Avatar Engine..." /> }
);

function LoadingScreen({ message }: { message: string }) {
    return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-950 text-white">
            <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
            <p className="text-slate-400 font-medium">{message}</p>
        </div>
    );
}

export default function StudioMasterPage() {
    const params = useParams();
    const router = useRouter();
    const projectId = params?.id as string;

    const [projectData, setProjectData] = useState<{ type: string; snapshot: any } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!projectId) return;

        const fetchProjectConfig = async () => {
            try {
                logger.info('StudioMaster: Fetching project config', { projectId });
                const response = await fetch(`/api/studio/load/${projectId}`);

                if (!response.ok) {
                    const err = await response.json();
                    throw new Error(err.error || 'Failed to load project config');
                }

                const data = await response.json();

                setProjectData({
                    type: data.type || 'video', // Default to video if undefined
                    snapshot: data.snapshot
                });
            } catch (err) {
                logger.error('StudioMaster: Load Error', err as Error);
                setError(err instanceof Error ? err.message : 'Unknown error');
            } finally {
                setLoading(false);
            }
        };

        fetchProjectConfig();
    }, [projectId]);

    if (loading) return <LoadingScreen message="Initializing Studio Workspace..." />;

    if (error) {
        return (
            <div className="h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-900">
                <div className="bg-white p-8 rounded-lg shadow-xl border max-w-md text-center">
                    <h2 className="text-red-600 text-xl font-bold mb-2">Error Loading Project</h2>
                    <p className="text-slate-600 mb-4">{error}</p>
                    <button
                        onClick={() => router.push('/editor')}
                        className="px-4 py-2 bg-slate-900 text-white rounded hover:bg-slate-800 transition-colors"
                    >
                        Return to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    if (!projectData) return null;

    // Engine Switcher
    switch (projectData.type) {
        case 'video':
        case 'custom': // Treat custom as video for now
            return <UnifiedVideoStudio projectId={projectId} initialSnapshot={projectData.snapshot} />;

        case 'pptx':
            // Assuming PPTX Studio accepts projectId
            return <ProfessionalPPTXStudio projectId={projectId} />; // types need verification

        case 'avatar':
        case 'talking-photo':
            return (
                <div className="h-screen w-full bg-black">
                    {/* Avatar System might need wrapper for studio mode if used as standalone page here */}
                    <RealisticAvatarSystem isStudioMode={false} />
                </div>
            );

        default:
            return (
                <div className="h-screen flex items-center justify-center bg-slate-100">
                    <div className="text-center">
                        <h1 className="text-2xl font-bold mb-2">Unsupported Project Type</h1>
                        <p className="text-slate-500">Type: {projectData.type}</p>
                        <button onClick={() => router.push('/editor')} className="mt-4 text-blue-600 hover:underline">Go Back</button>
                    </div>
                </div>
            );
    }
}
