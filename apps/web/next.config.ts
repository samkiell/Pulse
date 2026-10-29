import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../../"),
  transpilePackages: ["@pulse/db"],
  async rewrites() {
    const apiPort = process.env.PORT || process.env.API_PORT || "3001";
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
