'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  Server,
  Database,
  Cpu,
  HardDrive,
  Wifi,
  WifiOff,
  CheckCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Clock,
  Zap,
  Cloud,
  CloudOff,
} from 'lucide-react';

// Types
type ServiceStatus = 'healthy' | 'degraded' | 'down' | 'unknown';

interface ServiceHealth {
  name: string;
  status: ServiceStatus;
  latency?: number;
  message?: string;
  lastCheck: string;
}

interface SystemMetric {
  label: string;
  value: number;
  max: number;
  unit: string;
  icon: React.ReactNode;
  color: string;
}

interface SystemStatusPanelProps {
  className?: string;
  compact?: boolean;
}

// Status configurations
const statusConfig: Record<ServiceStatus, { icon: typeof CheckCircle; color: string; bgColor: string; label: string }> = {
  healthy: { icon: CheckCircle, color: 'text-green-500', bgColor: 'bg-green-100 dark:bg-green-900/30', label: 'Operacional' },
  degraded: { icon: AlertTriangle, color: 'text-yellow-500', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30', label: 'Degradado' },
  down: { icon: XCircle, color: 'text-red-500', bgColor: 'bg-red-100 dark:bg-red-900/30', label: 'Indisponível' },
  unknown: { icon: Activity, color: 'text-gray-500', bgColor: 'bg-gray-100 dark:bg-gray-900/30', label: 'Verificando...' },
};

// Helper functions
function formatLatency(ms?: number): string {
  if (ms === undefined) return '-';
  if (ms < 100) return `${ms}ms ⚡`;
  if (ms < 500) return `${ms}ms`;
  return `${ms}ms ⚠️`;
}

function getOverallStatus(services: ServiceHealth[]): ServiceStatus {
  if (services.some(s => s.status === 'down')) return 'down';
  if (services.some(s => s.status === 'degraded')) return 'degraded';
  if (services.every(s => s.status === 'healthy')) return 'healthy';
  return 'unknown';
}

// Components
function ServiceCard({ service }: { service: ServiceHealth }) {
  const config = statusConfig[service.status];
  const StatusIcon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`p-4 rounded-lg ${config.bgColor} transition-all`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <StatusIcon className={`w-5 h-5 ${config.color}`} />
          <div>
            <p className="font-medium text-gray-900 dark:text-white text-sm">
              {service.name}
            </p>
            <p className="text-xs text-gray-500">
              {service.message || config.label}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs font-mono text-gray-600 dark:text-gray-400">
            {formatLatency(service.latency)}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function MetricBar({ metric }: { metric: SystemMetric }) {
  const percentage = Math.min((metric.value / metric.max) * 100, 100);
  const isWarning = percentage > 80;
  const isCritical = percentage > 95;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {metric.icon}
          <span className="text-sm text-gray-600 dark:text-gray-400">{metric.label}</span>
        </div>
        <span className={`text-sm font-medium ${
          isCritical ? 'text-red-500' : isWarning ? 'text-yellow-500' : 'text-gray-700 dark:text-gray-300'
        }`}>
          {metric.value.toFixed(1)} / {metric.max} {metric.unit}
        </span>
      </div>
      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5 }}
          className={`h-full rounded-full ${
            isCritical ? 'bg-red-500' : isWarning ? 'bg-yellow-500' : metric.color
          }`}
        />
      </div>
    </div>
  );
}

// Main component
export function SystemStatusPanel({ className = '', compact = false }: SystemStatusPanelProps) {
  const [services, setServices] = useState<ServiceHealth[]>([]);
  const [metrics, setMetrics] = useState<SystemMetric[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const checkServices = useCallback(async () => {
    setIsRefreshing(true);
    
    // Check if online
    setIsOnline(navigator.onLine);

    // Simulated service checks (replace with real health check API calls)
    const serviceChecks: ServiceHealth[] = [
      {
        name: 'API Principal',
        status: 'healthy',
        latency: Math.floor(Math.random() * 100) + 20,
        lastCheck: new Date().toISOString(),
      },
      {
        name: 'Banco de Dados',
        status: 'healthy',
        latency: Math.floor(Math.random() * 50) + 10,
        lastCheck: new Date().toISOString(),
      },
      {
        name: 'Fila de Renderização',
        status: Math.random() > 0.9 ? 'degraded' : 'healthy',
        latency: Math.floor(Math.random() * 200) + 50,
        message: Math.random() > 0.9 ? 'Alta latência' : undefined,
        lastCheck: new Date().toISOString(),
      },
      {
        name: 'Storage (Supabase)',
        status: 'healthy',
        latency: Math.floor(Math.random() * 150) + 30,
        lastCheck: new Date().toISOString(),
      },
      {
        name: 'TTS (ElevenLabs)',
        status: 'healthy',
        latency: Math.floor(Math.random() * 300) + 100,
        lastCheck: new Date().toISOString(),
      },
      {
        name: 'FFmpeg Workers',
        status: 'healthy',
        latency: Math.floor(Math.random() * 80) + 20,
        lastCheck: new Date().toISOString(),
      },
    ];

    setServices(serviceChecks);

    // System metrics (simulated)
    const systemMetrics: SystemMetric[] = [
      {
        label: 'CPU',
        value: Math.random() * 40 + 20,
        max: 100,
        unit: '%',
        icon: <Cpu className="w-4 h-4 text-gray-500" />,
        color: 'bg-blue-500',
      },
      {
        label: 'Memória',
        value: Math.random() * 2 + 1.5,
        max: 4,
        unit: 'GB',
        icon: <Server className="w-4 h-4 text-gray-500" />,
        color: 'bg-purple-500',
      },
      {
        label: 'Storage',
        value: 2.4,
        max: 10,
        unit: 'GB',
        icon: <HardDrive className="w-4 h-4 text-gray-500" />,
        color: 'bg-indigo-500',
      },
      {
        label: 'Fila',
        value: Math.floor(Math.random() * 5),
        max: 50,
        unit: 'jobs',
        icon: <Zap className="w-4 h-4 text-gray-500" />,
        color: 'bg-emerald-500',
      },
    ];

    setMetrics(systemMetrics);
    setLastUpdate(new Date());
    setIsRefreshing(false);
  }, []);

  useEffect(() => {
    checkServices();

    // Auto-refresh every 30 seconds
    const interval = setInterval(checkServices, 30000);

    // Online/offline listeners
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [checkServices]);

  const overallStatus = getOverallStatus(services);
  const overallConfig = statusConfig[overallStatus];
  const OverallIcon = overallConfig.icon;

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <OverallIcon className={`w-4 h-4 ${overallConfig.color}`} />
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {overallConfig.label}
        </span>
        {!isOnline && (
          <WifiOff className="w-4 h-4 text-red-500 ml-2" />
        )}
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${overallConfig.bgColor}`}>
              <OverallIcon className={`w-5 h-5 ${overallConfig.color}`} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Status do Sistema
              </h3>
              <p className="text-sm text-gray-500">
                {overallConfig.label}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!isOnline && (
              <div className="flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-900/30 rounded-full">
                <WifiOff className="w-3 h-3 text-red-500" />
                <span className="text-xs text-red-600 dark:text-red-400">Offline</span>
              </div>
            )}

            <button
              onClick={checkServices}
              disabled={isRefreshing}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 text-gray-500 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Services Grid */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
          Serviços
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <AnimatePresence>
            {services.map((service) => (
              <ServiceCard key={service.name} service={service} />
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* System Metrics */}
      <div className="p-4">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-4">
          Recursos do Sistema
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {metrics.map((metric) => (
            <MetricBar key={metric.label} metric={metric} />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 rounded-b-xl">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>
              Atualizado {lastUpdate.toLocaleTimeString('pt-BR')}
            </span>
          </div>
          <span>Atualização automática a cada 30s</span>
        </div>
      </div>
    </div>
  );
}

export default SystemStatusPanel;
