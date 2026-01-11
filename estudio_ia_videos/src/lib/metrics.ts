
export const getMetricsSnapshot = async () => ({
  jobs: { active: 0, completed: 0, failed: 0 },
  system: { memory: 0, cpu: 0 }
});

export const getMetricsJson = async () => ({});
export const renderPrometheus = async () => '';
