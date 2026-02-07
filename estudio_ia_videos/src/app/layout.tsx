import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from 'sonner';
import { SentryProvider } from '@/components/monitoring/sentry-provider';

/**
 * Force dynamic rendering para todas as rotas.
 * - App autenticado (Supabase) = static generation inútil
 * - Elimina prerender errors do ErrorBoundary interno do Next.js
 *   que chama usePathname() sem contexto de navegação
 */
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'MVP Video Técnico Cursos',
  description: 'Sistema integrado para criação de vídeos educacionais com IA',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <SentryProvider />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
