'use client';

import { VideoCreationWizard } from '@/components/wizard/VideoCreationWizard';

export default function CreateVideoPage() {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            <VideoCreationWizard />
        </div>
    );
}
