'use client';

import { useProjects, useProjectMutations } from '@/hooks/use-projects';
import { useProjectStore } from '@/lib/stores/project-store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Search, FolderOpen, MoreVertical, Trash2, Download } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatRelativeTime } from '@/lib/utils';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useSearchParams } from 'next/navigation';

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  archived: 'bg-yellow-100 text-yellow-800',
};

export default function ProjectsPage() {
  const searchParams = useSearchParams();
  const { projects, meta, isLoading, error, refresh } = useProjects();
  const { createProject, deleteProject } = useProjectMutations();
  const {
    filters,
    setFilters,
    isCreateDialogOpen,
    openCreateDialog,
    closeCreateDialog,
    isDeleteDialogOpen,
    projectToDelete,
    openDeleteDialog,
    closeDeleteDialog,
  } = useProjectStore();

  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const querySearch = searchParams.get('search') || '';
    const queryStatus = searchParams.get('status');
    const normalizedStatus = queryStatus && queryStatus.length > 0 ? queryStatus : null;

    if (querySearch !== filters.search || normalizedStatus !== filters.status) {
      setFilters({ search: querySearch, status: normalizedStatus, page: 1 });
    }
  }, [searchParams, filters.search, filters.status, setFilters]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await createProject({ name: newName.trim(), description: newDesc.trim() || undefined });
      toast.success('Projeto criado com sucesso!');
      closeCreateDialog();
      setNewName('');
      setNewDesc('');
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar projeto');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!projectToDelete) return;
    setDeleting(true);
    try {
      await deleteProject(projectToDelete);
      toast.success('Projeto excluído');
      closeDeleteDialog();
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao excluir projeto');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Projetos</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              window.open('/api/export/projects', '_blank');
            }}
          >
            <Download className="mr-2 h-4 w-4" /> Exportar CSV
          </Button>
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" /> Novo Projeto
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar projetos..."
            value={filters.search}
            onChange={(e) => setFilters({ search: e.target.value })}
            className="pl-9"
          />
        </div>
        <Select
          value={filters.status || 'all'}
          onValueChange={(value) => setFilters({ status: value === 'all' ? null : value })}
        >
          <SelectTrigger className="w-[190px]">
            <SelectValue placeholder="Todos os status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="draft">Rascunho</SelectItem>
            <SelectItem value="in_progress">Em progresso</SelectItem>
            <SelectItem value="completed">Concluído</SelectItem>
            <SelectItem value="archived">Arquivado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Error */}
      {error && (
        <Card>
          <CardContent className="p-4 text-destructive text-center">
            {error}
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-24 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && projects.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Nenhum projeto encontrado</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Crie seu primeiro projeto para começar.
            </p>
            <Button className="mt-4" onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" /> Criar Projeto
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Project grid */}
      {!isLoading && projects.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card key={project.id} className="group relative hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <Link
                    href={`/dashboard/projects/${project.id}`}
                    className="flex-1 min-w-0"
                  >
                    <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
                      {project.name}
                    </h3>
                  </Link>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/projects/${project.id}`}>Abrir</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => openDeleteDialog(project.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {project.description || 'Sem descrição'}
                </p>

                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" className={statusColors[project.status] || ''}>
                    {project.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {project._count.slides} slides
                  </span>
                  {project._count.collaborators > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {project._count.collaborators} colaboradores
                    </span>
                  )}
                </div>

                <p className="text-xs text-muted-foreground mt-3">
                  Atualizado {formatRelativeTime(new Date(project.updatedAt))}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={meta.page <= 1}
            onClick={() => setFilters({ page: meta.page - 1 })}
          >
            Anterior
          </Button>
          <span className="flex items-center text-sm text-muted-foreground px-3">
            Página {meta.page} de {meta.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={meta.page >= meta.totalPages}
            onClick={() => setFilters({ page: meta.page + 1 })}
          >
            Próxima
          </Button>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={(open) => !open && closeCreateDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Projeto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="project-name">Nome</Label>
              <Input
                id="project-name"
                placeholder="Meu projeto de vídeo"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="project-desc">Descrição (opcional)</Label>
              <Textarea
                id="project-desc"
                placeholder="Descreva o projeto..."
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeCreateDialog}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={!newName.trim() || creating}>
              {creating ? 'Criando...' : 'Criar Projeto'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={(open) => !open && closeDeleteDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Projeto</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir este projeto? Esta ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={closeDeleteDialog}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
