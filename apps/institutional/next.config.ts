import type { NextConfig } from "next";
import path from "node:path";
import { apiEndpoint } from "@lufa/api-client/config.ts";

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
    return [
      {
        source: "/api/:path*",
        destination: apiEndpoint(":path*"),
      },
    ];
  },
};

export default nextConfig;
