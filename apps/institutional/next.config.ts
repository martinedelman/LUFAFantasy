import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  transpilePackages: ["@lufa/api-client", "@lufa/contracts"],
  turbopack: {
    resolveAlias: {
      "@vercel/flags-definitions": "./src/lib/vercelFlagsDefinitions.ts",
    },
  },
  webpack(config) {
    config.resolve.alias["@vercel/flags-definitions"] = path.resolve(
      process.cwd(),
      "src/lib/vercelFlagsDefinitions.ts",
    );
    return config;
  },
  async rewrites() {
    const apiUrl = (process.env.API_URL || "http://localhost:3001").replace(/\/$/, "");

    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
