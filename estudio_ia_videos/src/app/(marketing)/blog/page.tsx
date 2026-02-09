import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Clock, BookOpen } from 'lucide-react';

export const metadata = {
  title: 'Blog | Studio IA',
  description: 'Dicas, tutoriais e novidades sobre produção de vídeos de treinamento com inteligência artificial.',
};

const posts = [
  {
    slug: 'como-criar-videos-treinamento-nr',
    title: 'Como criar vídeos de treinamento NR em minutos com IA',
    description: 'Aprenda a transformar apresentações PPTX em vídeos profissionais de treinamento de segurança usando inteligência artificial.',
    category: 'Tutorial',
    readTime: '5 min',
    date: '2026-02-01',
  },
  {
    slug: 'tendencias-treinamento-corporativo-2026',
    title: 'Tendências de treinamento corporativo para 2026',
    description: 'Descubra como a IA generativa está transformando a forma como empresas treinam seus funcionários.',
    category: 'Insights',
    readTime: '7 min',
    date: '2026-01-15',
  },
  {
    slug: 'avatares-ia-treinamento',
    title: 'Avatares IA: o futuro dos apresentadores de treinamento',
    description: 'Conheça a tecnologia por trás dos avatares virtuais realistas e como eles melhoram o engajamento.',
    category: 'Tecnologia',
    readTime: '6 min',
    date: '2026-01-08',
  },
  {
    slug: 'guia-completo-nr-10-video',
    title: 'Guia completo: NR-10 em vídeo de treinamento',
    description: 'Tudo que você precisa saber para criar um treinamento de NR-10 completo e em conformidade.',
    category: 'Guia',
    readTime: '10 min',
    date: '2025-12-20',
  },
  {
    slug: 'roi-videos-treinamento-ia',
    title: 'ROI de vídeos de treinamento com IA vs. produção tradicional',
    description: 'Análise comparativa de custos e resultados entre produção tradicional e assistida por IA.',
    category: 'Business',
    readTime: '8 min',
    date: '2025-12-10',
  },
  {
    slug: 'tts-vozes-naturais-portugues',
    title: 'Vozes TTS em português: como escolher a melhor para seu treinamento',
    description: 'Compare as melhores vozes de síntese de fala em português brasileiro disponíveis no mercado.',
    category: 'Tutorial',
    readTime: '4 min',
    date: '2025-12-01',
  },
];

const categoryColors: Record<string, string> = {
  Tutorial: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Insights: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  Tecnologia: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  Guia: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  Business: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
};

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      {/* Hero */}
      <section className="px-6 py-20 text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <Badge variant="secondary" className="mb-4">
            <BookOpen className="w-3.5 h-3.5 mr-1.5" />
            Blog
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white">
            Insights e tutoriais
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400">
            Dicas práticas para criar vídeos de treinamento profissionais com IA.
          </p>
        </div>
      </section>

      {/* Posts Grid */}
      <section className="px-6 pb-20">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {posts.map((post) => (
            <Card key={post.slug} className="flex flex-col hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary" className={categoryColors[post.category] || ''}>
                    {post.category}
                  </Badge>
                  <span className="flex items-center text-xs text-slate-500">
                    <Clock className="w-3 h-3 mr-1" />
                    {post.readTime}
                  </span>
                </div>
                <CardTitle className="text-lg leading-snug">{post.title}</CardTitle>
                <CardDescription className="line-clamp-2">{post.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex items-end">
                <Button variant="ghost" className="p-0 h-auto text-violet-600 hover:text-violet-700" disabled>
                  Em breve
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20 bg-violet-600 text-white text-center">
        <div className="max-w-2xl mx-auto space-y-6">
          <h2 className="text-3xl font-bold">Pronto para começar?</h2>
          <p className="text-violet-100 text-lg">
            Crie seu primeiro vídeo de treinamento hoje mesmo.
          </p>
          <Link href="/register">
            <Button size="lg" className="bg-white text-violet-600 hover:bg-violet-50 h-14 px-8 text-lg">
              Criar Conta Grátis
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
