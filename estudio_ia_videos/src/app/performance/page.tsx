/**
 * 📊 Página do Dashboard de Performance
 * Monitoramento em tempo real do sistema
 */

import { PerformanceDashboard } from '@components/performance/PerformanceDashboard';

export default function PerformancePage() {
  return <PerformanceDashboard />;
}

export const metadata = {
  title: 'Performance Dashboard - Estúdio IA Vídeos',
  description: 'Monitoramento de performance em tempo real do sistema',
};