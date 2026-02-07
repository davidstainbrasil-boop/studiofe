'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import MobileNavigation from './MobileNavigation';

interface Project {
  id: string;
  title: string;
  description?: string;
  status: 'DRAFT' | 'PROCESSING' | 'COMPLETED' | 'ARCHIVED';
  createdAt: string;
  updatedAt: string;
  videos: Video[];
  _count: {
    videos: number;
  };
}

interface Video {
  id: string;
  title: string;
  url?: string;
  thumbnail?: string;
  duration?: number;
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'ARCHIVED';
  createdAt: string;
}

interface Stats {
  totalProjects: number;
  totalVideos: number;
  completedVideos: number;
  processingVideos: number;
  failedVideos: number;
  totalDuration: number;
}

export default function Dashboard() {
  const { data: session, status } = useSession();
  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'projects' | 'videos' | 'analytics'>('projects');

  useEffect(() => {
    if (status === 'authenticated') {
      fetchDashboardData();
    }
  }, [status]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Buscar projetos
      const projectsRes = await fetch('/api/user/projects');
      if (projectsRes.ok) {
        const projectsData = await projectsRes.json();
        setProjects(projectsData.projects);
      }

      // Buscar estatísticas
      const statsRes = await fetch('/api/user/stats');
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const createProject = async () => {
    const title = prompt('Digite o nome do novo projeto:');
    if (!title) return;

    try {
      const response = await fetch('/api/user/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title }),
      });

      if (response.ok) {
        const newProject = await response.json();
        setProjects((prev) => [newProject, ...prev]);
      } else {
        alert('Erro ao criar projeto');
      }
    } catch (error) {
      alert('Erro ao criar projeto');
    }
  };

  const deleteProject = async (projectId: string) => {
    if (!confirm('Tem certeza que deseja excluir este projeto?')) return;

    try {
      const response = await fetch(`/api/user/projects/${projectId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setProjects((prev) => prev.filter((p) => p.id !== projectId));
      } else {
        alert('Erro ao excluir projeto');
      }
    } catch (error) {
      alert('Erro ao excluir projeto');
    }
  };

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'PROCESSING':
        return 'bg-blue-100 text-blue-800';
      case 'FAILED':
        return 'bg-red-100 text-red-800';
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }, []);

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Acesso Restrito</h1>
          <p className="text-gray-600 mb-4">Faça login para acessar seu dashboard</p>
          <button
            onClick={() => (window.location.href = '/auth/signin')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Fazer Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Navigation */}
      <MobileNavigation currentPage={selectedTab} />

      {/* Desktop Header */}
      <header className="hidden md:block bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">TécnicoCursos Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Bem-vindo, {session.user?.name}</span>
              <div className="relative group">
                <button className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {session.user?.name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <a
                    href="/dashboard/profile"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Perfil
                  </a>
                  <a
                    href="/dashboard/settings"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Configurações
                  </a>
                  <button
                    onClick={() => signOut()}
                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    Sair
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Cards */}
      {stats && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 md:pt-6 pb-20 md:pb-8">
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-6">
            <div className="bg-white rounded-lg shadow p-3 md:p-4 lg:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-500 rounded-full flex items-center justify-center">
                    <svg
                      className="w-4 h-4 md:w-6 md:h-6 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                </div>
                <div className="ml-2 md:ml-4 min-w-0">
                  <p className="text-xs md:text-sm font-medium text-gray-600 truncate">Projetos</p>
                  <p className="text-lg md:text-2xl font-semibold text-gray-900">
                    {stats.totalProjects}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-3 md:p-4 lg:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 md:w-10 md:h-10 bg-green-500 rounded-full flex items-center justify-center">
                    <svg
                      className="w-4 h-4 md:w-6 md:h-6 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                </div>
                <div className="ml-2 md:ml-4 min-w-0">
                  <p className="text-xs md:text-sm font-medium text-gray-600 truncate">Vídeos</p>
                  <p className="text-lg md:text-2xl font-semibold text-gray-900">
                    {stats.totalVideos}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-3 md:p-4 lg:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 md:w-10 md:h-10 bg-yellow-500 rounded-full flex items-center justify-center">
                    <svg
                      className="w-4 h-4 md:w-6 md:h-6 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                </div>
                <div className="ml-2 md:ml-4 min-w-0">
                  <p className="text-xs md:text-sm font-medium text-gray-600 truncate">Duração</p>
                  <p className="text-lg md:text-2xl font-semibold text-gray-900 truncate">
                    {formatDuration(stats.totalDuration)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-3 md:p-4 lg:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 md:w-10 md:h-10 bg-purple-500 rounded-full flex items-center justify-center">
                    <svg
                      className="w-4 h-4 md:w-6 md:h-6 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                  </div>
                </div>
                <div className="ml-2 md:ml-4 min-w-0">
                  <p className="text-xs md:text-sm font-medium text-gray-600 truncate">
                    Concluídos
                  </p>
                  <p className="text-lg md:text-2xl font-semibold text-gray-900">
                    {stats.completedVideos}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg mb-4 md:mb-6 overflow-x-auto">
          <nav className="flex space-x-1 sm:space-x-4 md:space-x-8 p-2 sm:p-4" aria-label="Tabs">
            <button
              onClick={() => setSelectedTab('projects')}
              className={`py-2 px-3 sm:px-1 md:px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                selectedTab === 'projects'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Projetos
            </button>
            <button
              onClick={() => setSelectedTab('videos')}
              className={`py-2 px-3 sm:px-1 md:px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                selectedTab === 'videos'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Vídeos
            </button>
            <button
              onClick={() => setSelectedTab('analytics')}
              className={`py-2 px-3 sm:px-1 md:px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                selectedTab === 'analytics'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Analytics
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 md:pb-8">
        {selectedTab === 'projects' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-medium text-gray-900">Meus Projetos</h2>
              <button
                onClick={createProject}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                + Novo Projeto
              </button>
            </div>

            {projects.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum projeto</h3>
                <p className="mt-1 text-sm text-gray-500">Comece criando seu primeiro projeto</p>
                <div className="mt-6">
                  <button
                    onClick={createProject}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Criar Projeto
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow"
                  >
                    <div className="p-4 md:p-6">
                      <div className="flex items-center justify-between mb-3 md:mb-4">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(project.status)}`}
                        >
                          {project.status}
                        </span>
                        <div className="flex space-x-1 md:space-x-2">
                          <button
                            onClick={() => (window.location.href = `/editor/${project.id}`)}
                            className="p-1.5 md:p-0 text-blue-600 hover:text-blue-800"
                          >
                            <svg
                              className="w-4 h-4 md:w-5 md:h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                          </button>
                          <button
                            onClick={() => deleteProject(project.id)}
                            className="p-1.5 md:p-0 text-red-600 hover:text-red-800"
                          >
                            <svg
                              className="w-4 h-4 md:w-5 md:h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>

                      <h3 className="text-base md:text-lg font-medium text-gray-900 mb-2 truncate">
                        {project.title}
                      </h3>
                      <p className="text-gray-600 text-xs md:text-sm mb-3 md:mb-4 line-clamp-2">
                        {project.description || 'Sem descrição'}
                      </p>

                      <div className="flex items-center justify-between text-xs md:text-sm text-gray-500">
                        <span>
                          {project._count.videos} vídeo{project._count.videos !== 1 ? 's' : ''}
                        </span>
                        <span>{new Date(project.createdAt).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {selectedTab === 'videos' && <VideoGallery />}

        {selectedTab === 'analytics' && <AnalyticsDashboard stats={stats} />}
      </div>
    </div>
  );
}

function VideoGallery() {
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      const response = await fetch('/api/user/videos');
      if (response.ok) {
        const data = await response.json();
        setVideos(data.videos);
      }
    } catch (error) {
      console.error('Erro ao buscar vídeos:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Carregando vídeos...</div>;
  }

  return (
    <div>
      <h2 className="text-lg font-medium text-gray-900 mb-6">Meus Vídeos</h2>
      {videos.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500">Nenhum vídeo encontrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((video) => (
            <div key={video.id} className="bg-white rounded-lg shadow overflow-hidden">
              {video.thumbnail && (
                <img src={video.thumbnail} alt={video.title} className="w-full h-48 object-cover" />
              )}
              <div className="p-4">
                <h3 className="font-medium text-gray-900 mb-2">{video.title}</h3>
                {video.duration && (
                  <p className="text-sm text-gray-500 mb-2">
                    Duração: {Math.floor(video.duration / 60)}:
                    {(video.duration % 60).toString().padStart(2, '0')}
                  </p>
                )}
                {video.url && (
                  <a
                    href={video.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Assistir →
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AnalyticsDashboard({ stats }: { stats: Stats | null }) {
  return (
    <div>
      <h2 className="text-lg font-medium text-gray-900 mb-6">Analytics</h2>

      {!stats ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500">Carregando analytics...</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-md font-medium text-gray-900 mb-4">Resumo de Produção</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-600 font-medium">Vídeos Concluídos</p>
                <p className="text-2xl font-bold text-green-900">{stats.completedVideos}</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-600 font-medium">Em Processamento</p>
                <p className="text-2xl font-bold text-blue-900">{stats.processingVideos}</p>
              </div>
              <div className="p-4 bg-red-50 rounded-lg">
                <p className="text-sm text-red-600 font-medium">Falhas</p>
                <p className="text-2xl font-bold text-red-900">{stats.failedVideos}</p>
              </div>
              <div className="p-4 bg-yellow-50 rounded-lg">
                <p className="text-sm text-yellow-600 font-medium">Tempo Total</p>
                <p className="text-2xl font-bold text-yellow-900">
                  {Math.floor(stats.totalDuration / 60)}min
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-md font-medium text-gray-900 mb-4">Performance</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">Taxa de Sucesso</span>
                  <span className="text-sm text-gray-600">
                    {stats.totalVideos > 0
                      ? Math.round((stats.completedVideos / stats.totalVideos) * 100)
                      : 0}
                    %
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{
                      width: `${
                        stats.totalVideos > 0
                          ? (stats.completedVideos / stats.totalVideos) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
