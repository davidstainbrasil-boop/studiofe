/**
 * 📊 Usage Limits Hook
 * Client-side hook for checking and displaying usage limits
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

interface UsageResource {
  used: number;
  limit: number;
  percent: number;
}

interface UsageSummary {
  plan: string;
  resources: {
    projects: UsageResource;
    storage: UsageResource;
    videoMinutes: UsageResource;
    exports: UsageResource;
  };
}

interface UseUsageLimitsResult {
  usage: UsageSummary | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  checkLimit: (resource: 'projects' | 'storage' | 'videoMinutes' | 'exports') => UsageLimitCheck;
}

interface UsageLimitCheck {
  allowed: boolean;
  nearLimit: boolean; // Over 80% used
  percentUsed: number;
  message?: string;
}

export function useUsageLimits(): UseUsageLimitsResult {
  const { data: session } = useSession();
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsage = useCallback(async () => {
    if (!session?.user) {
      setUsage(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/usage');
      
      if (!response.ok) {
        throw new Error('Failed to fetch usage');
      }

      const data = await response.json();
      setUsage(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [session?.user]);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  const checkLimit = useCallback((resource: 'projects' | 'storage' | 'videoMinutes' | 'exports'): UsageLimitCheck => {
    if (!usage) {
      return {
        allowed: true,
        nearLimit: false,
        percentUsed: 0
      };
    }

    const resourceData = usage.resources[resource];
    
    // -1 means unlimited
    if (resourceData.limit === -1) {
      return {
        allowed: true,
        nearLimit: false,
        percentUsed: 0
      };
    }

    const percentUsed = resourceData.percent;
    const allowed = resourceData.used < resourceData.limit;
    const nearLimit = percentUsed >= 80;

    return {
      allowed,
      nearLimit,
      percentUsed,
      message: !allowed 
        ? `You've reached your ${resource} limit. Upgrade to continue.`
        : nearLimit 
          ? `You're using ${percentUsed}% of your ${resource} limit.`
          : undefined
    };
  }, [usage]);

  return {
    usage,
    isLoading,
    error,
    refresh: fetchUsage,
    checkLimit
  };
}
