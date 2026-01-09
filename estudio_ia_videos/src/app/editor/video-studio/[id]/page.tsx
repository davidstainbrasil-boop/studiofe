'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { VideoStudio } from '@components/video-studio/VideoStudio';

export default function VideoStudioPage() {
    const params = useParams();
    const projectId = params?.id as string || 'dev-project';

    return <VideoStudio projectId={projectId} />;
}
