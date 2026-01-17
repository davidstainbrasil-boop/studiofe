'use client';

import { useState, useEffect } from 'react';

interface ServiceHealth {
    status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
    latency: number;
    error?: string;
}

interface HealthData {
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    checks: Record<string, ServiceHealth>;
    version: string;
    environment: string;
    uptime: number;
}

export function SystemStatusDashboard() {
    const [health, setHealth] = useState<HealthData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchHealth = async (full = true) => {
        try {
            setLoading(true);
            const response = await fetch(`/api/health${full ? '?full=true' : ''}`);
            const data = await response.json();
            setHealth(data);
            setError(null);
        } catch (err) {
            setError('Failed to fetch health status');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHealth();
        const interval = setInterval(() => fetchHealth(), 30000); // Every 30s
        return () => clearInterval(interval);
    }, []);

    const formatUptime = (ms: number) => {
        const hours = Math.floor(ms / 3600000);
        const minutes = Math.floor((ms % 3600000) / 60000);
        return `${hours}h ${minutes}m`;
    };

    const StatusBadge = ({ status }: { status: string }) => {
        const colors = {
            healthy: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
            degraded: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
            unhealthy: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
            unknown: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
        };

        const icons = {
            healthy: '✓',
            degraded: '⚠',
            unhealthy: '✗',
            unknown: '?'
        };

        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status as keyof typeof colors] || colors.unknown}`}>
                <span className="mr-1">{icons[status as keyof typeof icons] || '?'}</span>
                {status}
            </span>
        );
    };

    if (loading && !health) {
        return (
            <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow animate-pulse">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
                <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    ))}
                </div>
            </div>
        );
    }

    if (error && !health) {
        return (
            <div className="p-6 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <p className="text-red-600 dark:text-red-400">{error}</p>
                <button
                    onClick={() => fetchHealth()}
                    className="mt-2 text-sm text-red-600 hover:text-red-800"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        🖥️ System Status
                        <StatusBadge status={health?.status || 'unknown'} />
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        v{health?.version} • {health?.environment} • Uptime: {formatUptime(health?.uptime || 0)}
                    </p>
                </div>
                <button
                    onClick={() => fetchHealth()}
                    disabled={loading}
                    className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                >
                    {loading ? 'Checking...' : 'Refresh'}
                </button>
            </div>

            {/* Services Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {health && Object.entries(health.checks).map(([name, service]) => (
                    <div
                        key={name}
                        className={`p-4 rounded-lg border ${service.status === 'healthy' ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20' :
                                service.status === 'degraded' ? 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20' :
                                    service.status === 'unhealthy' ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20' :
                                        'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/20'
                            }`}
                    >
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-medium capitalize">
                                    {name.replace(/_/g, ' ')}
                                </h3>
                                {service.error && (
                                    <p className="text-xs text-gray-500 mt-1">{service.error}</p>
                                )}
                            </div>
                            <div className="text-right">
                                <StatusBadge status={service.status} />
                                {service.latency > 0 && (
                                    <p className="text-xs text-gray-400 mt-1">{service.latency}ms</p>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Last Updated */}
            <p className="text-xs text-gray-400 mt-4 text-right">
                Last checked: {health?.timestamp ? new Date(health.timestamp).toLocaleTimeString() : 'N/A'}
            </p>
        </div>
    );
}

export default SystemStatusDashboard;
