'use client';

import { useState, useEffect, useCallback } from 'react';

// Types
interface AnalyticsOverview {
  totalProjects: number;
  totalVideos: number;
  totalDuration: number;
  totalStorage: number;
  renderSuccessRate: number;
  avgRenderTime: number;
  activeProjects: number;
}

interface TrendData {
  date: string;
  videos: number;
  renders: number;
  views?: number;
}

interface TopNR {
  nr: string;
  count: number;
}

interface AnalyticsResponse {
  overview: AnalyticsOverview;
  trends: TrendData[];
  topNRs: TopNR[];
  comparison: {
    videos: {
      current: number;
      previous: number;
      trend: number;
    };
  };
  period: string;
  generatedAt: string;
}

interface RenderJob {
  id: string;
  projectName: string;
  status: 'completed' | 'failed' | 'processing' | 'queued' | 'cancelled';
  duration: number;
  slidesCount: number;
  outputSize?: number;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
}

interface RenderStats {
  total: number;
  completed: number;
  failed: number;
  processing: number;
  queued: number;
  avgDuration: number;
  totalDuration: number;
  successRate: number;
}

interface RenderJobsResponse {
  jobs: RenderJob[];
  stats: RenderStats;
  dailyData: Array<{ date: string; completed: number; failed: number }>;
  topErrors: Array<{ message: string; count: number }>;
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  period: string;
}

// Hook for Analytics Overview
export function useAnalyticsOverview(period: '7d' | '30d' | '90d' = '30d') {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/analytics/overview?period=${period}`);
      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}

// Hook for Render Jobs Analytics
export function useRenderJobsAnalytics(options: {
  period?: '7d' | '30d' | '90d';
  status?: string;
  limit?: number;
  offset?: number;
} = {}) {
  const { period = '30d', status, limit = 20, offset = 0 } = options;
  
  const [data, setData] = useState<RenderJobsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        period,
        limit: limit.toString(),
        offset: offset.toString(),
        ...(status && { status }),
      });

      const response = await fetch(`/api/analytics/render-jobs?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch render jobs');
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [period, status, limit, offset]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}

// Hook for User Profile
export function useUserProfile() {
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/user/profile');
      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }
      const result = await response.json();
      setProfile(result.profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateProfile = useCallback(async (updates: Record<string, unknown>) => {
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update profile');
      }
      
      const result = await response.json();
      setProfile(result.profile);
      return result;
    } catch (err) {
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return { profile, isLoading, error, refetch: fetchProfile, updateProfile };
}

// Hook for User Preferences
export function useUserPreferences() {
  const [preferences, setPreferences] = useState<Record<string, unknown> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPreferences = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/user/preferences');
      if (!response.ok) {
        throw new Error('Failed to fetch preferences');
      }
      const result = await response.json();
      setPreferences(result.preferences);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updatePreferences = useCallback(async (updates: Record<string, unknown>) => {
    try {
      const response = await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update preferences');
      }
      
      const result = await response.json();
      setPreferences(result.preferences);
      return result;
    } catch (err) {
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  return { preferences, isLoading, error, refetch: fetchPreferences, updatePreferences };
}

// Hook for Assets Management
export function useAssets(options: {
  type?: string;
  folder?: string;
  search?: string;
  favoriteOnly?: boolean;
  limit?: number;
  offset?: number;
} = {}) {
  const { type, folder, search, favoriteOnly, limit = 50, offset = 0 } = options;
  
  const [assets, setAssets] = useState<unknown[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [typeCounts, setTypeCounts] = useState<Record<string, number>>({});
  const [pagination, setPagination] = useState({ total: 0, hasMore: false });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAssets = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
        ...(type && { type }),
        ...(folder && { folder }),
        ...(search && { search }),
        ...(favoriteOnly && { favorite: 'true' }),
      });

      const response = await fetch(`/api/assets?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch assets');
      }
      const result = await response.json();
      setAssets(result.assets);
      setFolders(result.folders);
      setTypeCounts(result.typeCounts);
      setPagination({ total: result.pagination.total, hasMore: result.pagination.hasMore });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [type, folder, search, favoriteOnly, limit, offset]);

  const updateAsset = useCallback(async (id: string, updates: Record<string, unknown>) => {
    try {
      const response = await fetch('/api/assets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update asset');
      }
      
      // Refresh assets
      await fetchAssets();
      return await response.json();
    } catch (err) {
      throw err;
    }
  }, [fetchAssets]);

  const deleteAsset = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/assets?id=${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete asset');
      }
      
      // Refresh assets
      await fetchAssets();
      return await response.json();
    } catch (err) {
      throw err;
    }
  }, [fetchAssets]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  return {
    assets,
    folders,
    typeCounts,
    pagination,
    isLoading,
    error,
    refetch: fetchAssets,
    updateAsset,
    deleteAsset,
  };
}

export default {
  useAnalyticsOverview,
  useRenderJobsAnalytics,
  useUserProfile,
  useUserPreferences,
  useAssets,
};
