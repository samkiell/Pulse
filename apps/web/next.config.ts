import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@pulse/db"],
  async rewrites() {
    const apiPort = process.env.API_PORT || "4000";
    const apiHost = process.env.INTERNAL_API_URL || `http://localhost:${apiPort}`;
    return [
      {
        source: "/api/v1/:path*",
        destination: `${apiHost}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
