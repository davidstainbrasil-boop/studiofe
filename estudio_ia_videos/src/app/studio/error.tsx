'use client'

import { useEffect } from 'react'
import { Button } from '@components/ui/button'
import { MonitorPlay } from 'lucide-react'
import * as Sentry from '@sentry/nextjs'

export default function StudioError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        Sentry.captureException(error, {
            tags: { boundary: 'studio-error' },
            extra: { digest: error.digest },
        })
    }, [error])

    return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-background p-4 text-center">
            <div className="mb-4 rounded-full bg-purple-100 p-3 text-purple-600 dark:bg-purple-900/20">
                <MonitorPlay className="h-8 w-8" />
            </div>
            <h2 className="mb-2 text-xl font-bold">Erro no Studio</h2>
            <p className="mb-4 max-w-md text-sm text-muted-foreground">
                O estúdio de vídeo encontrou um problema inesperado.
            </p>
            <div className="flex gap-3">
                <Button onClick={() => window.location.href = '/projects'} variant="outline" size="sm">
                    Voltar aos Projetos
                </Button>
                <Button onClick={() => reset()} size="sm">
                    Recarregar Studio
                </Button>
            </div>
        </div>
    )
}
