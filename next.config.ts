import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: '/family-guide',         destination: '/newcomer-guide', permanent: true },
      { source: '/family-guide/:path*',  destination: '/newcomer-guide/:path*', permanent: true },
      { source: '/new-to-river-region',  destination: '/newcomer-guide', permanent: true },
      { source: '/newcomer',             destination: '/newcomer-guide', permanent: true },
    ]
  },
};

export default nextConfig;
