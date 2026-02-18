'use client';

import { useProject, useProjectMutations } from '@/hooks/use-projects';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  Play,
  Pencil,
  Users,
  FileText,
  Video,
  Loader2,
} from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import { useState } from 'react';
import { toast } from 'sonner';

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  archived: 'bg-yellow-100 text-yellow-800',
};

const statusLabels: Record<string, string> = {
  draft: 'Rascunho',
  in_progress: 'Em Progresso',
  completed: 'Concluído',
  archived: 'Arquivado',
};

const renderStatusColors: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-800',
  queued: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800',
};

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const { project, isLoading, error, refresh } = useProject(projectId);
  const { updateProject } = useProjectMutations();

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editStatus, setEditStatus] = useState('draft');
  const [saving, setSaving] = useState(false);

  // Render dialog state
  const [renderOpen, setRenderOpen] = useState(false);
  const [rendering, setRendering] = useState(false);

  const openEditDialog = () => {
    if (!project) return;
    setEditName(project.name);
    setEditDesc(project.description || '');
    setEditStatus(project.status);
    setEditOpen(true);
  };

  const handleSaveProject = async () => {
    if (!project || !editName.trim()) return;
    setSaving(true);
    try {
      const changes: Record<string, string> = {};
      if (editName.trim() !== project.name) changes.name = editName.trim();
      if (editDesc.trim() !== (project.description || '')) changes.description = editDesc.trim();
      if (editStatus !== project.status) changes.status = editStatus;

      if (Object.keys(changes).length === 0) {
        setEditOpen(false);
        return;
      }

      await updateProject(projectId, changes);
      refresh();
      setEditOpen(false);
      toast.success('Projeto atualizado com sucesso');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar projeto');
    } finally {
      setSaving(false);
    }
  };

  const handleStartRender = async () => {
    if (!project) return;
    setRendering(true);
    try {
      const res = await fetch('/api/render/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Falha ao iniciar render' }));
        throw new Error(err.error || 'Falha ao iniciar render');
      }
      refresh();
      setRenderOpen(false);
      toast.success('Renderização iniciada! Acompanhe na aba Renders.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao iniciar renderização');
    } finally {
      setRendering(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="h-48 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
        <Card>
          <CardContent className="p-6 text-center text-destructive">
            {error || 'Projeto não encontrado'}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{project.name}</h1>
            <p className="text-sm text-muted-foreground">
              {project.description || 'Sem descrição'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className={statusColors[project.status] || ''}>
            {statusLabels[project.status] || project.status}
          </Badge>
          <Button variant="outline" size="sm" onClick={openEditDialog}>
            <Pencil className="mr-2 h-4 w-4" /> Editar
          </Button>
          <Button size="sm" onClick={() => setRenderOpen(true)} disabled={project._count.slides === 0}>
            <Play className="mr-2 h-4 w-4" /> Renderizar
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{project._count.slides}</p>
              <p className="text-xs text-muted-foreground">Slides</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Video className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{project._count.renderJobs}</p>
              <p className="text-xs text-muted-foreground">Renders</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Users className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{project._count.collaborators}</p>
              <p className="text-xs text-muted-foreground">Colaboradores</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Play className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">v{project.currentVersion}</p>
              <p className="text-xs text-muted-foreground">Versão</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="slides">
        <TabsList>
          <TabsTrigger value="slides">Slides</TabsTrigger>
          <TabsTrigger value="renders">Renders</TabsTrigger>
          <TabsTrigger value="team">Equipe</TabsTrigger>
        </TabsList>

        <TabsContent value="slides" className="mt-4">
          {project.slides.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Nenhum slide neste projeto ainda.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {project.slides.map((slide, idx) => (
                <Card key={slide.id}>
                  <CardContent className="p-4">
                    <div className="relative aspect-video bg-muted rounded mb-3 flex items-center justify-center">
                      {slide.thumbnailUrl ? (
                        <Image
                          src={slide.thumbnailUrl}
                          alt={slide.title || `Slide ${idx + 1}`}
                          fill
                          className="object-cover rounded"
                        />) : (
                        <FileText className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    <p className="font-medium text-sm truncate">
                      {slide.title || `Slide ${idx + 1}`}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {slide.duration && (
                        <span className="text-xs text-muted-foreground">
                          {slide.duration}s
                        </span>
                      )}
                      {slide.hasAudio && (
                        <Badge variant="outline" className="text-xs">
                          Audio
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="renders" className="mt-4">
          {project.renderJobs.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Nenhum render executado ainda.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {project.renderJobs.map((job) => (
                <Card key={job.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="secondary"
                          className={renderStatusColors[job.status] || ''}
                        >
                          {job.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeTime(new Date(job.createdAt))}
                        </span>
                      </div>
                      {job.status === 'processing' && (
                        <Progress value={job.progress} className="mt-2 h-2" />
                      )}
                    </div>
                    {job.outputUrl && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={job.outputUrl} target="_blank" rel="noopener noreferrer">
                          Download
                        </a>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="team" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dono</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={project.user.avatarUrl || undefined} />
                  <AvatarFallback>
                    {(project.user.name || project.user.email).slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{project.user.name || project.user.email}</p>
                  <p className="text-xs text-muted-foreground">{project.user.email}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {project.collaborators.length > 0 && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-base">Colaboradores</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {project.collaborators.map((collab) => (
                  <div key={collab.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={collab.user.avatarUrl || undefined} />
                        <AvatarFallback>
                          {(collab.user.name || collab.user.email).slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">
                          {collab.user.name || collab.user.email}
                        </p>
                        <p className="text-xs text-muted-foreground">{collab.user.email}</p>
                      </div>
                    </div>
                    <Badge variant="outline">{collab.role}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Project Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Projeto</DialogTitle>
            <DialogDescription>Altere as informações do projeto.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Nome do projeto"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-desc">Descrição</Label>
              <Textarea
                id="edit-desc"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                placeholder="Descrição do projeto"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Rascunho</SelectItem>
                  <SelectItem value="in_progress">Em Progresso</SelectItem>
                  <SelectItem value="completed">Concluído</SelectItem>
                  <SelectItem value="archived">Arquivado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveProject} disabled={!editName.trim() || saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...
                </>
              ) : (
                'Salvar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Start Render Dialog */}
      <Dialog open={renderOpen} onOpenChange={setRenderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Iniciar Renderização</DialogTitle>
            <DialogDescription>
              Será gerado um vídeo a partir dos {project._count.slides} slides deste projeto.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Slides</span>
              <span className="font-medium">{project._count.slides}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Versão</span>
              <span className="font-medium">v{project.currentVersion}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Renders anteriores</span>
              <span className="font-medium">{project._count.renderJobs}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenderOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleStartRender} disabled={rendering}>
              {rendering ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Iniciando...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" /> Iniciar Render
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
