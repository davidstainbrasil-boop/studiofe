'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface Video {
  id: string;
  title: string;
  description?: string;
  url?: string;
  thumbnail?: string;
  duration?: number;
  fileSize?: number;
  quality: 'LOW' | 'MEDIUM' | 'HIGH' | 'ULTRA';
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'ARCHIVED';
  createdAt: string;
  updatedAt: string;
  project?: {
    id: string;
    title: string;
  };
  _count: {
    shares: number;
  };
}

interface GalleryResponse {
  success: boolean;
  videos: Video[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  filters: {
    statuses: { status: string; _count: number }[];
    projects: { id: string; title: string }[];
  };
}

export default function VideoGallery() {
  const { data: session } = useSession();
  const [videos, setVideos] = useState<Video[]>([]);
  const [filteredVideos, setFilteredVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideos, setSelectedVideos] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<GalleryResponse['pagination'] | null>(null);
  const [availableFilters, setAvailableFilters] = useState<GalleryResponse['filters'] | null>(null);

  useEffect(() => {
    if (session) {
      fetchVideos();
    }
  }, [session, currentPage, searchQuery, statusFilter, projectFilter, sortBy, sortOrder]);

  const fetchVideos = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '12',
        search: searchQuery,
        status: statusFilter,
        sortBy,
        sortOrder,
        ...(projectFilter && { project: projectFilter }),
      });

      const response = await fetch(`/api/user/gallery?${params}`);

      if (response.ok) {
        const data: GalleryResponse = await response.json();
        setVideos(data.videos);
        setFilteredVideos(data.videos);
        setPagination(data.pagination);
        setAvailableFilters(data.filters);
      } else {
        console.error('Erro ao buscar vídeos');
      }
    } catch (error) {
      console.error('Erro ao buscar vídeos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const handleStatusFilter = (status: string) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  const handleProjectFilter = (projectId: string) => {
    setProjectFilter(projectId);
    setCurrentPage(1);
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  const toggleVideoSelection = (videoId: string) => {
    const newSelected = new Set(selectedVideos);
    if (newSelected.has(videoId)) {
      newSelected.delete(videoId);
    } else {
      newSelected.add(videoId);
    }
    setSelectedVideos(newSelected);
  };

  const selectAllVideos = () => {
    if (selectedVideos.size === filteredVideos.length) {
      setSelectedVideos(new Set());
    } else {
      setSelectedVideos(new Set(filteredVideos.map((v) => v.id)));
    }
  };

  const deleteSelectedVideos = async () => {
    if (selectedVideos.size === 0) return;

    if (!confirm(`Tem certeza que deseja arquivar ${selectedVideos.size} vídeo(s)?`)) return;

    try {
      const response = await fetch('/api/user/gallery', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ids: Array.from(selectedVideos),
        }),
      });

      if (response.ok) {
        await fetchVideos();
        setSelectedVideos(new Set());
      } else {
        alert('Erro ao arquivar vídeos');
      }
    } catch (error) {
      alert('Erro ao arquivar vídeos');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'PROCESSING':
        return 'bg-blue-100 text-blue-800';
      case 'FAILED':
        return 'bg-red-100 text-red-800';
      case 'ARCHIVED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '--:--';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-- MB';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'Concluído';
      case 'PROCESSING':
        return 'Processando';
      case 'FAILED':
        return 'Falhou';
      case 'ARCHIVED':
        return 'Arquivado';
      default:
        return status;
    }
  };

  const getQualityLabel = (quality: string) => {
    switch (quality) {
      case 'LOW':
        return 'Baixa';
      case 'MEDIUM':
        return 'Média';
      case 'HIGH':
        return 'Alta';
      case 'ULTRA':
        return 'Ultra';
      default:
        return quality;
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Acesso Restrito</h1>
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
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Minha Galeria de Vídeos</h1>
            </div>
            <button
              onClick={() => (window.location.href = '/dashboard')}
              className="text-blue-600 hover:text-blue-800"
            >
              ← Voltar ao Dashboard
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Buscar</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Buscar vídeos..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => handleStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos</option>
                <option value="PROCESSING">Processando</option>
                <option value="COMPLETED">Concluídos</option>
                <option value="FAILED">Falharam</option>
              </select>
            </div>

            {/* Project Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Projeto</label>
              <select
                value={projectFilter}
                onChange={(e) => handleProjectFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos os projetos</option>
                {availableFilters?.projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ordenar por</label>
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => handleSort(e.target.value.split('-')[0])}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="createdAt-desc">Mais recentes</option>
                <option value="createdAt-asc">Mais antigos</option>
                <option value="title-asc">Título (A-Z)</option>
                <option value="title-desc">Título (Z-A)</option>
                <option value="duration-desc">Duração (maior)</option>
                <option value="duration-asc">Duração (menor)</option>
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={
                    selectedVideos.size === filteredVideos.length && filteredVideos.length > 0
                  }
                  onChange={selectAllVideos}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Selecionar todos ({selectedVideos.size}/{filteredVideos.length})
                </span>
              </label>

              {selectedVideos.size > 0 && (
                <button
                  onClick={deleteSelectedVideos}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Arquivar Selecionados
                </button>
              )}
            </div>

            <div className="text-sm text-gray-600">{pagination?.total || 0} vídeos encontrados</div>
          </div>
        </div>

        {/* Video Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Carregando vídeos...</p>
          </div>
        ) : filteredVideos.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <svg
              className="mx-auto h-12 w-12 text-gray-400 mb-4"
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
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum vídeo encontrado</h3>
            <p className="text-gray-600">Tente ajustar os filtros ou criar um novo vídeo</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredVideos.map((video) => (
              <div
                key={video.id}
                className="bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="relative">
                  {/* Thumbnail */}
                  <div className="aspect-video bg-gray-200 relative">
                    {video.thumbnail ? (
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg
                          className="w-12 h-12 text-gray-400"
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
                    )}

                    {/* Status Badge */}
                    <span
                      className={`absolute top-2 right-2 px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(video.status)}`}
                    >
                      {getStatusLabel(video.status)}
                    </span>

                    {/* Selection Checkbox */}
                    <div className="absolute top-2 left-2">
                      <input
                        type="checkbox"
                        checked={selectedVideos.has(video.id)}
                        onChange={() => toggleVideoSelection(video.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 bg-white"
                      />
                    </div>

                    {/* Play Button Overlay */}
                    {video.url && video.status === 'COMPLETED' && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 hover:bg-opacity-30 transition-all">
                        <a
                          href={video.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-white bg-blue-600 rounded-full p-3 hover:bg-blue-700 transition-colors"
                        >
                          <svg
                            className="w-6 h-6"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Video Info */}
                <div className="p-4">
                  <h3 className="font-medium text-gray-900 mb-1 truncate">{video.title}</h3>

                  {video.description && (
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">{video.description}</p>
                  )}

                  {video.project && (
                    <p className="text-xs text-blue-600 mb-2">📁 {video.project.title}</p>
                  )}

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center space-x-3">
                      <span>⏱️ {formatDuration(video.duration)}</span>
                      <span>💾 {formatFileSize(video.fileSize)}</span>
                      <span>🎯 {getQualityLabel(video.quality)}</span>
                    </div>
                    <span>{new Date(video.createdAt).toLocaleDateString('pt-BR')}</span>
                  </div>

                  {video._count.shares > 0 && (
                    <div className="mt-2 text-xs text-gray-600">
                      🔗 Compartilhado {video._count.shares} vez(es)
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-center space-x-2 mt-8">
            <button
              onClick={() => setCurrentPage(pagination.page - 1)}
              disabled={!pagination.hasPrev}
              className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ←
            </button>

            <span className="px-4 py-2">
              Página {pagination.page} de {pagination.pages}
            </span>

            <button
              onClick={() => setCurrentPage(pagination.page + 1)}
              disabled={!pagination.hasNext}
              className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
