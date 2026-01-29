'use client'

import { ProfessionalDashboard } from '@/components/dashboard/professional-dashboard'

/**
 * Página do Dashboard Profissional
 * 
 * Esta página demonstra o dashboard profissional completo com:
 * - KPIs animados com tendências
 * - Gráficos interativos (área, pizza)
 * - Tabela de projetos com filtros
 * - Feed de atividades em tempo real
 * - Status do sistema
 * - Ações rápidas
 * 
 * Para usar o dashboard atual, acesse /dashboard
 * Para usar este dashboard profissional, acesse /dashboard/pro
 */
export default function ProfessionalDashboardPage() {
  return <ProfessionalDashboard />
}
