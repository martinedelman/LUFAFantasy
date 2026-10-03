import type { NextConfig } from "next";
import path from "node:path";
import { apiEndpoint } from "@lufa/api-client/config.ts";

const nextConfig: NextConfig = {
  transpilePackages: ["@lufa/api-client", "@lufa/contracts", "@lufa/institutional-web"],
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
        // Every browser call goes through this proxy, so the whole site reads
        // tackle data without touching the shared screens. Next merges the
        // original query string with this one.
        destination: `${apiEndpoint(":path*")}?modality=tackle`,
      },
    ];
  },
};

export default nextConfig;
