import type { NextConfig } from "next";
import packageJson from "./package.json";

const nextConfig: NextConfig = {
  env: {
    APP_VERSION: packageJson.version,
    BUILD_YEAR: new Date().getFullYear().toString(),
    BUILD_MONTH: (new Date().getMonth() + 1).toString().padStart(2, '0'),
  },
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
        // XMLファイル用のCORS（Vue Playerからfetchできるように）- 横書き
        source: '/items-h/:path*',
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
      },
      {
        // XMLファイル用のCORS（Vue Playerからfetchできるように）- 縦書き
        source: '/items-v/:path*',
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
