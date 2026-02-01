/**
 * 🎬 Unified Asset Browser
 * Browser de assets integrado com múltiplas tabs
 * Media, Avatars, Templates, Stock, AI
 */

'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  FolderOpen,
  UserCircle,
  LayoutTemplate,
  ImageIcon,
  Sparkles,
  Search,
  Filter,
  Upload,
  Star,
  Clock,
  Grid3X3,
  List,
  ChevronDown,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { useUnifiedStudioStore, type AssetTab } from '@/lib/stores/unified-studio-store';
import { MediaTab } from './asset-browser/MediaTab';
import { AvatarsTab } from './asset-browser/AvatarsTab';
import { TemplatesTab } from './asset-browser/TemplatesTab';
import { StockTab } from './asset-browser/StockTab';
import { AIGeneratorTab } from './asset-browser/AIGeneratorTab';
import { cn } from '@/lib/utils';

interface UnifiedAssetBrowserProps {
  className?: string;
  onAssetSelect?: (asset: AssetItem) => void;
  onAssetDragStart?: (asset: AssetItem) => void;
}

export interface AssetItem {
  id: string;
  name: string;
  type: 'image' | 'video' | 'audio' | 'avatar' | 'template' | 'document';
  url: string;
  thumbnail?: string;
  duration?: number;
  size?: number;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  isFavorite?: boolean;
}

type ViewMode = 'grid' | 'list';
type SortBy = 'name' | 'date' | 'size' | 'type';

const TAB_CONFIG = [
  { id: 'media' as const, label: 'Media', icon: FolderOpen, shortcut: '1' },
  { id: 'avatars' as const, label: 'Avatars', icon: UserCircle, shortcut: '2' },
  { id: 'templates' as const, label: 'Templates', icon: LayoutTemplate, shortcut: '3' },
  { id: 'stock' as const, label: 'Stock', icon: ImageIcon, shortcut: '4' },
  { id: 'ai' as const, label: 'AI', icon: Sparkles, shortcut: '5' },
];

export function UnifiedAssetBrowser({
  className,
  onAssetSelect,
  onAssetDragStart,
}: UnifiedAssetBrowserProps) {
  const { activePanel, setActivePanel } = useUnifiedStudioStore((state) => ({
    activePanel: state.activePanel,
    setActivePanel: state.setActivePanel,
  }));

  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    // Simulate refresh delay
    await new Promise((resolve) => setTimeout(resolve, 500));
    setIsRefreshing(false);
  }, []);

  const handleTabChange = useCallback(
    (value: string) => {
      setActivePanel(value as AssetTab);
    },
    [setActivePanel]
  );

  // Keyboard shortcuts for tab switching
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        const tabIndex = parseInt(e.key);
        if (tabIndex >= 1 && tabIndex <= 5) {
          const tab = TAB_CONFIG[tabIndex - 1];
          if (tab) {
            setActivePanel(tab.id);
            e.preventDefault();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActivePanel]);

  const filterProps = useMemo(
    () => ({
      searchQuery,
      viewMode,
      sortBy,
      showFavoritesOnly,
      onAssetSelect,
      onAssetDragStart,
    }),
    [searchQuery, viewMode, sortBy, showFavoritesOnly, onAssetSelect, onAssetDragStart]
  );

  return (
    <div className={cn('flex flex-col h-full bg-background border-r', className)}>
      <Tabs value={activePanel} onValueChange={handleTabChange} className="flex flex-col h-full">
        {/* Header with Search */}
        <div className="p-3 border-b space-y-3">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search assets..."
              value={searchQuery}
              onChange={handleSearch}
              className="pl-9 pr-4 h-9"
            />
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Button
                variant={showFavoritesOnly ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                className="h-8 px-2"
              >
                <Star className={cn('h-4 w-4', showFavoritesOnly && 'fill-yellow-400 text-yellow-400')} />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 px-2">
                    <Filter className="h-4 w-4 mr-1" />
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => setSortBy('name')}>
                    Sort by Name {sortBy === 'name' && '✓'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy('date')}>
                    Sort by Date {sortBy === 'date' && '✓'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy('size')}>
                    Sort by Size {sortBy === 'size' && '✓'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy('type')}>
                    Sort by Type {sortBy === 'type' && '✓'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="h-8 px-2"
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="h-8 px-2"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                className="h-8 px-2"
                disabled={isRefreshing}
              >
                <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
              </Button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <TabsList className="grid grid-cols-5 mx-3 mt-2 h-9">
          {TAB_CONFIG.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="flex items-center gap-1.5 text-xs px-2"
              title={`${tab.label} (Alt+${tab.shortcut})`}
            >
              <tab.icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Tab Content */}
        <ScrollArea className="flex-1">
          <TabsContent value="media" className="m-0 p-3">
            <MediaTab {...filterProps} />
          </TabsContent>

          <TabsContent value="avatars" className="m-0 p-3">
            <AvatarsTab {...filterProps} />
          </TabsContent>

          <TabsContent value="templates" className="m-0 p-3">
            <TemplatesTab {...filterProps} />
          </TabsContent>

          <TabsContent value="stock" className="m-0 p-3">
            <StockTab {...filterProps} />
          </TabsContent>

          <TabsContent value="ai" className="m-0 p-3">
            <AIGeneratorTab {...filterProps} />
          </TabsContent>
        </ScrollArea>

        {/* Footer with Quick Actions */}
        <div className="p-2 border-t bg-muted/30">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Clock className="h-3 w-3" />
              <span>Recent</span>
            </div>
            <Button variant="ghost" size="sm" className="h-7 text-xs">
              <Plus className="h-3 w-3 mr-1" />
              Import
            </Button>
          </div>
        </div>
      </Tabs>
    </div>
  );
}

export default UnifiedAssetBrowser;
