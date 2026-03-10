import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  serverExternalPackages: ["firebase-admin", "@react-pdf/renderer"],
};

export default nextConfig;
