import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  swcMinify: true,
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: true, // TODO: fix ESLint errors separately
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'date-fns', 'recharts'],
  },
  webpack: (config, { nextRuntime }) => {
    config.externals = [...(config.externals || []), { canvas: 'canvas' }];

    // SWC minification enabled via swcMinify: true
    // config.optimization.minimize is left at default (true for production)

    // Ensure proper module resolution for static assets
    config.resolve = {
      ...config.resolve,
      extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
    };

    // FIX: Edge Runtime (middleware) does NOT allow eval().
    // Sentry/webpack may set devtool to 'eval-source-map' which wraps every
    // module in eval() calls. Force 'source-map' for edge runtime to avoid
    // EvalError: "Code generation from strings disallowed for this context"
    if (nextRuntime === 'edge') {
      config.devtool = 'source-map';
    }

    return config;
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  async headers() {
    return [
      {
        source: '/_next/static/css/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      // Redirects antigos
      {
        source: '/pptx-studio-enhanced',
        destination: '/pptx-preview',
        permanent: true,
      },
      {
        source: '/pptx-upload-real',
        destination: '/pptx',
        permanent: true,
      },
      {
        source: '/pptx-editor-real',
        destination: '/editor',
        permanent: true,
      },
      // Redirects corrigidos de 404s
      {
        source: '/avatar-studio-hyperreal',
        destination: '/avatar-system-real',
        permanent: true,
      },
      {
        source: '/templates-nr-real',
        destination: '/smart-nr-templates',
        permanent: true,
      },
      {
        source: '/biblioteca-midia',
        destination: '/asset-library-studio',
        permanent: true,
      },
      {
        source: '/behavioral-analytics',
        destination: '/dashboard/analytics',
        permanent: true,
      },
      {
        source: '/ai-content-assistant',
        destination: '/ai-assistant',
        permanent: true,
      },
      {
        source: '/ai-templates-smart',
        destination: '/smart-templates',
        permanent: true,
      },
      {
        source: '/automation',
        destination: '/batch-processing',
        permanent: true,
      },
      {
        source: '/enterprise',
        destination: '/enterprise-integration',
        permanent: true,
      },
      {
        source: '/collaboration-v2',
        destination: '/real-time-collaboration',
        permanent: true,
      },
      {
        source: '/security-dashboard',
        destination: '/dashboard/security-analytics',
        permanent: true,
      },
      {
        source: '/enterprise-sso',
        destination: '/integrations',
        permanent: true,
      },
      {
        source: '/whitelabel',
        destination: '/brand-kit',
        permanent: true,
      },
      {
        source: '/admin/production-monitor',
        destination: '/admin/monitoring',
        permanent: true,
      },
      {
        source: '/admin/pptx-metrics',
        destination: '/dashboard/analytics',
        permanent: true,
      },
      {
        source: '/performance-dashboard',
        destination: '/performance',
        permanent: true,
      },
      {
        source: '/render-studio-advanced',
        destination: '/render-dashboard',
        permanent: true,
      },
      {
        source: '/asset-library',
        destination: '/asset-library-studio',
        permanent: true,
      },
      {
        source: '/real-time-comments',
        destination: '/comments',
        permanent: true,
      },
      {
        source: '/ai-advanced-lab',
        destination: '/ai-features',
        permanent: true,
      },
      {
        source: '/gamification',
        destination: '/interactive-elements',
        permanent: true,
      },
      {
        source: '/api-evolution',
        destination: '/api-keys',
        permanent: true,
      },
      {
        source: '/ml-ops',
        destination: '/system-control',
        permanent: true,
      },
      // Redirect /studio sem ID para /projects
      {
        source: '/studio',
        destination: '/projects',
        permanent: false,
      },
    ];
  },
};

export default withSentryConfig(
  nextConfig,
  {
    silent: true,
    org: 'cursostecno',
    project: 'estudio-ia-videos',
  },
  {
    // Disable Sentry temporarily to fix 403 errors
    enabled: process.env.NODE_ENV !== 'development',
    widenClientFileUpload: true,
    transpileClientSDK: true,
    tunnelRoute: '/monitoring',
    hideSourceMaps: true,
    disableLogger: false,
    automaticVercelMonitors: false,
    // Add error handling for failed requests
    clientInitOptions: {
      environment: process.env.NODE_ENV,
      tracesSampleRate: 0.1,
      replaysOnErrorSampleRate: 0.1,
      replaysSessionSampleRate: 0,
    },
  },
);
