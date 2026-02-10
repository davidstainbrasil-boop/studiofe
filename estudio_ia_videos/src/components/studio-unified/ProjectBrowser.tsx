'use client';

/**
 * ProjectBrowser - Dialog para abrir projetos recentes
 * Busca projetos do usuário via /api/projects e permite abrir no Studio Pro
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Button } from '@components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@components/ui/dialog';
import { FolderOpen, Clock, FileVideo, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface ProjectItem {
  id: string;
  name: string;
  type: string;
  status: string;
  updatedAt: string;
  createdAt: string;
}

interface ProjectBrowserProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenProject: (projectId: string) => void;
}

export function ProjectBrowser({ isOpen, onClose, onOpenProject }: ProjectBrowserProps) {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/projects?limit=20&sort=updatedAt');
      if (!res.ok) {
        throw new Error('Erro ao carregar projetos');
      }
      const data = await res.json();
      setProjects(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadProjects();
    }
  }, [isOpen, loadProjects]);

  const handleOpen = (projectId: string) => {
    onOpenProject(projectId);
    onClose();
    toast.success('Abrindo projeto...');
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const statusColors: Record<string, string> = {
    draft: 'text-yellow-500',
    'in-progress': 'text-blue-500',
    completed: 'text-green-500',
    archived: 'text-gray-500',
    error: 'text-red-500',
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[70vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Abrir Projeto
          </DialogTitle>
          <DialogDescription>
            Selecione um projeto recente para continuar editando
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mb-2 text-red-400" />
              <p className="text-sm">{error}</p>
              <Button variant="ghost" size="sm" onClick={loadProjects} className="mt-2">
                Tentar novamente
              </Button>
            </div>
          )}

          {!loading && !error && projects.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FileVideo className="h-12 w-12 mb-4" />
              <p className="text-sm">Nenhum projeto encontrado</p>
              <p className="text-xs">Crie seu primeiro projeto no Studio Pro</p>
            </div>
          )}

          {!loading && !error && projects.length > 0 && (
            <div className="space-y-1">
              {projects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => handleOpen(project.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors text-left group"
                >
                  <FileVideo className="h-8 w-8 text-purple-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate group-hover:text-purple-400 transition-colors">
                      {project.name}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{formatDate(project.updatedAt || project.createdAt)}</span>
                      <span className={statusColors[project.status] || 'text-gray-400'}>
                        {project.status}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
