'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { logger } from '@/lib/logger';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error('Global error', { error: error.message, digest: error.digest });
  }, [error]);

  return (
    <html lang="pt-BR">
      <body className="flex min-h-screen items-center justify-center bg-background">
        <div className="mx-auto max-w-md text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
          <h2 className="mt-4 text-xl font-semibold">Algo deu errado</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Ocorreu um erro inesperado. Tente novamente ou entre em contato com suporte.
          </p>
          {error.digest && (
            <p className="mt-1 text-xs text-muted-foreground">Código: {error.digest}</p>
          )}
          <Button onClick={reset} className="mt-6">
            Tentar novamente
          </Button>
        </div>
      </body>
    </html>
  );
}
