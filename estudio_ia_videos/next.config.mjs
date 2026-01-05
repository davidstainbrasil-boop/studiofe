/** @type {import('next').NextConfig} */
// Force Rebuild 2
const nextConfig = {
  eslint: {
    // Temporariamente ignorar erros de lint durante build para ambiente local
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Temporariamente ignorar erros de TypeScript durante build para ambiente local
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '**.elevenlabs.io',
      },
      {
        protocol: 'https',
        hostname: '**.d-id.com',
      },
      {
        protocol: 'https',
        hostname: '**.synthesia.io',
      },
      {
        protocol: 'https',
        hostname: 'trae-api-us.mchost.guru',
      },
    ],
  },
  // Disable source maps in development to prevent external fetches
  productionBrowserSourceMaps: false,
  // Disable dev indicators that might fetch external resources
  devIndicators: {
    buildActivity: false,
    buildActivityPosition: 'bottom-right',
  },
  // Ensure no external fetches for error overlay
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
  experimental: {
    serverComponentsExternalPackages: ['@remotion/bundler', '@remotion/renderer', 'esbuild'],
  },
  webpack: (config, { isServer }) => {
    config.externals.push({
      'utf-8-validate': 'commonjs utf-8-validate',
      'bufferutil': 'commonjs bufferutil',
      'canvas': 'commonjs canvas',
    });

    // Suppress warnings for critical dependencies in instrumentation libraries
    config.ignoreWarnings = [
      { module: /node_modules\/@opentelemetry\/instrumentation/ },
      { module: /node_modules\/@prisma\/instrumentation/ },
      { module: /node_modules\/require-in-the-middle/ },
    ];

    return config;
  },
};

export default nextConfig;
