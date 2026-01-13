
export const getMetricsSnapshot = async () => ({
  jobs: { active: 0, completed: 0, failed: 0 },
  system: { memory: 0, cpu: 0 }
});

export const getMetricsJson = async () => ({
  overview: {
    totalProjects: 0,
    completedProjects: 0,
    processingProjects: 0,
    totalDuration: 0,
    totalViews: 0,
    totalDownloads: 0,
    avgProcessingTime: 0
  },
  projectStatus: [],
  activity: {
    timeline: [],
    events: []
  },
  performance: {
    avgProcessingTime: 0,
    successRate: 0,
    cacheHitRate: 0
  },
  period: 'month',
  dateRange: {
    start: new Date().toISOString(),
    end: new Date().toISOString()
  }
});

export const renderPrometheus = async () => '# No metrics available';
