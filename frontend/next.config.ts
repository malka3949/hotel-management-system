import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['127.0.0.1', 'localhost', '192.168.1.166'],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.BACKEND_URL ?? 'http://localhost:3001'}/api/:path*`,
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  silent: true,
  disableLogger: true,
});
