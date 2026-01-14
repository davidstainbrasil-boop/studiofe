import { Metadata } from 'next';
import { Suspense } from 'react';
import { EnhancedAuthForm } from '@components/auth/enhanced-auth-form';
import { Sparkles, Video, ShieldCheck, Zap, Users, TrendingUp, Loader2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Login | Estúdio IA de Vídeos',
  description: 'Acesse sua conta para criar vídeos profissionais com IA',
};

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center p-8">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="container relative min-h-screen flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-2 lg:px-0">
      {/* Left Column - Branding & Features */}
      <div className="relative hidden h-full flex-col bg-muted p-10 text-white lg:flex dark:border-r">
        <div className="absolute inset-0 bg-zinc-900" />
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-purple-900 to-zinc-900 opacity-90" />

        {/* Logo & Brand */}
        <div className="relative z-20 flex items-center text-lg font-medium">
          <Video className="mr-2 h-6 w-6" />
          Estúdio IA de Vídeos
        </div>

        {/* Main Content */}
        <div className="relative z-20 mt-auto space-y-8">
          <div>
            <h1 className="text-4xl font-bold mb-4">
              Crie vídeos profissionais em minutos
            </h1>
            <p className="text-lg text-zinc-300">
              Plataforma completa de produção de vídeos com IA, avatares digitais e conversão automática de PPTX.
            </p>
          </div>

          {/* Testimonial */}
          <blockquote className="space-y-2 border-l-4 border-white/30 pl-4">
            <p className="text-base italic">
              &ldquo;Esta plataforma revolucionou a forma como criamos treinamentos de segurança.
              A geração automática a partir de PPTX economiza semanas de trabalho.&rdquo;
            </p>
            <footer className="text-sm text-zinc-300">— Equipe de Treinamento</footer>
          </blockquote>

          {/* Feature Highlights */}
          <div className="space-y-4 pt-6 border-t border-white/10">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold">IA Avançada</h3>
                <p className="text-sm text-zinc-300">
                  Geração automática de narrações, legendas e animações
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold">Pipeline Rápido</h3>
                <p className="text-sm text-zinc-300">
                  De PPTX a vídeo final em menos de 5 minutos
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold">Conformidade NR</h3>
                <p className="text-sm text-zinc-300">
                  Templates prontos para treinamentos regulamentados
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold">Colaboração em Tempo Real</h3>
                <p className="text-sm text-zinc-300">
                  Trabalhe em equipe com sincronização instantânea
                </p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 pt-6 border-t border-white/10">
            <div className="text-center">
              <div className="text-2xl font-bold">10k+</div>
              <div className="text-xs text-zinc-400">Vídeos criados</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">98%</div>
              <div className="text-xs text-zinc-400">Satisfação</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">24/7</div>
              <div className="text-xs text-zinc-400">Suporte</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-20 mt-8 text-xs text-zinc-400">
          <p>© 2026 Estúdio IA de Vídeos. Todos os direitos reservados.</p>
        </div>
      </div>

      {/* Right Column - Auth Form */}
      <div className="lg:p-8">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[450px]">
          <Suspense fallback={<LoadingFallback />}>
            <EnhancedAuthForm mode="login" />
          </Suspense>

          {/* Security Notice */}
          <div className="px-8 text-center text-xs text-muted-foreground">
            <p>
              Ao continuar, você concorda com nossos{' '}
              <a href="/terms" className="underline underline-offset-4 hover:text-primary">
                Termos de Serviço
              </a>{' '}
              e{' '}
              <a href="/privacy" className="underline underline-offset-4 hover:text-primary">
                Política de Privacidade
              </a>
              .
            </p>
            <p className="mt-2 flex items-center justify-center gap-1">
              <ShieldCheck className="h-3 w-3" />
              Conexão segura com criptografia SSL
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
