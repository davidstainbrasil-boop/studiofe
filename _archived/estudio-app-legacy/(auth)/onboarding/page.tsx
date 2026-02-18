/**
 * Onboarding Page
 * Página de onboarding para novos usuários
 */

import OnboardingWizard from '@/components/onboarding/OnboardingWizard';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Configurar Conta | TécnicoCursos',
  description: 'Configure sua conta para começar a criar vídeos',
};

export default function OnboardingPage() {
  return <OnboardingWizard />;
}
