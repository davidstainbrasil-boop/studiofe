'use client'

import { useEffect } from 'react'
import { Button } from '@components/ui/button'
import { AlertTriangle, LayoutDashboard } from 'lucide-react'
import * as Sentry from '@sentry/nextjs'

export default function DashboardError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        Sentry.captureException(error, {
            tags: { boundary: 'dashboard-error' },
            extra: { digest: error.digest },
        })
    }, [error])

    return (
        <div className="flex h-[80vh] w-full flex-col items-center justify-center p-4 text-center">
            <div className="mb-4 rounded-full bg-orange-100 p-3 text-orange-600 dark:bg-orange-900/20">
                <LayoutDashboard className="h-8 w-8" />
            </div>
            <h2 className="mb-2 text-xl font-bold">Erro no Dashboard</h2>
            <p className="mb-6 max-w-md text-sm text-muted-foreground">
                Não foi possível carregar o dashboard. Tente novamente.
            </p>
            <div className="flex gap-3">
                <Button onClick={() => window.location.href = '/'} variant="outline" size="sm">
                    Início
                </Button>
                <Button onClick={() => reset()} size="sm">
                    Recarregar
                </Button>
            </div>
        </div>
    )
}
