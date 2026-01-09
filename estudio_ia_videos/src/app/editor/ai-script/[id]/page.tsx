'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import AIScriptGenerator from '@components/ai/ai-script-generator';
import { Button } from '@components/ui/button';
import { ChevronLeft } from 'lucide-react';

export default function AIScriptWizardPage() {
    const params = useParams();
    const router = useRouter();
    const projectId = params?.id as string;

    return (
        <div className="min-h-screen bg-gray-50/50 p-6">
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center gap-4 mb-8">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push('/dashboard')}
                        className="text-gray-500 hover:text-gray-900"
                    >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Voltar
                    </Button>
                    <h1 className="text-2xl font-bold text-gray-900">Estúdio de Criação IA</h1>
                    <div className="flex-1" />
                    <div className="text-sm text-gray-500">
                        Projeto ID: <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{projectId}</span>
                    </div>
                </div>

                <AIScriptGenerator projectId={projectId} />
            </div>
        </div>
    );
}
