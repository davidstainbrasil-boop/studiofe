const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/:path*',
        destination: '/estudio_ia_videos/:path*',
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
