'use client';

import { useEffect } from 'react';
import { initSentry } from '@/lib/monitoring/sentry.client';

/**
 * Sentry Provider Component
 * Inicializa o Sentry no lado do cliente
 */
export function SentryProvider() {
  useEffect(() => {
    initSentry();
  }, []);

  return null;
}
