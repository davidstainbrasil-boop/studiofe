import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Estúdio IA Vídeos - PowerPoint para Vídeo em 10 Minutos',
  description: 'Transforme suas apresentações PPTX em vídeos de treinamento profissionais com narração IA, avatares e templates NR. Sem estúdio. Sem editor de vídeo.',
  keywords: [
    'vídeo treinamento',
    'PowerPoint para vídeo',
    'narração IA',
    'avatar IA',
    'NR treinamento',
    'PPTX para vídeo',
    'TTS português',
    'vídeo segurança do trabalho',
  ],
  openGraph: {
    title: 'Estúdio IA Vídeos - PowerPoint para Vídeo Profissional',
    description: 'Transforme PPTX em vídeos de treinamento com IA em 10 minutos',
    type: 'website',
    locale: 'pt_BR',
    siteName: 'Estúdio IA Vídeos',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Estúdio IA Vídeos',
    description: 'PowerPoint para vídeo profissional em 10 minutos',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-white">
      {children}
    </div>
  )
}
