import useSWR, { mutate } from 'swr';
import { useCallback, useState } from 'react';

// ---- Types ----

export interface RenderJobItem {
  id: string;
  status: string;
  progress: number;
  outputUrl: string | null;
  errorMsg: string | null;
  priority: number;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  project: {
    id: string;
    name: string;
  };
}

interface RenderJobsResponse {
  success: boolean;
  data: RenderJobItem[];
  summary: {
    total: number;
    completed: number;
    failed: number;
    processing: number;
  };
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface RenderJobDetailResponse {
  success: boolean;
  data: RenderJobItem & {
    config: Record<string, unknown> | null;
    user: { id: string; name: string | null; email: string };
  };
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
};

// ---- Hooks ----

/** Hook: list render jobs with pagination and status filter */
export function useRenderJobs(options?: {
  status?: string;
  page?: number;
  limit?: number;
  refreshInterval?: number;
}) {
  const { status, page = 1, limit = 20, refreshInterval = 10_000 } = options ?? {};

  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', String(limit));
  if (status && status !== 'all') params.set('status', status);
  const url = `/api/render/jobs?${params.toString()}`;

  const { data, error, isLoading, isValidating } = useSWR<RenderJobsResponse>(
    url,
    fetcher,
    {
      refreshInterval,
      revalidateOnFocus: false,
      dedupingInterval: 3000,
    }
  );

  const refresh = useCallback(() => {
    mutate(url);
  }, [url]);

  return {
    jobs: data?.data ?? [],
    summary: data?.summary ?? { total: 0, completed: 0, failed: 0, processing: 0 },
    meta: data?.meta ?? { total: 0, page: 1, limit: 20, totalPages: 0 },
    isLoading,
    isValidating,
    error: error?.message,
    refresh,
  };
}

/** Hook: single render job detail */
export function useRenderJob(jobId: string | null) {
  const { data, error, isLoading } = useSWR<RenderJobDetailResponse>(
    jobId ? `/api/render/jobs/${jobId}` : null,
    fetcher,
    {
      refreshInterval: 5_000,
      revalidateOnFocus: false,
    }
  );

  const refresh = useCallback(() => {
    if (jobId) mutate(`/api/render/jobs/${jobId}`);
  }, [jobId]);

  return {
    job: data?.data ?? null,
    isLoading,
    error: error?.message,
    refresh,
  };
}

/** Hook: cancel a render job */
export function useRenderJobActions() {
  const [cancelling, setCancelling] = useState<string | null>(null);

  const cancelJob = useCallback(async (jobId: string) => {
    setCancelling(jobId);
    try {
      const res = await fetch(`/api/render/jobs/${jobId}/cancel`, {
        method: 'POST',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to cancel job');
      // Revalidate all render job lists
      mutate(
        (key: string) => typeof key === 'string' && key.startsWith('/api/render/jobs'),
        undefined,
        { revalidate: true }
      );
      return json;
    } finally {
      setCancelling(null);
    }
  }, []);

  return { cancelJob, cancelling };
}
