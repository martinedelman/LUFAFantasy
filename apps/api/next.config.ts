import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@lufa/contracts",
    "@lufa/database",
    "@lufa/fantasy-core",
    "@lufa/identity-institutional",
    "@lufa/integrations",
    "@lufa/operations",
    "@lufa/sports",
  ],
};

export default nextConfig;
