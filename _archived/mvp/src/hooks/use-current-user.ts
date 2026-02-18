'use client';

import useSWR from 'swr';

interface CurrentUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: string;
  planTier: string;
  createdAt: string;
  _count?: {
    projects: number;
    renderJobs: number;
  };
}

interface UseCurrentUserReturn {
  user: CurrentUser | null;
  isLoading: boolean;
  isAdmin: boolean;
  error: Error | undefined;
  mutate: () => void;
}

const fetcher = (url: string) =>
  fetch(url).then(async (res) => {
    if (!res.ok) throw new Error('Failed to fetch user');
    const json = await res.json();
    return json.data ?? null;
  });

/**
 * Client-side hook to get the current user profile including role.
 * Uses SWR for caching — avoids redundant requests across components.
 * Consumes GET /api/me (canonical user profile endpoint).
 */
export function useCurrentUser(): UseCurrentUserReturn {
  const { data, error, isLoading, mutate } = useSWR<CurrentUser | null>(
    '/api/me',
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30_000, // 30s dedup
    }
  );

  return {
    user: data ?? null,
    isLoading,
    isAdmin: data?.role === 'admin',
    error,
    mutate: () => { mutate(); },
  };
}
