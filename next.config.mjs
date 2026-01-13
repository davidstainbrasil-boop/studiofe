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
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.abacus.ai',
        port: '',
        pathname: '/images/**',
      },
      {
        protocol: 'https',
        hostname: 'cursostecno.com.br',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '',
        pathname: '/**',
      },
    ],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
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
