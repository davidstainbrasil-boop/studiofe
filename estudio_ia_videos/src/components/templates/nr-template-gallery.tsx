'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutTemplate,
  ShieldCheck,
  HardHat,
  AlertTriangle,
  Flame,
  Zap,
  Factory,
  Users,
  Truck,
  Cog,
  Shield,
  Heart,
  Eye,
  Volume2,
  Beaker,
  ThermometerSun,
  Activity,
  Building2,
  Sparkles,
  Filter,
  Search,
  Grid,
  List,
  ChevronRight,
  Star,
  Clock,
  Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NRTemplate {
  id: string;
  nr: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  category: 'seguranca' | 'saude' | 'ambiente' | 'organizacao';
  slides: number;
  duration: string;
  featured?: boolean;
  tags: string[];
}

const nrTemplates: NRTemplate[] = [
  {
    id: 'nr-1',
    nr: 'NR-1',
    title: 'Disposições Gerais e GRO',
    description: 'Norma base sobre disposições gerais e Gerenciamento de Riscos Ocupacionais',
    icon: <LayoutTemplate className="h-5 w-5" />,
    category: 'organizacao',
    slides: 18,
    duration: '15 min',
    featured: true,
    tags: ['GRO', 'PGR', 'obrigatório'],
  },
  {
    id: 'nr-4',
    nr: 'NR-4',
    title: 'SESMT',
    description: 'Serviços Especializados em Segurança e Medicina do Trabalho',
    icon: <Shield className="h-5 w-5" />,
    category: 'organizacao',
    slides: 15,
    duration: '12 min',
    tags: ['SESMT', 'dimensionamento'],
  },
  {
    id: 'nr-5',
    nr: 'NR-5',
    title: 'CIPA',
    description: 'Comissão Interna de Prevenção de Acidentes e Assédio',
    icon: <Users className="h-5 w-5" />,
    category: 'organizacao',
    slides: 22,
    duration: '18 min',
    featured: true,
    tags: ['CIPA', 'eleição', 'assédio'],
  },
  {
    id: 'nr-6',
    nr: 'NR-6',
    title: 'EPI',
    description: 'Equipamentos de Proteção Individual',
    icon: <HardHat className="h-5 w-5" />,
    category: 'seguranca',
    slides: 20,
    duration: '16 min',
    featured: true,
    tags: ['EPI', 'CA', 'fornecimento'],
  },
  {
    id: 'nr-7',
    nr: 'NR-7',
    title: 'PCMSO',
    description: 'Programa de Controle Médico de Saúde Ocupacional',
    icon: <Heart className="h-5 w-5" />,
    category: 'saude',
    slides: 16,
    duration: '14 min',
    tags: ['PCMSO', 'ASO', 'exames'],
  },
  {
    id: 'nr-9',
    nr: 'NR-9',
    title: 'Agentes Físicos, Químicos e Biológicos',
    description: 'Avaliação e controle das exposições ocupacionais',
    icon: <Beaker className="h-5 w-5" />,
    category: 'ambiente',
    slides: 24,
    duration: '20 min',
    tags: ['agentes', 'exposição', 'limites'],
  },
  {
    id: 'nr-10',
    nr: 'NR-10',
    title: 'Segurança em Instalações Elétricas',
    description: 'Segurança em instalações e serviços em eletricidade',
    icon: <Zap className="h-5 w-5" />,
    category: 'seguranca',
    slides: 28,
    duration: '25 min',
    featured: true,
    tags: ['eletricidade', 'autorização', 'SEP'],
  },
  {
    id: 'nr-11',
    nr: 'NR-11',
    title: 'Transporte e Movimentação',
    description: 'Transporte, movimentação, armazenagem e manuseio de materiais',
    icon: <Truck className="h-5 w-5" />,
    category: 'seguranca',
    slides: 18,
    duration: '15 min',
    tags: ['empilhadeira', 'carga', 'içamento'],
  },
  {
    id: 'nr-12',
    nr: 'NR-12',
    title: 'Máquinas e Equipamentos',
    description: 'Segurança no trabalho em máquinas e equipamentos',
    icon: <Cog className="h-5 w-5" />,
    category: 'seguranca',
    slides: 32,
    duration: '28 min',
    featured: true,
    tags: ['máquinas', 'proteção', 'dispositivos'],
  },
  {
    id: 'nr-13',
    nr: 'NR-13',
    title: 'Caldeiras e Vasos de Pressão',
    description: 'Caldeiras, vasos de pressão, tubulações e tanques metálicos',
    icon: <ThermometerSun className="h-5 w-5" />,
    category: 'seguranca',
    slides: 22,
    duration: '20 min',
    tags: ['caldeira', 'pressão', 'inspeção'],
  },
  {
    id: 'nr-15',
    nr: 'NR-15',
    title: 'Atividades Insalubres',
    description: 'Atividades e operações insalubres',
    icon: <AlertTriangle className="h-5 w-5" />,
    category: 'saude',
    slides: 20,
    duration: '18 min',
    tags: ['insalubridade', 'adicional', 'anexos'],
  },
  {
    id: 'nr-16',
    nr: 'NR-16',
    title: 'Atividades Perigosas',
    description: 'Atividades e operações perigosas',
    icon: <Flame className="h-5 w-5" />,
    category: 'seguranca',
    slides: 16,
    duration: '14 min',
    tags: ['periculosidade', 'adicional', 'explosivos'],
  },
  {
    id: 'nr-17',
    nr: 'NR-17',
    title: 'Ergonomia',
    description: 'Adaptação das condições de trabalho às características psicofisiológicas',
    icon: <Activity className="h-5 w-5" />,
    category: 'saude',
    slides: 26,
    duration: '22 min',
    featured: true,
    tags: ['ergonomia', 'AET', 'mobiliário'],
  },
  {
    id: 'nr-18',
    nr: 'NR-18',
    title: 'Construção Civil',
    description: 'Segurança e saúde no trabalho na indústria da construção',
    icon: <Building2 className="h-5 w-5" />,
    category: 'seguranca',
    slides: 35,
    duration: '30 min',
    featured: true,
    tags: ['construção', 'PCMAT', 'canteiro'],
  },
  {
    id: 'nr-20',
    nr: 'NR-20',
    title: 'Líquidos Combustíveis e Inflamáveis',
    description: 'Segurança e saúde no trabalho com inflamáveis e combustíveis',
    icon: <Flame className="h-5 w-5" />,
    category: 'seguranca',
    slides: 24,
    duration: '22 min',
    tags: ['inflamável', 'classe', 'instalação'],
  },
  {
    id: 'nr-23',
    nr: 'NR-23',
    title: 'Proteção Contra Incêndios',
    description: 'Proteção contra incêndios',
    icon: <Flame className="h-5 w-5" />,
    category: 'seguranca',
    slides: 18,
    duration: '15 min',
    tags: ['incêndio', 'extintor', 'evacuação'],
  },
  {
    id: 'nr-24',
    nr: 'NR-24',
    title: 'Condições Sanitárias',
    description: 'Condições sanitárias e de conforto nos locais de trabalho',
    icon: <ShieldCheck className="h-5 w-5" />,
    category: 'ambiente',
    slides: 14,
    duration: '12 min',
    tags: ['sanitário', 'vestiário', 'refeitório'],
  },
  {
    id: 'nr-25',
    nr: 'NR-25',
    title: 'Resíduos Industriais',
    description: 'Resíduos industriais',
    icon: <Factory className="h-5 w-5" />,
    category: 'ambiente',
    slides: 12,
    duration: '10 min',
    tags: ['resíduo', 'descarte', 'classificação'],
  },
  {
    id: 'nr-26',
    nr: 'NR-26',
    title: 'Sinalização de Segurança',
    description: 'Sinalização de segurança',
    icon: <Eye className="h-5 w-5" />,
    category: 'seguranca',
    slides: 16,
    duration: '14 min',
    tags: ['sinalização', 'cores', 'identificação'],
  },
  {
    id: 'nr-33',
    nr: 'NR-33',
    title: 'Espaços Confinados',
    description: 'Segurança e saúde nos trabalhos em espaços confinados',
    icon: <Shield className="h-5 w-5" />,
    category: 'seguranca',
    slides: 26,
    duration: '24 min',
    featured: true,
    tags: ['confinado', 'PET', 'supervisão'],
  },
  {
    id: 'nr-35',
    nr: 'NR-35',
    title: 'Trabalho em Altura',
    description: 'Trabalho em altura acima de 2 metros',
    icon: <HardHat className="h-5 w-5" />,
    category: 'seguranca',
    slides: 24,
    duration: '22 min',
    featured: true,
    tags: ['altura', 'queda', 'ancoragem'],
  },
];

const categories = [
  { id: 'all', name: 'Todos', icon: <Grid className="h-4 w-4" /> },
  { id: 'seguranca', name: 'Segurança', icon: <Shield className="h-4 w-4" /> },
  { id: 'saude', name: 'Saúde', icon: <Heart className="h-4 w-4" /> },
  { id: 'ambiente', name: 'Ambiente', icon: <Factory className="h-4 w-4" /> },
  { id: 'organizacao', name: 'Organização', icon: <Users className="h-4 w-4" /> },
];

interface NRTemplateGalleryProps {
  onSelect?: (template: NRTemplate) => void;
  className?: string;
}

export function NRTemplateGallery({ onSelect, className }: NRTemplateGalleryProps) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFeaturedOnly, setShowFeaturedOnly] = useState(false);

  const filteredTemplates = nrTemplates.filter(template => {
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    const matchesSearch = 
      template.nr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesFeatured = !showFeaturedOnly || template.featured;
    
    return matchesCategory && matchesSearch && matchesFeatured;
  });

  const featuredTemplates = nrTemplates.filter(t => t.featured);

  return (
    <div className={cn('flex flex-col h-full bg-zinc-900 text-white', className)}>
      {/* Header */}
      <div className="p-6 border-b border-zinc-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <LayoutTemplate className="h-5 w-5 text-orange-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Templates NR</h2>
              <p className="text-sm text-zinc-400">
                {nrTemplates.length} templates para treinamentos de segurança
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-2 rounded-lg transition-colors',
                viewMode === 'grid'
                  ? 'bg-zinc-700 text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              )}
            >
              <Grid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'p-2 rounded-lg transition-colors',
                viewMode === 'list'
                  ? 'bg-zinc-700 text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              )}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Buscar por NR, título ou tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg
                         text-sm placeholder:text-zinc-500 focus:outline-none focus:border-orange-500"
            />
          </div>

          <button
            onClick={() => setShowFeaturedOnly(!showFeaturedOnly)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors',
              showFeaturedOnly
                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                : 'bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-700'
            )}
          >
            <Star className="h-4 w-4" />
            Destaques
          </button>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors',
                selectedCategory === category.id
                  ? 'bg-orange-500 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
              )}
            >
              {category.icon}
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* Featured Section */}
      {!searchQuery && selectedCategory === 'all' && !showFeaturedOnly && (
        <div className="p-6 border-b border-zinc-800 bg-gradient-to-r from-orange-500/10 to-transparent">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-orange-400" />
            <h3 className="font-semibold">Templates em Destaque</h3>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {featuredTemplates.slice(0, 4).map(template => (
              <motion.button
                key={template.id}
                onClick={() => onSelect?.(template)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex-shrink-0 w-64 p-4 bg-zinc-800/80 border border-zinc-700 rounded-xl
                           text-left hover:border-orange-500/50 transition-colors"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-orange-500/20 rounded-lg text-orange-400">
                    {template.icon}
                  </div>
                  <div>
                    <div className="font-bold text-orange-400">{template.nr}</div>
                    <div className="text-xs text-zinc-500">{template.slides} slides</div>
                  </div>
                </div>
                <h4 className="font-medium text-sm mb-1 line-clamp-1">{template.title}</h4>
                <p className="text-xs text-zinc-400 line-clamp-2">{template.description}</p>
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Templates Grid/List */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredTemplates.length === 0 ? (
          <div className="text-center py-12 text-zinc-500">
            <LayoutTemplate className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum template encontrado</p>
            <p className="text-sm mt-1">Tente ajustar os filtros de busca</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <AnimatePresence mode="popLayout">
              {filteredTemplates.map((template, index) => (
                <motion.button
                  key={template.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.02 }}
                  onClick={() => onSelect?.(template)}
                  className="group p-4 bg-zinc-800/50 border border-zinc-700 rounded-xl text-left
                             hover:bg-zinc-800 hover:border-orange-500/50 transition-all"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 bg-zinc-700 rounded-lg text-zinc-400 
                                    group-hover:bg-orange-500/20 group-hover:text-orange-400 transition-colors">
                      {template.icon}
                    </div>
                    {template.featured && (
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    )}
                  </div>

                  <div className="text-lg font-bold text-orange-400 mb-1">{template.nr}</div>
                  <h4 className="font-medium text-sm mb-2 line-clamp-2">{template.title}</h4>
                  
                  <div className="flex items-center gap-3 text-xs text-zinc-500">
                    <span className="flex items-center gap-1">
                      <LayoutTemplate className="h-3 w-3" />
                      {template.slides} slides
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {template.duration}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1 mt-3">
                    {template.tags.slice(0, 3).map(tag => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 bg-zinc-700/50 rounded text-xs text-zinc-400"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {filteredTemplates.map((template, index) => (
                <motion.button
                  key={template.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: index * 0.02 }}
                  onClick={() => onSelect?.(template)}
                  className="group w-full flex items-center gap-4 p-4 bg-zinc-800/50 border border-zinc-700 
                             rounded-xl text-left hover:bg-zinc-800 hover:border-orange-500/50 transition-all"
                >
                  <div className="p-3 bg-zinc-700 rounded-lg text-zinc-400 
                                  group-hover:bg-orange-500/20 group-hover:text-orange-400 transition-colors">
                    {template.icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-orange-400">{template.nr}</span>
                      <span className="font-medium">{template.title}</span>
                      {template.featured && (
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      )}
                    </div>
                    <p className="text-sm text-zinc-400 line-clamp-1">{template.description}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="flex items-center gap-1 text-xs text-zinc-500">
                        <LayoutTemplate className="h-3 w-3" />
                        {template.slides} slides
                      </span>
                      <span className="flex items-center gap-1 text-xs text-zinc-500">
                        <Clock className="h-3 w-3" />
                        {template.duration}
                      </span>
                      <div className="flex gap-1">
                        {template.tags.slice(0, 3).map(tag => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 bg-zinc-700/50 rounded text-xs text-zinc-400"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <ChevronRight className="h-5 w-5 text-zinc-600 group-hover:text-orange-400 transition-colors" />
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="p-4 border-t border-zinc-800 bg-zinc-800/50">
        <div className="flex items-center justify-between text-sm text-zinc-400">
          <span>
            Mostrando {filteredTemplates.length} de {nrTemplates.length} templates
          </span>
          <span className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Selecione um template para começar
          </span>
        </div>
      </div>
    </div>
  );
}

export default NRTemplateGallery;
