import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const apiUrl = process.env.API_URL || "http://127.0.0.1:3001";
    return [{ source: "/api/fantasy/:path*", destination: `${apiUrl}/api/fantasy/:path*` }];
  },
};

export default nextConfig;
