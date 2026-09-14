/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [{
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Strict-Transport-Security', value: 'max-age=63072000' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      ],
    }]
  },
  async rewrites() {
    // In local development, Next.js dev server proxies /svc/api calls to local FastAPI instance
    if (process.env.NODE_ENV === 'development') {
      const backendUrl = (process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/+$/, '');
      return [
        {
          source: '/svc/api',
          destination: `${backendUrl}/`,
        },
        {
          source: '/svc/api/:path*',
          destination: `${backendUrl}/:path*`,
        },
      ];
    }
    // In production on Vercel, vercel.json routes /svc/api/* directly to the backend service
    return [];
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
