import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  serverExternalPackages: ["firebase-admin"],
  transpilePackages: ["@react-pdf/renderer"],
};

export default nextConfig;
