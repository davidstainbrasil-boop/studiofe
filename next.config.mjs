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
    domains: ['localhost'],
    unoptimized: true,
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
