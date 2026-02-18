'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { logger } from '@/lib/logger';

export default function ProjectsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error('Projects error', { error: error.message, digest: error.digest });
  }, [error]);

  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="max-w-md text-center">
        <AlertTriangle className="mx-auto h-10 w-10 text-amber-500" />
        <h2 className="mt-4 text-lg font-semibold">Erro ao carregar projetos</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {error.message || 'Não foi possível carregar a lista de projetos.'}
        </p>
        <Button variant="outline" onClick={reset} className="mt-4">
          Tentar novamente
        </Button>
      </div>
    </div>
  );
}
