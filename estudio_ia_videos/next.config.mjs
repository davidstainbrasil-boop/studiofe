import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'standalone',
  reactStrictMode: true,
  swcMinify: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
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
  webpack: (config) => {
    config.externals = [...(config.externals || []), { canvas: "canvas" }];
    // Ensure proper module resolution for static assets
    config.resolve = {
      ...config.resolve,
      extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
    };
    return config;
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // Asset prefix removed to allow standard Vercel relative path resolution
  // This fixes the issue where implicit Vercel URLs didn't match the custom domain
  // Ensure static assets are served correctly with proper headers
  async headers() {
    return [
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
    // For all available options, see:
    // https://github.com/getsentry/sentry-webpack-plugin#options

    // Suppresses source map uploading logs during build
    silent: true,
    org: "cursostecno", // Updated to match user context roughly
    project: "estudio-ia-videos",
  },
  {
    // For all available options, see:
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

    // Upload a larger set of source maps for prettier stack traces (increases build time)
    widenClientFileUpload: true,

    // Transpiles SDK to be compatible with IE11 (increases bundle size)
    transpileClientSDK: true,

    // Routes browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers (increases server load)
    tunnelRoute: "/monitoring",

    // Hides source maps from generated client bundles
    hideSourceMaps: true,

    // Automatically tree-shake Sentry logger statements to reduce bundle size
    disableLogger: true,

    // Enables automatic instrumentation of Vercel Cron Monitors.
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,
  }
);
