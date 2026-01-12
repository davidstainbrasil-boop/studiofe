module.exports = {
  apps: [
    {
      name: 'cleanup-cron',
      script: '/root/_MVP_Video_TecnicoCursos_v7/scripts/daily-cleanup.sh',
      cron_restart: '0 2 * * *',  // Daily at 2 AM
      autorestart: false,
      watch: false,
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
