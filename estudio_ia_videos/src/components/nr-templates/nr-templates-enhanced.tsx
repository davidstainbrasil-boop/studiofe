

'use client'

/**
 * 🛡️ NR TEMPLATES ENHANCED - Sprint 17
 * Templates NR com compliance automático e validação em tempo real
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@components/ui/card'
import { Button } from '@components/ui/button'
import { Badge } from '@components/ui/badge'
import { Input } from '@components/ui/input'
import { 
  Shield, 
  Search, 
  CheckCircle, 
  Clock, 
  Users, 
  FileText,
  Video,
  Zap,
  ArrowRight,
  Award,
  AlertTriangle,
  Play,
  Download,
  Eye,
  Star,
  Upload
} from 'lucide-react'

interface NRTemplate {
  id: string
  nr: string
  title: string
  description: string
  category: string
  difficulty: 'Básico' | 'Intermediário' | 'Avançado'
  duration: string
  compliance: number
  lastUpdated: string
  slides: number
  status: 'ready' | 'updating' | 'draft'
  features: string[]
  preview?: string
}

const nrTemplates: NRTemplate[] = [
  {
    id: 'nr-12',
    nr: 'NR-12',
    title: 'Segurança no Trabalho em Máquinas e Equipamentos',
    description: 'Treinamento completo sobre operação segura de máquinas, dispositivos de proteção e procedimentos de manutenção.',
    category: 'Máquinas e Equipamentos',
    difficulty: 'Avançado',
    duration: '45 min',
    compliance: 98,
    lastUpdated: '2 dias atrás',
    slides: 28,
    status: 'ready',
    features: ['Avatares 3D', 'Simulações Interativas', 'Quiz Compliance', 'Certificação Digital'],
    preview: '/nr12-thumb.jpg'
  },
  {
    id: 'nr-35',
    nr: 'NR-35',
    title: 'Trabalho em Altura',
    description: 'Procedimentos de segurança para trabalho em altura, uso de EPIs e sistemas de proteção coletiva.',
    category: 'Trabalho em Altura',
    difficulty: 'Avançado',
    duration: '40 min',
    compliance: 96,
    lastUpdated: '1 semana atrás',
    slides: 25,
    status: 'ready',
    features: ['Simulação 3D', 'Realidade Virtual', 'Checklist Digital', 'Avaliação Prática'],
    preview: '/nr35-thumb.jpg'
  },
  {
    id: 'nr-33',
    nr: 'NR-33',
    title: 'Segurança e Saúde nos Trabalhos em Espaços Confinados',
    description: 'Identificação, avaliação e controle dos riscos em espaços confinados.',
    category: 'Espaços Confinados',
    difficulty: 'Avançado',
    duration: '50 min',
    compliance: 94,
    lastUpdated: '3 dias atrás',
    slides: 32,
    status: 'ready',
    features: ['Detecção de Gases', 'Procedimentos de Resgate', 'Monitoramento Contínuo'],
    preview: '/nr33-thumb.jpg'
  },
  {
    id: 'nr-06',
    nr: 'NR-06',
    title: 'Equipamento de Proteção Individual - EPI',
    description: 'Seleção, uso, conservação e descarte adequado dos equipamentos de proteção individual.',
    category: 'Proteção Individual',
    difficulty: 'Básico',
    duration: '30 min',
    compliance: 99,
    lastUpdated: '1 dia atrás',
    slides: 18,
    status: 'ready',
    features: ['Catálogo Interativo', 'Guia de Seleção', 'Manutenção Preventiva'],
    preview: '/corporativa-thumb.jpg'
  },
  {
    id: 'nr-10',
    nr: 'NR-10',
    title: 'Segurança em Instalações e Serviços em Eletricidade',
    description: 'Procedimentos de segurança em atividades com eletricidade, medidas de controle e proteção.',
    category: 'Segurança Elétrica',
    difficulty: 'Intermediário',
    duration: '55 min',
    compliance: 97,
    lastUpdated: '5 dias atrás',
    slides: 35,
    status: 'updating',
    features: ['Simulador Elétrico', 'Medição de Riscos', 'Procedimentos de Emergência'],
    preview: '/avatar-executivo-thumb.jpg'
  },
  {
    id: 'nr-17',
    nr: 'NR-17',
    title: 'Ergonomia',
    description: 'Parâmetros para adequação das condições de trabalho às características psicofisiológicas.',
    category: 'Ergonomia',
    difficulty: 'Intermediário',
    duration: '35 min',
    compliance: 95,
    lastUpdated: '1 semana atrás',
    slides: 22,
    status: 'ready',
    features: ['Análise Postural', 'Exercícios Preventivos', 'Avaliação Ergonômica'],
    preview: '/corporativa-thumb.jpg'
  }
]

export default function NRTemplatesEnhanced() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [filteredTemplates, setFilteredTemplates] = useState(nrTemplates)

  useEffect(() => {
    let filtered = nrTemplates

    if (searchTerm) {
      filtered = filtered.filter(template =>
        template.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.nr.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.category.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(template => template.category === selectedCategory)
    }

    setFilteredTemplates(filtered)
  }, [searchTerm, selectedCategory])

  const categories = ['all', ...Array.from(new Set(nrTemplates.map(t => t.category)))]

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'updating': return <Clock className="h-4 w-4 text-orange-500 animate-spin" />
      case 'draft': return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      default: return <FileText className="h-4 w-4" />
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Básico': return 'bg-green-100 text-green-700 border-green-200'
      case 'Intermediário': return 'bg-orange-100 text-orange-700 border-orange-200'
      case 'Avançado': return 'bg-red-100 text-red-700 border-red-200'
      default: return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const handleUseTemplate = (template: NRTemplate) => {
    // Redirecionar para o sistema real com template pré-selecionado
    router.push(`/pptx-upload-real?template=${template.id}`)
  }

  const handlePreviewTemplate = (template: NRTemplate) => {
    router.push(`/template-preview/${template.id}`)
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4 py-8 bg-gradient-to-br from-green-50 to-blue-50 rounded-2xl border border-green-200">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="p-3 bg-green-500/20 rounded-full">
            <Shield className="h-8 w-8 text-green-600" />
          </div>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
              Templates NR Compliance Pro
            </h1>
            <p className="text-lg text-muted-foreground mt-2">
              Templates profissionais com compliance automático e validação em tempo real
            </p>
          </div>
        </div>

        {/* Métricas Gerais */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
          <div className="bg-white/70 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-600">{nrTemplates.length}</div>
            <div className="text-sm text-muted-foreground">Templates Disponíveis</div>
          </div>
          <div className="bg-white/70 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-600">97%</div>
            <div className="text-sm text-muted-foreground">Compliance Médio</div>
          </div>
          <div className="bg-white/70 rounded-lg p-4">
            <div className="text-2xl font-bold text-purple-600">40min</div>
            <div className="text-sm text-muted-foreground">Duração Média</div>
          </div>
          <div className="bg-white/70 rounded-lg p-4">
            <div className="text-2xl font-bold text-orange-600">100%</div>
            <div className="text-sm text-muted-foreground">Atualizados</div>
          </div>
        </div>
      </div>

      {/* Controles de Busca e Filtro */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar por NR, título ou categoria..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(category)}
            >
              {category === 'all' ? 'Todas as NRs' : category}
            </Button>
          ))}
        </div>
      </div>

      {/* Grid de Templates */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => (
          <Card key={template.id} className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-green-500">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-600 text-white font-bold px-3 py-1">
                      {template.nr}
                    </Badge>
                    {getStatusIcon(template.status)}
                  </div>
                  <CardTitle className="text-lg line-clamp-2">
                    {template.title}
                  </CardTitle>
                </div>
                
                <div className="text-right space-y-1">
                  <div className="text-2xl font-bold text-green-600">
                    {template.compliance}%
                  </div>
                  <div className="text-xs text-muted-foreground">Compliance</div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Preview Thumbnail */}
              {template.preview && (
                <div className="aspect-video bg-muted rounded-lg overflow-hidden relative">
                  <img 
                    src={template.preview} 
                    alt={template.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-all duration-300">
                    <Button size="sm" variant="secondary" onClick={() => handlePreviewTemplate(template)}>
                      <Eye className="h-4 w-4 mr-2" />
                      Preview
                    </Button>
                  </div>
                </div>
              )}

              {/* Descrição */}
              <p className="text-sm text-muted-foreground line-clamp-2">
                {template.description}
              </p>

              {/* Metadados */}
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    {template.slides} slides
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {template.duration}
                  </span>
                </div>
                <Badge className={getDifficultyColor(template.difficulty)} variant="outline">
                  {template.difficulty}
                </Badge>
              </div>

              {/* Features */}
              <div className="space-y-2">
                <div className="text-sm font-medium">Recursos Inclusos:</div>
                <div className="flex flex-wrap gap-1">
                  {template.features.slice(0, 3).map((feature, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {feature}
                    </Badge>
                  ))}
                  {template.features.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{template.features.length - 3} mais
                    </Badge>
                  )}
                </div>
              </div>

              {/* Ações */}
              <div className="flex gap-2 pt-2">
                <Button 
                  className="flex-1" 
                  onClick={() => handleUseTemplate(template)}
                  disabled={template.status !== 'ready'}
                >
                  {template.status === 'ready' ? (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Usar Template
                    </>
                  ) : (
                    <>
                      <Clock className="h-4 w-4 mr-2" />
                      Atualizando...
                    </>
                  )}
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handlePreviewTemplate(template)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </div>

              {/* Status e última atualização */}
              <div className="text-xs text-muted-foreground pt-2 border-t">
                <div className="flex justify-between items-center">
                  <span>Atualizado {template.lastUpdated}</span>
                  {template.compliance >= 95 && (
                    <span className="flex items-center gap-1 text-green-600">
                      <Star className="h-3 w-3" />
                      Premium
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Rodapé com Informações */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6 border border-green-200">
        <div className="text-center space-y-4">
          <h3 className="text-xl font-bold text-green-700">
            ✅ Compliance Automático Garantido
          </h3>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Todos os templates são atualizados automaticamente conforme mudanças nas Normas Regulamentadoras, 
            garantindo 100% de conformidade com a legislação atual.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button variant="outline" onClick={() => router.push('/compliance-dashboard')}>
              <Shield className="h-4 w-4 mr-2" />
              Dashboard de Compliance
            </Button>
            <Button onClick={() => router.push('/pptx-upload-real')}>
              <Upload className="h-4 w-4 mr-2" />
              Criar Novo Treinamento
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

