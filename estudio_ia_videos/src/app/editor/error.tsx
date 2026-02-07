'use client'

import { useEffect } from 'react'
import { Button } from '@components/ui/button'
import { AlertTriangle, Film } from 'lucide-react'
import * as Sentry from '@sentry/nextjs'

export default function EditorError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        Sentry.captureException(error, {
            tags: { boundary: 'editor-error' },
            extra: { digest: error.digest },
        })
    }, [error])

    return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-background p-4 text-center">
            <div className="mb-4 rounded-full bg-red-100 p-3 text-red-600 dark:bg-red-900/20">
                <Film className="h-8 w-8" />
            </div>
            <h2 className="mb-2 text-xl font-bold">Erro no Editor</h2>
            <p className="mb-4 max-w-md text-sm text-muted-foreground">
                O editor encontrou um problema. Suas alterações anteriores foram salvas automaticamente.
            </p>
            <div className="flex gap-3">
                <Button onClick={() => window.location.href = '/projects'} variant="outline" size="sm">
                    Meus Projetos
                </Button>
                <Button onClick={() => reset()} size="sm">
                    Reabrir Editor
                </Button>
            </div>
            {process.env.NODE_ENV === 'development' && (
                <pre className="mt-6 max-w-xl overflow-auto rounded bg-slate-950 p-3 text-left text-xs text-red-400">
                    {error.message}
                </pre>
            )}
        </div>
    )
}
