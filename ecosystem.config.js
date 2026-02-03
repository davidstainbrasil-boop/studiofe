/**
 * PM2 Ecosystem Configuration - Production
 * MVP Vídeos TécnicoCursos v7
 * 
 * Features:
 * - Cluster mode for multi-core utilization
 * - Auto-restart on failure
 * - Log rotation
 * - Health monitoring
 * - Zero-downtime reload
 * 
 * Usage:
 *   pm2 start ecosystem.config.js --env production
 *   pm2 reload ecosystem.config.js --env production
 *   pm2 logs mvp-video-app
 */

module.exports = {
  apps: [
    // ================================
    // Main Next.js Application
    // ================================
    {
      name: 'mvp-video-app',
      script: 'npm',
      args: 'start',
      cwd: '/opt/mvp-videos/estudio_ia_videos',
      
      // Cluster mode for production
      instances: 'max',  // Use all CPU cores
      exec_mode: 'cluster',
      
      // Memory & restart settings
      max_memory_restart: '1G',
      max_restarts: 10,
      min_uptime: '30s',
      autorestart: true,
      
      // Watch settings (disabled in prod)
      watch: false,
      ignore_watch: ['node_modules', 'logs', '.next/cache'],
      
      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 10000,
      shutdown_with_message: true,
      wait_ready: true,
      
      // Environment - Production
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOST: '0.0.0.0',
        NEXT_TELEMETRY_DISABLED: '1',
      },
      
      // Environment - Staging
      env_staging: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOST: '0.0.0.0',
        DEBUG: 'app:*',
      },
      
      // Logging
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/var/log/pm2/mvp-video-app-error.log',
      out_file: '/var/log/pm2/mvp-video-app-out.log',
      merge_logs: true,
      log_type: 'json',
      
      // Source maps for error tracking
      source_map_support: true,
      
      // Health check (requires pm2 plus or custom implementation)
      health_check_interval: 30000,
      health_check_grace_period: 10000,
    },
    
    // ================================
    // Render Worker (Background Jobs)
    // ================================
    {
      name: 'mvp-video-worker',
      script: 'npm',
      args: 'run worker',
      cwd: '/opt/mvp-videos/estudio_ia_videos',
      
      // Single instance for worker
      instances: 1,
      exec_mode: 'fork',
      
      // Higher memory for video processing
      max_memory_restart: '4G',
      max_restarts: 5,
      min_uptime: '60s',
      autorestart: true,
      
      // Watch settings
      watch: false,
      
      // Graceful shutdown for long jobs
      kill_timeout: 300000,  // 5 minutes for video processing
      listen_timeout: 30000,
      
      // Environment
      env_production: {
        NODE_ENV: 'production',
        WORKER_CONCURRENCY: '3',
        REDIS_URL: 'redis://localhost:6379',
      },
      
      // Logging
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/var/log/pm2/mvp-video-worker-error.log',
      out_file: '/var/log/pm2/mvp-video-worker-out.log',
      merge_logs: true,
    },
    
    // ================================
    // Collaboration WebSocket Server
    // ================================
    {
      name: 'mvp-video-collab',
      script: 'npx',
      args: 'tsx scripts/collaboration-server.ts',
      cwd: '/opt/mvp-videos/estudio_ia_videos',
      
      instances: 1,
      exec_mode: 'fork',
      
      max_memory_restart: '512M',
      max_restarts: 10,
      min_uptime: '10s',
      autorestart: true,
      
      watch: false,
      
      kill_timeout: 5000,
      
      env_production: {
        NODE_ENV: 'production',
        COLLAB_PORT: '3001',
      },
      
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/var/log/pm2/mvp-video-collab-error.log',
      out_file: '/var/log/pm2/mvp-video-collab-out.log',
      merge_logs: true,
    },
    
    // ================================
    // Cron Jobs (Scheduled Tasks)
    // ================================
    {
      name: 'mvp-video-cron',
      script: 'npm',
      args: 'run cron',
      cwd: '/opt/mvp-videos/estudio_ia_videos',
      
      instances: 1,
      exec_mode: 'fork',
      cron_restart: '0 */6 * * *',  // Restart every 6 hours
      
      max_memory_restart: '256M',
      max_restarts: 5,
      autorestart: true,
      
      watch: false,
      
      env_production: {
        NODE_ENV: 'production',
      },
      
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/var/log/pm2/mvp-video-cron-error.log',
      out_file: '/var/log/pm2/mvp-video-cron-out.log',
      merge_logs: true,
    },
  ],

  // ================================
  // Deployment Configuration
  // ================================
  deploy: {
    production: {
      user: 'deploy',
      host: ['production-server.cursostecno.com.br'],
      ref: 'origin/main',
      repo: 'git@github.com:cursostecno/mvp-videos.git',
      path: '/opt/mvp-videos',
      
      // Pre-deploy commands
      'pre-deploy-local': '',
      
      // Post-deploy commands
      'post-deploy': 'cd estudio_ia_videos && npm ci --production && npm run build && pm2 reload ecosystem.config.js --env production',
      
      // Pre-setup commands (first deployment)
      'pre-setup': 'mkdir -p /var/log/pm2 && mkdir -p /opt/backups',
      
      // SSH options
      ssh_options: 'StrictHostKeyChecking=no',
    },
    
    staging: {
      user: 'deploy',
      host: ['staging-server.cursostecno.com.br'],
      ref: 'origin/develop',
      repo: 'git@github.com:cursostecno/mvp-videos.git',
      path: '/opt/mvp-videos-staging',
      
      'post-deploy': 'cd estudio_ia_videos && npm ci && npm run build && pm2 reload ecosystem.config.js --env staging',
      
      ssh_options: 'StrictHostKeyChecking=no',
    },
  },
};

