// Analytics Components Barrel Export

// Dashboards
export { default as AnalyticsDashboard } from './analytics-dashboard';
export { default as RealAnalyticsDashboard } from './real-analytics-dashboard';
export { default as AdvancedDashboard } from './advanced-dashboard';
export { default as BusinessIntelligenceDashboard } from './business-intelligence-dashboard';
export { default as RealTimeAnalytics } from './real-time-analytics';
export { default as RealTimeAnalyticsReal } from './real-time-analytics-real';

// Sub-components
export { default as MetricsCards } from './metrics-cards';
export { default as ChartsSection } from './charts-section';
export { default as ProjectsTable } from './projects-table';
export { default as DateRangeFilter } from './date-range-filter';
export { default as DataExport } from './data-export';
export { default as ContentAnalysisEngine } from './content-analysis-engine';

// Charts exports (named exports)
export * from './charts';

// System status
export { SystemStatusPanel } from './system-status-panel';

// Legacy export for backwards compatibility
export { default as AnalyticsDashboardLegacy } from './AnalyticsDashboard';
