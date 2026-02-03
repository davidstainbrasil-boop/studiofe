/**
 * Public Layout
 * Layout para páginas públicas (landing, termos, etc.)
 */

import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: {
    default: 'TécnicoCursos - Vídeos de Treinamento com IA',
    template: '%s | TécnicoCursos',
  },
};

function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-sm border-b">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="text-2xl font-bold text-blue-600">
            TécnicoCursos
          </Link>
          <div className="hidden md:flex items-center space-x-8">
            <Link href="#features" className="text-gray-600 hover:text-gray-900">
              Funcionalidades
            </Link>
            <Link href="#pricing" className="text-gray-600 hover:text-gray-900">
              Preços
            </Link>
            <Link href="/templates" className="text-gray-600 hover:text-gray-900">
              Templates NR
            </Link>
            <Link href="#faq" className="text-gray-600 hover:text-gray-900">
              FAQ
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <Link
              href="/auth/login"
              className="text-gray-600 hover:text-gray-900 font-medium"
            >
              Entrar
            </Link>
            <Link
              href="/auth/signup"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Criar Conta
            </Link>
          </div>
        </div>
      </nav>
    </header>
  );
}

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <div className="pt-16">
        {children}
      </div>
    </>
  );
}
