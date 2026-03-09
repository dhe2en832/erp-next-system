import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  
  // TypeScript configuration
  typescript: {
    // Allow production builds to complete even if there are type errors (not recommended for production)
    // ignoreBuildErrors: false,
  },
};

export default nextConfig;
