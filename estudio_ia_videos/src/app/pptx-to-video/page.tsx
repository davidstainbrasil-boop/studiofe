/**
 * PPTX to Video - Interface Simplificada estilo HeyGen
 *
 * Design limpo e profissional:
 * - Upload simples com drag & drop
 * - Configuração em uma única tela
 * - Botão grande "Criar Vídeo"
 */
'use client';

import { PPTXToVideoWizardV2 } from '@/components/pptx-to-video/PPTXToVideoWizardV2';

export default function PPTXToVideoPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto max-w-6xl">
        {/* Clean Card Container */}
        <div className="bg-card rounded-2xl shadow-xl border overflow-hidden my-8">
          <PPTXToVideoWizardV2 />
        </div>

        {/* Footer Info */}
        <div className="text-center pb-8 text-sm text-muted-foreground">
          <p>Powered by AI • Vozes naturais em português • 100% automático</p>
        </div>
      </div>
    </main>
  );
}
