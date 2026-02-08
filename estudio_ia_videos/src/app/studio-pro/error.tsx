'use client'

import { useEffect } from 'react'
import { Button } from '@components/ui/button'
import { MonitorPlay, RefreshCw, Home } from 'lucide-react'
import * as Sentry from '@sentry/nextjs'

export default function StudioProError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        Sentry.captureException(error, {
            tags: { boundary: 'studio-pro-error' },
            extra: { digest: error.digest },
        })
    }, [error])

    return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-950 p-4 text-center">
            <div className="mb-6 rounded-full bg-red-500/10 p-4">
                <MonitorPlay className="h-10 w-10 text-red-400" />
            </div>
            <h2 className="mb-2 text-2xl font-bold text-white">Erro no Studio Pro</h2>
            <p className="mb-2 max-w-md text-sm text-slate-400">
                O editor encontrou um problema inesperado. Seu trabalho salvo não foi perdido.
            </p>
            {error.message && (
                <p className="mb-6 max-w-md text-xs text-slate-500 font-mono bg-slate-900 px-3 py-2 rounded">
                    {error.message.slice(0, 200)}
                </p>
            )}
            <div className="flex gap-3">
                <Button
                    onClick={() => window.location.href = '/studio-pro'}
                    variant="outline"
                    size="sm"
                    className="border-slate-700 text-slate-300 hover:bg-slate-800"
                >
                    <Home className="h-4 w-4 mr-2" />
                    Dashboard
                </Button>
                <Button
                    onClick={() => reset()}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Recarregar Editor
                </Button>
            </div>
        </div>
    )
}
