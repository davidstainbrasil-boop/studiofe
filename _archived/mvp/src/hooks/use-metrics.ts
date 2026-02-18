import useSWR from 'swr';

interface DashboardMetrics {
  totalProjects: number;
  activeProjects: number;
  totalRenders: number;
  completedRenders: number;
  failedRenders: number;
  renderSuccessRate: number;
  totalCollaborators: number;
}

interface ChartData {
  projectsByDay: Array<{ date: string; count: number }>;
  rendersByStatus: Array<{ status: string; count: number }>;
}

interface RecentProject {
  id: string;
  name: string;
  status: string;
  updatedAt: string;
  _count: { slides: number };
}

interface ActivityEntry {
  id: string;
  eventType: string;
  eventData: Record<string, unknown>;
  createdAt: string;
}

interface DashboardResponse {
  success: boolean;
  data: {
    metrics: DashboardMetrics;
    charts: ChartData;
    recentProjects: RecentProject[];
    recentActivity: ActivityEntry[];
    period: string;
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

/** Hook: dashboard analytics metrics */
export function useMetrics(period: '7d' | '30d' | '90d' = '30d') {
  const { data, error, isLoading } = useSWR<DashboardResponse>(
    `/api/analytics/dashboard?period=${period}`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30_000,
      refreshInterval: 60_000, // Auto-refresh every 60s
    }
  );

  return {
    metrics: data?.data.metrics ?? null,
    charts: data?.data.charts ?? null,
    recentProjects: data?.data.recentProjects ?? [],
    recentActivity: data?.data.recentActivity ?? [],
    period: data?.data.period ?? period,
    isLoading,
    error: error?.message,
  };
}
