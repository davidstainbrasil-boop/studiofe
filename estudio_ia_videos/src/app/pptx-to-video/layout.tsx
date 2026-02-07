/**
 * Layout para PPTX to Video - Fluxo HeyGen-like
 */
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'PPTX to Video | Estudio IA Videos',
  description: 'Transforme sua apresentação PowerPoint em vídeo profissional com avatar AI em 3 passos simples.',
};

export default function PPTXToVideoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {children}
    </div>
  );
}
