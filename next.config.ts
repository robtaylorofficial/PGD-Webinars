import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Allow embed pages to be iframed only from PGD domains
        source: '/embed/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' https://plangrowdo.com https://*.plangrowdo.com",
          },
          {
            key: 'X-Frame-Options',
            value: 'ALLOW-FROM https://plangrowdo.com',
          },
        ],
      },
      {
        // All other pages: deny framing entirely
        source: '/((?!embed).*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
        ],
      },
    ]
  },
}

export default nextConfig;
