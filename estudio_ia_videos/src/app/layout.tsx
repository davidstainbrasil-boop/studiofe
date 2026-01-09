import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import './styles/mobile-first.css';
import Providers from './components/providers';
import { Toaster } from './components/ui/toaster';
import { ThemeProvider } from './components/theme/theme-provider';
import { InteractiveTutorial } from './components/tutorial/tutorial-simple';
import { EmergencyErrorBoundary } from './lib/advanced-analytics-emergency';
import PWAInstallPrompt from './components/pwa/pwa-install-prompt';

import ProductionProvider from './components/providers/production-provider';
import GlobalButtonFix from './components/ui/button-fix-global';
import { AuthProvider } from '@hooks/use-auth';
import { Navbar } from './components/layout/navbar';

// DEV/E2E URL Isolation Guard - MUST be imported early
import './lib/dev-url-guard';

// Import do sistema de correções melhorado
// import './lib/emergency-fixes-improved';

// Inicializar Sentry se configurado
if (process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN) {
  import('@sentry/nextjs').then((Sentry) => {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN,
      tracesSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? '0.1'),
      replaysSessionSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE ?? '0'),
      replaysOnErrorSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE ?? '1'),
      environment: process.env.NODE_ENV,
      enabled: true,
    });
  }).catch(() => {
    console.warn('Sentry initialization failed');
  });
}

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || 'https://cursostecno.com.br'),
  title: {
    default: 'VideoStudio Pro - Editor de Vídeo com IA',
    template: '%s | VideoStudio Pro'
  },
  description: 'A plataforma mais avançada do Brasil para criação de vídeos de treinamento e segurança com Inteligência Artificial.',
  keywords: ['IA', 'Vídeo', 'Edição', 'Segurança do Trabalho', 'NR', 'Treinamento'],
  authors: [{ name: 'VideoStudio Team' }],
  creator: 'VideoStudio Pro',
  publisher: 'VideoStudio Pro',
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: 'https://videostudio.pro',
    title: 'VideoStudio Pro - O Melhor do Brasil',
    description: 'Crie vídeos profissionais em minutos com nossa IA avançada.',
    siteName: 'VideoStudio Pro',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VideoStudio Pro',
    description: 'Revolucione seus treinamentos com vídeos gerados por IA.',
    creator: '@videostudio',
  },
  manifest: '/manifest.json',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#000000'
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={inter.className}>
        <EmergencyErrorBoundary>
          <ThemeProvider
            defaultTheme="light"
          >
            <Providers>
              <ProductionProvider>
                <AuthProvider>
                  <div className="relative">
                    <Navbar />
                    {children}
                    <PWAInstallPrompt />
                    <InteractiveTutorial />
                    <GlobalButtonFix />
                  </div>
                </AuthProvider>
              </ProductionProvider>
            </Providers>
          </ThemeProvider>
        </EmergencyErrorBoundary>
        <Toaster />
      </body>
    </html>
  );
}

