/**
 * PM2 Ecosystem Configuration
 *
 * Main application configuration with cache warming on startup
 */

module.exports = {
  apps: [
    {
      name: 'mvp-video',
      script: './estudio_ia_videos/server.js',
      cwd: '/root/_MVP_Video_TecnicoCursos_v7',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: '/var/log/pm2/mvp-video-error.log',
      out_file: '/var/log/pm2/mvp-video-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      listen_timeout: 10000,
      kill_timeout: 5000,
    }
  ]
};
