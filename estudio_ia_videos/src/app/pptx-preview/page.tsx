/**
 * 🎬 PPTX Preview & Edit Page
 * 
 * Wrapper for Professional PPTX Studio
 */

'use client';

import { Suspense } from 'react';
import { ProfessionalPPTXStudio } from '@components/pptx/professional-pptx-studio';
import { Loader2 } from 'lucide-react';

export default function PPTXPreviewPage() {
    return (
        <div className="h-screen w-full overflow-hidden bg-[#0f1115]">
            <Suspense fallback={
                <div className="flex items-center justify-center h-full text-white">
                    <Loader2 className="w-8 h-8 animate-spin mr-2" />
                    Carregando Studio...
                </div>
            }>
                <ProfessionalPPTXStudio />
            </Suspense>
        </div>
    );
}
