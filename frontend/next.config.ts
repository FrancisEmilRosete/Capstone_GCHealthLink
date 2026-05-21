import type { NextConfig } from "next";
import withPWAInit from "next-pwa";
import path from "node:path";

const withPWA = withPWAInit({
  dest: "public",
  register: false,
  skipWaiting: true,
  disable: process.env.NODE_ENV !== "production",
  buildExcludes: [/middleware-manifest\.json$/],
  fallbacks: {
    document: "/offline",
  },
});

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Registration is disabled; redirect any direct visits to /register back to login.
      { source: '/register', destination: '/login', permanent: false },
    ];
  },
  // Strict mode in Next dev intentionally double-invokes effects,
  // which doubles client data fetching and slows perceived rendering.
  reactStrictMode: process.env.NODE_ENV === "production",
  outputFileTracingRoot: path.join(__dirname, ".."),
  experimental: {
    // Work around intermittent Windows build-worker crashes during static generation.
    cpus: process.platform === "win32" ? 2 : undefined,
  },
};

export default withPWA(nextConfig);
