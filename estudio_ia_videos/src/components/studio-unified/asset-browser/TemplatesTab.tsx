/**
 * 📦 Templates Tab
 * Galeria de templates NR e custom
 */

'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  LayoutTemplate,
  Play,
  Clock,
  FileText,
  Shield,
  ChevronRight,
  Sparkles,
  Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AssetItem } from '../UnifiedAssetBrowser';

interface TemplatesTabProps {
  searchQuery: string;
  viewMode: 'grid' | 'list';
  sortBy: 'name' | 'date' | 'size' | 'type';
  showFavoritesOnly: boolean;
  onAssetSelect?: (asset: AssetItem) => void;
  onAssetDragStart?: (asset: AssetItem) => void;
}

interface Template {
  id: string;
  title: string;
  description: string;
  thumbnail?: string;
  category: 'nr' | 'corporate' | 'educational' | 'custom';
  nrNumber?: string;
  duration: number;
  slideCount: number;
  tags: string[];
  isPremium: boolean;
  isNew: boolean;
}

// NR Templates
const NR_TEMPLATES: Template[] = [
  {
    id: 'nr-06',
    title: 'NR-06 - EPIs',
    description: 'Equipamentos de Proteção Individual',
    category: 'nr',
    nrNumber: 'NR-06',
    duration: 1800,
    slideCount: 25,
    tags: ['segurança', 'epi', 'obrigatório'],
    isPremium: false,
    isNew: false,
  },
  {
    id: 'nr-10',
    title: 'NR-10 - Segurança em Eletricidade',
    description: 'Instalações e serviços em eletricidade',
    category: 'nr',
    nrNumber: 'NR-10',
    duration: 2400,
    slideCount: 35,
    tags: ['eletricidade', 'segurança', 'risco'],
    isPremium: false,
    isNew: false,
  },
  {
    id: 'nr-12',
    title: 'NR-12 - Segurança em Máquinas',
    description: 'Máquinas e equipamentos industriais',
    category: 'nr',
    nrNumber: 'NR-12',
    duration: 2700,
    slideCount: 40,
    tags: ['máquinas', 'industrial', 'segurança'],
    isPremium: false,
    isNew: true,
  },
  {
    id: 'nr-35',
    title: 'NR-35 - Trabalho em Altura',
    description: 'Segurança para trabalhos acima de 2m',
    category: 'nr',
    nrNumber: 'NR-35',
    duration: 1500,
    slideCount: 20,
    tags: ['altura', 'segurança', 'construção'],
    isPremium: false,
    isNew: false,
  },
];

const CORPORATE_TEMPLATES: Template[] = [
  {
    id: 'corp-onboarding',
    title: 'Onboarding de Funcionários',
    description: 'Template para integração de novos colaboradores',
    category: 'corporate',
    duration: 1200,
    slideCount: 15,
    tags: ['rh', 'integração', 'treinamento'],
    isPremium: true,
    isNew: true,
  },
  {
    id: 'corp-compliance',
    title: 'Compliance e Ética',
    description: 'Treinamento sobre código de conduta',
    category: 'corporate',
    duration: 900,
    slideCount: 12,
    tags: ['compliance', 'ética', 'corporativo'],
    isPremium: true,
    isNew: false,
  },
];

const formatDuration = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}min`;
  }
  return `${minutes}min`;
};

export function TemplatesTab({
  searchQuery,
  viewMode,
  showFavoritesOnly,
  onAssetSelect,
  onAssetDragStart,
}: TemplatesTabProps) {
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [templates, setTemplates] = useState<Template[]>([]);

  useEffect(() => {
    // Simulate loading
    setLoading(true);
    setTimeout(() => {
      setTemplates([...NR_TEMPLATES, ...CORPORATE_TEMPLATES]);
      setLoading(false);
    }, 500);
  }, []);

  // Filter templates
  const filteredTemplates = React.useMemo(() => {
    let result = [...templates];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query) ||
          t.tags.some((tag) => tag.includes(query)) ||
          t.nrNumber?.toLowerCase().includes(query)
      );
    }

    if (selectedCategory !== 'all') {
      result = result.filter((t) => t.category === selectedCategory);
    }

    return result;
  }, [templates, searchQuery, selectedCategory]);

  const handleTemplateSelect = useCallback(
    (template: Template) => {
      const assetItem: AssetItem = {
        id: template.id,
        name: template.title,
        type: 'template',
        url: '',
        thumbnail: template.thumbnail,
        duration: template.duration,
        createdAt: new Date(),
        metadata: {
          category: template.category,
          nrNumber: template.nrNumber,
          slideCount: template.slideCount,
          tags: template.tags,
        },
      };
      onAssetSelect?.(assetItem);
    },
    [onAssetSelect]
  );

  const handleDragStart = useCallback(
    (e: React.DragEvent, template: Template) => {
      const assetItem: AssetItem = {
        id: template.id,
        name: template.title,
        type: 'template',
        url: '',
        thumbnail: template.thumbnail,
        duration: template.duration,
        createdAt: new Date(),
        metadata: {
          category: template.category,
          nrNumber: template.nrNumber,
          slideCount: template.slideCount,
          tags: template.tags,
        },
      };
      e.dataTransfer.setData('application/json', JSON.stringify(assetItem));
      e.dataTransfer.effectAllowed = 'copy';
      onAssetDragStart?.(assetItem);
    },
    [onAssetDragStart]
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
        </div>
        <div className="grid grid-cols-1 gap-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Category Filter */}
      <div className="flex gap-2 flex-wrap">
        <Badge
          variant={selectedCategory === 'all' ? 'default' : 'outline'}
          className="cursor-pointer"
          onClick={() => setSelectedCategory('all')}
        >
          Todos ({templates.length})
        </Badge>
        <Badge
          variant={selectedCategory === 'nr' ? 'default' : 'outline'}
          className="cursor-pointer"
          onClick={() => setSelectedCategory('nr')}
        >
          <Shield className="h-3 w-3 mr-1" />
          NR ({templates.filter((t) => t.category === 'nr').length})
        </Badge>
        <Badge
          variant={selectedCategory === 'corporate' ? 'default' : 'outline'}
          className="cursor-pointer"
          onClick={() => setSelectedCategory('corporate')}
        >
          Corporativo ({templates.filter((t) => t.category === 'corporate').length})
        </Badge>
      </div>

      {/* Templates List */}
      {filteredTemplates.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <LayoutTemplate className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No templates found</p>
          <p className="text-xs mt-1">Try a different search or category</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTemplates.map((template) => (
            <Card
              key={template.id}
              className="group cursor-pointer hover:bg-muted/50 transition-colors"
              draggable
              onDragStart={(e) => handleDragStart(e, template)}
              onClick={() => handleTemplateSelect(template)}
            >
              <div className="flex items-start gap-4 p-4">
                {/* Thumbnail */}
                <div className="h-16 w-24 rounded-md bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0 relative overflow-hidden">
                  {template.thumbnail ? (
                    <img
                      src={template.thumbnail}
                      alt={template.title}
                      className="w-full h-full object-cover"
                    />
                  ) : template.category === 'nr' ? (
                    <Shield className="h-8 w-8 text-primary" />
                  ) : (
                    <LayoutTemplate className="h-8 w-8 text-primary" />
                  )}
                  {template.isNew && (
                    <Badge className="absolute -top-1 -right-1 text-[10px] px-1 py-0 bg-green-500">
                      NEW
                    </Badge>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-medium text-sm leading-tight">{template.title}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        {template.description}
                      </p>
                    </div>
                    {template.isPremium && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        <Sparkles className="h-3 w-3 mr-0.5" />
                        Pro
                      </Badge>
                    )}
                  </div>

                  {/* Meta */}
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDuration(template.duration)}
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      {template.slideCount} slides
                    </span>
                  </div>

                  {/* Tags */}
                  <div className="flex items-center gap-1.5 mt-2">
                    {template.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">
                        {tag}
                      </Badge>
                    ))}
                    {template.tags.length > 3 && (
                      <span className="text-[10px] text-muted-foreground">
                        +{template.tags.length - 3}
                      </span>
                    )}
                  </div>
                </div>

                {/* Action */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      <div className="pt-2 border-t">
        <Button variant="outline" size="sm" className="w-full">
          <Download className="h-4 w-4 mr-2" />
          Browse More Templates
        </Button>
      </div>
    </div>
  );
}

export default TemplatesTab;
