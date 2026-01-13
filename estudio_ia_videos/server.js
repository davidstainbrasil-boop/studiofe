/**
 * Custom Next.js Server with Cache Warming
 *
 * This custom server starts Next.js and pre-warms the cache
 * on startup to eliminate cold-start latency.
 *
 * Usage:
 *   node server.js
 *   or via PM2: pm2 start server.js --name mvp-video
 */

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Cache warming function (dynamic import since it's TypeScript)
async function warmCacheOnStartup() {
  try {
    console.log('🔥 Starting cache warming...');

    // Dynamic import of the cache warming module
    const { warmCache } = await import('./src/lib/cache/cache-warming.ts');

    // Warm cache asynchronously (non-blocking)
    warmCache({
      templates: true,
      activeUsers: true,
      systemStats: true,
      recentProjects: true,
      userTiers: true
    }).catch(error => {
      console.error('⚠️  Cache warming failed:', error.message);
    });

    console.log('✅ Cache warming initiated (running in background)');
  } catch (error) {
    console.warn('⚠️  Cache warming module not available:', error.message);
    console.log('   Server will start without cache warming');
  }
}

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error handling request:', err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  }).listen(port, hostname, async (err) => {
    if (err) throw err;

    console.log(`\n🚀 Server ready on http://${hostname}:${port}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   Redis: ${process.env.REDIS_URL ? '✅ Configured' : '❌ Not configured'}`);

    // Warm cache after server is ready (only in production)
    if (!dev && process.env.REDIS_URL) {
      await warmCacheOnStartup();
    } else {
      console.log('ℹ️  Cache warming disabled (dev mode or Redis not configured)');
    }
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n🛑 SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n🛑 SIGINT received, shutting down gracefully...');
  process.exit(0);
});
