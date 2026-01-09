

/**
 * 🏗️ Sistema de Templates NR Avançado
 * Templates Profissionais com Compliance Automático
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card';
import { Badge } from '@components/ui/badge';
import { Button } from '@components/ui/button';
import { Progress } from '@components/ui/progress';
import { Alert, AlertDescription } from '@components/ui/alert';
import { Input } from '@components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@components/ui/select';
import {
  HardHat,
  Shield,
  AlertTriangle,
  CheckCircle,
  FileText,
  Video,
  Brain,
  Target,
  Users,
  Award,
  Globe,
  Clock,
  BarChart3,
  Zap,
  Eye,
  Settings,
  Download,
  Play,
  RefreshCw,
  Sparkles,
  Building,
  Briefcase,
  TrendingUp,
  Activity,
  Star,
  Crown,
  Rocket,
  Database,
  Palette,
  Monitor,
  HeadphonesIcon,
  Camera,
  Mic,
  Filter,
  Search,
  BookOpen,
  Wrench
} from 'lucide-react';
import Image from 'next/image';
import { toast } from 'react-hot-toast';

interface NRTemplateEnhanced {
  id: string;
  nome: string;
  nr: string;
  categoria: string;
  setor: string[];
  tipo: 'video-base' | 'interativo' | '3d-imersivo' | 'gamificado' | 'micro-learning';
  duracaoMinutos: number;
  complexidade: 1 | 2 | 3 | 4 | 5;
  descricao: string;
  objetivos: string[];
  recursos: {
    avatar3D: boolean;
    cenarios3D: boolean;
    quizInterativo: boolean;
    realidadeVirtual: boolean;
    narracaoIA: boolean;
    legendasAutomaticas: boolean;
    certificado: boolean;
    mobileFriendly: boolean;
  };
  conformidade: {
    mte: boolean;
    certificacao: boolean;
    auditoria: boolean;
    rastreabilidade: boolean;
    score: number;
  };
  preview: {
    thumbnail: string;
    video?: string;
    screenshots: string[];
  };
  estatisticas: {
    uso: number;
    satisfacao: number;
    eficacia: number;
    tempoMedioCompletude: number;
  };
  conteudo: {
    topicos: string[];
    exerciciosPraticos: number;
    estudosCaso: number;
    avaliacoes: number;
  };
  personalizacao: {
    cores: boolean;
    logo: boolean;
    avatar: boolean;
    cenarios: boolean;
    texto: boolean;
  };
  requisitos: {
    conhecimentoPrevio: string;
    equipamentos: string[];
    tempo: string;
  };
  tags: string[];
  preco: {
    gratuito: boolean;
    premium: boolean;
    empresarial: boolean;
    valor?: number;
  };
}

interface FilterOptions {
  nr: string;
  setor: string;
  tipo: string;
  complexidade: string;
  duracao: string;
  gratuito: boolean;
}

export default function NRTemplatesEnhanced() {
  const [templates, setTemplates] = useState<NRTemplateEnhanced[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<NRTemplateEnhanced[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<NRTemplateEnhanced | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<FilterOptions>({
    nr: 'all',
    setor: 'all',
    tipo: 'all',
    complexidade: 'all',
    duracao: 'all',
    gratuito: false
  });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'relevancia' | 'popularidade' | 'avaliacao' | 'recente'>('relevancia');

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [templates, searchTerm, filters, sortBy]);

  const loadTemplates = async () => {
    // Simular carregamento de templates avançados
    const mockTemplates: NRTemplateEnhanced[] = [
      {
        id: 'nr06-epi-premium-3d',
        nome: 'EPIs Premium 3D',
        nr: 'NR-06',
        categoria: 'Proteção Individual',
        setor: ['Construção Civil', 'Industrial', 'Petroquímico'],
        tipo: '3d-imersivo',
        duracaoMinutos: 25,
        complexidade: 4,
        descricao: 'Treinamento imersivo com avatares 3D demonstrando uso correto de EPIs em diferentes cenários industriais.',
        objetivos: [
          'Identificar EPIs adequados para cada atividade',
          'Demonstrar uso correto dos equipamentos',
          'Reconhecer situações de risco',
          'Aplicar procedimentos de segurança'
        ],
        recursos: {
          avatar3D: true,
          cenarios3D: true,
          quizInterativo: true,
          realidadeVirtual: true,
          narracaoIA: true,
          legendasAutomaticas: true,
          certificado: true,
          mobileFriendly: true
        },
        conformidade: {
          mte: true,
          certificacao: true,
          auditoria: true,
          rastreabilidade: true,
          score: 98
        },
        preview: {
          thumbnail: '/templates/nr06-premium-thumb.jpg',
          video: '/templates/nr06-premium-preview.mp4',
          screenshots: ['/templates/nr06-1.jpg', '/templates/nr06-2.jpg', '/templates/nr06-3.jpg']
        },
        estatisticas: {
          uso: 1247,
          satisfacao: 4.9,
          eficacia: 96,
          tempoMedioCompletude: 23
        },
        conteudo: {
          topicos: ['Tipos de EPIs', 'Uso Correto', 'Manutenção', 'Legislação', 'Casos Práticos'],
          exerciciosPraticos: 8,
          estudosCaso: 5,
          avaliacoes: 3
        },
        personalizacao: {
          cores: true,
          logo: true,
          avatar: true,
          cenarios: true,
          texto: true
        },
        requisitos: {
          conhecimentoPrevio: 'Conhecimentos básicos sobre segurança',
          equipamentos: ['Computador', 'Headset (recomendado)', 'Webcam (opcional)'],
          tempo: '20-30 minutos'
        },
        tags: ['3D', 'Interativo', 'Premium', 'Certificado', 'Mobile'],
        preco: {
          gratuito: false,
          premium: true,
          empresarial: true,
          valor: 199
        }
      },
      {
        id: 'nr10-eletrica-basico',
        nome: 'Segurança Elétrica Essencial',
        nr: 'NR-10',
        categoria: 'Segurança Elétrica',
        setor: ['Elétrico', 'Industrial', 'Manutenção'],
        tipo: 'video-base',
        duracaoMinutos: 35,
        complexidade: 3,
        descricao: 'Fundamentos da segurança em instalações elétricas com apresentação didática e exemplos práticos.',
        objetivos: [
          'Compreender riscos elétricos',
          'Aplicar medidas de proteção',
          'Reconhecer procedimentos seguros',
          'Identificar situações de perigo'
        ],
        recursos: {
          avatar3D: true,
          cenarios3D: false,
          quizInterativo: true,
          realidadeVirtual: false,
          narracaoIA: true,
          legendasAutomaticas: true,
          certificado: true,
          mobileFriendly: true
        },
        conformidade: {
          mte: true,
          certificacao: true,
          auditoria: true,
          rastreabilidade: true,
          score: 95
        },
        preview: {
          thumbnail: '/templates/nr10-basico-thumb.jpg',
          screenshots: ['/templates/nr10-1.jpg', '/templates/nr10-2.jpg']
        },
        estatisticas: {
          uso: 892,
          satisfacao: 4.7,
          eficacia: 94,
          tempoMedioCompletude: 32
        },
        conteudo: {
          topicos: ['Conceitos Básicos', 'Riscos Elétricos', 'EPIs Específicos', 'Procedimentos', 'Emergências'],
          exerciciosPraticos: 4,
          estudosCaso: 3,
          avaliacoes: 2
        },
        personalizacao: {
          cores: true,
          logo: true,
          avatar: false,
          cenarios: false,
          texto: true
        },
        requisitos: {
          conhecimentoPrevio: 'Nenhum',
          equipamentos: ['Computador', 'Internet'],
          tempo: '30-40 minutos'
        },
        tags: ['Básico', 'Gratuito', 'Certificado'],
        preco: {
          gratuito: true,
          premium: false,
          empresarial: false
        }
      },
      {
        id: 'nr12-maquinas-gamificado',
        nome: 'Máquinas Seguras Game',
        nr: 'NR-12',
        categoria: 'Segurança em Máquinas',
        setor: ['Metalúrgico', 'Automobilístico', 'Alimentício'],
        tipo: 'gamificado',
        duracaoMinutos: 40,
        complexidade: 5,
        descricao: 'Experiência gamificada com desafios práticos, simulações de situações reais e sistema de pontuação.',
        objetivos: [
          'Dominar procedimentos de segurança',
          'Identificar dispositivos de proteção',
          'Aplicar bloqueio e etiquetagem',
          'Gerenciar riscos operacionais'
        ],
        recursos: {
          avatar3D: true,
          cenarios3D: true,
          quizInterativo: true,
          realidadeVirtual: true,
          narracaoIA: true,
          legendasAutomaticas: true,
          certificado: true,
          mobileFriendly: false
        },
        conformidade: {
          mte: true,
          certificacao: true,
          auditoria: true,
          rastreabilidade: true,
          score: 97
        },
        preview: {
          thumbnail: '/templates/nr12-game-thumb.jpg',
          video: '/templates/nr12-game-preview.mp4',
          screenshots: ['/templates/nr12-1.jpg', '/templates/nr12-2.jpg', '/templates/nr12-3.jpg', '/templates/nr12-4.jpg']
        },
        estatisticas: {
          uso: 634,
          satisfacao: 4.8,
          eficacia: 97,
          tempoMedioCompletude: 38
        },
        conteudo: {
          topicos: ['Dispositivos de Segurança', 'LOTO', 'Análise de Riscos', 'Manutenção Segura', 'Casos Reais'],
          exerciciosPraticos: 12,
          estudosCaso: 8,
          avaliacoes: 5
        },
        personalizacao: {
          cores: true,
          logo: true,
          avatar: true,
          cenarios: true,
          texto: true
        },
        requisitos: {
          conhecimentoPrevio: 'Experiência com máquinas industriais',
          equipamentos: ['Computador de alta performance', 'Headset', 'Controle (opcional)'],
          tempo: '35-45 minutos'
        },
        tags: ['Gamificado', 'VR', 'Avançado', 'Interativo', 'Premium'],
        preco: {
          gratuito: false,
          premium: true,
          empresarial: true,
          valor: 299
        }
      },
      {
        id: 'nr35-altura-micro',
        nome: 'Altura Express',
        nr: 'NR-35',
        categoria: 'Trabalho em Altura',
        setor: ['Construção Civil', 'Telecomunicações', 'Energia'],
        tipo: 'micro-learning',
        duracaoMinutos: 12,
        complexidade: 2,
        descricao: 'Módulos rápidos e focados para trabalhadores em altura, com conteúdo essencial e prático.',
        objetivos: [
          'Reconhecer riscos de queda',
          'Usar EPIs corretamente',
          'Aplicar check-list de segurança',
          'Seguir procedimentos básicos'
        ],
        recursos: {
          avatar3D: false,
          cenarios3D: false,
          quizInterativo: true,
          realidadeVirtual: false,
          narracaoIA: true,
          legendasAutomaticas: true,
          certificado: false,
          mobileFriendly: true
        },
        conformidade: {
          mte: true,
          certificacao: false,
          auditoria: true,
          rastreabilidade: true,
          score: 88
        },
        preview: {
          thumbnail: '/templates/nr35-micro-thumb.jpg',
          screenshots: ['/templates/nr35-1.jpg', '/templates/nr35-2.jpg']
        },
        estatisticas: {
          uso: 1568,
          satisfacao: 4.5,
          eficacia: 89,
          tempoMedioCompletude: 11
        },
        conteudo: {
          topicos: ['EPIs para Altura', 'Check-list', 'Procedimentos Básicos'],
          exerciciosPraticos: 2,
          estudosCaso: 1,
          avaliacoes: 1
        },
        personalizacao: {
          cores: false,
          logo: true,
          avatar: false,
          cenarios: false,
          texto: true
        },
        requisitos: {
          conhecimentoPrevio: 'Nenhum',
          equipamentos: ['Smartphone ou Computador'],
          tempo: '10-15 minutos'
        },
        tags: ['Micro-learning', 'Mobile', 'Rápido', 'Gratuito'],
        preco: {
          gratuito: true,
          premium: false,
          empresarial: false
        }
      }
    ];

    setTemplates(mockTemplates);
  };

  const applyFilters = () => {
    let filtered = [...templates];

    // Filtro por busca
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(template =>
        template.nome.toLowerCase().includes(search) ||
        template.nr.toLowerCase().includes(search) ||
        template.categoria.toLowerCase().includes(search) ||
        template.descricao.toLowerCase().includes(search) ||
        template.tags.some(tag => tag.toLowerCase().includes(search))
      );
    }

    // Filtros específicos
    if (filters.nr !== 'all') {
      filtered = filtered.filter(t => t.nr === filters.nr);
    }
    
    if (filters.setor !== 'all') {
      filtered = filtered.filter(t => t.setor.includes(filters.setor));
    }
    
    if (filters.tipo !== 'all') {
      filtered = filtered.filter(t => t.tipo === filters.tipo);
    }
    
    if (filters.complexidade !== 'all') {
      filtered = filtered.filter(t => t.complexidade === parseInt(filters.complexidade));
    }
    
    if (filters.duracao !== 'all') {
      const duracao = filters.duracao;
      filtered = filtered.filter(t => {
        if (duracao === 'curta') return t.duracaoMinutos <= 15;
        if (duracao === 'media') return t.duracaoMinutos > 15 && t.duracaoMinutos <= 30;
        if (duracao === 'longa') return t.duracaoMinutos > 30;
        return true;
      });
    }
    
    if (filters.gratuito) {
      filtered = filtered.filter(t => t.preco.gratuito);
    }

    // Ordenação
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'popularidade':
          return b.estatisticas.uso - a.estatisticas.uso;
        case 'avaliacao':
          return b.estatisticas.satisfacao - a.estatisticas.satisfacao;
        case 'recente':
          return a.id.localeCompare(b.id); // Simplificado
        default:
          return b.estatisticas.eficacia - a.estatisticas.eficacia;
      }
    });

    setFilteredTemplates(filtered);
  };

  const getComplexityColor = (level: number) => {
    const colors = {
      1: 'text-green-600',
      2: 'text-blue-600',
      3: 'text-yellow-600',
      4: 'text-orange-600',
      5: 'text-red-600'
    };
    return colors[level as keyof typeof colors] || 'text-gray-600';
  };

  const getComplexityLabel = (level: number) => {
    const labels = {
      1: 'Básico',
      2: 'Fácil', 
      3: 'Intermediário',
      4: 'Avançado',
      5: 'Especialista'
    };
    return labels[level as keyof typeof labels] || 'N/A';
  };

  const getTipoIcon = (tipo: string) => {
    const icons = {
      'video-base': Video,
      'interativo': Target,
      '3d-imersivo': Globe,
      'gamificado': Rocket,
      'micro-learning': BookOpen
    };
    const Icon = icons[tipo as keyof typeof icons] || Video;
    return <Icon className="h-4 w-4" />;
  };

  const getTipoBadge = (tipo: string) => {
    const badges = {
      'video-base': 'bg-blue-100 text-blue-800',
      'interativo': 'bg-green-100 text-green-800',
      '3d-imersivo': 'bg-purple-100 text-purple-800',
      'gamificado': 'bg-red-100 text-red-800',
      'micro-learning': 'bg-orange-100 text-orange-800'
    };
    return badges[tipo as keyof typeof badges] || 'bg-gray-100 text-gray-800';
  };

  const resetFilters = () => {
    setFilters({
      nr: 'all',
      setor: 'all',
      tipo: 'all',
      complexidade: 'all',
      duracao: 'all',
      gratuito: false
    });
    setSearchTerm('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-3">
          <HardHat className="h-10 w-10 text-orange-600" />
          <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
            Templates NR Avançados
          </h1>
          <Award className="h-10 w-10 text-blue-600" />
        </div>
        <p className="text-gray-600 max-w-3xl mx-auto">
          Biblioteca completa de templates profissionais com compliance automático e recursos avançados de IA
        </p>
      </div>

      {/* Filtros e Busca */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Filter className="h-5 w-5 text-blue-600" />
              <span>Filtros Avançados</span>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={resetFilters}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Limpar
              </Button>
              <div className="flex items-center space-x-1">
                <Button 
                  variant={viewMode === 'grid' ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  Grid
                </Button>
                <Button 
                  variant={viewMode === 'list' ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  Lista
                </Button>
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar templates por nome, NR, categoria ou tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filtros */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div>
              <label className="text-sm font-medium">Norma</label>
              <Select value={filters.nr} onValueChange={(value) => setFilters(prev => ({ ...prev, nr: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="NR-06">NR-06</SelectItem>
                  <SelectItem value="NR-10">NR-10</SelectItem>
                  <SelectItem value="NR-12">NR-12</SelectItem>
                  <SelectItem value="NR-17">NR-17</SelectItem>
                  <SelectItem value="NR-35">NR-35</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Setor</label>
              <Select value={filters.setor} onValueChange={(value) => setFilters(prev => ({ ...prev, setor: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="Construção Civil">Construção</SelectItem>
                  <SelectItem value="Industrial">Industrial</SelectItem>
                  <SelectItem value="Elétrico">Elétrico</SelectItem>
                  <SelectItem value="Metalúrgico">Metalúrgico</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Tipo</label>
              <Select value={filters.tipo} onValueChange={(value) => setFilters(prev => ({ ...prev, tipo: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="video-base">Vídeo Base</SelectItem>
                  <SelectItem value="interativo">Interativo</SelectItem>
                  <SelectItem value="3d-imersivo">3D Imersivo</SelectItem>
                  <SelectItem value="gamificado">Gamificado</SelectItem>
                  <SelectItem value="micro-learning">Micro-learning</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Complexidade</label>
              <Select value={filters.complexidade} onValueChange={(value) => setFilters(prev => ({ ...prev, complexidade: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="1">Básico</SelectItem>
                  <SelectItem value="2">Fácil</SelectItem>
                  <SelectItem value="3">Intermediário</SelectItem>
                  <SelectItem value="4">Avançado</SelectItem>
                  <SelectItem value="5">Especialista</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Duração</label>
              <Select value={filters.duracao} onValueChange={(value) => setFilters(prev => ({ ...prev, duracao: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="curta">Até 15min</SelectItem>
                  <SelectItem value="media">16-30min</SelectItem>
                  <SelectItem value="longa">Mais de 30min</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Ordenar por</label>
              <Select value={sortBy} onValueChange={(value: string) => setSortBy(value as 'relevancia' | 'popularidade' | 'avaliacao' | 'recente')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevancia">Relevância</SelectItem>
                  <SelectItem value="popularidade">Popularidade</SelectItem>
                  <SelectItem value="avaliacao">Avaliação</SelectItem>
                  <SelectItem value="recente">Mais Recente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Filtros Rápidos */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={filters.gratuito ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilters(prev => ({ ...prev, gratuito: !prev.gratuito }))}
            >
              Apenas Gratuitos
            </Button>
            <Badge className="bg-blue-100 text-blue-800">
              {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''} encontrado{filteredTemplates.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Grid/Lista de Templates */}
      <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
        {filteredTemplates.map((template) => (
          <Card 
            key={template.id}
            className={`cursor-pointer transition-all duration-300 hover:shadow-lg group ${
              selectedTemplate?.id === template.id ? 'ring-2 ring-blue-500 shadow-lg' : ''
            } ${viewMode === 'list' ? 'flex' : ''}`}
            onClick={() => setSelectedTemplate(template)}
          >
            {viewMode === 'grid' ? (
              // Grid View
              <>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Badge className="bg-orange-100 text-orange-800">
                          {template.nr}
                        </Badge>
                        <Badge className={getTipoBadge(template.tipo)}>
                          {getTipoIcon(template.tipo)}
                          <span className="ml-1 capitalize">{template.tipo.replace('-', ' ')}</span>
                        </Badge>
                      </div>
                      <CardTitle className="text-lg group-hover:text-blue-600 transition-colors">
                        {template.nome}
                      </CardTitle>
                      <CardDescription>
                        {template.categoria}
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <Badge 
                        variant="outline"
                        className={getComplexityColor(template.complexidade)}
                      >
                        {getComplexityLabel(template.complexidade)}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Preview */}
                  <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center space-y-2">
                        {getTipoIcon(template.tipo)}
                        <div className="text-xs text-gray-500">
                          Preview {template.duracaoMinutos}min
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Descrição */}
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {template.descricao}
                  </p>

                  {/* Recursos */}
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-gray-600">Recursos:</div>
                    <div className="flex flex-wrap gap-1">
                      {template.recursos.avatar3D && (
                        <Badge variant="outline" className="text-xs">
                          <Users className="h-3 w-3 mr-1" />
                          Avatar 3D
                        </Badge>
                      )}
                      {template.recursos.cenarios3D && (
                        <Badge variant="outline" className="text-xs">
                          <Globe className="h-3 w-3 mr-1" />
                          Cenários 3D
                        </Badge>
                      )}
                      {template.recursos.quizInterativo && (
                        <Badge variant="outline" className="text-xs">
                          <Target className="h-3 w-3 mr-1" />
                          Quiz
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Estatísticas */}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <div className="font-bold text-blue-600">{template.estatisticas.uso}</div>
                      <div className="text-gray-500">Usos</div>
                    </div>
                    <div>
                      <div className="font-bold text-green-600">{template.estatisticas.satisfacao}</div>
                      <div className="text-gray-500">★ Avaliação</div>
                    </div>
                    <div>
                      <div className="font-bold text-purple-600">{template.estatisticas.eficacia}%</div>
                      <div className="text-gray-500">Eficácia</div>
                    </div>
                  </div>

                  {/* Preço e Ação */}
                  <div className="flex items-center justify-between pt-2">
                    <div>
                      {template.preco.gratuito ? (
                        <Badge className="bg-green-100 text-green-800">Gratuito</Badge>
                      ) : (
                        <div className="text-sm font-bold text-blue-600">
                          R$ {template.preco.valor}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-1">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-xs text-green-700">{template.conformidade.score}% Conforme</span>
                    </div>
                  </div>
                </CardContent>
              </>
            ) : (
              // List View
              <div className="flex w-full p-6">
                <div className="w-32 h-20 bg-gray-100 rounded-lg flex-shrink-0 mr-4">
                  <div className="h-full flex items-center justify-center">
                    {getTipoIcon(template.tipo)}
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <Badge className="bg-orange-100 text-orange-800 text-xs">
                          {template.nr}
                        </Badge>
                        <Badge className={`${getTipoBadge(template.tipo)} text-xs`}>
                          {template.tipo.replace('-', ' ')}
                        </Badge>
                        <Badge 
                          variant="outline"
                          className={`${getComplexityColor(template.complexidade)} text-xs`}
                        >
                          {getComplexityLabel(template.complexidade)}
                        </Badge>
                      </div>
                      <h3 className="font-semibold text-lg group-hover:text-blue-600 transition-colors">
                        {template.nome}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">{template.descricao}</p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>{template.duracaoMinutos}min</span>
                        <span>{template.estatisticas.uso} usos</span>
                        <span>★ {template.estatisticas.satisfacao}</span>
                        <span>{template.estatisticas.eficacia}% eficácia</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="mb-2">
                        {template.preco.gratuito ? (
                          <Badge className="bg-green-100 text-green-800">Gratuito</Badge>
                        ) : (
                          <div className="text-lg font-bold text-blue-600">
                            R$ {template.preco.valor}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-1">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-xs text-green-700">{template.conformidade.score}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Search className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <div className="text-lg font-medium text-gray-600 mb-2">
              Nenhum template encontrado
            </div>
            <div className="text-sm text-gray-500 mb-4">
              Tente ajustar seus filtros ou termos de busca
            </div>
            <Button onClick={resetFilters}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Limpar Filtros
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Template Selecionado - Detalhes */}
      {selectedTemplate && (
        <Card className="border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Star className="h-5 w-5 text-blue-600" />
                <span>{selectedTemplate.nome}</span>
                <Badge className="bg-orange-100 text-orange-800">
                  {selectedTemplate.nr}
                </Badge>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline">
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>
                <Button className="bg-blue-600">
                  <Download className="h-4 w-4 mr-2" />
                  Usar Template
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Objetivos de Aprendizagem</h4>
                  <ul className="space-y-1 text-sm">
                    {selectedTemplate.objetivos.map((obj, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <Target className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <span>{obj}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Conteúdo Incluído</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <BookOpen className="h-4 w-4 text-green-600" />
                      <span>{selectedTemplate.conteudo.topicos.length} Tópicos</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Wrench className="h-4 w-4 text-blue-600" />
                      <span>{selectedTemplate.conteudo.exerciciosPraticos} Exercícios</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-purple-600" />
                      <span>{selectedTemplate.conteudo.estudosCaso} Estudos de Caso</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Award className="h-4 w-4 text-orange-600" />
                      <span>{selectedTemplate.conteudo.avaliacoes} Avaliações</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Requisitos</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Conhecimento:</span> {selectedTemplate.requisitos.conhecimentoPrevio}
                    </div>
                    <div>
                      <span className="font-medium">Tempo:</span> {selectedTemplate.requisitos.tempo}
                    </div>
                    <div>
                      <span className="font-medium">Equipamentos:</span>
                      <ul className="ml-4 mt-1">
                        {selectedTemplate.requisitos.equipamentos.map((eq, index) => (
                          <li key={index} className="text-gray-600">• {eq}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Recursos Técnicos</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(selectedTemplate.recursos).map(([recurso, ativo]) => (
                      <div key={recurso} className="flex items-center justify-between text-sm">
                        <span className="capitalize">{recurso.replace(/([A-Z])/g, ' $1')}</span>
                        <Badge className={ativo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}>
                          {ativo ? 'Sim' : 'Não'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Personalização Disponível</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(selectedTemplate.personalizacao).map(([item, disponivel]) => (
                      <div key={item} className="flex items-center space-x-2 text-sm">
                        <CheckCircle className={`h-4 w-4 ${disponivel ? 'text-green-600' : 'text-gray-400'}`} />
                        <span className="capitalize">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Performance e Compliance</h4>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">Conformidade Regulamentária</span>
                        <span className="text-sm font-bold">{selectedTemplate.conformidade.score}%</span>
                      </div>
                      <Progress value={selectedTemplate.conformidade.score} className="h-2" />
                    </div>
                    
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">Satisfação dos Usuários</span>
                        <span className="text-sm font-bold">{selectedTemplate.estatisticas.satisfacao}/5</span>
                      </div>
                      <Progress value={selectedTemplate.estatisticas.satisfacao * 20} className="h-2" />
                    </div>
                    
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">Eficácia de Aprendizado</span>
                        <span className="text-sm font-bold">{selectedTemplate.estatisticas.eficacia}%</span>
                      </div>
                      <Progress value={selectedTemplate.estatisticas.eficacia} className="h-2" />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Setores de Aplicação</h4>
                  <div className="flex flex-wrap gap-1">
                    {selectedTemplate.setor.map((setor) => (
                      <Badge key={setor} variant="outline" className="text-xs">
                        {setor}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

