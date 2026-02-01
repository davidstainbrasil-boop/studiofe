import { Metadata } from 'next';
import { Suspense } from 'react';
import { EnhancedAuthForm } from '@components/auth/enhanced-auth-form';
import { Video, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';

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
      {/* Background decorations */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-violet-200/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-200/30 rounded-full blur-3xl" />
      </div>

      <div className="lg:p-8 flex items-center justify-center">
        <div className="mx-auto flex w-full flex-col justify-center space-y-8 sm:w-[450px]">
          {/* Logo & Header */}
          <div className="flex flex-col space-y-4 text-center">
            <div className="flex items-center justify-center">
              <div className="relative">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/30">
                  <Video className="h-7 w-7 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-r from-amber-400 to-orange-500 shadow-md">
                  <Sparkles className="h-3 w-3 text-white" />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900 bg-clip-text text-transparent dark:from-white dark:to-slate-300">
                Crie sua conta gratuita
              </h1>
              <p className="text-muted-foreground">
                Comece a criar vídeos profissionais em minutos
              </p>
            </div>
          </div>

          {/* Benefits */}
          <div className="flex justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span>Grátis para começar</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span>Sem cartão</span>
            </div>
          </div>

          <Suspense fallback={<LoadingFallback />}>
            <EnhancedAuthForm mode="register" />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
