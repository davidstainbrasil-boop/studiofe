'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Search,
  Clock,
  Play,
  Zap,
  Shield,
  Flame,
  HardHat,
  Activity,
  AlertTriangle,
  Building2,
  Eye,
  FileText,
  Sparkles,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface NRTemplate {
  id: string;
  nr: string;
  title: string;
  description: string;
  duration: string;
  slides: number;
  category: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  features: string[];
  popular?: boolean;
  new?: boolean;
}

const NR_TEMPLATES: NRTemplate[] = [
  {
    id: 'nr-01',
    nr: 'NR-01',
    title: 'Disposições Gerais e GRO',
    description: 'Programa de Gerenciamento de Riscos Ocupacionais',
    duration: '5 min',
    slides: 12,
    category: 'Gestão',
    icon: FileText,
    color: 'blue',
    features: ['GRO', 'PGR', 'Inventário de Riscos'],
    popular: true,
  },
  {
    id: 'nr-05',
    nr: 'NR-05',
    title: 'CIPA',
    description: 'Comissão Interna de Prevenção de Acidentes',
    duration: '8 min',
    slides: 18,
    category: 'Gestão',
    icon: Shield,
    color: 'green',
    features: ['Eleição CIPA', 'Atribuições', 'SIPAT'],
    popular: true,
  },
  {
    id: 'nr-06',
    nr: 'NR-06',
    title: 'EPI',
    description: 'Equipamentos de Proteção Individual',
    duration: '6 min',
    slides: 15,
    category: 'Proteção',
    icon: HardHat,
    color: 'orange',
    features: ['Uso correto', 'Conservação', 'CA'],
    popular: true,
  },
  {
    id: 'nr-10',
    nr: 'NR-10',
    title: 'Segurança em Eletricidade',
    description: 'Segurança em Instalações e Serviços em Eletricidade',
    duration: '10 min',
    slides: 22,
    category: 'Risco Elétrico',
    icon: Zap,
    color: 'yellow',
    features: ['Básico', 'SEP', 'Alta Tensão'],
  },
  {
    id: 'nr-12',
    nr: 'NR-12',
    title: 'Máquinas e Equipamentos',
    description: 'Segurança no Trabalho em Máquinas e Equipamentos',
    duration: '12 min',
    slides: 28,
    category: 'Operação',
    icon: Activity,
    color: 'red',
    features: ['Proteções', 'Dispositivos', 'Manutenção'],
  },
  {
    id: 'nr-17',
    nr: 'NR-17',
    title: 'Ergonomia',
    description: 'Ergonomia no Ambiente de Trabalho',
    duration: '7 min',
    slides: 16,
    category: 'Saúde',
    icon: Activity,
    color: 'purple',
    features: ['AEP', 'AET', 'Mobiliário'],
    new: true,
  },
  {
    id: 'nr-23',
    nr: 'NR-23',
    title: 'Proteção Contra Incêndios',
    description: 'Prevenção e Combate a Incêndios',
    duration: '8 min',
    slides: 20,
    category: 'Emergência',
    icon: Flame,
    color: 'red',
    features: ['Extintores', 'Rotas de Fuga', 'Brigada'],
  },
  {
    id: 'nr-33',
    nr: 'NR-33',
    title: 'Espaço Confinado',
    description: 'Segurança e Saúde em Espaços Confinados',
    duration: '9 min',
    slides: 21,
    category: 'Risco Alto',
    icon: AlertTriangle,
    color: 'amber',
    features: ['Reconhecimento', 'APR', 'Resgate'],
  },
  {
    id: 'nr-35',
    nr: 'NR-35',
    title: 'Trabalho em Altura',
    description: 'Trabalho em Altura com Segurança',
    duration: '9 min',
    slides: 20,
    category: 'Risco Alto',
    icon: Building2,
    color: 'sky',
    features: ['Capacitação', 'EPIs', 'Análise de Risco'],
    popular: true,
  },
];

const CATEGORIES = ['Todos', 'Gestão', 'Proteção', 'Risco Elétrico', 'Operação', 'Saúde', 'Emergência', 'Risco Alto'];

interface NRTemplateLibraryProps {
  onSelect?: (template: NRTemplate) => void;
  selectedId?: string;
  compact?: boolean;
}

export function NRTemplateLibrary({ onSelect, selectedId, compact = false }: NRTemplateLibraryProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Todos');

  const filteredTemplates = NR_TEMPLATES.filter((template) => {
    const matchesSearch =
      template.nr.toLowerCase().includes(search.toLowerCase()) ||
      template.title.toLowerCase().includes(search.toLowerCase()) ||
      template.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === 'Todos' || template.category === category;
    return matchesSearch && matchesCategory;
  });

  const handleSelect = (template: NRTemplate) => {
    if (onSelect) {
      onSelect(template);
    } else {
      router.push(`/dashboard/editor?template=${template.id}`);
    }
  };

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; text: string; border: string }> = {
      blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
      green: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' },
      orange: { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200' },
      yellow: { bg: 'bg-yellow-50', text: 'text-yellow-600', border: 'border-yellow-200' },
      red: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' },
      purple: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' },
      amber: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' },
      sky: { bg: 'bg-sky-50', text: 'text-sky-600', border: 'border-sky-200' },
    };
    return colors[color] || colors.blue;
  };

  if (compact) {
    return (
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar NR..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto">
          {filteredTemplates.map((template) => {
            const Icon = template.icon;
            const colors = getColorClasses(template.color);
            const isSelected = selectedId === template.id;

            return (
              <Card
                key={template.id}
                className={cn(
                  'cursor-pointer transition-all hover:shadow-md',
                  isSelected && 'ring-2 ring-violet-500'
                )}
                onClick={() => handleSelect(template)}
              >
                <CardContent className="p-4">
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center mb-2', colors.bg)}>
                    <Icon className={cn('w-4 h-4', colors.text)} />
                  </div>
                  <Badge variant="outline" className="mb-1">{template.nr}</Badge>
                  <p className="text-sm font-medium line-clamp-1">{template.title}</p>
                  <p className="text-xs text-slate-500">{template.duration}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6 text-green-600" />
            Templates NR
          </h2>
          <p className="text-slate-500">
            Treinamentos prontos para as principais Normas Regulamentadoras
          </p>
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar NR..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map((cat) => (
          <Button
            key={cat}
            variant={category === cat ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCategory(cat)}
            className={category === cat ? 'bg-violet-600' : ''}
          >
            {cat}
          </Button>
        ))}
      </div>

      {/* Templates Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.map((template) => {
          const Icon = template.icon;
          const colors = getColorClasses(template.color);

          return (
            <Card
              key={template.id}
              className="group cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1"
              onClick={() => handleSelect(template)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', colors.bg)}>
                    <Icon className={cn('w-6 h-6', colors.text)} />
                  </div>
                  <div className="flex gap-1">
                    {template.popular && (
                      <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                        <Sparkles className="w-3 h-3 mr-1" />
                        Popular
                      </Badge>
                    )}
                    {template.new && (
                      <Badge className="bg-green-100 text-green-700 border-green-200">
                        Novo
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="mt-3">
                  <Badge variant="outline" className={cn('mb-2', colors.border, colors.text)}>
                    {template.nr}
                  </Badge>
                  <CardTitle className="text-lg">{template.title}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {template.description}
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent>
                <div className="flex items-center gap-4 text-sm text-slate-500 mb-3">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {template.duration}
                  </span>
                  <span className="flex items-center gap-1">
                    <FileText className="w-4 h-4" />
                    {template.slides} slides
                  </span>
                </div>

                <div className="flex flex-wrap gap-1 mb-4">
                  {template.features.map((feature) => (
                    <Badge key={feature} variant="secondary" className="text-xs">
                      {feature}
                    </Badge>
                  ))}
                </div>

                <Button className="w-full group-hover:bg-violet-600 group-hover:text-white transition-colors">
                  <Play className="w-4 h-4 mr-2" />
                  Usar Template
                  <ChevronRight className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-600">Nenhum template encontrado</h3>
          <p className="text-slate-500">Tente ajustar sua busca ou categoria</p>
        </div>
      )}
    </div>
  );
}

export { NR_TEMPLATES };
