'use client';

import { useState, useEffect } from 'react';

interface QuotaInfo {
    service: string;
    used: number;
    total: number;
    remaining: number;
    percentage: number;
    warning: boolean;
    critical: boolean;
    resetDate?: string;
}

interface AllQuotas {
    did: QuotaInfo | null;
    heygen: QuotaInfo | null;
    elevenlabs: QuotaInfo | null;
    azure: QuotaInfo | null;
    lastUpdated: string;
    hasWarnings: boolean;
    hasCritical: boolean;
}

export function APIQuotaDisplay() {
    const [quotas, setQuotas] = useState<AllQuotas | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchQuotas = async (refresh = false) => {
        try {
            setLoading(true);
            const response = await fetch(`/api/quotas${refresh ? '?refresh=true' : ''}`);
            const data = await response.json();
            if (data.success) {
                setQuotas(data.data);
                setError(null);
            } else {
                setError(data.error);
            }
        } catch (err) {
            setError('Failed to fetch quotas');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQuotas();
        // Auto-refresh every 5 minutes
        const interval = setInterval(() => fetchQuotas(), 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    const QuotaBar = ({ quota }: { quota: QuotaInfo }) => {
        const usedPercent = 100 - ((quota.remaining / quota.total) * 100);
        const barColor = quota.critical ? 'bg-red-500' : quota.warning ? 'bg-yellow-500' : 'bg-green-500';

        return (
            <div className="mb-4">
                <div className="flex justify-between items-center mb-1">
                    <span className="font-medium text-sm">{quota.service}</span>
                    <span className="text-xs text-gray-500">
                        {quota.remaining.toLocaleString()} / {quota.total.toLocaleString()}
                    </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                    <div
                        className={`h-2.5 rounded-full ${barColor} transition-all duration-300`}
                        style={{ width: `${usedPercent}%` }}
                    />
                </div>
                {quota.critical && (
                    <p className="text-xs text-red-500 mt-1">⚠️ Quota crítica! Considere upgrade.</p>
                )}
                {quota.resetDate && (
                    <p className="text-xs text-gray-400 mt-1">
                        Reset: {new Date(quota.resetDate).toLocaleDateString()}
                    </p>
                )}
            </div>
        );
    };

    if (loading && !quotas) {
        return (
            <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
                <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                    <div className="h-2 bg-gray-200 rounded mb-2"></div>
                    <div className="h-2 bg-gray-200 rounded mb-2"></div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            </div>
        );
    }

    return (
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-lg flex items-center">
                    📊 API Quotas
                    {quotas?.hasCritical && <span className="ml-2 text-red-500">🔴</span>}
                    {quotas?.hasWarnings && !quotas?.hasCritical && <span className="ml-2 text-yellow-500">🟡</span>}
                </h3>
                <button
                    onClick={() => fetchQuotas(true)}
                    className="text-xs text-blue-500 hover:text-blue-700"
                    disabled={loading}
                >
                    {loading ? 'Atualizando...' : 'Atualizar'}
                </button>
            </div>

            {quotas?.did && <QuotaBar quota={quotas.did} />}
            {quotas?.heygen && <QuotaBar quota={quotas.heygen} />}
            {quotas?.elevenlabs && <QuotaBar quota={quotas.elevenlabs} />}
            {quotas?.azure && <QuotaBar quota={quotas.azure} />}

            <p className="text-xs text-gray-400 mt-2">
                Última atualização: {quotas?.lastUpdated ? new Date(quotas.lastUpdated).toLocaleTimeString() : 'N/A'}
            </p>
        </div>
    );
}

export default APIQuotaDisplay;
