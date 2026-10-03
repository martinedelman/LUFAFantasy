import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@lufa/api-client", "@lufa/contracts", "@lufa/institutional-web"],
};

export default nextConfig;
