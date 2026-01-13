const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/((?!_next|api|favicon.ico).*)',
        destination: '/estudio_ia_videos/$1',
      },
    ];
  },
  experimental: {
    serverComponentsExternalPackages: ['@supabase/supabase-js'],
  },
  images: {
    domains: [
      'cdn.abacus.ai',
      'cursostecno.com.br',
      'localhost',
    ],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
  },
  eslint: {
    // STAGING: Bypass lint for build
    ignoreDuringBuilds: true,
  },
  typescript: {
    // STAGING: Bypass type check for runtime validation
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
