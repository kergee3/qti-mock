import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    const playerUrl = process.env.PLAYER_URL || 'http://localhost:5173'
    return [
      {
        // API Routes用のCORS
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: playerUrl
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'POST, OPTIONS'
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization'
          }
        ]
      },
      {
        // XMLファイル用のCORS（Vue Playerからfetchできるように）
        source: '/items/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*'
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, OPTIONS'
          }
        ]
      }
    ]
  }
};

export default nextConfig;
