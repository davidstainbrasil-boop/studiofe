import { Metadata } from 'next';
import { Suspense } from 'react';
import { EnhancedAuthForm } from '@components/auth/enhanced-auth-form';
import { Video, Loader2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Criar Conta | Estúdio IA de Vídeos',
  description: 'Crie sua conta e comece a produzir vídeos profissionais com IA',
};

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center p-8">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="container relative min-h-screen flex-col items-center justify-center grid lg:max-w-none lg:px-0">
      <div className="lg:p-8">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[450px]">
          {/* Logo */}
          <div className="flex flex-col space-y-2 text-center">
            <div className="flex items-center justify-center mb-2">
              <Video className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Crie sua conta gratuita
            </h1>
            <p className="text-sm text-muted-foreground">
              Comece a criar vídeos profissionais em minutos
            </p>
          </div>

          <Suspense fallback={<LoadingFallback />}>
            <EnhancedAuthForm mode="register" />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
