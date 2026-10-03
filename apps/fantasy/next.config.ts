import type { NextConfig } from "next";
import { apiEndpoint } from "@lufa/api-client/config.ts";

const nextConfig: NextConfig = {
  transpilePackages: ["@lufa/api-client", "@lufa/institutional-web"],
  async rewrites() {
    return [{ source: "/api/fantasy/:path*", destination: apiEndpoint("fantasy/:path*", "http://127.0.0.1:3001") }];
  },
};

export default nextConfig;
