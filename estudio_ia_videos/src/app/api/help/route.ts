import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@lib/logger'

// FAQ data - In production, this would come from a CMS or database
const faqs = [
  {
    id: 1,
    question: 'Como gerar legendas automáticas?',
    answer: 'Acesse a página Auto-Subtitles, faça upload do seu vídeo e clique em "Gerar Legendas". O sistema usará IA (Whisper) para transcrever automaticamente.',
    category: 'Legendas'
  },
  {
    id: 2,
    question: 'Qual o limite de tamanho para upload de vídeos?',
    answer: 'Para processamento direto, o limite é 25MB. Para vídeos maiores, use o processamento em lote que suporta até 500MB.',
    category: 'Upload'
  },
  {
    id: 3,
    question: 'Como funciona a clonagem de voz?',
    answer: 'Você precisa de pelo menos 30 segundos de áudio limpo. Faça upload na página Voice Cloning e o sistema criará um modelo de voz personalizado.',
    category: 'Voz'
  },
  {
    id: 4,
    question: 'Posso processar vários vídeos ao mesmo tempo?',
    answer: 'Sim! Use a funcionalidade de Batch Processing para processar múltiplos vídeos simultaneamente com drag and drop.',
    category: 'Processamento'
  },
  {
    id: 5,
    question: 'Como exportar vídeos em 4K?',
    answer: 'Na página Video Enhancement, selecione a opção de upscaling e escolha 2160p (4K). O sistema usará IA para escalar seu vídeo.',
    category: 'Export'
  },
  {
    id: 6,
    question: 'Meus dados estão seguros?',
    answer: 'Sim! Usamos criptografia SSL/TLS, armazenamento seguro na AWS/Cloudflare, e seguimos as melhores práticas de segurança.',
    category: 'Segurança'
  },
  {
    id: 7,
    question: 'Como criar um avatar AI?',
    answer: 'Acesse AI Avatars, escolha entre avatares pré-definidos ou faça upload de sua foto. Configure voz, expressões e gere seu vídeo com avatar personalizado.',
    category: 'Avatares'
  },
  {
    id: 8,
    question: 'Posso usar minha própria marca nos vídeos?',
    answer: 'Sim! Na página Brand Kit, você pode cadastrar logotipos, cores, fontes e templates personalizados. Eles serão aplicados automaticamente aos seus vídeos.',
    category: 'Marca'
  },
  {
    id: 9,
    question: 'Como converter uma apresentação PPTX em vídeo?',
    answer: 'Use a funcionalidade PPT-to-Video. Faça upload do seu PPTX, o sistema extrairá slides e notas automaticamente. Adicione narrações AI e exporte como vídeo.',
    category: 'Conversão'
  },
  {
    id: 10,
    question: 'Quais formatos de exportação são suportados?',
    answer: 'Suportamos MP4, MOV, WEBM para vídeo; MP3, WAV, AAC para áudio; e SRT, VTT para legendas. Resoluções de 480p até 4K.',
    category: 'Export'
  }
]

const guides = [
  {
    id: 1,
    title: 'Primeiros Passos',
    description: 'Aprenda o básico da plataforma',
    icon: 'lightbulb',
    category: 'getting-started',
    link: '/docs/getting-started'
  },
  {
    id: 2,
    title: 'Tutoriais em Vídeo',
    description: 'Assista demonstrações práticas',
    icon: 'video',
    category: 'tutorials',
    link: '/docs/tutorials'
  },
  {
    id: 3,
    title: 'Documentação da API',
    description: 'Referência técnica completa',
    icon: 'file-text',
    category: 'api',
    link: '/docs/api'
  },
  {
    id: 4,
    title: 'Guia de Configuração',
    description: 'Configure a plataforma',
    icon: 'settings',
    category: 'configuration',
    link: '/docs/configuration'
  },
  {
    id: 5,
    title: 'PPT to Video',
    description: 'Converta apresentações em vídeos',
    icon: 'presentation',
    category: 'features',
    link: '/ppt-to-video'
  },
  {
    id: 6,
    title: 'Voice Studio',
    description: 'Sintetize e clone vozes AI',
    icon: 'mic',
    category: 'features',
    link: '/voice-studio'
  },
  {
    id: 7,
    title: 'AI Avatars',
    description: 'Crie apresentadores virtuais',
    icon: 'user',
    category: 'features',
    link: '/ai-avatars'
  },
  {
    id: 8,
    title: 'Exportação Avançada',
    description: 'Opções de formatos e qualidade',
    icon: 'download',
    category: 'features',
    link: '/export-pro'
  }
]

const contactOptions = [
  {
    id: 1,
    title: 'Email de Suporte',
    description: 'Resposta em até 24 horas',
    icon: 'mail',
    action: 'mailto:suporte@tecnicocursos.com.br'
  },
  {
    id: 2,
    title: 'Chat ao Vivo',
    description: 'Disponível em horário comercial',
    icon: 'message-circle',
    action: '/chat'
  },
  {
    id: 3,
    title: 'Base de Conhecimento',
    description: 'Artigos e tutoriais detalhados',
    icon: 'book',
    action: '/docs'
  }
]

/**
 * GET /api/help
 * Returns FAQs, guides, and contact options for help center
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')?.toLowerCase()
    const category = searchParams.get('category')
    const type = searchParams.get('type') // 'faqs', 'guides', 'contact', or all

    let filteredFaqs = faqs
    let filteredGuides = guides
    let filteredContact = contactOptions

    // Apply search filter
    if (search) {
      filteredFaqs = faqs.filter(faq => 
        faq.question.toLowerCase().includes(search) ||
        faq.answer.toLowerCase().includes(search) ||
        faq.category.toLowerCase().includes(search)
      )
      filteredGuides = guides.filter(guide =>
        guide.title.toLowerCase().includes(search) ||
        guide.description.toLowerCase().includes(search)
      )
    }

    // Apply category filter for FAQs
    if (category) {
      filteredFaqs = filteredFaqs.filter(faq => 
        faq.category.toLowerCase() === category.toLowerCase()
      )
    }

    // Return specific type or all
    if (type === 'faqs') {
      return NextResponse.json({
        success: true,
        data: { faqs: filteredFaqs }
      })
    }

    if (type === 'guides') {
      return NextResponse.json({
        success: true,
        data: { guides: filteredGuides }
      })
    }

    if (type === 'contact') {
      return NextResponse.json({
        success: true,
        data: { contact: filteredContact }
      })
    }

    // Return all
    return NextResponse.json({
      success: true,
      data: {
        faqs: filteredFaqs,
        guides: filteredGuides,
        contact: filteredContact,
        categories: [...new Set(faqs.map(f => f.category))]
      }
    })
  } catch (error) {
    logger.error('Help data fetch error', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({
      success: false,
      error: 'Falha ao carregar dados de ajuda'
    }, { status: 500 })
  }
}
