'use client'

import { useEffect } from 'react'
import { Button } from '@components/ui/button'
import { FolderOpen } from 'lucide-react'
import * as Sentry from '@sentry/nextjs'

export default function ProjectsError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        Sentry.captureException(error, {
            tags: { boundary: 'projects-error' },
            extra: { digest: error.digest },
        })
    }, [error])

    return (
        <div className="flex h-[80vh] w-full flex-col items-center justify-center p-4 text-center">
            <div className="mb-4 rounded-full bg-yellow-100 p-3 text-yellow-600 dark:bg-yellow-900/20">
                <FolderOpen className="h-8 w-8" />
            </div>
            <h2 className="mb-2 text-xl font-bold">Erro ao Carregar Projetos</h2>
            <p className="mb-6 max-w-md text-sm text-muted-foreground">
                Não foi possível carregar seus projetos. Verifique sua conexão e tente novamente.
            </p>
            <div className="flex gap-3">
                <Button onClick={() => window.location.href = '/'} variant="outline" size="sm">
                    Início
                </Button>
                <Button onClick={() => reset()} size="sm">
                    Tentar Novamente
                </Button>
            </div>
        </div>
    )
}
