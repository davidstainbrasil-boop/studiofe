module.exports = {
    apps: [
        {
            name: 'mvp-video-app',
            script: 'node_modules/next/dist/bin/next',
            args: 'start',
            cwd: './',
            instances: 'max',
            exec_mode: 'cluster',
            watch: false,
            max_memory_restart: '1G',
            env: {
                NODE_ENV: 'production',
                PORT: 3000,
            },
            env_production: {
                NODE_ENV: 'production',
                PORT: 3000,
            },
            env_staging: {
                NODE_ENV: 'staging',
                PORT: 3001,
            },
            error_file: './logs/pm2-error.log',
            out_file: './logs/pm2-out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            merge_logs: true,
            autorestart: true,
            max_restarts: 10,
            min_uptime: '10s',
            listen_timeout: 10000,
            kill_timeout: 5000,
        },
        {
            name: 'cache-warmer',
            script: 'node',
            args: '-e "setInterval(() => fetch(\'http://localhost:3000/api/admin/cache/warm\', {method: \'POST\'}).catch(console.error), 1800000)"',
            instances: 1,
            exec_mode: 'fork',
            cron_restart: '0 */2 * * *',
            autorestart: false,
        }
    ],

    deploy: {
        production: {
            user: 'deploy',
            host: ['SERVER_IP_OR_DOMAIN'],
            ref: 'origin/main',
            repo: 'GIT_REPOSITORY_URL',
            path: '/var/www/production',
            'pre-deploy-local': '',
            'post-deploy': 'npm ci --legacy-peer-deps && npm run build && pm2 reload ecosystem.config.js --env production',
            'pre-setup': '',
            'ssh_options': 'ForwardAgent=yes'
        },
        staging: {
            user: 'deploy',
            host: ['STAGING_SERVER_IP'],
            ref: 'origin/staging',
            repo: 'GIT_REPOSITORY_URL',
            path: '/var/www/staging',
            'post-deploy': 'npm ci --legacy-peer-deps && npm run build && pm2 reload ecosystem.config.js --env staging',
            env: {
                NODE_ENV: 'staging'
            }
        }
    }
}
