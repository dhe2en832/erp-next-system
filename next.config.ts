import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone',
  experimental: {
    turbo: {
      root: __dirname,
    },
  },
};

export default nextConfig;
