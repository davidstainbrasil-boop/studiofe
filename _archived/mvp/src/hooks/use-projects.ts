import useSWR, { mutate } from 'swr';
import { useCallback } from 'react';
import { useProjectStore, type ProjectItem } from '@/lib/stores/project-store';

interface ProjectListResponse {
  success: boolean;
  data: ProjectItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface ProjectDetailResponse {
  success: boolean;
  data: ProjectItem & {
    slides: Array<{
      id: string;
      title: string;
      orderIndex: number;
      thumbnailUrl: string | null;
      duration: number | null;
      hasAudio: boolean;
    }>;
    collaborators: Array<{
      id: string;
      role: string;
      user: { id: string; name: string | null; email: string; avatarUrl: string | null };
    }>;
    renderJobs: Array<{
      id: string;
      status: string;
      progress: number;
      outputUrl: string | null;
      createdAt: string;
      completedAt: string | null;
    }>;
    user: { id: string; name: string | null; email: string; avatarUrl: string | null };
    _count: {
      slides: number;
      collaborators: number;
      renderJobs: number;
      versions: number;
    };
  };
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }
  return res.json();
};

function buildProjectsUrl(filters: {
  search: string;
  status: string | null;
  page: number;
  limit: number;
}): string {
  const params = new URLSearchParams();
  params.set('page', String(filters.page));
  params.set('limit', String(filters.limit));
  if (filters.search) params.set('search', filters.search);
  if (filters.status) params.set('status', filters.status);
  return `/api/projects?${params.toString()}`;
}

/** Hook: list projects with filters from Zustand store */
export function useProjects() {
  const filters = useProjectStore((s) => s.filters);
  const url = buildProjectsUrl(filters);

  const { data, error, isLoading, isValidating } = useSWR<ProjectListResponse>(
    url,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
  );

  const refresh = useCallback(() => {
    mutate(url);
  }, [url]);

  return {
    projects: data?.data ?? [],
    meta: data?.meta ?? { total: 0, page: 1, limit: 20, totalPages: 0 },
    isLoading,
    isValidating,
    error: error?.message,
    refresh,
  };
}

/** Hook: single project detail */
export function useProject(projectId: string | null) {
  const { data, error, isLoading, isValidating } = useSWR<ProjectDetailResponse>(
    projectId ? `/api/projects/${projectId}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
    }
  );

  const refresh = useCallback(() => {
    if (projectId) mutate(`/api/projects/${projectId}`);
  }, [projectId]);

  return {
    project: data?.data ?? null,
    isLoading,
    isValidating,
    error: error?.message,
    refresh,
  };
}

/** Mutations for projects */
export function useProjectMutations() {
  const createProject = useCallback(
    async (data: { name: string; description?: string; type?: string }) => {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create project');
      // Revalidate project list
      mutate((key: string) => typeof key === 'string' && key.startsWith('/api/projects'), undefined, { revalidate: true });
      return json.data;
    },
    []
  );

  const updateProject = useCallback(
    async (id: string, data: Record<string, unknown>) => {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update project');
      mutate(`/api/projects/${id}`);
      mutate((key: string) => typeof key === 'string' && key.startsWith('/api/projects?'), undefined, { revalidate: true });
      return json.data;
    },
    []
  );

  const deleteProject = useCallback(async (id: string) => {
    const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to delete project');
    mutate((key: string) => typeof key === 'string' && key.startsWith('/api/projects'), undefined, { revalidate: true });
  }, []);

  return { createProject, updateProject, deleteProject };
}
