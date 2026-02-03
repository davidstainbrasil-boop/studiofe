'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Badge } from '@components/ui/badge';
import { Input } from '@components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@components/ui/select';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@components/ui/dropdown-menu';
import {
    Video,
    Play,
    Plus,
    FolderOpen,
    Clock,
    Loader2,
    Search,
    Grid3X3,
    List,
    MoreVertical,
    Edit3,
    Trash2,
    Copy,
    Download,
    Share2,
    FileText,
    Users,
    Sparkles,
    TrendingUp,
    Film,
    Calendar,
    Filter,
    SlidersHorizontal,
    Eye
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useProjects, Project } from '@hooks/use-projects';
import { CreateProjectDialog } from '@components/dashboard/create-project-dialog';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@lib/utils';

// Status Colors & Text
const statusConfig: Record<string, { color: string; bg: string; text: string }> = {
    'draft': { color: 'text-slate-600', bg: 'bg-slate-100 dark:bg-slate-800', text: 'Rascunho' },
    'in-progress': { color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950', text: 'Em Progresso' },
    'review': { color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950', text: 'Em Revisão' },
    'completed': { color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950', text: 'Concluído' },
    'archived': { color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950', text: 'Arquivado' },
    'error': { color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950', text: 'Erro' },
};

// Type Icons
const typeIcons: Record<string, React.ReactNode> = {
    'video': <Video className="w-5 h-5" />,
    'pptx': <FileText className="w-5 h-5" />,
    'talking-photo': <Users className="w-5 h-5" />,
    'avatar': <Sparkles className="w-5 h-5" />,
    'custom': <Film className="w-5 h-5" />,
};

const formatTimeAgo = (dateString: string) => {
    try {
        return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: ptBR });
    } catch {
        return 'Recentemente';
    }
};

const formatDate = (dateString: string) => {
    try {
        return format(new Date(dateString), "dd 'de' MMM, yyyy", { locale: ptBR });
    } catch {
        return '-';
    }
};

export default function ProjectsPage() {
    const { projects, isLoading } = useProjects({ limit: 100 });
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [sortBy, setSortBy] = useState<string>('updated');

    // Filter and sort projects
    const filteredProjects = useMemo(() => {
        let result = [...projects];

        if (searchQuery) {
            result = result.filter(p =>
                p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.description?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        if (statusFilter !== 'all') {
            result = result.filter(p => p.status === statusFilter);
        }

        result.sort((a, b) => {
            if (sortBy === 'updated') {
                return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
            }
            if (sortBy === 'created') {
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            }
            if (sortBy === 'name') {
                return a.name.localeCompare(b.name);
            }
            return 0;
        });

        return result;
    }, [projects, searchQuery, statusFilter, sortBy]);

    // Stats
    const stats = useMemo(() => {
        const completed = projects.filter(p => p.status === 'completed').length;
        const inProgress = projects.filter(p => p.status === 'review').length;
        return {
            total: projects.length,
            completed,
            inProgress,
            draft: projects.filter(p => p.status === 'draft').length
        };
    }, [projects]);

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                        Meus Projetos
                    </h1>
                    <p className="text-slate-500 mt-1">
                        Gerencie e organize seus projetos de vídeo
                    </p>
                </div>
                <CreateProjectDialog
                    open={isDialogOpen}
                    onOpenChange={setIsDialogOpen}
                    trigger={
                        <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg shadow-blue-500/25">
                            <Plus className="w-4 h-4 mr-2" />
                            Novo Projeto
                        </Button>
                    }
                />
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-blue-600 to-blue-700 text-white border-0">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-blue-100 text-sm font-medium">Total</p>
                                <p className="text-3xl font-bold">{stats.total}</p>
                            </div>
                            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                                <FolderOpen className="w-6 h-6" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-emerald-600 to-emerald-700 text-white border-0">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-emerald-100 text-sm font-medium">Concluídos</p>
                                <p className="text-3xl font-bold">{stats.completed}</p>
                            </div>
                            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                                <TrendingUp className="w-6 h-6" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white border-0">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-amber-100 text-sm font-medium">Em Progresso</p>
                                <p className="text-3xl font-bold">{stats.inProgress}</p>
                            </div>
                            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                                <Clock className="w-6 h-6" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-slate-600 to-slate-700 text-white border-0">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-slate-300 text-sm font-medium">Rascunhos</p>
                                <p className="text-3xl font-bold">{stats.draft}</p>
                            </div>
                            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                                <Edit3 className="w-6 h-6" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters & Search */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                placeholder="Buscar projetos..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <div className="flex gap-2">
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-[140px]">
                                    <Filter className="w-4 h-4 mr-2 text-slate-400" />
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
                                    <SelectItem value="draft">Rascunho</SelectItem>
                                    <SelectItem value="in-progress">Em Progresso</SelectItem>
                                    <SelectItem value="review">Em Revisão</SelectItem>
                                    <SelectItem value="completed">Concluído</SelectItem>
                                    <SelectItem value="archived">Arquivado</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select value={sortBy} onValueChange={setSortBy}>
                                <SelectTrigger className="w-[160px]">
                                    <SlidersHorizontal className="w-4 h-4 mr-2 text-slate-400" />
                                    <SelectValue placeholder="Ordenar" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="updated">Última Atualização</SelectItem>
                                    <SelectItem value="created">Data de Criação</SelectItem>
                                    <SelectItem value="name">Nome A-Z</SelectItem>
                                </SelectContent>
                            </Select>

                            <div className="flex border rounded-lg overflow-hidden">
                                <Button
                                    variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                                    size="icon"
                                    onClick={() => setViewMode('grid')}
                                    className="rounded-none"
                                >
                                    <Grid3X3 className="w-4 h-4" />
                                </Button>
                                <Button
                                    variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                                    size="icon"
                                    onClick={() => setViewMode('list')}
                                    className="rounded-none"
                                >
                                    <List className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Projects Grid/List */}
            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="text-center">
                        <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-4" />
                        <p className="text-slate-500">Carregando projetos...</p>
                    </div>
                </div>
            ) : filteredProjects.length === 0 ? (
                <Card>
                    <CardContent className="py-16">
                        <div className="text-center">
                            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FolderOpen className="w-10 h-10 text-slate-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                                {searchQuery || statusFilter !== 'all' ? 'Nenhum projeto encontrado' : 'Comece seu primeiro projeto'}
                            </h3>
                            <p className="text-slate-500 mb-6 max-w-md mx-auto">
                                {searchQuery || statusFilter !== 'all'
                                    ? 'Tente ajustar seus filtros de busca'
                                    : 'Crie vídeos profissionais a partir de apresentações PPTX ou templates customizados'}
                            </p>
                            {!searchQuery && statusFilter === 'all' && (
                                <CreateProjectDialog
                                    open={isDialogOpen}
                                    onOpenChange={setIsDialogOpen}
                                    trigger={
                                        <Button className="bg-gradient-to-r from-blue-600 to-purple-600">
                                            <Plus className="w-4 h-4 mr-2" />
                                            Criar Primeiro Projeto
                                        </Button>
                                    }
                                />
                            )}
                        </div>
                    </CardContent>
                </Card>
            ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <AnimatePresence mode="popLayout">
                        {filteredProjects.map((project, index) => (
                            <motion.div
                                key={project.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ delay: index * 0.05 }}
                            >
                                <ProjectCard project={project} />
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            ) : (
                <Card>
                    <CardContent className="p-0">
                        <div className="divide-y divide-slate-200 dark:divide-slate-800">
                            <AnimatePresence mode="popLayout">
                                {filteredProjects.map((project, index) => (
                                    <motion.div
                                        key={project.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        transition={{ delay: index * 0.03 }}
                                    >
                                        <ProjectListItem project={project} />
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

// Project Card Component
function ProjectCard({ project }: { project: Project }) {
    const status = statusConfig[project.status] || statusConfig['draft'];
    const typeIcon = typeIcons[project.type] || typeIcons['video'];

    return (
        <Card className="group hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-slate-900/50 transition-all duration-300 overflow-hidden">
            <div className="h-40 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 relative">
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur flex items-center justify-center text-slate-400">
                        {typeIcon}
                    </div>
                </div>
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Link href={`/studio/${project.id}`}>
                        <Button size="sm" className="bg-white text-slate-900 hover:bg-slate-100">
                            <Play className="w-4 h-4 mr-1" />
                            Abrir
                        </Button>
                    </Link>
                    <Button size="sm" variant="secondary">
                        <Eye className="w-4 h-4 mr-1" />
                        Preview
                    </Button>
                </div>
                <div className="absolute top-3 right-3">
                    <Badge className={cn("font-medium", status.bg, status.color)}>
                        {status.text}
                    </Badge>
                </div>
            </div>

            <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-slate-900 dark:text-white truncate flex-1">
                        {project.name}
                    </h3>
                    <ProjectMenu project={project} />
                </div>
                <p className="text-sm text-slate-500 line-clamp-2 mb-4 min-h-[40px]">
                    {project.description || 'Sem descrição'}
                </p>
                <div className="flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {formatTimeAgo(project.updated_at)}
                    </div>
                    <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(project.created_at)}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

// Project List Item Component
function ProjectListItem({ project }: { project: Project }) {
    const status = statusConfig[project.status] || statusConfig['draft'];
    const typeIcon = typeIcons[project.type] || typeIcons['video'];

    return (
        <div className="flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center text-slate-500 flex-shrink-0">
                {typeIcon}
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                        {project.name}
                    </h3>
                    <Badge className={cn("font-medium text-xs", status.bg, status.color)}>
                        {status.text}
                    </Badge>
                </div>
                <p className="text-sm text-slate-500 truncate">
                    {project.description || 'Sem descrição'}
                </p>
            </div>

            <div className="hidden md:flex items-center gap-6 text-sm text-slate-400">
                <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    <span>{formatTimeAgo(project.updated_at)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(project.created_at)}</span>
                </div>
            </div>

            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Link href={`/studio/${project.id}`}>
                    <Button size="sm" className="bg-gradient-to-r from-blue-600 to-purple-600">
                        <Play className="w-4 h-4 mr-1" />
                        Abrir
                    </Button>
                </Link>
                <ProjectMenu project={project} />
            </div>
        </div>
    );
}

// Project Dropdown Menu
function ProjectMenu({ project }: { project: Project }) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="w-4 h-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem>
                    <Edit3 className="w-4 h-4 mr-2" />
                    Renomear
                </DropdownMenuItem>
                <DropdownMenuItem>
                    <Copy className="w-4 h-4 mr-2" />
                    Duplicar
                </DropdownMenuItem>
                <DropdownMenuItem>
                    <Share2 className="w-4 h-4 mr-2" />
                    Compartilhar
                </DropdownMenuItem>
                <DropdownMenuItem>
                    <Download className="w-4 h-4 mr-2" />
                    Exportar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Excluir
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
