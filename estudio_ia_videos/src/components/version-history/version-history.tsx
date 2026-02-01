'use client';

/**
 * Version History Component
 * 
 * Displays project version history with ability to restore previous versions.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  History,
  Clock,
  RotateCcw,
  Eye,
  User,
  ChevronRight,
  AlertTriangle,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export interface ProjectVersion {
  id: string;
  versionNumber: number;
  createdAt: Date;
  createdBy: {
    id: string;
    name: string;
    avatar?: string;
  };
  description?: string;
  changesSummary: {
    slidesAdded: number;
    slidesModified: number;
    slidesDeleted: number;
  };
  isCurrent: boolean;
  isAutoSave: boolean;
}

interface VersionHistoryProps {
  projectId: string;
  versions: ProjectVersion[];
  onRestore: (versionId: string) => Promise<void>;
  onPreview: (versionId: string) => void;
  isLoading?: boolean;
  className?: string;
}

export function VersionHistory({
  projectId,
  versions,
  onRestore,
  onPreview,
  isLoading = false,
  className,
}: VersionHistoryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<ProjectVersion | null>(null);
  const [isRestoreDialogOpen, setIsRestoreDialogOpen] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const handleRestore = async () => {
    if (!selectedVersion) return;
    
    try {
      setIsRestoring(true);
      await onRestore(selectedVersion.id);
      toast.success(`Projeto restaurado para a versão ${selectedVersion.versionNumber}`);
      setIsRestoreDialogOpen(false);
      setIsOpen(false);
    } catch (error) {
      toast.error('Erro ao restaurar versão');
    } finally {
      setIsRestoring(false);
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (hours < 1) return 'Agora mesmo';
    if (hours < 24) return `${hours}h atrás`;
    if (days === 1) return 'Ontem';
    if (days < 7) return `${days} dias atrás`;
    
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: days > 365 ? 'numeric' : undefined,
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Group versions by day
  const groupedVersions = versions.reduce((groups, version) => {
    const date = version.createdAt.toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(version);
    return groups;
  }, {} as Record<string, ProjectVersion[]>);

  return (
    <>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="sm" className={className}>
            <History className="w-4 h-4 mr-2" />
            Histórico
            {versions.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {versions.length}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Histórico de Versões
            </SheetTitle>
            <SheetDescription>
              Visualize e restaure versões anteriores do seu projeto.
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-200px)] mt-6 pr-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-pulse space-y-4 w-full">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 bg-slate-100 dark:bg-slate-800 rounded-lg" />
                  ))}
                </div>
              </div>
            ) : versions.length === 0 ? (
              <div className="text-center py-12">
                <History className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500">Nenhuma versão anterior</p>
                <p className="text-sm text-slate-400 mt-1">
                  As versões serão criadas automaticamente ao salvar.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedVersions).map(([date, dayVersions]) => (
                  <div key={date}>
                    <div className="sticky top-0 bg-background z-10 py-2">
                      <span className="text-sm font-medium text-slate-500">
                        {formatDate(dayVersions[0].createdAt)}
                      </span>
                    </div>
                    <div className="space-y-2 ml-2 border-l-2 border-slate-200 dark:border-slate-700 pl-4">
                      {dayVersions.map((version) => (
                        <VersionItem
                          key={version.id}
                          version={version}
                          formatTime={formatTime}
                          onPreview={() => onPreview(version.id)}
                          onRestore={() => {
                            setSelectedVersion(version);
                            setIsRestoreDialogOpen(true);
                          }}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Restore Confirmation Dialog */}
      <Dialog open={isRestoreDialogOpen} onOpenChange={setIsRestoreDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Restaurar Versão
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja restaurar a versão {selectedVersion?.versionNumber}?
              Isso substituirá o projeto atual.
            </DialogDescription>
          </DialogHeader>
          
          {selectedVersion && (
            <div className="py-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-slate-500" />
                  {formatDate(selectedVersion.createdAt)} às {formatTime(selectedVersion.createdAt)}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-slate-500" />
                  {selectedVersion.createdBy.name}
                </div>
                {selectedVersion.description && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                    {selectedVersion.description}
                  </p>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRestoreDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleRestore} disabled={isRestoring}>
              {isRestoring ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Restaurando...
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Restaurar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Version Item Component
interface VersionItemProps {
  version: ProjectVersion;
  formatTime: (date: Date) => string;
  onPreview: () => void;
  onRestore: () => void;
}

function VersionItem({ version, formatTime, onPreview, onRestore }: VersionItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.div
      layout
      className={cn(
        'relative p-3 rounded-lg transition-colors',
        version.isCurrent
          ? 'bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800'
          : 'hover:bg-slate-50 dark:hover:bg-slate-900/50'
      )}
    >
      {/* Timeline dot */}
      <div
        className={cn(
          'absolute -left-[21px] top-4 w-3 h-3 rounded-full border-2 bg-background',
          version.isCurrent
            ? 'border-violet-500'
            : version.isAutoSave
            ? 'border-slate-300'
            : 'border-blue-500'
        )}
      />

      <div
        className="cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-medium">v{version.versionNumber}</span>
            {version.isCurrent && (
              <Badge className="bg-violet-500 text-white text-xs">Atual</Badge>
            )}
            {version.isAutoSave && (
              <Badge variant="outline" className="text-xs">Auto</Badge>
            )}
          </div>
          <span className="text-xs text-slate-500">{formatTime(version.createdAt)}</span>
        </div>

        <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
          <User className="w-3 h-3" />
          {version.createdBy.name}
        </div>

        {version.description && (
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 line-clamp-2">
            {version.description}
          </p>
        )}
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 pt-3 border-t space-y-3"
          >
            {/* Changes Summary */}
            <div className="flex gap-3 text-xs">
              {version.changesSummary.slidesAdded > 0 && (
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  +{version.changesSummary.slidesAdded} slides
                </Badge>
              )}
              {version.changesSummary.slidesModified > 0 && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                  ~{version.changesSummary.slidesModified} modificados
                </Badge>
              )}
              {version.changesSummary.slidesDeleted > 0 && (
                <Badge variant="secondary" className="bg-red-100 text-red-700">
                  -{version.changesSummary.slidesDeleted} removidos
                </Badge>
              )}
            </div>

            {/* Actions */}
            {!version.isCurrent && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={onPreview}>
                  <Eye className="w-4 h-4 mr-1" />
                  Visualizar
                </Button>
                <Button variant="outline" size="sm" onClick={onRestore}>
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Restaurar
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default VersionHistory;
