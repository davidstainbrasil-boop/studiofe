'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Badge } from '@components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@components/ui/tabs';
import {
    Video,
    Sparkles,
    Play,
    Users,
    Settings,
    FileText,
    Layers,
    Clock,
    Download,
    Plus,
    FolderOpen,
    Zap,
    Target,
    BarChart3,
    Loader2
} from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useProjects, Project } from '@hooks/use-projects';
import { CreateProjectDialog } from '@components/dashboard/create-project-dialog';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const getStatusColor = (status: string) => {
    switch (status) {
        case 'draft': return 'bg-gray-100 text-gray-800';
        case 'in-progress': return 'bg-blue-100 text-blue-800';
        case 'completed': return 'bg-green-100 text-green-800';
        case 'rendering': return 'bg-yellow-100 text-yellow-800';
        case 'error': return 'bg-red-100 text-red-800';
        default: return 'bg-gray-100 text-gray-800';
    }
};

const getStatusText = (status: string) => {
    switch (status) {
        case 'draft': return 'Rascunho';
        case 'in-progress': return 'Em Progresso';
        case 'completed': return 'Concluído';
        case 'rendering': return 'Renderizando';
        case 'error': return 'Erro';
        default: return status;
    }
};

const getTypeIcon = (type: string) => {
    switch (type) {
        case 'video': return <Video className="w-4 h-4" />;
        case 'pptx': return <FileText className="w-4 h-4" />;
        case 'talking-photo': return <Users className="w-4 h-4" />;
        case 'avatar': return <Sparkles className="w-4 h-4" />;
        default: return <Video className="w-4 h-4" />;
    }
};

const formatTimeAgo = (dateString: string) => {
    try {
        return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: ptBR });
    } catch (e) {
        return 'Recentemente';
    }
};

export default function ProjectsPage() {
    const [selectedTab, setSelectedTab] = useState('projects');
    const { projects, isLoading, total } = useProjects({ limit: 100 });
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="container mx-auto px-6 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">
                            Meus Projetos
                        </h1>
                        <p className="text-lg text-gray-600 mt-2">
                            Gerencie seus vídeos e apresentações
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <CreateProjectDialog
                            open={isDialogOpen}
                            onOpenChange={setIsDialogOpen}
                            trigger={
                                <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600">
                                    <Plus className="w-5 h-5 mr-2" />
                                    Novo Projeto
                                </Button>
                            }
                        />
                    </div>
                </div>

                {/* Main Content */}
                <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
                    <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
                        <TabsTrigger value="projects">Todos os Projetos</TabsTrigger>
                        <TabsTrigger value="templates">Templates</TabsTrigger>
                    </TabsList>

                    <TabsContent value="projects">
                        <Card>
                            <CardContent className="p-6">
                                {isLoading ? (
                                    <div className="flex justify-center py-12">
                                        <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {projects.map((project) => (
                                            <motion.div
                                                key={project.id}
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                whileHover={{ scale: 1.02 }}
                                                className="border rounded-lg p-6 hover:shadow-lg transition-all cursor-pointer bg-white"
                                            >
                                                <div className="flex items-start justify-between mb-4">
                                                    <div className="bg-blue-100 p-2 rounded-lg">
                                                        {getTypeIcon(project.type)}
                                                    </div>
                                                    <Badge className={getStatusColor(project.status)}>
                                                        {getStatusText(project.status)}
                                                    </Badge>
                                                </div>
                                                <h3 className="font-semibold mb-2">{project.name}</h3>
                                                <p className="text-sm text-gray-600 mb-4 line-clamp-2">{project.description || 'Sem descrição'}</p>
                                                <div className="flex items-center justify-between text-sm text-gray-500">
                                                    <span>{formatTimeAgo(project.updated_at)}</span>
                                                </div>
                                                <div className="mt-4 flex gap-2">
                                                    <Link href={`/studio/${project.id}`} className="flex-1">
                                                        <Button size="sm" className="w-full">
                                                            <Play className="w-4 h-4 mr-1" />
                                                            Abrir
                                                        </Button>
                                                    </Link>
                                                    <Button variant="outline" size="sm">
                                                        <Settings className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </motion.div>
                                        ))}
                                        {projects.length === 0 && (
                                            <div className="col-span-full text-center py-12">
                                                <p className="text-gray-500">Nenhum projeto encontrado.</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="templates">
                        <Card>
                            <CardHeader>
                                <CardTitle>Biblioteca de Templates</CardTitle>
                                <CardDescription>
                                    Templates profissionais para diferentes tipos de conteúdo
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="text-center py-12">
                                    <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                                        Templates em Desenvolvimento
                                    </h3>
                                    <p className="text-gray-600 mb-6">
                                        A biblioteca de templates estará disponível em breve
                                    </p>
                                    <Button>
                                        <Plus className="w-4 h-4 mr-2" />
                                        Criar Template Personalizado
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
